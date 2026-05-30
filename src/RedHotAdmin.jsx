import { useState, useEffect } from "react";
import axios from "axios";

const API = "https://redhot-7.onrender.com";

function authHeader(token) {
  return { Authorization: `Bearer ${token}` };
}

function useProducts() {
  const [products, setProducts] = useState([]);

  const fetchProducts = () => {
    axios.get(`${API}/products`)
      .then(res => setProducts(res.data))
      .catch(err => console.error("API Error:", err));
  };

  useEffect(() => { fetchProducts(); }, []);

  return { products, refresh: fetchProducts };
}

const CATEGORIES = ["Women Fashion", "Ethnic Wear", "Men Fashion", "Topwear", "Bottomwear", "Accessories", "Footwear", "Beauty Fashion"];
const STORES = ["Myntra", "Amazon India", "Flipkart", "Ajio", "Manual"];
const PRIMARY_STORES = new Set(["Myntra", "Ajio"]);
const emptyForm = {
  name: "",
  price: "",
  mrp: "",
  discount: "",
  category: "",
  badge: "",
  image: "",
  affiliate_url: "",
  affiliate_link: "",
  source_url: "",
  description: "",
  store: "Myntra",
  rating: "",
  review_count: "",
  trend_keyword: "",
  tags: "",
  seo_title: "",
  meta_description: "",
  commission_rate: "",
  estimated_commission: "",
  commission_score: "",
  lowest_price: "",
};

function tagsToText(tags) {
  return Array.isArray(tags) ? tags.join(", ") : (tags || "");
}

function textToTags(value) {
  return String(value || "").split(",").map(tag => tag.trim()).filter(Boolean).slice(0, 10);
}

function productPayload(form) {
  const price = Number(form.price) || 0;
  const mrp = Number(form.mrp) || 0;
  const discount = Number(form.discount) || (mrp > price && price > 0 ? Math.round(((mrp - price) / mrp) * 100) : 0);
  const commissionRate = Number(form.commission_rate) || 0;
  return {
    name: form.name.trim(),
    title: form.name.trim(),
    price,
    mrp,
    discount,
    category: form.category,
    badge: form.badge,
    image: form.image.trim(),
    images: form.image.trim() ? [form.image.trim()] : [],
    affiliate_url: form.affiliate_url.trim(),
    affiliate_link: form.affiliate_url.trim() || form.affiliate_link.trim() || "#",
    source_url: form.source_url.trim(),
    description: form.description.trim(),
    store: form.store,
    store_priority: PRIMARY_STORES.has(form.store) ? "PRIMARY" : "SECONDARY",
    rating: Number(form.rating) || 0,
    review_count: Number(form.review_count) || 0,
    trend_keyword: form.trend_keyword.trim(),
    tags: textToTags(form.tags),
    seo_title: form.seo_title.trim() || form.name.trim().slice(0, 60),
    meta_description: form.meta_description.trim() || form.description.trim().slice(0, 160),
    affiliate_disclosure: "This post contains affiliate links.",
    commission_rate: commissionRate,
    estimated_commission: Number(form.estimated_commission) || (commissionRate > 0 && price > 0 ? Math.round((price * commissionRate) / 100) : 0),
    commission_score: Number(form.commission_score) || 0,
    lowest_price: Number(form.lowest_price) || price,
  };
}

