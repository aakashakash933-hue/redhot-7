import { useState, useEffect } from "react";
import axios from "axios";
import 'bootstrap/dist/css/bootstrap.min.css';

function useProducts() {
  const [products, setProducts] = useState([]);
  useEffect(() => {
    axios
      .get("http://localhost:3001/products")
      .then(res => {
        const shuffled = [...res.data].sort(() => Math.random() - 0.5);
        setProducts(shuffled);
      })
      .catch(err => console.error("API Error:", err));
  }, []);
  return products;
}

const CATEGORIES = ["All", "Men", "Women", "Accessories", "Electronics"];

export default function RedHotStore() {
  const products = useProducts();

  const [search,      setSearch]      = useState("");
  const [category,    setCategory]    = useState("All");
  const [sort,        setSort]        = useState("default");
  const [redirecting, setRedirecting] = useState(null);
  const [heroVisible, setHeroVisible] = useState(false);
  const [showAbout,   setShowAbout]   = useState(false);

  useEffect(() => { setTimeout(() => setHeroVisible(true), 80); }, []);

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

  const handleBuy = (product) => {
    setRedirecting(product.id);
    setTimeout(() => {
      setRedirecting(null);
      if (product.affiliate_link && product.affiliate_link !== "#") {
        window.open(product.affiliate_link, "_blank");
      } else {
        alert("Affiliate link not set for this product.");
      }
    }, 1100);
  };

  return (
    <div style={{ fontFamily: "'Cormorant Garamond', 'Georgia', serif", background: "#f7f5f2", minHeight: "100vh", color: "#2c2c2c" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');

        :root {
          --cream:    #f7f5f2;
          --warm:     #ede8e0;
          --sand:     #d4c9b8;
          --taupe:    #9e8f7e;
          --umber:    #5c4f3d;
          --charcoal: #2c2c2c;
          --white:    #ffffff;
          --red:      #c81e1e;
          --red-dim:  rgba(200,30,30,0.12);
        }

        html, body, #root {
          width: 100%;
          min-height: 100vh;
          margin: 0;
          padding: 0;
        }

        * { box-sizing: border-box; }
        body { background: var(--cream) !important; }

        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: var(--red); border-radius: 2px; }

        .rh-navbar {
          background: rgba(247,245,242,0.96);
          backdrop-filter: blur(14px);
          border-bottom: 1px solid var(--warm);
          padding: 0 2rem;
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
        }
        .rh-brand {
          font-family: 'Cormorant Garamond', serif;
          font-weight: 700;
          font-size: 1.6rem;
          color: var(--red);
          letter-spacing: 0.04em;
          text-decoration: none;
        }
        .rh-about-btn {
          font-family: 'DM Sans', sans-serif;
          font-size: 11px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          background: transparent;
          border: 1px solid var(--sand);
          color: var(--taupe);
          padding: 7px 18px;
          border-radius: 3px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .rh-about-btn:hover {
          border-color: var(--red);
          color: var(--red);
          background: var(--red-dim);
        }

        .rh-hero {
          background: linear-gradient(160deg, var(--warm) 0%, var(--cream) 60%);
          border-bottom: 1px solid var(--sand);
          padding: 80px 2rem 60px;
          text-align: center;
          width: 100%;
        }
        .rh-hero-eyebrow {
          font-family: 'DM Sans', sans-serif;
          font-size: 10px;
          letter-spacing: 0.38em;
          color: var(--taupe);
          font-weight: 500;
          margin-bottom: 1.1rem;
          text-transform: uppercase;
        }
        .rh-hero-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(2.6rem, 6vw, 5rem);
          font-weight: 700;
          line-height: 1.08;
          color: var(--charcoal);
          margin-bottom: 1rem;
        }
        .rh-hero-title span { color: var(--red); font-style: italic; }
        .rh-hero-sub {
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          color: var(--taupe);
          letter-spacing: 0.1em;
          max-width: 380px;
          margin: 0 auto;
        }
        .hero-fade { opacity: 0; transform: translateY(24px); transition: opacity .9s ease, transform .9s ease; }
        .hero-fade.in { opacity: 1; transform: translateY(0); }

        .rh-filters {
          background: var(--white);
          border-bottom: 1px solid var(--warm);
          padding: 1.5rem 2rem;
          width: 100%;
        }
        .rh-search.form-control {
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          background: var(--cream);
          border: 1px solid var(--sand);
          border-radius: 4px;
          color: var(--charcoal);
          padding: 0.55rem 1rem;
          box-shadow: none !important;
        }
        .rh-search.form-control:focus { border-color: var(--red); background: var(--white); }
        .rh-select.form-select {
          font-family: 'DM Sans', sans-serif;
          font-size: 12px;
          letter-spacing: 0.06em;
          background: var(--cream);
          border: 1px solid var(--sand);
          border-radius: 4px;
          color: var(--charcoal);
          padding: 0.55rem 2rem 0.55rem 1rem;
          box-shadow: none !important;
          cursor: pointer;
        }
        .rh-select.form-select:focus { border-color: var(--red); }

        .rh-pill {
          font-family: 'DM Sans', sans-serif;
          font-size: 10px;
          letter-spacing: 0.2em;
          font-weight: 500;
          padding: 6px 18px;
          border-radius: 2px;
          border: 1px solid var(--sand);
          background: transparent;
          color: var(--taupe);
          cursor: pointer;
          transition: all 0.2s;
          text-transform: uppercase;
        }
        .rh-pill:hover { border-color: var(--red); color: var(--red); background: var(--red-dim); }
        .rh-pill.active { background: var(--red); border-color: var(--red); color: var(--white); }

        .rh-card {
          background: var(--white);
          border: 1px solid var(--warm);
          border-radius: 6px;
          overflow: visible;
          transition: transform 0.35s ease, box-shadow 0.35s ease;
          position: relative;
          z-index: 1;
          height: 100%;
        }
        .rh-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 20px 40px rgba(200,30,30,0.10);
          z-index: 2;
        }

        .rh-card-img-wrap {
          border-radius: 6px 6px 0 0;
          overflow: hidden;
          position: relative;
        }
        .rh-card-img {
          width: 100%;
          height: 260px;
          object-fit: cover;
          display: block;
          background: var(--warm);
        }

        .rh-badge-hot {
          position: absolute; top: 12px; left: 12px;
          background: var(--red); color: var(--white);
          font-family: 'DM Sans', sans-serif; font-size: 9px; font-weight: 600;
          letter-spacing: 0.2em; padding: 3px 10px; border-radius: 2px; text-transform: uppercase;
        }
        .rh-badge-new {
          position: absolute; top: 12px; left: 12px;
          background: var(--sand); color: var(--umber);
          font-family: 'DM Sans', sans-serif; font-size: 9px; font-weight: 600;
          letter-spacing: 0.2em; padding: 3px 10px; border-radius: 2px; text-transform: uppercase;
        }
        .rh-card-body {
          padding: 18px 16px 16px;
          border-radius: 0 0 6px 6px;
          background: var(--white);
        }
        .rh-cat-label {
          font-family: 'DM Sans', sans-serif; font-size: 9px;
          letter-spacing: 0.22em; color: var(--taupe); text-transform: uppercase; margin-bottom: 5px;
        }
        .rh-prod-name {
          font-family: 'Cormorant Garamond', serif; font-size: 1.1rem;
          font-weight: 600; color: var(--charcoal); line-height: 1.3; margin-bottom: 14px;
        }
        .rh-price {
          font-family: 'DM Sans', sans-serif; font-size: 1.05rem;
          font-weight: 600; color: var(--red);
        }
        .rh-buy-btn {
          font-family: 'DM Sans', sans-serif; font-size: 10px; font-weight: 600;
          letter-spacing: 0.2em; text-transform: uppercase;
          background: var(--red); color: var(--white);
          border: none; padding: 8px 18px; border-radius: 3px; cursor: pointer; transition: all 0.2s;
        }
        .rh-buy-btn:hover {
          background: #a01515;
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(200,30,30,0.3);
        }

        .rh-count {
          font-family: 'DM Sans', sans-serif; font-size: 10px;
          letter-spacing: 0.2em; color: var(--sand); text-transform: uppercase;
          padding: 1.2rem 2rem 0;
          width: 100%;
        }

        .rh-grid-wrap {
          width: 100%;
          padding: 1.5rem 2rem 5rem;
        }

        .rh-empty { text-align: center; padding: 100px 0; color: var(--sand); width: 100%; }
        .rh-empty-icon { font-size: 3rem; margin-bottom: 1rem; }
        .rh-empty-text { font-family: 'DM Sans', sans-serif; font-size: 11px; letter-spacing: 0.22em; text-transform: uppercase; }

        .rh-overlay {
          position: fixed; inset: 0;
          background: rgba(247,245,242,0.92); backdrop-filter: blur(6px);
          z-index: 9999; display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 18px;
        }
        .rh-spinner {
          width: 32px; height: 32px;
          border: 2px solid var(--sand); border-top-color: var(--red);
          border-radius: 50%; animation: rh-spin 0.8s linear infinite;
        }
        .rh-redirect-text {
          font-family: 'DM Sans', sans-serif; font-size: 11px;
          letter-spacing: 0.22em; color: var(--taupe); text-transform: uppercase;
        }
        @keyframes rh-spin { to { transform: rotate(360deg); } }

        .rh-about-overlay {
          position: fixed; inset: 0;
          background: rgba(44,44,44,0.5); backdrop-filter: blur(4px);
          z-index: 9999; display: flex; align-items: center; justify-content: center;
        }
        .rh-about-modal {
          background: var(--white); border-radius: 8px;
          padding: 48px 44px; width: 480px; max-width: 95vw;
          position: relative; border-top: 3px solid var(--red);
        }
        .rh-about-close {
          position: absolute; top: 16px; right: 18px;
          background: none; border: none; font-size: 20px;
          color: var(--taupe); cursor: pointer; line-height: 1;
        }
        .rh-about-close:hover { color: var(--red); }

        .rh-footer {
          background: var(--charcoal); color: var(--taupe);
          text-align: center; padding: 2rem;
          font-family: 'DM Sans', sans-serif; font-size: 11px; letter-spacing: 0.16em;
          width: 100%;
        }
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
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "2rem", fontWeight: 700, color: "#c81e1e", marginBottom: 8 }}>
              About Redhot
            </div>
            <div style={{ width: 40, height: 2, background: "#c81e1e", marginBottom: 20 }} />
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "#9e8f7e", lineHeight: 1.8, marginBottom: 16 }}>
              Redhot is a curated affiliate store bringing you the finest picks across fashion, accessories, and electronics.
            </p>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "#9e8f7e", lineHeight: 1.8, marginBottom: 16 }}>
              Every product is hand-selected for style. When you click Link, you're redirected to the application where you can complete your purchase.
            </p>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#d4c9b8", lineHeight: 1.8 }}>
              © 2025 Redhot — Curated with care.
            </p>
          </div>
        </div>
      )}

      <div className="rh-navbar">
        <span className="rh-brand">redhot</span>
        <button className="rh-about-btn" onClick={() => setShowAbout(true)}>About</button>
      </div>

      <div className="rh-hero">
        <div className={`hero-fade ${heroVisible ? "in" : ""}`}>
          <div className="rh-hero-eyebrow">New Arrivals</div>
          <h1 className="rh-hero-title">
            Discover What's<br />
            <span>Curated & Coveted</span>
          </h1>
          <p className="rh-hero-sub">Refined drops. Every piece worth wearing.</p>
        </div>
      </div>

      <div className="rh-filters">
        <div className="d-flex gap-2 flex-wrap mb-3">
          <input
            className="rh-search form-control flex-grow-1"
            style={{ minWidth: 200 }}
            placeholder="Search products…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select
            className="rh-select form-select"
            style={{ width: "auto" }}
            value={sort}
            onChange={e => setSort(e.target.value)}
          >
            <option value="default">Sort: Default</option>
            <option value="price_asc">Price: Low → High</option>
            <option value="price_desc">Price: High → Low</option>
            <option value="name">Name A–Z</option>
          </select>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              className={`rh-pill ${category === cat ? "active" : ""}`}
              onClick={() => setCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="rh-count">
        Showing {filtered.length} of {products.length} products
      </div>

      <div className="rh-grid-wrap">
        {filtered.length === 0 ? (
          <div className="rh-empty">
            <div className="rh-empty-icon">◇</div>
            <div className="rh-empty-text">No products found</div>
          </div>
        ) : (
          <div className="row row-cols-2 row-cols-md-3 row-cols-xl-5 g-3">
            {filtered.map(product => (
              <div className="col" key={product.id}>
                <div className="rh-card">
                  <div className="rh-card-img-wrap">
                    <img
                      src={product.image || "https://placehold.co/300x300?text=No+Image"}
                      alt={product.name}
                      className="rh-card-img"
                      onError={e => { e.target.src = "https://placehold.co/300x300?text=No+Image"; }}
                    />
                    {product.badge && (
                      <span className={product.badge === "HOT" ? "rh-badge-hot" : "rh-badge-new"}>
                        {product.badge}
                      </span>
                    )}
                  </div>
                  <div className="rh-card-body">
                    <div className="rh-cat-label">{(product.category || "").toUpperCase()}</div>
                    <h3 className="rh-prod-name">{product.name}</h3>
                    <div className="d-flex align-items-center justify-content-between">
                      <span className="rh-price">₹{(product.price || 0).toLocaleString()}</span>
                      <button className="rh-buy-btn" onClick={() => handleBuy(product)}>
                        Link
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rh-footer">© 2025 REDHOT — All rights reserved</div>
    </div>
  );
}