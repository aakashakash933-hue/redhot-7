const express = require("express");
const fs = require("fs");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const FILE = "products.json";

if (!fs.existsSync(FILE)) {
  fs.writeFileSync(FILE, "[]");
}

app.get("/products", (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(FILE));
    res.json(data);
  } catch (err) {
    res.json([]);
  }
});

app.post("/products", (req, res) => {
  const data = JSON.parse(fs.readFileSync(FILE));
  const newProduct = { id: Date.now(), ...req.body };
  data.push(newProduct);
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
  res.json(newProduct);
});

app.delete("/products/:id", (req, res) => {
  const data = JSON.parse(fs.readFileSync(FILE));
  const newData = data.filter(p => p.id !== Number(req.params.id));
  fs.writeFileSync(FILE, JSON.stringify(newData, null, 2));
  res.json({ success: true });
});

app.put("/products/:id", (req, res) => {
  const data = JSON.parse(fs.readFileSync(FILE));
  const newData = data.map(p =>
    p.id === Number(req.params.id) ? { ...p, ...req.body } : p
  );
  fs.writeFileSync(FILE, JSON.stringify(newData, null, 2));
  res.json({ success: true });
});

app.listen(process.env.PORT || 3001, () => {
  console.log("Server running on port", process.env.PORT || 3001);
});