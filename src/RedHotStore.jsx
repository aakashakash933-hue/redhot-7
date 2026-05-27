import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import 'bootstrap/dist/css/bootstrap.min.css';

const API = "https://redhot-7.onrender.com";

function useProducts() {
  const [products, setProducts] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(false);
  useEffect(() => {
    axios
      .get(`${API}/products`, { timeout: 60000 })
      .then(res => {
        const shuffled = [...res.data].sort(() => Math.random() - 0.5);
        setProducts(shuffled);
      })
      .catch(err => { console.error("API Error:", err); setError(true); })
      .finally(() => setLoading(false));
  }, []);
  return { products, loading, error };
}

const CATEGORIES = ["All", "Men's Topwear", "Men's Bottomwear", "Women's Topwear", "Women's Bottomwear", "Accessories"];

export default function RedHotStore({ onNavigateAdmin }) {
  const { products, loading, error } = useProducts();

  const [search,      setSearch]      = useState("");
  const [category,    setCategory]    = useState("All");
  const [sort,        setSort]        = useState("default");
  const [redirecting, setRedirecting] = useState(null);
  const [heroVisible, setHeroVisible] = useState(false);
  const [showAbout,   setShowAbout]   = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [detail,      setDetail]      = useState(null); // product detail modal
  const [detailVisible, setDetailVisible] = useState(false);

  useEffect(() => { setTimeout(() => setHeroVisible(true), 80); }, []);

  const closeDetail = useCallback(() => {
    setDetailVisible(false);
    setTimeout(() => {
      setDetail(null);
      document.body.style.overflow = "";
    }, 350);
  }, []);

  // close detail on ESC
  useEffect(() => {
    const fn = (e) => { if (e.key === "Escape") closeDetail(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [closeDetail]);

  const filtered = products
    .filter(p => {
      const q = search.toLowerCase();
      return (
        (p.name || "").toLowerCase().includes(q) &&
        (category === "All" || p.category === category)
      );
    })
    .sort((a, b) => {
      if (sort === "price_asc")  return a.price - b.price;
      if (sort === "price_desc") return b.price - a.price;
      if (sort === "name")       return (a.name || "").localeCompare(b.name || "");
      return 0;
    });

  const handleBuy = (product, e) => {
    if (e) e.stopPropagation();
    setRedirecting(product.id);
    setTimeout(() => {
      setRedirecting(null);
      window.open(`${API}/go/${product.id}`, "_blank");
    }, 1100);
  };

  return (
    <div style={{ fontFamily: "'Cormorant Garamond', 'Georgia', serif", background: "#f7f5f2", minHeight: "100vh", color: "#2c2c2c", overflowX: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
        :root { --cream:#f7f5f2; --warm:#ede8e0; --sand:#d4c9b8; --taupe:#9e8f7e; --umber:#5c4f3d; --charcoal:#2c2c2c; --white:#ffffff; --red:#c81e1e; --red-dim:rgba(200,30,30,0.12); }
        html,body,#root { width:100%; min-height:100vh; margin:0; padding:0; }
        * { box-sizing:border-box; }
        body { background:var(--cream) !important; }
        ::-webkit-scrollbar { width:4px; } ::-webkit-scrollbar-thumb { background:var(--red); border-radius:2px; }

        .rh-navbar { background:rgba(247,245,242,0.96); backdrop-filter:blur(14px); border-bottom:1px solid var(--warm); padding:0 2rem; height:64px; display:flex; align-items:center; justify-content:space-between; width:100%; position:sticky; top:0; z-index:9999; }
        .rh-brand { font-family:'Cormorant Garamond',serif; font-weight:700; font-size:1.6rem; color:var(--red); letter-spacing:0.04em; cursor:default; }
        .rh-nav-actions { display:flex; align-items:center; gap:10px; }
        .rh-about-btn { font-family:'DM Sans',sans-serif; font-size:11px; letter-spacing:0.18em; text-transform:uppercase; background:transparent; border:1px solid var(--sand); color:var(--taupe); padding:7px 18px; border-radius:3px; cursor:pointer; transition:all 0.2s; }
        .rh-about-btn:hover { border-color:var(--red); color:var(--red); background:var(--red-dim); }

        .rh-hero { background:linear-gradient(160deg,var(--warm) 0%,var(--cream) 60%); border-bottom:1px solid var(--sand); padding:50px 2rem 35px; text-align:center; width:100%; }
        .rh-hero-eyebrow { font-family:'DM Sans',sans-serif; font-size:10px; letter-spacing:0.38em; color:var(--taupe); font-weight:500; margin-bottom:1.1rem; text-transform:uppercase; }
        .rh-hero-title { font-family:'Cormorant Garamond',serif; font-size:clamp(2rem,4vw,3.5rem); font-weight:700; line-height:1.08; color:var(--charcoal); margin-bottom:1rem; }
        .rh-hero-title span { color:var(--red); font-style:italic; }
        .rh-hero-sub { font-family:'DM Sans',sans-serif; font-size:13px; color:var(--taupe); letter-spacing:0.1em; max-width:380px; margin:0 auto; }
        .hero-fade { opacity:0; transform:translateY(24px); transition:opacity .9s ease,transform .9s ease; }
        .hero-fade.in { opacity:1; transform:translateY(0); }

        .rh-filters { background:var(--white); border-bottom:1px solid var(--warm); padding:1.5rem 2rem; width:100%; position:sticky; top:64px; z-index:90; }
        .rh-search.form-control { font-family:'DM Sans',sans-serif; font-size:13px; background:var(--cream); border:1px solid var(--sand); border-radius:4px; color:var(--charcoal); padding:0.55rem 1rem; box-shadow:none !important; }
        .rh-search.form-control:focus { border-color:var(--red); background:var(--white); }
        .rh-select.form-select { font-family:'DM Sans',sans-serif; font-size:12px; letter-spacing:0.06em; background:var(--cream); border:1px solid var(--sand); border-radius:4px; color:var(--charcoal); padding:0.55rem 2rem 0.55rem 1rem; box-shadow:none !important; cursor:pointer; }
        .rh-select.form-select:focus { border-color:var(--red); }
        .rh-pill { font-family:'DM Sans',sans-serif; font-size:10px; letter-spacing:0.12em; font-weight:500; padding:8px 12px; border-radius:4px; border:1px solid var(--sand); background:transparent; color:var(--taupe); cursor:pointer; transition:all 0.2s; text-transform:uppercase; text-align:center; flex-grow:1; }
        .rh-pill:hover { border-color:var(--red); color:var(--red); background:var(--red-dim); }
        .rh-pill.active { background:var(--charcoal); border-color:var(--charcoal); color:var(--white); }

        .rh-category-scroll { display:flex; flex-wrap:wrap; gap:8px; padding-bottom:8px; margin-top:10px; }

        .rh-card { background:var(--white); border:1px solid var(--warm); border-radius:4px; overflow:hidden; transition:box-shadow 0.35s ease, transform 0.25s ease; height:100%; cursor:pointer; }
        .rh-card:hover { box-shadow:0 12px 24px rgba(0,0,0,0.06); transform:translateY(-2px); }
        .rh-card-img-wrap { border-radius:4px 4px 0 0; overflow:hidden; position:relative; }
        .rh-card-img { width:100%; aspect-ratio:3/4; object-fit:cover; display:block; background:var(--warm); transition:transform 0.5s ease; }
        .rh-card:hover .rh-card-img { transform:scale(1.04); }
        .rh-badge-hot { position:absolute; top:10px; left:10px; background:var(--white); color:var(--red); font-family:'DM Sans',sans-serif; font-size:9px; font-weight:700; letter-spacing:0.1em; padding:4px 8px; border-radius:2px; text-transform:uppercase; box-shadow:0 2px 8px rgba(0,0,0,0.1); }
        .rh-badge-new { position:absolute; top:10px; left:10px; background:var(--white); color:var(--charcoal); font-family:'DM Sans',sans-serif; font-size:9px; font-weight:700; letter-spacing:0.1em; padding:4px 8px; border-radius:2px; text-transform:uppercase; box-shadow:0 2px 8px rgba(0,0,0,0.1); }
        .rh-card-body { padding:12px; background:var(--white); }
        .rh-cat-label { font-family:'DM Sans',sans-serif; font-size:9px; letter-spacing:0.1em; color:var(--taupe); text-transform:uppercase; margin-bottom:4px; }
        .rh-prod-name { font-family:'DM Sans',sans-serif; font-size:13px; font-weight:500; color:var(--charcoal); line-height:1.3; margin-bottom:4px; display:-webkit-box; -webkit-line-clamp:1; -webkit-box-orient:vertical; overflow:hidden; }
        .rh-prod-desc { display:none; }
        .rh-price { font-family:'DM Sans',sans-serif; font-size:14px; font-weight:700; color:var(--charcoal); }
        .rh-buy-btn { font-family:'DM Sans',sans-serif; font-size:10px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; background:transparent; color:var(--red); border:none; padding:4px 0; cursor:pointer; transition:all 0.2s; }
        .rh-buy-btn:hover { color:#a01515; }

        .rh-count { font-family:'DM Sans',sans-serif; font-size:10px; letter-spacing:0.2em; color:var(--sand); text-transform:uppercase; padding:1.2rem 2rem 0; width:100%; }
        .rh-grid-wrap { width:100%; padding:1rem 1.5rem 5rem; position:relative; z-index:0; isolation:isolate; overflow:hidden; }

        .rh-empty { text-align:center; padding:100px 0; color:var(--sand); width:100%; }
        .rh-empty-icon { font-size:3rem; margin-bottom:1rem; }
        .rh-empty-text { font-family:'DM Sans',sans-serif; font-size:11px; letter-spacing:0.22em; text-transform:uppercase; }

        .rh-error { text-align:center; padding:80px 2rem; width:100%; }
        .rh-error-icon { font-size:2.5rem; margin-bottom:1rem; }
        .rh-error-text { font-family:'DM Sans',sans-serif; font-size:11px; letter-spacing:0.22em; text-transform:uppercase; color:var(--red); margin-bottom:1.5rem; }
        .rh-retry-btn { font-family:'DM Sans',sans-serif; font-size:10px; letter-spacing:0.2em; text-transform:uppercase; background:transparent; border:1px solid var(--red); color:var(--red); padding:8px 24px; border-radius:3px; cursor:pointer; transition:all 0.2s; }
        .rh-retry-btn:hover { background:var(--red); color:var(--white); }

        .rh-skeleton { background:var(--white); border:1px solid var(--warm); border-radius:4px; overflow:hidden; height:100%; }
        .rh-skeleton-img { width:100%; aspect-ratio:3/4; background:linear-gradient(90deg,var(--warm) 25%,var(--cream) 50%,var(--warm) 75%); background-size:200% 100%; animation:rh-shimmer 1.4s infinite; }
        .rh-skeleton-body { padding:12px; }
        .rh-skeleton-line { height:10px; border-radius:4px; margin-bottom:8px; background:linear-gradient(90deg,var(--warm) 25%,var(--cream) 50%,var(--warm) 75%); background-size:200% 100%; animation:rh-shimmer 1.4s infinite; }
        @keyframes rh-shimmer { 0%{background-position:200% 0;} 100%{background-position:-200% 0;} }

        @media (max-width:576px) { .rh-hero{padding:30px 1rem 20px;} .rh-select.form-select{width:100% !important;} .rh-filters{padding:0.75rem;} .rh-count{padding:0.75rem 0.75rem 0;} .rh-grid-wrap{padding:0.75rem 0.5rem 5rem;} }

        .rh-overlay { position:fixed; inset:0; background:rgba(247,245,242,0.92); backdrop-filter:blur(6px); z-index:9999; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:18px; }
        .rh-spinner { width:32px; height:32px; border:2px solid var(--sand); border-top-color:var(--red); border-radius:50%; animation:rh-spin 0.8s linear infinite; }
        .rh-redirect-text { font-family:'DM Sans',sans-serif; font-size:11px; letter-spacing:0.22em; color:var(--taupe); text-transform:uppercase; }
        @keyframes rh-spin { to{transform:rotate(360deg);} }

        .rh-about-overlay { position:fixed; inset:0; background:rgba(44,44,44,0.5); backdrop-filter:blur(4px); z-index:9999; display:flex; align-items:center; justify-content:center; }
        .rh-about-modal { background:var(--white); border-radius:8px; padding:48px 44px; width:480px; max-width:95vw; position:relative; border-top:3px solid var(--red); }
        .rh-about-close { position:absolute; top:16px; right:18px; background:none; border:none; font-size:20px; color:var(--taupe); cursor:pointer; line-height:1; }
        .rh-about-close:hover { color:var(--red); }

        /* ── DETAIL MODAL ── */
        .rh-detail-backdrop {
          position:fixed; inset:0; z-index:10000;
          background:rgba(44,44,44,0.55);
          backdrop-filter:blur(6px);
          display:flex; align-items:flex-end; justify-content:center;
          opacity:0; transition:opacity 0.35s ease;
        }
        .rh-detail-backdrop.visible { opacity:1; }
        .rh-detail-sheet {
          background:var(--white);
          border-radius:20px 20px 0 0;
          width:100%; max-width:720px;
          max-height:92vh;
          overflow-y:auto;
          transform:translateY(100%);
          transition:transform 0.38s cubic-bezier(0.22,1,0.36,1);
          position:relative;
        }
        .rh-detail-backdrop.visible .rh-detail-sheet { transform:translateY(0); }
        .rh-detail-drag { width:40px; height:4px; background:var(--sand); border-radius:2px; margin:14px auto 0; }
        .rh-detail-close {
          position:absolute; top:16px; right:20px;
          background:var(--warm); border:none; border-radius:50%;
          width:32px; height:32px; cursor:pointer;
          font-size:16px; color:var(--taupe);
          display:flex; align-items:center; justify-content:center;
          transition:all 0.2s;
        }
        .rh-detail-close:hover { background:var(--red); color:var(--white); }
        .rh-detail-img { width:100%; height:clamp(260px,45vw,420px); object-fit:cover; display:block; }
        .rh-detail-body { padding:28px 28px 48px; }
        .rh-detail-cat { font-family:'DM Sans',sans-serif; font-size:9px; letter-spacing:0.3em; color:var(--taupe); text-transform:uppercase; margin-bottom:10px; }
        .rh-detail-name { font-family:'Cormorant Garamond',serif; font-size:clamp(1.8rem,5vw,2.6rem); font-weight:700; color:var(--charcoal); line-height:1.1; margin-bottom:16px; }
        .rh-detail-desc { font-family:'DM Sans',sans-serif; font-size:13px; color:var(--taupe); line-height:1.85; margin-bottom:24px; }
        .rh-detail-price { font-family:'DM Sans',sans-serif; font-size:1.6rem; font-weight:700; color:var(--red); margin-bottom:24px; }
        .rh-detail-divider { height:1px; background:var(--warm); margin-bottom:24px; }
        .rh-detail-buy {
          font-family:'DM Sans',sans-serif; font-size:11px; font-weight:600;
          letter-spacing:0.22em; text-transform:uppercase;
          background:var(--red); color:var(--white);
          border:none; padding:14px 36px; border-radius:3px;
          cursor:pointer; transition:all 0.2s; width:100%;
        }
        .rh-detail-buy:hover { background:#a01515; box-shadow:0 8px 24px rgba(200,30,30,0.3); }
        .rh-detail-meta { display:flex; gap:24px; flex-wrap:wrap; margin-bottom:24px; }
        .rh-detail-meta-item { font-family:'DM Sans',sans-serif; font-size:11px; }
        .rh-detail-meta-label { color:var(--taupe); letter-spacing:0.15em; text-transform:uppercase; font-size:9px; margin-bottom:4px; }
        .rh-detail-meta-value { color:var(--charcoal); font-weight:500; }

        .rh-footer { background:var(--charcoal); color:var(--taupe); text-align:center; padding:2rem; font-family:'DM Sans',sans-serif; font-size:11px; letter-spacing:0.16em; width:100%; }
      `}</style>

      {redirecting && (
        <div className="rh-overlay">
          <div className="rh-spinner" />
          <div className="rh-redirect-text">Redirecting…</div>
        </div>
      )}

      {showAbout && (
        <div className="rh-about-overlay" onClick={() => setShowAbout(false)}>
          <div className="rh-about-modal" onClick={e => e.stopPropagation()}>
            <button className="rh-about-close" onClick={() => setShowAbout(false)}>✕</button>
            <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"2rem", fontWeight:700, color:"#c81e1e", marginBottom:8 }}>About Redhot</div>
            <div style={{ width:40, height:2, background:"#c81e1e", marginBottom:20 }} />
            <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:14, color:"#9e8f7e", lineHeight:1.8, marginBottom:16 }}>Redhot is a curated affiliate store bringing you the finest picks across fashion, accessories, and electronics.</p>
            <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:14, color:"#9e8f7e", lineHeight:1.8, marginBottom:16 }}>Every product is hand-selected for style. When you click Link, you're redirected to the platform where you can complete your purchase.</p>
            <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, color:"#d4c9b8", lineHeight:1.8 }}>© 2025 Redhot — Curated with care.</p>
          </div>
        </div>
      )}

      {showPrivacy && (
        <div className="rh-about-overlay" onClick={() => setShowPrivacy(false)}>
          <div className="rh-about-modal" onClick={e => e.stopPropagation()}>
            <button className="rh-about-close" onClick={() => setShowPrivacy(false)}>✕</button>
            <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"2rem", fontWeight:700, color:"#c81e1e", marginBottom:8 }}>Privacy Policy</div>
            <div style={{ width:40, height:2, background:"#c81e1e", marginBottom:20 }} />
            <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:14, color:"#9e8f7e", lineHeight:1.8, marginBottom:16 }}>We value your privacy. Redhot does not collect personal data beyond basic analytics to improve your experience.</p>
            <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:14, color:"#9e8f7e", lineHeight:1.8, marginBottom:16 }}>When you click on a product link, you are redirected to third-party affiliate partners where their respective privacy policies apply.</p>
          </div>
        </div>
      )}

      {showContact && (
        <div className="rh-about-overlay" onClick={() => setShowContact(false)}>
          <div className="rh-about-modal" onClick={e => e.stopPropagation()}>
            <button className="rh-about-close" onClick={() => setShowContact(false)}>✕</button>
            <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"2rem", fontWeight:700, color:"#c81e1e", marginBottom:8 }}>Contact Us</div>
            <div style={{ width:40, height:2, background:"#c81e1e", marginBottom:20 }} />
            <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:14, color:"#9e8f7e", lineHeight:1.8, marginBottom:16 }}>Have a question or feedback? We'd love to hear from you.</p>
            <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:14, color:"#9e8f7e", lineHeight:1.8, marginBottom:16 }}>Email us at: <a href="mailto:redhotseven.in@gmail.com" style={{ color:"#c81e1e", textDecoration:"none", fontWeight:600 }}>redhotseven.in@gmail.com</a></p>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {detail && (
        <div className={`rh-detail-backdrop${detailVisible ? " visible" : ""}`} onClick={closeDetail}>
          <div className="rh-detail-sheet" onClick={e => e.stopPropagation()}>
            <div className="rh-detail-drag" />
            <button className="rh-detail-close" onClick={closeDetail}>✕</button>

            <img
              src={detail.image || "https://placehold.co/720x420?text=No+Image"}
              alt={detail.name}
              className="rh-detail-img"
              onError={e => { e.target.src = "https://placehold.co/720x420?text=No+Image"; }}
            />

            <div className="rh-detail-body">
              <div className="rh-detail-cat">{detail.category}</div>
              <h2 className="rh-detail-name">{detail.name}</h2>

              <div className="rh-detail-meta">
                <div className="rh-detail-meta-item">
                  <div className="rh-detail-meta-label">Category</div>
                  <div className="rh-detail-meta-value">{detail.category || "—"}</div>
                </div>
                {detail.badge && (
                  <div className="rh-detail-meta-item">
                    <div className="rh-detail-meta-label">Badge</div>
                    <div className="rh-detail-meta-value" style={{ color: detail.badge === "HOT" ? "#c81e1e" : "#5c4f3d" }}>
                      {detail.badge === "HOT" ? "🔥 Hot Pick" : "✦ New Arrival"}
                    </div>
                  </div>
                )}
              </div>

              <div className="rh-detail-divider" />

              {detail.description && (
                <p className="rh-detail-desc">{detail.description}</p>
              )}

              <div className="rh-detail-price">₹{(detail.price || 0).toLocaleString()}</div>

              <button className="rh-detail-buy" onClick={(e) => { handleBuy(detail, e); closeDetail(); }}>
                Shop Now — ₹{(detail.price || 0).toLocaleString()}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="rh-navbar">
        <span className="rh-brand">redhot</span>
        <div className="rh-nav-actions">
          <button className="rh-about-btn" onClick={() => setShowAbout(true)}>About</button>
        </div>
      </div>

      <div className="rh-hero">
        <div className={`hero-fade ${heroVisible ? "in" : ""}`}>
          <div className="rh-hero-eyebrow">New Arrivals</div>
          <h1 className="rh-hero-title"><span>Curated & Coveted</span></h1>
          <p className="rh-hero-sub">Refined drops. Every piece worth wearing.</p>
        </div>
      </div>

      <div className="rh-filters">
        <div className="d-flex gap-2 flex-wrap mb-3">
          <input className="rh-search form-control flex-grow-1" style={{ minWidth:200 }} placeholder="Search products…" value={search} onChange={e => setSearch(e.target.value)} />
          <select className="rh-select form-select" style={{ width:"auto" }} value={category} onChange={e => setCategory(e.target.value)}>
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat === "All" ? "Filter: All Categories" : cat}</option>
            ))}
          </select>
          <select className="rh-select form-select" style={{ width:"auto" }} value={sort} onChange={e => setSort(e.target.value)}>
            <option value="default">Sort: Default</option>
            <option value="price_asc">Price: Low → High</option>
            <option value="price_desc">Price: High → Low</option>
            <option value="name">Name A–Z</option>
          </select>
        </div>
      </div>

      <div className="rh-count">
        {loading ? "Loading products…" : `Showing ${filtered.length} of ${products.length} products`}
      </div>

      <div className="rh-grid-wrap">
        {loading ? (
          <div className="row row-cols-2 row-cols-md-3 row-cols-xl-5 g-2">
            {[...Array(6)].map((_, i) => (
              <div className="col" key={i}>
                <div className="rh-skeleton">
                  <div className="rh-skeleton-img" />
                  <div className="rh-skeleton-body">
                    <div className="rh-skeleton-line" style={{ width:"40%", height:8 }} />
                    <div className="rh-skeleton-line" style={{ width:"80%" }} />
                    <div className="rh-skeleton-line" style={{ width:"50%", marginTop:14 }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="rh-error">
            <div className="rh-error-icon">⚠️</div>
            <div className="rh-error-text">Failed to load products</div>
            <button className="rh-retry-btn" onClick={() => window.location.reload()}>Try Again</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rh-empty">
            <div className="rh-empty-icon">◇</div>
            <div className="rh-empty-text">
              {category !== "All" ? `No products in ${category} yet` : "No products found"}
            </div>
          </div>
        ) : (
          <div className="row row-cols-2 row-cols-md-3 row-cols-xl-5 g-2">
            {filtered.map(product => (
              <div className="col" key={product.id}>
                <div className="rh-card" onClick={() => openDetail(product)}>
                  <div className="rh-card-img-wrap">
                    <img src={product.image || "https://placehold.co/300x400?text=No+Image"} alt={product.name} className="rh-card-img" onError={e => { e.target.src = "https://placehold.co/300x400?text=No+Image"; }} />
                    {product.badge && (
                      <span className={product.badge === "HOT" ? "rh-badge-hot" : "rh-badge-new"}>{product.badge}</span>
                    )}
                  </div>
                  <div className="rh-card-body">
                    <div className="rh-cat-label">{(product.category || "").toUpperCase()}</div>
                    <h3 className="rh-prod-name">{product.name}</h3>
                    <div className="d-flex align-items-center justify-content-between">
                      <span className="rh-price">₹{(product.price || 0).toLocaleString()}</span>
                      <button className="rh-buy-btn" onClick={(e) => handleBuy(product, e)}>Link</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rh-footer">
        <div style={{ marginBottom: "1rem", display: "flex", justifyContent: "center", gap: "20px" }}>
          <span style={{ cursor: "pointer", textDecoration: "underline" }} onClick={() => setShowAbout(true)}>About Us</span>
          <span style={{ cursor: "pointer", textDecoration: "underline" }} onClick={() => setShowContact(true)}>Contact Us</span>
          <span style={{ cursor: "pointer", textDecoration: "underline" }} onClick={() => setShowPrivacy(true)}>Privacy Policy</span>
        </div>
        © 2025 REDHOT — <span style={{ cursor: "pointer" }} onClick={onNavigateAdmin}>All rights reserved</span>
      </div>
    </div>
  );
}