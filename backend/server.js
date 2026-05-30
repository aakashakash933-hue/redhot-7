const express = require("express");
require("dotenv").config();
const fs = require("fs");
const fsp = require("fs").promises;
const cors = require("cors");
const crypto = require("crypto");
const path = require("path");
const { v2: cloudinary } = require("cloudinary");
const { GoogleGenerativeAI } = require("@google/generative-ai");

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
const PUBLISHED_FILE = path.join(__dirname, "published_urls.json");

// Ensure file exists synchronously at startup
if (!fs.existsSync(FILE)) {
  fs.writeFileSync(FILE, "[]");
}

if (!fs.existsSync(PUBLISHED_FILE)) {
  fs.writeFileSync(PUBLISHED_FILE, "[]");
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

async function readJson(file, fallback) {
  try {
    const data = await fsp.readFile(file, "utf-8");
    return JSON.parse(data);
  } catch {
    return fallback;
  }
}

async function writeJson(file, data) {
  const tempFile = `${file}.tmp`;
  await fsp.writeFile(tempFile, JSON.stringify(data, null, 2));
  await fsp.rename(tempFile, file);
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
  if (hostname.includes("amazon")) return { store: "Amazon India", priority: "SECONDARY", category: "Fashion" };
  if (hostname.includes("flipkart")) return { store: "Flipkart", priority: "SECONDARY", category: "Fashion" };
  return null;
}

// All known affiliate short-link / redirect domains
const AFFILIATE_DOMAINS = [
  "earnkaro", "ekaro",
  "myntr.it",
  "short.gy", "mysk.short.gy",
  "linksredirect",
  "bit.ly", "tinyurl.com",
  "clnk.in",
  "amzn.in", "amzn.to",
  "fkrt.it", "fkrt.cc"
];

function isEarnKaroUrl(value) {
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return AFFILIATE_DOMAINS.some(d => hostname.includes(d));
  } catch {
    return false;
  }
}

