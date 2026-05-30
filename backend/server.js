const express = require("express");
require("dotenv").config();
const fs = require("fs");
const fsp = require("fs").promises;
const cors = require("cors");
const crypto = require("crypto");
const path = require("path");
const { v2: cloudinary } = require("cloudinary");

const app = express();

const cloudinaryConfigured = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (cloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  });
}

// Production CORS configuration
app.use(cors({
  origin: "*", // In strict production, change this to your custom domain
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

const FILE = path.join(__dirname, "products.json");

// Ensure file exists synchronously at startup
if (!fs.existsSync(FILE)) {
  fs.writeFileSync(FILE, "[]");
}


// Helper function for safe, non-blocking file reads
async function readProducts() {
  try {
    const data = await fsp.readFile(FILE, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading products:", err);
    return [];
  }
}

// Helper function for safe, non-blocking file writes
async function writeProducts(data) {
  // Use a temporary file to prevent corruption during crash/power loss
  const tempFile = `${FILE}.tmp`;
  await fsp.writeFile(tempFile, JSON.stringify(data, null, 2));
  await fsp.rename(tempFile, FILE);
}


function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string") {
    return value.split(",").map(item => item.trim()).filter(Boolean);
  }
  return [];
}

function detectStoreFromUrl(value) {
  let hostname;
  try {
    hostname = new URL(value).hostname.toLowerCase();
  } catch {
    return null;
  }

  if (hostname.includes("myntra")) return { store: "Myntra", priority: "PRIMARY", category: "Fashion" };
  if (hostname.includes("ajio")) return { store: "Ajio", priority: "PRIMARY", category: "Fashion" };
  if (hostname.includes("nykaa")) return { store: "Nykaa Fashion", priority: "PRIMARY", category: "Fashion" };
  if (hostname.includes("amazon")) return { store: "Amazon India", priority: "SECONDARY", category: "Fashion" };
  if (hostname.includes("flipkart")) return { store: "Flipkart", priority: "SECONDARY", category: "Fashion" };
  if (hostname.includes("meesho")) return { store: "Meesho", priority: "SECONDARY", category: "Fashion" };
  return null;
}

function pickMeta(html, names) {
  for (const name of names) {
    const pattern = new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i");
    const match = html.match(pattern);
    if (match?.[1]) return decodeHtml(match[1]);
  }
  return "";
}

function decodeHtml(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function extractNumber(value) {
  const match = String(value || "").replace(/,/g, "").match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

async function uploadImagesToCloudinary(imageUrls, folder = "redhot/products") {
  const urls = toArray(imageUrls).slice(0, 4);
  if (!urls.length || !cloudinaryConfigured) return urls;

  const uploads = await Promise.allSettled(urls.map(url =>
    cloudinary.uploader.upload(url, {
      folder,
      resource_type: "image",
      overwrite: false
    })
  ));

  const secureUrls = uploads
    .filter(result => result.status === "fulfilled")
    .map(result => result.value.secure_url)
    .filter(Boolean);

  return secureUrls.length ? secureUrls : urls;
}

async function scrapeAffiliateUrl(affiliateUrl) {
  const detected = detectStoreFromUrl(affiliateUrl);
  if (!detected) {
    const err = new Error("Unsupported affiliate link domain. Use Myntra, Ajio, Nykaa Fashion, Amazon, Flipkart, or Meesho.");
    err.status = 400;
    throw err;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 18000);
  try {
    const response = await fetch(affiliateUrl, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": "Mozilla/5.0 RedhotAffiliateAgent/2.1",
        "accept": "text/html,application/xhtml+xml"
      }
    });
    const html = await response.text();
    const title = pickMeta(html, ["og:title", "twitter:title"]) || decodeHtml(html.match(/<title[^>]*>([^<]+)/i)?.[1] || `${detected.store} Fashion Deal`);
    const description = pickMeta(html, ["og:description", "description", "twitter:description"]);
    const image = pickMeta(html, ["og:image", "twitter:image"]);
    const cloudinaryImages = await uploadImagesToCloudinary(image ? [image] : []);
    const price = extractNumber(pickMeta(html, ["product:price:amount", "og:price:amount"]) || html.match(/(?:price|sellingPrice)["']?\s*[:=]\s*["']?₹?\s*([\d,.]+)/i)?.[1]);
    const mrp = extractNumber(html.match(/(?:mrp|maximumRetailPrice|listPrice)["']?\s*[:=]\s*["']?₹?\s*([\d,.]+)/i)?.[1]);
    const discount = mrp > price && price > 0 ? Math.round(((mrp - price) / mrp) * 100) : 0;

    return normalizeProduct({
      name: title.slice(0, 120),
      title,
      description,
      price,
      mrp,
      discount,
      image: cloudinaryImages[0] || image,
      images: cloudinaryImages.length ? cloudinaryImages : (image ? [image] : []),
      affiliate_url: affiliateUrl,
      source_url: response.url || affiliateUrl,
      original_url: response.url || affiliateUrl,
      store: detected.store,
      store_priority: detected.priority,
      category: detected.category,
      tags: [detected.store.toLowerCase().replace(/\s+/g, "-"), "affiliate", "fashion"],
      trend_keyword: "manual affiliate link",
      seo_title: title.slice(0, 60),
      meta_description: (description || title).slice(0, 160),
      broadcast_status: {
        telegram: "queued",
        pinterest: "rss"
      }
    });
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeProduct(input, existing = {}) {
  const name = input.name || input.title || existing.name || "";
  const price = Number(input.price ?? existing.price ?? 0);
  const mrp = Number(input.mrp ?? input.original_price ?? existing.mrp ?? 0);
  const discount = Number(input.discount ?? existing.discount ?? (
    mrp > price && price > 0 ? Math.round(((mrp - price) / mrp) * 100) : 0
  ));
  const images = toArray(input.images || input.image_urls || existing.images);
  const image = input.image || input.primary_image || images[0] || existing.image || "";
  const tags = toArray(input.tags || existing.tags);
  const store = input.store || input.store_name || existing.store || "Manual";
  const primaryStores = new Set(["Myntra", "Ajio", "Nykaa Fashion"]);
  const affiliateUrl = input.affiliate_url || existing.affiliate_url || "";
  const commissionRate = Number(input.commission_rate ?? existing.commission_rate ?? 0);
  const estimatedCommission = Number(input.estimated_commission ?? existing.estimated_commission ?? (
    commissionRate > 0 && price > 0 ? Math.round((price * commissionRate) / 100) : 0
  ));

  return {
    ...existing,
    ...input,
    name,
    title: input.title || name,
    slug: input.slug || existing.slug || slugify(name),
    price,
    mrp,
    discount,
    category: input.category || existing.category || "",
    badge: input.badge || existing.badge || (discount >= 40 ? "HOT" : ""),
    image,
    images: images.length ? images : (image ? [image] : []),
    description: input.description || input.ai_description || existing.description || "",
    affiliate_url: affiliateUrl,
    affiliate_link: affiliateUrl || input.affiliate_link || input.affiliate_url || existing.affiliate_link || "#",
    source_url: input.source_url || input.original_url || existing.source_url || "",
    original_url: input.original_url || input.source_url || existing.original_url || existing.source_url || "",
    store,
    store_priority: input.store_priority || existing.store_priority || (primaryStores.has(store) ? "PRIMARY" : "SECONDARY"),
    rating: Number(input.rating ?? existing.rating ?? 0),
    review_count: Number(input.review_count ?? input.reviews ?? existing.review_count ?? 0),
    tags,
    trend_keyword: input.trend_keyword || existing.trend_keyword || "",
    seo_title: input.seo_title || existing.seo_title || String(name).slice(0, 60),
    meta_description: input.meta_description || existing.meta_description || String(input.description || existing.description || "").slice(0, 160),
    affiliate_disclosure: input.affiliate_disclosure || existing.affiliate_disclosure || "This post contains affiliate links.",
    commission_rate: commissionRate,
    estimated_commission: estimatedCommission,
    commission_score: Number(input.commission_score ?? existing.commission_score ?? 0),
    lowest_price: Number(input.lowest_price ?? existing.lowest_price ?? price),
    price_history: Array.isArray(input.price_history) ? input.price_history : (existing.price_history || [{ price, checked_at: new Date().toISOString() }]),
    broadcast_status: {
      telegram: input.broadcast_status?.telegram || existing.broadcast_status?.telegram || "pending",
      pinterest: input.broadcast_status?.pinterest || existing.broadcast_status?.pinterest || "rss"
    },
    post_id: input.post_id || existing.post_id || null,
    published_at: input.published_at || existing.published_at || new Date().toISOString()
  };
}

// ── Auth ───────────────────────────────────────────────────────────────────
const ADMIN_USER = process.env.ADMIN_USER || "Akash";
const ADMIN_PASS = process.env.ADMIN_PASS || "redhot2026";

const tokens = new Set();

function requireAuth(req, res, next) {
  const auth = req.headers["authorization"] || "";
  const token = auth.replace("Bearer ", "").trim();
  const apiKey = process.env.WEBSITE_API_KEY || "";
  if (!token || (!tokens.has(token) && token !== apiKey)) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    const token = crypto.randomBytes(32).toString("hex");
    tokens.add(token);
    // Expire token after 8 hours to prevent stale sessions
    setTimeout(() => tokens.delete(token), 8 * 60 * 60 * 1000);
    return res.json({ token });
  }
  res.status(401).json({ error: "Invalid credentials" });
});

app.post("/api/logout", (req, res) => {
  const auth = req.headers["authorization"] || "";
  const token = auth.replace("Bearer ", "").trim();
  tokens.delete(token);
  res.json({ success: true });
});

// ── Products ───────────────────────────────────────────────────────────────
app.get("/products", async (req, res) => {
  const data = await readProducts();
  res.json(data);
});

app.get("/feed.xml", async (req, res) => {
  const products = await readProducts();
  const siteUrl = process.env.WEBSITE_URL || "https://redhot.in";
  const items = products.slice(-30).reverse().map(product => {
    const title = escapeXml(product.seo_title || product.name);
    const link = escapeXml(product.affiliate_url || product.source_url || product.original_url || product.affiliate_link || siteUrl);
    const description = escapeXml(product.meta_description || product.description || "Redhot affiliate fashion deal.");
    return `<item><title>${title}</title><link>${link}</link><guid>${siteUrl}/product/${product.slug || product.id}</guid><description>${description}</description><pubDate>${new Date(product.published_at || Date.now()).toUTCString()}</pubDate></item>`;
  }).join("");

  res.type("application/rss+xml").send(`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Redhot Deals</title><link>${siteUrl}</link><description>AI-curated fashion affiliate deals from Redhot.</description>${items}</channel></rss>`);
});

app.post("/products", requireAuth, async (req, res) => {
  try {
    const data = await readProducts();
    const newProduct = normalizeProduct({ id: Date.now(), ...req.body });
    data.push(newProduct);
    await writeProducts(data);
    res.json(newProduct);
  } catch (err) {
    res.status(500).json({ error: "Failed to create product" });
  }
});

app.put("/products/:id", requireAuth, async (req, res) => {
  try {
    const data = await readProducts();
    const newData = data.map(p =>
      p.id === Number(req.params.id) ? normalizeProduct(req.body, p) : p
    );
    await writeProducts(newData);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to update product" });
  }
});

app.delete("/products/:id", requireAuth, async (req, res) => {
  try {
    const data = await readProducts();
    const newData = data.filter(p => p.id !== Number(req.params.id));
    await writeProducts(newData);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete product" });
  }
});

// bulk delete
app.post("/products/bulk-delete", requireAuth, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids)) return res.status(400).json({ error: "ids must be array" });
    
    const data = await readProducts();
    const newData = data.filter(p => !ids.includes(p.id));
    await writeProducts(newData);
    res.json({ success: true, deleted: ids.length });
  } catch (err) {
    res.status(500).json({ error: "Failed to bulk delete products" });
  }
});

// ── Affiliate link masking ─────────────────────────────────────────────────
app.get("/go/:id", async (req, res) => {
  try {
    const data = await readProducts();
    const product = data.find(p => p.id === Number(req.params.id));
    const target = product?.affiliate_url || product?.source_url || product?.original_url || product?.affiliate_link;
    if (!product || !target || target === "#") {
      return res.status(404).json({ error: "Link not found" });
    }
    res.redirect(target);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/products", async (req, res) => {
  const data = await readProducts();
  res.json(data);
});

app.get("/api/integrations", requireAuth, async (req, res) => {
  res.json({
    website_api_key: Boolean(process.env.WEBSITE_API_KEY),
    cloudinary: cloudinaryConfigured,
    gemini: Boolean(process.env.GEMINI_API_KEY),
    telegram: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHANNEL_ID)
  });
});

app.post("/api/products", requireAuth, async (req, res) => {
  try {
    const data = await readProducts();
    const newProduct = normalizeProduct({ id: Date.now(), ...req.body });
    data.push(newProduct);
    await writeProducts(data);
    res.status(201).json({ id: newProduct.id, post_id: newProduct.id, product: newProduct });
  } catch (err) {
    res.status(500).json({ error: "Failed to publish product" });
  }
});

app.post("/api/manual-affiliate", requireAuth, async (req, res) => {
  try {
    const affiliateUrl = String(req.body.affiliate_url || req.body.url || "").trim();
    if (!affiliateUrl) {
      return res.status(400).json({ error: "affiliate_url is required", stage: "Detecting store" });
    }

    const detected = detectStoreFromUrl(affiliateUrl);
    if (!detected) {
      return res.status(400).json({
        error: "Unsupported affiliate link domain. Supported stores: Myntra, Ajio, Nykaa Fashion, Amazon India, Flipkart, Meesho.",
        stage: "Detecting store"
      });
    }

    const product = await scrapeAffiliateUrl(affiliateUrl);
    const data = await readProducts();
    const newProduct = {
      ...product,
      id: Date.now(),
      manual_trigger: true,
      media_provider: cloudinaryConfigured ? "cloudinary" : "source",
      pipeline_stages: [
        "Detecting store",
        "Scraping product",
        "Uploading images",
        "Generating SEO",
        "Publishing",
        "Broadcasting",
        "Done"
      ]
    };
    data.push(newProduct);
    await writeProducts(data);

    res.status(201).json({
      id: newProduct.id,
      post_id: newProduct.id,
      product: newProduct,
      stages: newProduct.pipeline_stages,
      message: "Manual affiliate link published"
    });
  } catch (err) {
    res.status(err.status || 500).json({
      error: err.message || "Manual affiliate publish failed",
      stage: err.status === 400 ? "Detecting store" : "Scraping product"
    });
  }
});

app.get("/api/dashboard", requireAuth, async (req, res) => {
  const products = await readProducts();
  const today = new Date().toISOString().slice(0, 10);
  const publishedToday = products.filter(p => String(p.published_at || "").startsWith(today));
  const storeBreakdown = products.reduce((acc, product) => {
    const store = product.store || "Manual";
    acc[store] = (acc[store] || 0) + 1;
    return acc;
  }, {});
  const trendKeywords = [...new Set(products.map(p => p.trend_keyword).filter(Boolean))].slice(0, 12);

  res.json({
    stats: {
      total_products: products.length,
      published_today: publishedToday.length,
      primary_store_products: products.filter(p => p.store_priority === "PRIMARY").length,
      products_with_affiliate_links: products.filter(p => (p.affiliate_link && p.affiliate_link !== "#") || p.source_url).length,
      direct_affiliate_products: products.filter(p => p.affiliate_url).length,
      estimated_commission_total: products.reduce((sum, p) => sum + (Number(p.estimated_commission) || 0), 0),
      price_drop_candidates: products.filter(p => Number(p.lowest_price) > Number(p.price)).length
    },
    recent_products: products.slice(-8).reverse(),
    store_breakdown: storeBreakdown,
    trend_keywords: trendKeywords,
    logs: [
      "Dashboard reflects products currently published through Redhot API.",
      "AffiliateAgent pipeline logs can be attached when scheduler/orchestrator service is deployed."
    ]
  });
});

function escapeXml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Global error handler for uncaught JSON/parsing errors
app.use((err, req, res, _next) => {
  console.error(err.stack);
  res.status(500).send({ error: 'Something broke!' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running in production mode on port ${PORT}`);
});
