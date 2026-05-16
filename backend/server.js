const express = require("express");
const fs = require("fs");
const cors = require("cors");
const crypto = require("crypto");

const app = express();

app.use(cors());
app.use(express.json());

const FILE = "products.json";
if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, "[]");

// ── Auth ───────────────────────────────────────────────────────────────────
const ADMIN_USER = process.env.ADMIN_USER || "Akash";
const ADMIN_PASS = process.env.ADMIN_PASS || "redhot2026";
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
    // expire token after 8 hours
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

// ── Products (public read, protected write) ────────────────────────────────
app.get("/products", (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(FILE));
    res.json(data);
  } catch {
    res.json([]);
  }
});

app.post("/products", requireAuth, (req, res) => {
  const data = JSON.parse(fs.readFileSync(FILE));
  const newProduct = { id: Date.now(), ...req.body };
  data.push(newProduct);
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
  res.json(newProduct);
});

app.put("/products/:id", requireAuth, (req, res) => {
  const data = JSON.parse(fs.readFileSync(FILE));
  const newData = data.map(p =>
    p.id === Number(req.params.id) ? { ...p, ...req.body } : p
  );
  fs.writeFileSync(FILE, JSON.stringify(newData, null, 2));
  res.json({ success: true });
});

app.delete("/products/:id", requireAuth, (req, res) => {
  const data = JSON.parse(fs.readFileSync(FILE));
  const newData = data.filter(p => p.id !== Number(req.params.id));
  fs.writeFileSync(FILE, JSON.stringify(newData, null, 2));
  res.json({ success: true });
});

// bulk delete
app.post("/products/bulk-delete", requireAuth, (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids)) return res.status(400).json({ error: "ids must be array" });
  const data = JSON.parse(fs.readFileSync(FILE));
  const newData = data.filter(p => !ids.includes(p.id));
  fs.writeFileSync(FILE, JSON.stringify(newData, null, 2));
  res.json({ success: true, deleted: ids.length });
});

// ── Affiliate link masking ─────────────────────────────────────────────────
app.get("/go/:id", (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(FILE));
    const product = data.find(p => p.id === Number(req.params.id));
    if (!product || !product.affiliate_link || product.affiliate_link === "#") {
      return res.status(404).json({ error: "Link not found" });
    }
    res.redirect(product.affiliate_link);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

app.listen(process.env.PORT || 3001, () => {
  console.log("Server running on port", process.env.PORT || 3001);
});