export default function RedHotAdmin({ onNavigateStore }) {
  const [token, setToken]       = useState(() => sessionStorage.getItem("rh_token") || "");
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const { products, refresh } = useProducts();
  const [search, setSearch]   = useState("");
  const [form, setForm]       = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [editId, setEditId]   = useState(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState(null);
  const [toast, setToast]     = useState("");
  const [selected, setSelected] = useState(new Set());
  const [bulkConfirm, setBulkConfirm] = useState(false);
  const [manualUrl, setManualUrl] = useState("");
  const [manualStage, setManualStage] = useState("");
  const [manualError, setManualError] = useState("");
  const [manualLoading, setManualLoading] = useState(false);

  const loggedIn = !!token;

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2800); };

  const stats = {
    total: products.length,
    categories: new Set(products.map(p => p.category)).size,
    hot: products.filter(p => p.badge === "HOT").length,
    avgPrice: products.length ? Math.round(products.reduce((a, p) => a + p.price, 0) / products.length) : 0,
    primaryShare: products.length ? Math.round((products.filter(p => p.store_priority === "PRIMARY" || PRIMARY_STORES.has(p.store)).length / products.length) * 100) : 0,
    highRated: products.filter(p => Number(p.rating) >= 4).length,
    affiliateReady: products.filter(p => p.affiliate_link && p.affiliate_link !== "#").length,
    directAffiliate: products.filter(p => p.affiliate_url).length,
    cloudinaryImages: products.filter(p => Array.isArray(p.cloudinary_images) && p.cloudinary_images.length > 0).length,
    trendKeywords: [...new Set(products.map(p => p.trend_keyword).filter(Boolean))].slice(0, 8),
    storeBreakdown: products.reduce((acc, product) => {
      const store = product.store || "Manual";
      acc[store] = (acc[store] || 0) + 1;
      return acc;
    }, {}),
  };

  const filtered = products.filter(p =>
    (p.name || "").toLowerCase().includes(search.toLowerCase()) ||
    (p.category || "").toLowerCase().includes(search.toLowerCase()) ||
    (p.store || "").toLowerCase().includes(search.toLowerCase()) ||
    (p.trend_keyword || "").toLowerCase().includes(search.toLowerCase()) ||
    tagsToText(p.tags).toLowerCase().includes(search.toLowerCase())
  );

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    try {
      const res = await axios.post(`${API}/api/login`, loginForm);
      const t = res.data.token;
      sessionStorage.setItem("rh_token", t);
      setToken(t);
      setLoginError("");
    } catch {
      setLoginError("Invalid credentials.");
      setLoginForm(f => ({ ...f, password: "" }));
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    try { await axios.post(`${API}/api/logout`, {}, { headers: authHeader(token) }); } catch {
      // Session cleanup still happens locally if the remote logout call fails.
    }
    sessionStorage.removeItem("rh_token");
    setToken("");
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.name || !form.price || !form.category || !form.image) {
      setFormError("Name, price, category and image are required."); return;
    }
    try {
      await axios.post(`${API}/api/products`, productPayload(form), { headers: authHeader(token) });
      refresh();
      setForm(emptyForm);
      setFormError("");
      showToast("✓ Product added — visible on store now!");
    } catch (err) {
      if (err.response?.status === 401) { handleLogout(); }
      setFormError("Failed to add product.");
    }
  };

  const openEdit = (product) => {
    setEditId(product.id);
    setEditForm({
      ...emptyForm,
      ...product,
      price: String(product.price || ""),
      mrp: String(product.mrp || ""),
      discount: String(product.discount || ""),
      rating: String(product.rating || ""),
      review_count: String(product.review_count || ""),
      affiliate_url: product.affiliate_url || "",
      commission_rate: String(product.commission_rate || ""),
      estimated_commission: String(product.estimated_commission || ""),
      commission_score: String(product.commission_score || ""),
      lowest_price: String(product.lowest_price || ""),
      description: product.description || "",
      tags: tagsToText(product.tags),
      store: product.store || "Manual",
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API}/products/${editId}`, productPayload(editForm), { headers: authHeader(token) });
      refresh();
      setEditId(null);
      showToast("✓ Product updated");
    } catch (err) {
      if (err.response?.status === 401) handleLogout();
    }
  };

  const confirmDelete = async () => {
    try {
      await axios.delete(`${API}/products/${deleteId}`, { headers: authHeader(token) });
      refresh();
      setDeleteId(null);
      showToast("🗑 Product deleted");
    } catch (err) {
      if (err.response?.status === 401) handleLogout();
    }
  };

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(p => p.id)));
    }
  };

  const handleBulkDelete = async () => {
    try {
      await axios.post(`${API}/products/bulk-delete`, { ids: [...selected] }, { headers: authHeader(token) });
      refresh();
      setSelected(new Set());
      setBulkConfirm(false);
      showToast(`🗑 ${selected.size} products deleted`);
    } catch (err) {
      if (err.response?.status === 401) handleLogout();
    }
  };

  const runManualPublish = async (e) => {
    e.preventDefault();
    if (!manualUrl.trim()) {
      setManualError("Paste an EarnKaro or supported product link first.");
      return;
    }

    const stages = [
      "Resolving link...",
      "Detecting store...",
      "Scraping product...",
      "Uploading images...",
      "Generating SEO...",
      "Publishing...",
    ];
    setManualLoading(true);
    setManualError("");

    let stageIndex = 0;
    setManualStage(stages[0]);
    const timer = setInterval(() => {
      stageIndex = Math.min(stageIndex + 1, stages.length - 1);
      setManualStage(stages[stageIndex]);
    }, 700);

    try {
      await axios.post(`${API}/api/manual-affiliate`, { affiliate_url: manualUrl.trim() }, { headers: authHeader(token) });
      clearInterval(timer);
      setManualStage("Published!");
      setManualUrl("");
      refresh();
      showToast("✓ EarnKaro product published");
    } catch (err) {
      clearInterval(timer);
      if (err.response?.status === 401) handleLogout();
      setManualStage(err.response?.data?.stage ? `${err.response.data.stage} failed` : "Failed");
      setManualError(err.response?.data?.error || "Manual affiliate publish failed.");
    } finally {
      setManualLoading(false);
    }
  };

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=Jost:wght@300;400;500;600&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root { --red:#c0392b; --red2:#e74c3c; --bg:#0a0a0a; --bg2:#111; --border:#222; --text:#f5e6d3; --muted:#555; --muted2:#888; }
    body { font-family:'Jost',sans-serif; background:var(--bg); color:var(--text); }
    ::-webkit-scrollbar { width:4px; } ::-webkit-scrollbar-thumb { background:var(--red); }
    .rha-inp { width:100%; background:#0d0d0d; border:1px solid var(--border); color:var(--text); padding:10px 14px; border-radius:4px; font-size:13px; font-family:'Jost',sans-serif; outline:none; transition:border-color .2s; }
    .rha-inp:focus { border-color:var(--red); }
    .rha-btn-p { background:linear-gradient(135deg,var(--red),var(--red2)); border:none; color:#fff; padding:11px 26px; font-family:'Jost',sans-serif; font-size:12px; letter-spacing:.15em; font-weight:600; cursor:pointer; border-radius:3px; transition:all .2s; }
    .rha-btn-p:hover { transform:translateY(-1px); box-shadow:0 6px 20px rgba(192,57,43,.3); }
    .rha-btn-g { background:transparent; border:1px solid var(--border); color:var(--muted); padding:11px 22px; font-family:'Jost',sans-serif; font-size:12px; letter-spacing:.12em; cursor:pointer; border-radius:3px; transition:all .2s; }
    .rha-btn-g:hover { border-color:var(--muted2); color:var(--text); }
    .rha-btn-del { background:transparent; border:1px solid #2a1a1a; color:#7a3030; font-size:11px; letter-spacing:.1em; padding:6px 14px; border-radius:3px; cursor:pointer; transition:all .2s; font-family:'Jost',sans-serif; }
    .rha-btn-del:hover { background:#1a0a0a; border-color:var(--red); color:var(--red); }
    .rha-btn-edit { background:transparent; border:1px solid var(--border); color:var(--muted); font-size:11px; letter-spacing:.1em; padding:6px 14px; border-radius:3px; cursor:pointer; transition:all .2s; font-family:'Jost',sans-serif; margin-right:6px; }
    .rha-btn-edit:hover { border-color:var(--muted2); color:var(--text); }
    .rha-btn-store { background:transparent; border:1px solid #2a2a1a; color:#7a7a30; font-size:11px; letter-spacing:.12em; padding:7px 16px; border-radius:3px; cursor:pointer; transition:all .2s; font-family:'Jost',sans-serif; }
    .rha-btn-store:hover { border-color:#c8a01e; color:#c8a01e; background:#1a1a0a; }
    .rha-card { background:var(--bg2); border:1px solid var(--border); border-radius:8px; }
    .rha-row { display:grid; grid-template-columns:32px 56px 1.2fr 110px 110px 92px 86px 90px 140px; gap:12px; padding:14px 20px; border-bottom:1px solid #161616; align-items:center; transition:background .15s; }
    .rha-row:hover { background:#131313; }
    .rha-row.selected { background:#1a0e0e; }
    .rha-head { display:grid; grid-template-columns:32px 56px 1.2fr 110px 110px 92px 86px 90px 140px; gap:12px; padding:12px 20px; background:#0d0d0d; border-bottom:1px solid var(--border); }
    .rha-overlay { position:fixed; inset:0; background:rgba(0,0,0,.8); z-index:200; display:flex; align-items:center; justify-content:center; }
    .rha-modal { background:var(--bg2); border:1px solid var(--border); border-radius:8px; padding:36px; width:540px; max-width:95vw; position:relative; max-height:90vh; overflow-y:auto; }
    .rha-modal::before { content:''; position:absolute; top:0; left:0; right:0; height:2px; background:linear-gradient(90deg,var(--red),var(--red2)); border-radius:8px 8px 0 0; }
    .rha-toast { position:fixed; bottom:28px; right:28px; background:var(--bg2); border:1px solid var(--border); border-left:3px solid var(--red); padding:14px 22px; border-radius:4px; font-size:13px; z-index:999; animation:slideUp .3s ease; }
    .rha-checkbox { width:16px; height:16px; accent-color:var(--red); cursor:pointer; }
    .rha-img-preview { width:100%; height:140px; object-fit:cover; border-radius:4px; margin-top:8px; background:#1a1a1a; border:1px solid var(--border); display:block; }
    @keyframes slideUp { from{opacity:0;transform:translateY(10px);} to{opacity:1;transform:translateY(0);} }
    .rha-chip { display:inline-block; font-size:9px; letter-spacing:.12em; padding:2px 7px; border-radius:2px; border:1px solid #2a2a2a; color:#888; text-transform:uppercase; margin:2px 4px 0 0; }
    .rha-primary { border-color:#2e4b36; color:#62b376; background:#0b160e; }
    .rha-secondary { border-color:#4b3f2e; color:#c8a01e; background:#171306; }
    @media(max-width:1000px) { .rha-row,.rha-head { grid-template-columns:32px 48px 1fr 100px 90px; } .rha-row>*:nth-child(n+6),.rha-head>*:nth-child(n+6){display:none;} }
  `;

  if (!loggedIn) return (
    <div style={{ minHeight:"100vh", background:"#0a0a0a", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <style>{css}</style>
      <div style={{ background:"#111", border:"1px solid #222", borderRadius:8, padding:"50px 44px", width:400, maxWidth:"95vw", position:"relative" }}>
        <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background:"linear-gradient(90deg,#c0392b,#e74c3c)", borderRadius:"8px 8px 0 0" }} />
        <div style={{ fontFamily:"'Playfair Display'", fontSize:28, fontWeight:900, color:"#c0392b", textAlign:"center", marginBottom:6 }}>redhot 🔥</div>
        <div style={{ fontSize:11, letterSpacing:"0.25em", color:"#555", textAlign:"center", marginBottom:36 }}>ADMIN PORTAL</div>
        <form onSubmit={handleLogin}>
          <div style={{ fontSize:10, letterSpacing:"0.2em", color:"#555", marginBottom:8 }}>USERNAME</div>
          <input className="rha-inp" style={{ marginBottom:20 }} value={loginForm.username} onChange={e => setLoginForm(f => ({ ...f, username: e.target.value }))} placeholder="admin" autoComplete="off" />
          <div style={{ fontSize:10, letterSpacing:"0.2em", color:"#555", marginBottom:8 }}>PASSWORD</div>
          <input className="rha-inp" style={{ marginBottom:24 }} type="password" value={loginForm.password} onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" />
          <button className="rha-btn-p" type="submit" style={{ width:"100%", padding:14 }} disabled={loginLoading}>
            {loginLoading ? "SIGNING IN…" : "SIGN IN →"}
          </button>
        </form>
        {loginError && <p style={{ fontSize:12, color:"#c0392b", textAlign:"center", marginTop:14 }}>{loginError}</p>}
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:"#0a0a0a", color:"#f5e6d3" }}>
      <style>{css}</style>

      <nav style={{ position:"sticky", top:0, zIndex:50, background:"rgba(10,10,10,0.96)", backdropFilter:"blur(12px)", borderBottom:"1px solid #222", height:60, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 32px" }}>
        <div>
          <span style={{ fontFamily:"'Playfair Display'", fontSize:20, fontWeight:900, color:"#c0392b" }}>redhot</span>
          <span style={{ fontSize:9, letterSpacing:"0.2em", background:"#c0392b", color:"#fff", padding:"2px 8px", borderRadius:2, marginLeft:10, verticalAlign:"middle" }}>ADMIN</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          {onNavigateStore && <button className="rha-btn-store" onClick={onNavigateStore}>← STORE</button>}
          <span style={{ fontSize:11, letterSpacing:"0.15em", color:"#555" }}>Logged in as {loginForm.username || "admin"}</span>
          <button className="rha-btn-g" style={{ padding:"7px 16px", fontSize:11 }} onClick={handleLogout}>LOGOUT</button>
        </div>
      </nav>

      <div style={{ maxWidth:1400, margin:"0 auto", padding:"36px 32px" }}>

        {/* STATS */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))", gap:16, marginBottom:40 }}>
          {[
            { label:"TOTAL PRODUCTS", value:stats.total },
            { label:"HIGH RATED ITEMS", value:stats.highRated },
            { label:"EARNKARO LINKS", value:stats.directAffiliate },
            { label:"CLOUDINARY ITEMS", value:stats.cloudinaryImages },
            { label:"AVG PRICE", value:`₹${stats.avgPrice.toLocaleString()}` },
          ].map(s => (
            <div key={s.label} className="rha-card" style={{ padding:"24px 22px", position:"relative", overflow:"hidden" }}>
              <div style={{ position:"absolute", bottom:0, left:0, right:0, height:2, background:"linear-gradient(90deg,#c0392b,transparent)" }} />
              <div style={{ fontFamily:"'Playfair Display'", fontSize:32, fontWeight:700 }}>{s.value}</div>
              <div style={{ fontSize:10, letterSpacing:"0.2em", color:"#555", marginTop:4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* PIPELINE READINESS */}
        <div style={{ display:"grid", gridTemplateColumns:"minmax(0,1.2fr) minmax(260px,.8fr)", gap:16, marginBottom:36 }}>
          <div className="rha-card" style={{ padding:24 }}>
            <div style={{ fontSize:12, letterSpacing:"0.2em", color:"#c0392b", marginBottom:16, fontWeight:600 }}>AFFILIATEAGENT V3 READINESS</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:12 }}>
              {[
                { label:"EarnKaro link", value:"affiliate_url is the Shop Now link", ok:true },
                { label:"Product publish API", value:"/api/products", ok:true },
                { label:"Supported stores", value:"Myntra, Amazon, Flipkart, Ajio", ok:true },
                { label:"Cloudinary", value:"images upload to CDN", ok:true },
                { label:"Gemini fallback", value:"SEO falls back to scraped copy", ok:true },
              ].map(item => (
                <div key={item.label} style={{ border:"1px solid #1f1f1f", borderRadius:6, padding:14, background:"#0d0d0d" }}>
                  <div style={{ fontSize:10, letterSpacing:"0.16em", color:item.ok ? "#62b376" : "#c8a01e", marginBottom:6 }}>{item.ok ? "READY" : "CHECK"}</div>
                  <div style={{ fontSize:13, color:"#f5e6d3" }}>{item.label}</div>
                  <div style={{ fontSize:11, color:"#666", marginTop:4 }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="rha-card" style={{ padding:24 }}>
            <div style={{ fontSize:12, letterSpacing:"0.2em", color:"#c0392b", marginBottom:14, fontWeight:600 }}>STORE MIX</div>
            {Object.entries(stats.storeBreakdown).length === 0 ? (
              <div style={{ fontSize:12, color:"#555" }}>No products published yet.</div>
            ) : Object.entries(stats.storeBreakdown).map(([store, count]) => (
              <div key={store} style={{ display:"flex", justifyContent:"space-between", borderBottom:"1px solid #171717", padding:"8px 0", fontSize:12 }}>
                <span>{store}</span>
                <span style={{ color:"#c0392b" }}>{count}</span>
              </div>
            ))}
            {stats.trendKeywords.length > 0 && (
              <div style={{ marginTop:14 }}>
                {stats.trendKeywords.map(keyword => <span className="rha-chip" key={keyword}>{keyword}</span>)}
              </div>
            )}
          </div>
        </div>

        {/* MANUAL AFFILIATE TRIGGER */}
        <div className="rha-card" style={{ padding:28, marginBottom:36, position:"relative", overflow:"hidden" }}>
          <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:"linear-gradient(90deg,#62b376,#c0392b,transparent)" }} />
          <div style={{ fontSize:12, letterSpacing:"0.2em", color:"#62b376", marginBottom:10, fontWeight:600 }}>EARNKARO LINK PUBLISH</div>
          <div style={{ fontSize:12, color:"#777", marginBottom:18 }}>
            Paste one EarnKaro link. The system resolves the final store URL, scrapes product data, uploads images to Cloudinary, generates SEO, and publishes it.
          </div>
          <form onSubmit={runManualPublish}>
            <div style={{ display:"grid", gridTemplateColumns:"minmax(0,1fr) auto", gap:12, alignItems:"start" }}>
              <input className="rha-inp" placeholder="EarnKaro link or Myntra/Amazon/Flipkart/Ajio product URL" value={manualUrl} onChange={e => setManualUrl(e.target.value)} disabled={manualLoading} />
              <button className="rha-btn-p" type="submit" disabled={manualLoading}>{manualLoading ? "RUNNING" : "PUBLISH"}</button>
            </div>
          </form>
          {(manualStage || manualError) && (
            <div style={{ marginTop:14, border:"1px solid #1f1f1f", borderRadius:6, padding:14, background:"#0d0d0d" }}>
              <div style={{ fontSize:10, letterSpacing:"0.16em", color:manualError ? "#c0392b" : "#62b376", marginBottom:6 }}>
                {manualError ? "ERROR" : "STATUS"}
              </div>
              <div style={{ fontSize:13 }}>{manualStage}</div>
              {manualError && <div style={{ fontSize:12, color:"#c0392b", marginTop:6 }}>{manualError}</div>}
            </div>
          )}
        </div>

        {/* ADD FORM */}
        <div className="rha-card" style={{ padding:28, marginBottom:36, position:"relative", overflow:"hidden" }}>
          <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:"linear-gradient(90deg,#c0392b,#e74c3c,transparent)" }} />
          <div style={{ fontSize:12, letterSpacing:"0.2em", color:"#c0392b", marginBottom:22, fontWeight:600 }}>+ ADD NEW PRODUCT</div>
          <form onSubmit={handleAdd}>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:16, marginBottom:16 }}>
              <div>
                <div style={{ fontSize:10, letterSpacing:"0.18em", color:"#555", marginBottom:6 }}>PRODUCT NAME *</div>
                <input className="rha-inp" placeholder="e.g. Flame Hoodie" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <div style={{ fontSize:10, letterSpacing:"0.18em", color:"#555", marginBottom:6 }}>PRICE (₹) *</div>
                <input className="rha-inp" type="number" placeholder="4999" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} />
              </div>
              <div>
                <div style={{ fontSize:10, letterSpacing:"0.18em", color:"#555", marginBottom:6 }}>MRP (₹)</div>
                <input className="rha-inp" type="number" placeholder="7999" value={form.mrp} onChange={e => setForm(p => ({ ...p, mrp: e.target.value }))} />
              </div>
              <div>
                <div style={{ fontSize:10, letterSpacing:"0.18em", color:"#555", marginBottom:6 }}>DISCOUNT %</div>
                <input className="rha-inp" type="number" placeholder="Auto" value={form.discount} onChange={e => setForm(p => ({ ...p, discount: e.target.value }))} />
              </div>
              <div>
                <div style={{ fontSize:10, letterSpacing:"0.18em", color:"#555", marginBottom:6 }}>CATEGORY *</div>
                <select className="rha-inp" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                  <option value="">Select…</option>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize:10, letterSpacing:"0.18em", color:"#555", marginBottom:6 }}>STORE</div>
                <select className="rha-inp" value={form.store} onChange={e => setForm(p => ({ ...p, store: e.target.value }))}>
                  {STORES.map(store => <option key={store}>{store}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize:10, letterSpacing:"0.18em", color:"#555", marginBottom:6 }}>BADGE</div>
                <select className="rha-inp" value={form.badge} onChange={e => setForm(p => ({ ...p, badge: e.target.value }))}>
                  <option value="">None</option>
                  <option value="HOT">HOT 🔥</option>
                  <option value="NEW">NEW</option>
                </select>
              </div>
              <div>
                <div style={{ fontSize:10, letterSpacing:"0.18em", color:"#555", marginBottom:6 }}>RATING</div>
                <input className="rha-inp" type="number" step="0.1" min="0" max="5" placeholder="4.3" value={form.rating} onChange={e => setForm(p => ({ ...p, rating: e.target.value }))} />
              </div>
              <div>
                <div style={{ fontSize:10, letterSpacing:"0.18em", color:"#555", marginBottom:6 }}>REVIEWS</div>
                <input className="rha-inp" type="number" placeholder="1280" value={form.review_count} onChange={e => setForm(p => ({ ...p, review_count: e.target.value }))} />
              </div>
              <div>
                <div style={{ fontSize:10, letterSpacing:"0.18em", color:"#555", marginBottom:6 }}>COMMISSION %</div>
                <input className="rha-inp" type="number" step="0.1" placeholder="8" value={form.commission_rate} onChange={e => setForm(p => ({ ...p, commission_rate: e.target.value }))} />
              </div>
              <div>
                <div style={{ fontSize:10, letterSpacing:"0.18em", color:"#555", marginBottom:6 }}>COMMISSION SCORE</div>
                <input className="rha-inp" type="number" min="0" max="100" placeholder="0-100" value={form.commission_score} onChange={e => setForm(p => ({ ...p, commission_score: e.target.value }))} />
              </div>
              <div style={{ gridColumn:"span 2" }}>
                <div style={{ fontSize:10, letterSpacing:"0.18em", color:"#555", marginBottom:6 }}>IMAGE URL *</div>
                <input className="rha-inp" placeholder="https://images.unsplash.com/…" value={form.image} onChange={e => setForm(p => ({ ...p, image: e.target.value }))} />
                {form.image && <img src={form.image} alt="preview" className="rha-img-preview" onError={e => e.target.style.display="none"} onLoad={e => e.target.style.display="block"} />}
              </div>
              <div style={{ gridColumn:"span 2" }}>
                <div style={{ fontSize:10, letterSpacing:"0.18em", color:"#555", marginBottom:6 }}>DESCRIPTION</div>
                <textarea className="rha-inp" rows={2} placeholder="Short product description…" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} style={{ resize:"vertical" }} />
              </div>
              <div style={{ gridColumn:"span 2" }}>
                <div style={{ fontSize:10, letterSpacing:"0.18em", color:"#555", marginBottom:6 }}>DIRECT AFFILIATE URL</div>
                <input className="rha-inp" placeholder="Pre-converted affiliate URL" value={form.affiliate_url} onChange={e => setForm(p => ({ ...p, affiliate_url: e.target.value }))} />
              </div>
              <div style={{ gridColumn:"span 2" }}>
                <div style={{ fontSize:10, letterSpacing:"0.18em", color:"#555", marginBottom:6 }}>FALLBACK AFFILIATE LINK</div>
                <input className="rha-inp" placeholder="Optional legacy link" value={form.affiliate_link} onChange={e => setForm(p => ({ ...p, affiliate_link: e.target.value }))} />
              </div>
              <div style={{ gridColumn:"span 2" }}>
                <div style={{ fontSize:10, letterSpacing:"0.18em", color:"#555", marginBottom:6 }}>ORIGINAL PRODUCT URL</div>
                <input className="rha-inp" placeholder="https://www.myntra.com/…" value={form.source_url} onChange={e => setForm(p => ({ ...p, source_url: e.target.value }))} />
              </div>
              <div>
                <div style={{ fontSize:10, letterSpacing:"0.18em", color:"#555", marginBottom:6 }}>TREND KEYWORD</div>
                <input className="rha-inp" placeholder="instagram kurti" value={form.trend_keyword} onChange={e => setForm(p => ({ ...p, trend_keyword: e.target.value }))} />
              </div>
              <div>
                <div style={{ fontSize:10, letterSpacing:"0.18em", color:"#555", marginBottom:6 }}>TAGS</div>
                <input className="rha-inp" placeholder="viral, ethnic, reels" value={form.tags} onChange={e => setForm(p => ({ ...p, tags: e.target.value }))} />
              </div>
              <div style={{ gridColumn:"span 2" }}>
                <div style={{ fontSize:10, letterSpacing:"0.18em", color:"#555", marginBottom:6 }}>SEO TITLE</div>
                <input className="rha-inp" maxLength={60} placeholder="Max 60 characters" value={form.seo_title} onChange={e => setForm(p => ({ ...p, seo_title: e.target.value }))} />
              </div>
              <div style={{ gridColumn:"span 2" }}>
                <div style={{ fontSize:10, letterSpacing:"0.18em", color:"#555", marginBottom:6 }}>META DESCRIPTION</div>
                <textarea className="rha-inp" rows={2} maxLength={160} placeholder="Max 160 characters" value={form.meta_description} onChange={e => setForm(p => ({ ...p, meta_description: e.target.value }))} style={{ resize:"vertical" }} />
              </div>
            </div>
            {formError && <p style={{ fontSize:12, color:"#c0392b", marginBottom:12 }}>{formError}</p>}
            <div style={{ display:"flex", gap:12 }}>
              <button className="rha-btn-p" type="submit">ADD PRODUCT</button>
              <button className="rha-btn-g" type="button" onClick={() => { setForm(emptyForm); setFormError(""); }}>CLEAR</button>
            </div>
          </form>
        </div>

        {/* TABLE HEADER */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20, flexWrap:"wrap", gap:12 }}>
          <div>
            <div style={{ fontFamily:"'Playfair Display'", fontSize:24, fontWeight:700 }}>Products</div>
            <div style={{ fontSize:11, letterSpacing:"0.15em", color:"#444", marginTop:4 }}>{filtered.length} OF {products.length} PRODUCTS</div>
          </div>
          <div style={{ display:"flex", gap:12, alignItems:"center", flexWrap:"wrap" }}>
            {selected.size > 0 && (
              <button className="rha-btn-del" onClick={() => setBulkConfirm(true)} style={{ padding:"9px 18px" }}>
                DELETE {selected.size} SELECTED
              </button>
            )}
            <input className="rha-inp" style={{ width:260 }} placeholder="🔍 Search products…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        <div className="rha-card" style={{ overflow:"hidden" }}>
          <div className="rha-head">
            <div>
              <input type="checkbox" className="rha-checkbox"
                checked={selected.size === filtered.length && filtered.length > 0}
                onChange={toggleSelectAll} />
            </div>
            {["IMG","PRODUCT","STORE","CATEGORY","PRICE","RATING","LINK","ACTIONS"].map(h => (
              <div key={h} style={{ fontSize:9, letterSpacing:"0.2em", color:"#555", fontWeight:600 }}>{h}</div>
            ))}
          </div>
          <div style={{ maxHeight:500, overflowY:"auto" }}>
            {filtered.length === 0 ? (
              <div style={{ textAlign:"center", padding:60, color:"#444" }}>
                <div style={{ fontSize:36, marginBottom:12 }}>🔥</div>
                <div style={{ fontSize:12, letterSpacing:"0.15em" }}>NO PRODUCTS FOUND</div>
              </div>
            ) : filtered.map(p => (
              <div className={`rha-row${selected.has(p.id) ? " selected" : ""}`} key={p.id}>
                <input type="checkbox" className="rha-checkbox" checked={selected.has(p.id)} onChange={() => toggleSelect(p.id)} />
                <img src={p.image} alt={p.name} style={{ width:44, height:44, objectFit:"cover", borderRadius:4, background:"#1a1a1a" }} />
                <div>
                  <div style={{ fontFamily:"'Playfair Display'", fontSize:14, fontWeight:700 }}>{p.name}</div>
                  <div style={{ fontSize:10, letterSpacing:"0.12em", color:"#555", marginTop:2 }}>{p.trend_keyword || (p.description ? p.description.slice(0,50)+"…" : p.category)}</div>
                </div>
                <div>
                  <div style={{ fontSize:12, color:"#888" }}>{p.store || "Manual"}</div>
                  <span className={`rha-chip ${(p.store_priority === "PRIMARY" || PRIMARY_STORES.has(p.store)) ? "rha-primary" : "rha-secondary"}`}>
                    {(p.store_priority === "PRIMARY" || PRIMARY_STORES.has(p.store)) ? "Primary" : "Secondary"}
                  </span>
                </div>
                <div style={{ fontSize:12, color:"#555" }}>{p.category}</div>
                <div>
                  <div style={{ fontSize:14, fontWeight:500, color:"#c0392b" }}>₹{(p.price || 0).toLocaleString()}</div>
                  {!!p.mrp && <div style={{ fontSize:10, color:"#555", textDecoration:"line-through" }}>₹{p.mrp.toLocaleString()}</div>}
                  {!!p.discount && <div style={{ fontSize:10, color:"#c8a01e" }}>{p.discount}% off</div>}
                </div>
                <div>
                  {Number(p.rating) > 0
                    ? <span style={{ color:Number(p.rating) >= 4 ? "#62b376" : "#c8a01e", fontSize:12 }}>{Number(p.rating).toFixed(1)} ★</span>
                    : <span style={{ color:"#444", fontSize:12 }}>—</span>}
                  {!!p.review_count && <div style={{ fontSize:10, color:"#555" }}>{p.review_count} reviews</div>}
                </div>
                <div style={{ fontSize:11, color:"#555" }}>{p.affiliate_url ? "DIRECT" : (p.affiliate_link && p.affiliate_link !== "#" ? "✓ SET" : "—")}</div>
                <div>
                  <button className="rha-btn-edit" onClick={() => openEdit(p)}>EDIT</button>
                  <button className="rha-btn-del" onClick={() => setDeleteId(p.id)}>DEL</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* EDIT MODAL */}
      {editId && (
        <div className="rha-overlay">
          <div className="rha-modal">
            <div style={{ fontFamily:"'Playfair Display'", fontSize:20, fontWeight:700, marginBottom:24 }}>Edit Product</div>
            <form onSubmit={handleSaveEdit}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
                <div>
                  <div style={{ fontSize:10, letterSpacing:"0.18em", color:"#555", marginBottom:6 }}>NAME</div>
                  <input className="rha-inp" value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div>
                  <div style={{ fontSize:10, letterSpacing:"0.18em", color:"#555", marginBottom:6 }}>PRICE (₹)</div>
                  <input className="rha-inp" type="number" value={editForm.price} onChange={e => setEditForm(p => ({ ...p, price: e.target.value }))} />
                </div>
                <div>
                  <div style={{ fontSize:10, letterSpacing:"0.18em", color:"#555", marginBottom:6 }}>MRP (₹)</div>
                  <input className="rha-inp" type="number" value={editForm.mrp} onChange={e => setEditForm(p => ({ ...p, mrp: e.target.value }))} />
                </div>
                <div>
                  <div style={{ fontSize:10, letterSpacing:"0.18em", color:"#555", marginBottom:6 }}>DISCOUNT %</div>
                  <input className="rha-inp" type="number" value={editForm.discount} onChange={e => setEditForm(p => ({ ...p, discount: e.target.value }))} />
                </div>
                <div>
                  <div style={{ fontSize:10, letterSpacing:"0.18em", color:"#555", marginBottom:6 }}>CATEGORY</div>
                  <select className="rha-inp" value={editForm.category} onChange={e => setEditForm(p => ({ ...p, category: e.target.value }))}>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize:10, letterSpacing:"0.18em", color:"#555", marginBottom:6 }}>STORE</div>
                  <select className="rha-inp" value={editForm.store} onChange={e => setEditForm(p => ({ ...p, store: e.target.value }))}>
                    {STORES.map(store => <option key={store}>{store}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize:10, letterSpacing:"0.18em", color:"#555", marginBottom:6 }}>BADGE</div>
                  <select className="rha-inp" value={editForm.badge} onChange={e => setEditForm(p => ({ ...p, badge: e.target.value }))}>
                    <option value="">None</option>
                    <option value="HOT">HOT</option>
                    <option value="NEW">NEW</option>
                  </select>
                </div>
                <div>
                  <div style={{ fontSize:10, letterSpacing:"0.18em", color:"#555", marginBottom:6 }}>RATING</div>
                  <input className="rha-inp" type="number" step="0.1" min="0" max="5" value={editForm.rating} onChange={e => setEditForm(p => ({ ...p, rating: e.target.value }))} />
                </div>
              <div>
                <div style={{ fontSize:10, letterSpacing:"0.18em", color:"#555", marginBottom:6 }}>REVIEWS</div>
                <input className="rha-inp" type="number" value={editForm.review_count} onChange={e => setEditForm(p => ({ ...p, review_count: e.target.value }))} />
              </div>
                <div>
                  <div style={{ fontSize:10, letterSpacing:"0.18em", color:"#555", marginBottom:6 }}>COMMISSION %</div>
                  <input className="rha-inp" type="number" step="0.1" value={editForm.commission_rate} onChange={e => setEditForm(p => ({ ...p, commission_rate: e.target.value }))} />
                </div>
                <div>
                  <div style={{ fontSize:10, letterSpacing:"0.18em", color:"#555", marginBottom:6 }}>COMMISSION SCORE</div>
                  <input className="rha-inp" type="number" min="0" max="100" value={editForm.commission_score} onChange={e => setEditForm(p => ({ ...p, commission_score: e.target.value }))} />
                </div>
                <div style={{ gridColumn:"span 2" }}>
                  <div style={{ fontSize:10, letterSpacing:"0.18em", color:"#555", marginBottom:6 }}>IMAGE URL</div>
                  <input className="rha-inp" value={editForm.image} onChange={e => setEditForm(p => ({ ...p, image: e.target.value }))} />
                  {editForm.image && <img src={editForm.image} alt="preview" className="rha-img-preview" onError={e => e.target.style.display="none"} onLoad={e => e.target.style.display="block"} />}
                </div>
                <div style={{ gridColumn:"span 2" }}>
                  <div style={{ fontSize:10, letterSpacing:"0.18em", color:"#555", marginBottom:6 }}>DESCRIPTION</div>
                  <textarea className="rha-inp" rows={2} value={editForm.description} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} style={{ resize:"vertical" }} />
                </div>
                <div style={{ gridColumn:"span 2" }}>
                  <div style={{ fontSize:10, letterSpacing:"0.18em", color:"#555", marginBottom:6 }}>DIRECT AFFILIATE URL</div>
                  <input className="rha-inp" value={editForm.affiliate_url} onChange={e => setEditForm(p => ({ ...p, affiliate_url: e.target.value }))} />
                </div>
                <div style={{ gridColumn:"span 2" }}>
                  <div style={{ fontSize:10, letterSpacing:"0.18em", color:"#555", marginBottom:6 }}>FALLBACK AFFILIATE LINK</div>
                  <input className="rha-inp" value={editForm.affiliate_link} onChange={e => setEditForm(p => ({ ...p, affiliate_link: e.target.value }))} />
                </div>
                <div style={{ gridColumn:"span 2" }}>
                  <div style={{ fontSize:10, letterSpacing:"0.18em", color:"#555", marginBottom:6 }}>ORIGINAL PRODUCT URL</div>
                  <input className="rha-inp" value={editForm.source_url} onChange={e => setEditForm(p => ({ ...p, source_url: e.target.value }))} />
                </div>
                <div>
                  <div style={{ fontSize:10, letterSpacing:"0.18em", color:"#555", marginBottom:6 }}>TREND KEYWORD</div>
                  <input className="rha-inp" value={editForm.trend_keyword} onChange={e => setEditForm(p => ({ ...p, trend_keyword: e.target.value }))} />
                </div>
                <div>
                  <div style={{ fontSize:10, letterSpacing:"0.18em", color:"#555", marginBottom:6 }}>TAGS</div>
                  <input className="rha-inp" value={editForm.tags} onChange={e => setEditForm(p => ({ ...p, tags: e.target.value }))} />
                </div>
                <div style={{ gridColumn:"span 2" }}>
                  <div style={{ fontSize:10, letterSpacing:"0.18em", color:"#555", marginBottom:6 }}>SEO TITLE</div>
                  <input className="rha-inp" maxLength={60} value={editForm.seo_title} onChange={e => setEditForm(p => ({ ...p, seo_title: e.target.value }))} />
                </div>
                <div style={{ gridColumn:"span 2" }}>
                  <div style={{ fontSize:10, letterSpacing:"0.18em", color:"#555", marginBottom:6 }}>META DESCRIPTION</div>
                  <textarea className="rha-inp" rows={2} maxLength={160} value={editForm.meta_description} onChange={e => setEditForm(p => ({ ...p, meta_description: e.target.value }))} style={{ resize:"vertical" }} />
                </div>
              </div>
              <div style={{ display:"flex", gap:12, justifyContent:"flex-end" }}>
                <button className="rha-btn-g" type="button" onClick={() => setEditId(null)}>CANCEL</button>
                <button className="rha-btn-p" type="submit">SAVE CHANGES</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM */}
      {deleteId && (
        <div className="rha-overlay">
          <div style={{ background:"#111", border:"1px solid #222", borderRadius:8, padding:36, width:380, maxWidth:"95vw", textAlign:"center" }}>
            <div style={{ fontSize:32, marginBottom:16 }}>🗑️</div>
            <div style={{ fontFamily:"'Playfair Display'", fontSize:18, marginBottom:8 }}>Delete this product?</div>
            <div style={{ fontSize:12, color:"#555", marginBottom:28 }}>{products.find(p => p.id === deleteId)?.name}</div>
            <div style={{ display:"flex", gap:12, justifyContent:"center" }}>
              <button className="rha-btn-g" onClick={() => setDeleteId(null)}>CANCEL</button>
              <button className="rha-btn-p" style={{ background:"linear-gradient(135deg,#7a1a1a,#c0392b)" }} onClick={confirmDelete}>DELETE</button>
            </div>
          </div>
        </div>
      )}

      {/* BULK DELETE CONFIRM */}
      {bulkConfirm && (
        <div className="rha-overlay">
          <div style={{ background:"#111", border:"1px solid #222", borderRadius:8, padding:36, width:380, maxWidth:"95vw", textAlign:"center" }}>
            <div style={{ fontSize:32, marginBottom:16 }}>🗑️</div>
            <div style={{ fontFamily:"'Playfair Display'", fontSize:18, marginBottom:8 }}>Delete {selected.size} products?</div>
            <div style={{ fontSize:12, color:"#555", marginBottom:28 }}>This cannot be undone.</div>
            <div style={{ display:"flex", gap:12, justifyContent:"center" }}>
              <button className="rha-btn-g" onClick={() => setBulkConfirm(false)}>CANCEL</button>
              <button className="rha-btn-p" style={{ background:"linear-gradient(135deg,#7a1a1a,#c0392b)" }} onClick={handleBulkDelete}>DELETE ALL</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="rha-toast">{toast}</div>}
    </div>
  );
}
