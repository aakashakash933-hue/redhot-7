const express = require("express");
const fs = require("fs");
const fsp = require("fs").promises;
const cors = require("cors");
const crypto = require("crypto");
const path = require("path");

const app = express();

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

// ── Auth ───────────────────────────────────────────────────────────────────
const ADMIN_USER = process.env.ADMIN_USER || "Akash";
const ADMIN_PASS = process.env.ADMIN_PASS || "redhot2026";
// Use a persistent secret if defined, otherwise generate a secure random one
const TOKEN_SECRET = process.env.TOKEN_SECRET || crypto.randomBytes(32).toString("hex");

const tokens = new Set();

function requireAuth(req, res, next) {
  const auth = req.headers["authorization"] || "";
  const token = auth.replace("Bearer ", "").trim();
  if (!token || !tokens.has(token)) {
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
    const newProduct = { id: Date.now(), ...req.body };
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
      p.id === Number(req.params.id) ? { ...p, ...req.body } : p
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
    if (!product || !product.affiliate_link || product.affiliate_link === "#") {
      return res.status(404).json({ error: "Link not found" });
    }
    res.redirect(product.affiliate_link);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Global error handler for uncaught JSON/parsing errors
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send({ error: 'Something broke!' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running in production mode on port ${PORT}`);
});