function ensureHttpUrl(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function normalizeUrlForMemory(value) {
  try {
    const url = new URL(value);
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return String(value || "").trim().replace(/[?#].*$/, "").replace(/\/$/, "");
  }
}

async function resolveEarnKaroLink(earnKaroUrl) {
  let current = earnKaroUrl;
  const maxHops = Number(process.env.MAX_REDIRECT_HOPS || 15);
  const browserUA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

  for (let hop = 0; hop <= maxHops; hop++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(current, {
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "user-agent": browserUA,
          "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "accept-language": "en-IN,en;q=0.9"
        }
      });

      // Follow HTTP redirects
      const location = response.headers.get("location");
      if (response.status >= 300 && response.status < 400 && location) {
        current = new URL(location, current).toString();
        continue;
      }

      // If we landed on a page, check for JS/meta redirects
      if (response.status === 200) {
        const html = await response.text();

        // meta refresh
        const metaRefresh = html.match(/<meta[^>]+http-equiv=["']refresh["'][^>]+content=["'][^;]*;\s*url=([^"']+)/i);
        if (metaRefresh && metaRefresh[1]) {
          const refreshUrl = decodeHtml(metaRefresh[1].trim());
          if (refreshUrl && refreshUrl !== current) {
            current = new URL(refreshUrl, current).toString();
            continue;
          }
        }

        // JS window.location redirect
        const jsRedirect = html.match(/window\.location(?:\.href)?\s*=\s*["']([^"']+)/i) ||
          html.match(/location\.replace\(["']([^"']+)/i);
        if (jsRedirect && jsRedirect[1]) {
          const jsUrl = decodeHtml(jsRedirect[1].trim());
          if (jsUrl && jsUrl.startsWith("http") && jsUrl !== current) {
            current = new URL(jsUrl, current).toString();
            continue;
          }
        }

        // Already on a supported store
        if (detectStoreFromUrl(current)) return current;

        // Final fallback: find store URL embedded in page
        const storeUrlMatch = html.match(/https?:\/\/(?:www\.)?(?:myntra|ajio|amazon|flipkart)\.[^"'\s]+/i);
        if (storeUrlMatch) return decodeHtml(storeUrlMatch[0]);
      }

      return current;
    } catch (fetchErr) {
      const err = new Error("Could not resolve affiliate link. Please check the URL.");
      err.status = 400;
      err.stage = "Resolving link";
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }

  const err = new Error("Could not resolve affiliate link after too many redirects.");
  err.status = 400;
  err.stage = "Resolving link";
  throw err;
}

async function alreadyPublished(earnKaroUrl, finalUrl) {
  const memory = await readJson(PUBLISHED_FILE, []);
  const keys = new Set(memory.flatMap(item => [item.affiliate_url_key, item.original_url_key]).filter(Boolean));
  return keys.has(normalizeUrlForMemory(earnKaroUrl)) || keys.has(normalizeUrlForMemory(finalUrl));
}

async function markPublished(product) {
  const memory = await readJson(PUBLISHED_FILE, []);
  memory.push({
    id: product.id,
    title: product.title || product.name,
    affiliate_url: product.affiliate_url,
    original_url: product.original_url,
    affiliate_url_key: normalizeUrlForMemory(product.affiliate_url),
    original_url_key: normalizeUrlForMemory(product.original_url),
    published_at: new Date().toISOString()
  });
  await writeJson(PUBLISHED_FILE, memory);
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

async function enrichWithGemini(product) {
  if (!process.env.GEMINI_API_KEY) {
    return {
      seo_description: product.description || product.title || product.name,
      seo_title: (product.title || product.name || "Redhot Fashion Deal").slice(0, 60),
      meta_description: (product.description || product.title || product.name || "Redhot affiliate fashion deal.").slice(0, 160)
    };
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `Create SEO content for this Indian fashion affiliate product. Return strict JSON with keys seo_description, seo_title, meta_description.
Product: ${product.title || product.name}
Store: ${product.store}
Category: ${product.category}
Price: ${product.price}
MRP: ${product.mrp}
Description: ${product.description || ""}`;
    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(text);
    return {
      seo_description: String(parsed.seo_description || product.description || product.title).slice(0, 1200),
      seo_title: String(parsed.seo_title || product.title || product.name).slice(0, 60),
      meta_description: String(parsed.meta_description || product.description || product.title || product.name).slice(0, 160)
    };
  } catch (err) {
    console.warn("Gemini enrichment failed, using scraped description fallback:", err.message);
    return {
      seo_description: product.description || product.title || product.name,
      seo_title: (product.title || product.name || "Redhot Fashion Deal").slice(0, 60),
      meta_description: (product.description || product.title || product.name || "Redhot affiliate fashion deal.").slice(0, 160)
    };
  }
}

function extractMyntraData(html) {
  // Myntra embeds product data in __myx_data__ or window.__data__ or __NEXT_DATA__
  // Try each in order of reliability

  // 1. Try __myx_data__ (Myntra's primary data blob)
  const myxMatch = html.match(/window\.__myx\s*=\s*({.+?});\s*(?:window|<\/script>)/s) ||
    html.match(/__myx_data__\s*=\s*({.+?});\s*(?:window|<\/script>)/s);
  if (myxMatch) {
    try { return { source: "myx", data: JSON.parse(myxMatch[1]) }; } catch {}
  }

  // 2. Try __NEXT_DATA__
  const nextMatch = html.match(/<script[^>]+id="__NEXT_DATA__"[^>]*>({.+?})<\/script>/s);
  if (nextMatch) {
    try { return { source: "next", data: JSON.parse(nextMatch[1]) }; } catch {}
  }

  // 3. Try pdpData JSON blob
  const pdpMatch = html.match(/(?:pdpData|productData)\s*[:=]\s*({.+?})(?:;|\s*(?:window|var\s))/s);
  if (pdpMatch) {
    try { return { source: "pdp", data: JSON.parse(pdpMatch[1]) }; } catch {}
  }

  return null;
}

function extractMyntraImages(html, parsed) {
  const images = new Set();

  // From parsed JSON blobs — walk common paths
  if (parsed?.data) {
    const stringify = JSON.stringify(parsed.data);
    // Pull all CDN image URLs from the JSON
    const cdnMatches = [...stringify.matchAll(/https?:\\?\/\\?\/(?:assets|cdn)\.[^"'\\]+\.(?:jpg|jpeg|png|webp)[^"'\\]*/gi)];
    for (const m of cdnMatches) {
      images.add(m[0].replace(/\\u002F/g, "/").replace(/\\/g, ""));
    }
  }

  // Myntra CDN pattern directly in HTML
  const cdnRe = /https?:\/\/(?:assets|cdn)\.myntassets\.com\/[^"'\s\\]+\.(?:jpg|jpeg|png|webp)[^"'\s\\]*/gi;
  for (const m of html.matchAll(cdnRe)) {
    images.add(decodeHtml(m[0]));
  }

  // Fallback: any image URL in HTML
  const genericRe = /https?:\/\/[^"'\\\s]+\.(?:jpg|jpeg|png|webp)(?:[^"'\\\s]*)?/gi;
  for (const m of html.matchAll(genericRe)) {
    images.add(decodeHtml(m[0]));
  }

  // Filter out tiny icons / tracking pixels
  return [...images]
    .filter(u => !u.includes("logo") && !u.includes("icon") && !u.includes("sprite") && !u.includes("1x1"))
    .slice(0, Number(process.env.MAX_IMAGES || 8));
}

function extractMyntraPrices(html, parsed) {
  let price = 0, mrp = 0;

  if (parsed?.data) {
    const str = JSON.stringify(parsed.data);
    // Common Myntra JSON keys
    const priceMatch = str.match(/"(?:price|discountedPrice|sellingPrice)"\s*:\s*(\d+)/i);
    const mrpMatch = str.match(/"(?:mrp|originalPrice|listPrice|strikeThroughPrice)"\s*:\s*(\d+)/i);
    if (priceMatch) price = Number(priceMatch[1]);
    if (mrpMatch) mrp = Number(mrpMatch[1]);
  }

  // HTML regex fallback
  if (!price) price = extractNumber(html.match(/(?:price|sellingPrice|discountedPrice)["']?\s*[:=]\s*["']?₹?\s*([\d,.]+)/i)?.[1]);
  if (!mrp) mrp = extractNumber(html.match(/(?:mrp|maximumRetailPrice|listPrice|strikeThroughPrice)["']?\s*[:=]\s*["']?₹?\s*([\d,.]+)/i)?.[1]);

  return { price, mrp };
}

async function scrapeAffiliateUrl(earnKaroUrl, finalUrl) {
  const detected = detectStoreFromUrl(finalUrl);
  if (!detected) {
    const err = new Error("Store not supported. Supported stores: Myntra, Amazon, Flipkart, Ajio.");
    err.status = 400;
    err.stage = "Detecting store";
    throw err;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(finalUrl, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        // Use a real browser UA — Myntra blocks generic bots
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "accept-language": "en-IN,en;q=0.9",
        "accept-encoding": "gzip, deflate, br",
        "cache-control": "no-cache",
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "none",
        "upgrade-insecure-requests": "1"
      }
    });
    const html = await response.text();

    // Try structured data extraction (Myntra-aware)
    const parsed = extractMyntraData(html);

    const title = pickMeta(html, ["og:title", "twitter:title"]) || decodeHtml(html.match(/<title[^>]*>([^<]+)/i)?.[1] || `${detected.store} Fashion Deal`);
    const description = pickMeta(html, ["og:description", "description", "twitter:description"]);

    const extractedImages = extractMyntraImages(html, parsed);

    if (!extractedImages.length) {
      const err = new Error("No product images found. Myntra may be blocking automated access — try again in a moment.");
      err.status = 422;
      err.stage = "Scraping product";
      throw err;
    }
    const cloudinaryImages = await uploadImagesToCloudinary(extractedImages);
    if (!cloudinaryImages.length) {
      const err = new Error("Image upload failed.");
      err.status = 502;
      err.stage = "Uploading images";
      throw err;
    }

    const { price, mrp } = extractMyntraPrices(html, parsed);
    const priceFromMeta = extractNumber(pickMeta(html, ["product:price:amount", "og:price:amount"]));
    const finalPrice = price || priceFromMeta;
    const discount = mrp > finalPrice && finalPrice > 0 ? Math.round(((mrp - finalPrice) / mrp) * 100) : 0;

    if (!title) {
      const err = new Error("Could not extract product title. The page may have changed.");
      err.status = 422;
      err.stage = "Scraping product";
      throw err;
    }

    const scrapedProduct = normalizeProduct({
      name: title.slice(0, 120),
      title,
      description,
      price: finalPrice,
      mrp,
      discount,
      image: cloudinaryImages[0],
      images: cloudinaryImages,
      cloudinary_images: cloudinaryImages,
      affiliate_url: earnKaroUrl,
      source_url: response.url || finalUrl,
      original_url: response.url || finalUrl,
      store: detected.store,
      store_priority: detected.priority,
      category: detected.category,
      tags: [detected.store.toLowerCase().replace(/\s+/g, "-"), "affiliate", "fashion"],
      trend_keyword: "earnkaro manual link",
      seo_title: title.slice(0, 60),
      meta_description: (description || title).slice(0, 160),
      broadcast_status: {
        pinterest: "rss"
      }
    });
    const seo = await enrichWithGemini(scrapedProduct);
    return normalizeProduct({
      ...scrapedProduct,
      description: seo.seo_description || scrapedProduct.description,
      seo_description: seo.seo_description,
      seo_title: seo.seo_title,
      meta_description: seo.meta_description
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
  const cloudinaryImages = toArray(input.cloudinary_images || existing.cloudinary_images);
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
    cloudinary_images: cloudinaryImages.length ? cloudinaryImages : (images.length ? images : (image ? [image] : [])),
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
    gemini: Boolean(process.env.GEMINI_API_KEY)
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
    const affiliateUrl = ensureHttpUrl(req.body.affiliate_url || req.body.url);
    try {
      new URL(affiliateUrl);
    } catch {
      return res.status(400).json({ error: "Please enter a valid link.", stage: "Resolving link" });
    }

    // Always resolve: short links, affiliate trackers, and any non-store URL
    const needsResolve = isEarnKaroUrl(affiliateUrl) || !detectStoreFromUrl(affiliateUrl);
    const finalUrl = needsResolve ? await resolveEarnKaroLink(affiliateUrl) : affiliateUrl;
    const detected = detectStoreFromUrl(finalUrl);
    if (!detected) {
      return res.status(400).json({ error: "Store not supported. Supported stores: Myntra, Amazon, Flipkart, Ajio.", stage: "Detecting store" });
    }
    if (await alreadyPublished(affiliateUrl, finalUrl)) {
      return res.status(409).json({ error: "Product already published.", stage: "Checking duplicate" });
    }

    const product = await scrapeAffiliateUrl(affiliateUrl, finalUrl);
    const data = await readProducts();
    const newProduct = {
      ...product,
      id: Date.now(),
      manual_trigger: true,
      media_provider: cloudinaryConfigured ? "cloudinary" : "source",
      pipeline_stages: [
        "Resolving link",
        "Detecting store",
        "Scraping product",
        "Uploading images",
        "Generating SEO",
        "Publishing",
        "Published"
      ]
    };
    data.push(newProduct);
    await writeProducts(data);
    await markPublished(newProduct);

    res.status(201).json({
      id: newProduct.id,
      post_id: newProduct.id,
      product: newProduct,
      stages: newProduct.pipeline_stages,
      url: `${process.env.WEBSITE_URL || ""}/product/${newProduct.slug}`,
      message: "Published"
    });
  } catch (err) {
    res.status(err.status || 500).json({
      error: err.message || "Manual affiliate publish failed",
      stage: err.stage || "Scraping product"
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

// Global error handler for uncaught JSON/parsing errors
app.use((err, req, res, _next) => {
  console.error(err.stack);
  res.status(500).send({ error: 'Something broke!' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running in production mode on port ${PORT}`);
});
