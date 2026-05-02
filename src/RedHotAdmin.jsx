import { useState, useEffect } from "react";
import axios from "axios";

const API = "http://localhost:3001";

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

const ADMIN_USER = "admin";
const ADMIN_PASS = "redhot2026";
const CATEGORIES = ["Men", "Women", "Accessories", "Electronics"];
const emptyForm = { name: "", price: "", category: "", badge: "", image: "", affiliate_link: "" };

export default function RedHotAdmin() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [loginError, setLoginError] = useState("");

  const { products, refresh } = useProducts();
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState(null);
  const [toast, setToast] = useState("");

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2800); };

  const stats = {
    total: products.length,
    categories: new Set(products.map(p => p.category)).size,
    hot: products.filter(p => p.badge === "HOT").length,
    avgPrice: products.length ? Math.round(products.reduce((a, p) => a + p.price, 0) / products.length) : 0,
  };

  const filtered = products.filter(p =>
    (p.name || "").toLowerCase().includes(search.toLowerCase()) ||
    (p.category || "").toLowerCase().includes(search.toLowerCase())
  );

  const handleLogin = (e) => {
    e.preventDefault();
    if (loginForm.username === ADMIN_USER && loginForm.password === ADMIN_PASS) {
      setLoggedIn(true); setLoginError("");
    } else {
      setLoginError("Invalid credentials.");
      setLoginForm(f => ({ ...f, password: "" }));
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.name || !form.price || !form.category || !form.image) {
      setFormError("Name, price, category and image are required."); return;
    }
    await axios.post(`${API}/products`, {
      name: form.name.trim(),
      price: parseInt(form.price),
      category: form.category,
      badge: form.badge,
      image: form.image.trim(),
      affiliate_link: form.affiliate_link.trim() || "#"
    });
    refresh();
    setForm(emptyForm);
    setFormError("");
    showToast("✓ Product added — visible on store now!");
  };

  const openEdit = (product) => {
    setEditId(product.id);
    setEditForm({ ...product, price: String(product.price) });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    await axios.put(`${API}/products/${editId}`, {
      ...editForm,
      price: parseInt(editForm.price)
    });
    refresh();
    setEditId(null);
    showToast("✓ Product updated");
  };

  const confirmDelete = async () => {
    await axios.delete(`${API}/products/${deleteId}`);
    refresh();
    setDeleteId(null);
    showToast("🗑 Product deleted");
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
    .rha-card { background:var(--bg2); border:1px solid var(--border); border-radius:8px; }
    .rha-row { display:grid; grid-template-columns:56px 1fr 110px 120px 90px 80px 140px; gap:12px; padding:14px 20px; border-bottom:1px solid #161616; align-items:center; transition:background .15s; }
    .rha-row:hover { background:#131313; }
    .rha-head { display:grid; grid-template-columns:56px 1fr 110px 120px 90px 80px 140px; gap:12px; padding:12px 20px; background:#0d0d0d; border-bottom:1px solid var(--border); }
    .rha-overlay { position:fixed; inset:0; background:rgba(0,0,0,.8); z-index:200; display:flex; align-items:center; justify-content:center; }
    .rha-modal { background:var(--bg2); border:1px solid var(--border); border-radius:8px; padding:36px; width:500px; max-width:95vw; position:relative; }
    .rha-modal::before { content:''; position:absolute; top:0; left:0; right:0; height:2px; background:linear-gradient(90deg,var(--red),var(--red2)); border-radius:8px 8px 0 0; }
    .rha-toast { position:fixed; bottom:28px; right:28px; background:var(--bg2); border:1px solid var(--border); border-left:3px solid var(--red); padding:14px 22px; border-radius:4px; font-size:13px; z-index:999; animation:slideUp .3s ease; }
    @keyframes slideUp { from{opacity:0;transform:translateY(10px);} to{opacity:1;transform:translateY(0);} }
    @media(max-width:900px) { .rha-row,.rha-head { grid-template-columns:48px 1fr 90px 130px; } .rha-row>*:nth-child(n+5),.rha-head>*:nth-child(n+5){display:none;} }
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
          <button className="rha-btn-p" type="submit" style={{ width:"100%", padding:14 }}>SIGN IN →</button>
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
        <div style={{ display:"flex", alignItems:"center", gap:20 }}>
          <span style={{ fontSize:11, letterSpacing:"0.15em", color:"#555" }}>Logged in as admin</span>
          <button className="rha-btn-g" style={{ padding:"7px 16px", fontSize:11 }} onClick={() => setLoggedIn(false)}>LOGOUT</button>
        </div>
      </nav>

      <div style={{ maxWidth:1400, margin:"0 auto", padding:"36px 32px" }}>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))", gap:16, marginBottom:40 }}>
          {[
            { label:"TOTAL PRODUCTS", value:stats.total },
            { label:"CATEGORIES",     value:stats.categories },
            { label:"HOT ITEMS 🔥",   value:stats.hot },
            { label:"AVG PRICE",      value:`₹${stats.avgPrice.toLocaleString()}` },
          ].map(s => (
            <div key={s.label} className="rha-card" style={{ padding:"24px 22px", position:"relative", overflow:"hidden" }}>
              <div style={{ position:"absolute", bottom:0, left:0, right:0, height:2, background:"linear-gradient(90deg,#c0392b,transparent)" }} />
              <div style={{ fontFamily:"'Playfair Display'", fontSize:32, fontWeight:700 }}>{s.value}</div>
              <div style={{ fontSize:10, letterSpacing:"0.2em", color:"#555", marginTop:4 }}>{s.label}</div>
            </div>
          ))}
        </div>

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
                <div style={{ fontSize:10, letterSpacing:"0.18em", color:"#555", marginBottom:6 }}>CATEGORY *</div>
                <select className="rha-inp" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                  <option value="">Select…</option>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
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
              <div style={{ gridColumn:"span 2" }}>
                <div style={{ fontSize:10, letterSpacing:"0.18em", color:"#555", marginBottom:6 }}>IMAGE URL *</div>
                <input className="rha-inp" placeholder="https://images.unsplash.com/..." value={form.image} onChange={e => setForm(p => ({ ...p, image: e.target.value }))} />
              </div>
              <div style={{ gridColumn:"span 2" }}>
                <div style={{ fontSize:10, letterSpacing:"0.18em", color:"#555", marginBottom:6 }}>AFFILIATE LINK</div>
                <input className="rha-inp" placeholder="https://..." value={form.affiliate_link} onChange={e => setForm(p => ({ ...p, affiliate_link: e.target.value }))} />
              </div>
            </div>
            {formError && <p style={{ fontSize:12, color:"#c0392b", marginBottom:12 }}>{formError}</p>}
            <div style={{ display:"flex", gap:12 }}>
              <button className="rha-btn-p" type="submit">ADD PRODUCT</button>
              <button className="rha-btn-g" type="button" onClick={() => { setForm(emptyForm); setFormError(""); }}>CLEAR</button>
            </div>
          </form>
        </div>

        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20, flexWrap:"wrap", gap:12 }}>
          <div>
            <div style={{ fontFamily:"'Playfair Display'", fontSize:24, fontWeight:700 }}>Products</div>
            <div style={{ fontSize:11, letterSpacing:"0.15em", color:"#444", marginTop:4 }}>{filtered.length} OF {products.length} PRODUCTS</div>
          </div>
          <input className="rha-inp" style={{ width:260 }} placeholder="🔍 Search products…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <div className="rha-card" style={{ overflow:"hidden" }}>
          <div className="rha-head">
            {["IMG","PRODUCT","CATEGORY","PRICE","BADGE","LINK","ACTIONS"].map(h => (
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
              <div className="rha-row" key={p.id}>
                <img src={p.image} alt={p.name} style={{ width:44, height:44, objectFit:"cover", borderRadius:4, background:"#1a1a1a" }} />
                <div>
                  <div style={{ fontFamily:"'Playfair Display'", fontSize:14, fontWeight:700 }}>{p.name}</div>
                  <div style={{ fontSize:10, letterSpacing:"0.12em", color:"#555", marginTop:2 }}>{p.category}</div>
                </div>
                <div style={{ fontSize:12, color:"#555" }}>{p.category}</div>
                <div style={{ fontSize:14, fontWeight:500, color:"#c0392b" }}>₹{p.price.toLocaleString()}</div>
                <div>
                  {p.badge
                    ? <span style={{ display:"inline-block", fontSize:9, letterSpacing:"0.15em", padding:"2px 8px", borderRadius:2, fontWeight:600, background: p.badge==="HOT" ? "#c0392b" : "#2c3e50", color:"#fff" }}>{p.badge}</span>
                    : <span style={{ color:"#444", fontSize:12 }}>—</span>}
                </div>
                <div style={{ fontSize:11, color:"#555" }}>{p.affiliate_link && p.affiliate_link !== "#" ? "✓ SET" : "—"}</div>
                <div>
                  <button className="rha-btn-edit" onClick={() => openEdit(p)}>EDIT</button>
                  <button className="rha-btn-del" onClick={() => setDeleteId(p.id)}>DEL</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

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
                  <div style={{ fontSize:10, letterSpacing:"0.18em", color:"#555", marginBottom:6 }}>CATEGORY</div>
                  <select className="rha-inp" value={editForm.category} onChange={e => setEditForm(p => ({ ...p, category: e.target.value }))}>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
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
                <div style={{ gridColumn:"span 2" }}>
                  <div style={{ fontSize:10, letterSpacing:"0.18em", color:"#555", marginBottom:6 }}>IMAGE URL</div>
                  <input className="rha-inp" value={editForm.image} onChange={e => setEditForm(p => ({ ...p, image: e.target.value }))} />
                </div>
                <div style={{ gridColumn:"span 2" }}>
                  <div style={{ fontSize:10, letterSpacing:"0.18em", color:"#555", marginBottom:6 }}>AFFILIATE LINK</div>
                  <input className="rha-inp" value={editForm.affiliate_link} onChange={e => setEditForm(p => ({ ...p, affiliate_link: e.target.value }))} />
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

      {toast && <div className="rha-toast">{toast}</div>}
    </div>
  );
}