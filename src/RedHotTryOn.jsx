import { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

const API = "http://localhost:3001";

function useProducts() {
  const [products, setProducts] = useState([]);
  useEffect(() => {
    axios.get(`${API}/products`)
      .then(res => setProducts(res.data))
      .catch(err => console.error(err));
  }, []);
  return products;
}

function MannequinSVG() {
  return (
    <svg viewBox="0 0 200 480" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 3, pointerEvents: "none" }}>
      <ellipse cx="100" cy="42" rx="28" ry="33" stroke="#c81e1e" strokeWidth="1.5" opacity="0.5"/>
      <path d="M90,73 L90,92 M110,73 L110,92" stroke="#c81e1e" strokeWidth="1.5" opacity="0.5"/>
      <path d="M90,92 Q65,98 52,115 L38,175 L50,195 L65,190 L72,175 L68,120 L90,108" stroke="#c81e1e" strokeWidth="1.5" opacity="0.5" strokeLinejoin="round"/>
      <path d="M110,92 Q135,98 148,115 L162,175 L150,195 L135,190 L128,175 L132,120 L110,108" stroke="#c81e1e" strokeWidth="1.5" opacity="0.5" strokeLinejoin="round"/>
      <path d="M68,120 L68,225 Q80,235 100,236 Q120,235 132,225 L132,120" stroke="#c81e1e" strokeWidth="1.5" opacity="0.5"/>
      <line x1="68" y1="225" x2="132" y2="225" stroke="#c81e1e" strokeWidth="1" strokeDasharray="4,3" opacity="0.4"/>
      <path d="M72,225 L68,390 L80,412 L95,412 L98,370 L100,236" stroke="#c81e1e" strokeWidth="1.5" opacity="0.5" strokeLinejoin="round"/>
      <path d="M128,225 L132,390 L120,412 L105,412 L102,370 L100,236" stroke="#c81e1e" strokeWidth="1.5" opacity="0.5" strokeLinejoin="round"/>
      <ellipse cx="82" cy="416" rx="14" ry="7" stroke="#c81e1e" strokeWidth="1.5" opacity="0.5"/>
      <ellipse cx="118" cy="416" rx="14" ry="7" stroke="#c81e1e" strokeWidth="1.5" opacity="0.5"/>
    </svg>
  );
}

export default function RedHotTryOn() {
  const products = useProducts();
  const [selectedTop, setSelectedTop]       = useState(null);
  const [selectedBottom, setSelectedBottom] = useState(null);
  const [verdict, setVerdict]               = useState("");
  const [loading, setLoading]               = useState(false);

  const wearable = products.filter(p => p.category === "Men" || p.category === "Women");

  const getVerdict = async () => {
    if (!selectedTop && !selectedBottom) return;
    setLoading(true);
    setVerdict("");
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: `You are a sharp, editorial fashion stylist for Redhot — a curated luxury streetwear store. Analyze this outfit and give a punchy style verdict in 2-3 sentences. Include a style score out of 10.

Top: ${selectedTop ? `${selectedTop.name} — ₹${selectedTop.price?.toLocaleString()}` : "None selected"}
Bottom: ${selectedBottom ? `${selectedBottom.name} — ₹${selectedBottom.price?.toLocaleString()}` : "None selected"}

Be bold, fashion-forward, and specific.`
          }]
        })
      });
      const data = await res.json();
      setVerdict(data.content[0].text);
    } catch {
      setVerdict("Style verdict unavailable right now.");
    }
    setLoading(false);
  };

  return (
    <div style={{ fontFamily: "'Cormorant Garamond', serif", background: "#f7f5f2", minHeight: "100vh", color: "#2c2c2c" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
        :root {
          --cream:#f7f5f2; --warm:#ede8e0; --sand:#d4c9b8; --taupe:#9e8f7e;
          --umber:#5c4f3d; --charcoal:#2c2c2c; --white:#ffffff;
          --red:#c81e1e; --red-dim:rgba(200,30,30,0.10);
        }
        * { box-sizing: border-box; }

        .tryon-navbar {
          background: rgba(247,245,242,0.96); backdrop-filter: blur(14px);
          border-bottom: 1px solid var(--warm); padding: 0 2rem;
          height: 64px; display: flex; align-items: center;
          justify-content: space-between; position: sticky; top: 0; z-index: 50;
        }
        .tryon-brand { font-family:'Cormorant Garamond',serif; font-weight:700; font-size:1.6rem; color:var(--red); letter-spacing:0.04em; text-decoration:none; }
        .tryon-back { font-family:'DM Sans',sans-serif; font-size:11px; letter-spacing:0.18em; text-transform:uppercase; background:transparent; border:1px solid var(--sand); color:var(--taupe); padding:7px 18px; border-radius:3px; cursor:pointer; transition:all 0.2s; text-decoration:none; display:inline-block; }
        .tryon-back:hover { border-color:var(--red); color:var(--red); background:var(--red-dim); }

        .tryon-header { text-align:center; padding:48px 2rem 36px; border-bottom:1px solid var(--warm); background:linear-gradient(160deg,var(--warm) 0%,var(--cream) 60%); }
        .tryon-header-eyebrow { font-family:'DM Sans',sans-serif; font-size:10px; letter-spacing:0.38em; color:var(--taupe); text-transform:uppercase; margin-bottom:0.8rem; }
        .tryon-header-title { font-family:'Cormorant Garamond',serif; font-size:clamp(2rem,5vw,3.5rem); font-weight:700; color:var(--charcoal); line-height:1.1; }
        .tryon-header-title span { color:var(--red); font-style:italic; }
        .tryon-header-sub { font-family:'DM Sans',sans-serif; font-size:12px; color:var(--taupe); letter-spacing:0.1em; margin-top:0.8rem; }

        .tryon-layout {
          display: grid;
          grid-template-columns: 1fr 260px 1fr;
          min-height: calc(100vh - 180px);
        }

        .tryon-panel {
          padding: 2rem 1.2rem;
          border-right: 1px solid var(--warm);
          overflow-y: auto;
          max-height: calc(100vh - 180px);
          position: sticky;
          top: 64px;
        }
        .tryon-panel-right { border-right:none; border-left:1px solid var(--warm); }

        .tryon-panel-eyebrow { font-family:'DM Sans',sans-serif; font-size:9px; letter-spacing:0.3em; text-transform:uppercase; color:var(--taupe); margin-bottom:0.5rem; }
        .tryon-panel-heading { font-family:'Cormorant Garamond',serif; font-size:1.6rem; font-weight:700; color:var(--charcoal); margin-bottom:1.2rem; }
        .tryon-panel-heading span { color:var(--red); font-style:italic; }

        .tryon-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
        .tryon-card { border:1.5px solid var(--warm); border-radius:5px; overflow:hidden; cursor:pointer; transition:all 0.2s; background:var(--white); position:relative; }
        .tryon-card:hover { border-color:var(--red); transform:translateY(-2px); box-shadow:0 8px 20px var(--red-dim); }
        .tryon-card.selected { border-color:var(--red); box-shadow:0 0 0 2px var(--red); }
        .tryon-card img { width:100%; height:110px; object-fit:cover; display:block; background:var(--warm); }
        .tryon-card-info { padding:7px 9px; }
        .tryon-card-name { font-family:'Cormorant Garamond',serif; font-size:0.82rem; font-weight:600; color:var(--charcoal); line-height:1.2; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .tryon-card-price { font-family:'DM Sans',sans-serif; font-size:10px; font-weight:600; color:var(--red); margin-top:2px; }
        .tryon-card-badge { position:absolute; top:5px; right:5px; background:var(--red); color:#fff; font-family:'DM Sans',sans-serif; font-size:7px; letter-spacing:0.15em; padding:2px 6px; border-radius:2px; text-transform:uppercase; }

        .tryon-center {
          background: var(--cream);
          display: flex; flex-direction:column; align-items:center;
          padding: 2rem 1rem 2.5rem;
          position: sticky; top: 64px;
          max-height: calc(100vh - 180px);
          overflow-y: auto;
        }
        .tryon-center-label { font-family:'DM Sans',sans-serif; font-size:9px; letter-spacing:0.3em; text-transform:uppercase; color:var(--taupe); margin-bottom:1.2rem; text-align:center; }

        .mannequin-wrap { position:relative; width:180px; height:440px; flex-shrink:0; }

        .m-top-zone {
          position:absolute; top:0; left:0; right:0; height:48%;
          overflow:hidden;
          clip-path: polygon(33% 0%,67% 0%,72% 7%,82% 12%,100% 24%,97% 46%,86% 48%,70% 46%,67% 100%,33% 100%,30% 46%,14% 48%,3% 46%,0% 24%,18% 12%,28% 7%);
        }
        .m-top-zone img { width:100%; height:100%; object-fit:cover; }
        .m-top-empty { width:100%; height:100%; background:linear-gradient(180deg,var(--warm),var(--sand)); display:flex; align-items:center; justify-content:center; flex-direction:column; gap:5px; }

        .m-bottom-zone {
          position:absolute; bottom:0; left:0; right:0; height:55%;
          overflow:hidden;
          clip-path: polygon(26% 0%,74% 0%,82% 9%,76% 100%,60% 100%,55% 48%,45% 48%,40% 100%,24% 100%,18% 9%);
        }
        .m-bottom-zone img { width:100%; height:100%; object-fit:cover; }
        .m-bottom-empty { width:100%; height:100%; background:linear-gradient(180deg,var(--sand),var(--warm)); display:flex; align-items:center; justify-content:center; flex-direction:column; gap:5px; }

        .m-empty-icon { font-size:1.2rem; opacity:0.35; }
        .m-empty-text { font-family:'DM Sans',sans-serif; font-size:8px; letter-spacing:0.2em; text-transform:uppercase; color:var(--taupe); }

        .tryon-strip { margin-top:1.2rem; width:100%; display:flex; flex-direction:column; gap:6px; }
        .tryon-strip-item { display:flex; align-items:center; gap:8px; background:var(--white); border:1px solid var(--warm); border-radius:4px; padding:7px 9px; }
        .tryon-strip-item img { width:32px; height:32px; object-fit:cover; border-radius:3px; }
        .tryon-strip-label { font-family:'DM Sans',sans-serif; font-size:8px; letter-spacing:0.15em; text-transform:uppercase; color:var(--taupe); }
        .tryon-strip-name { font-family:'Cormorant Garamond',serif; font-size:0.85rem; font-weight:600; color:var(--charcoal); }
        .tryon-strip-remove { margin-left:auto; background:none; border:none; color:var(--sand); cursor:pointer; font-size:13px; transition:color 0.2s; line-height:1; }
        .tryon-strip-remove:hover { color:var(--red); }

        .verdict-btn { font-family:'DM Sans',sans-serif; font-size:10px; font-weight:600; letter-spacing:0.2em; text-transform:uppercase; background:var(--red); color:var(--white); border:none; padding:11px 0; border-radius:3px; cursor:pointer; transition:all 0.2s; margin-top:1.2rem; width:100%; }
        .verdict-btn:hover { background:#a01515; box-shadow:0 6px 16px rgba(200,30,30,0.3); }
        .verdict-btn:disabled { background:var(--sand); cursor:not-allowed; }
        .verdict-box { margin-top:1rem; padding:14px 16px; background:var(--white); border:1px solid var(--warm); border-left:3px solid var(--red); border-radius:4px; font-family:'DM Sans',sans-serif; font-size:12px; color:var(--umber); line-height:1.7; width:100%; }

        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        .loading-pulse { animation:pulse 1.2s ease-in-out infinite; }

        @media(max-width:860px) {
          .tryon-layout { grid-template-columns:1fr; }
          .tryon-panel { position:relative; top:0; max-height:none; border-right:none; border-bottom:1px solid var(--warm); }
          .tryon-panel-right { border-left:none; border-top:1px solid var(--warm); }
          .tryon-center { position:relative; top:0; max-height:none; }
        }
      `}</style>

      {/* NAVBAR */}
      <div className="tryon-navbar">
        <span className="tryon-brand">redhot</span>
        <Link to="/" className="tryon-back">← Back to Store</Link>
      </div>

      {/* HEADER */}
      <div className="tryon-header">
        <div className="tryon-header-eyebrow">New Feature</div>
        <h1 className="tryon-header-title">Virtual <span>Changing Room</span></h1>
        <p className="tryon-header-sub">Pick a top & bottom — see the combo, get an AI style verdict</p>
      </div>

      <div className="tryon-layout">

        {/* LEFT — TOP SELECTOR */}
        <div className="tryon-panel">
          <div className="tryon-panel-eyebrow">Step 1</div>
          <div className="tryon-panel-heading">Pick your <span>Top</span></div>
          {wearable.length === 0
            ? <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:"var(--sand)" }}>Loading…</div>
            : <div className="tryon-grid">
                {wearable.map(p => (
                  <div key={p.id}
                    className={`tryon-card ${selectedTop?.id === p.id ? "selected" : ""}`}
                    onClick={() => { setSelectedTop(selectedTop?.id === p.id ? null : p); setVerdict(""); }}
                  >
                    {selectedTop?.id === p.id && <span className="tryon-card-badge">Top ✓</span>}
                    <img src={p.image || "https://via.placeholder.com/200"} alt={p.name} onError={e => { e.target.src = "https://via.placeholder.com/200"; }} />
                    <div className="tryon-card-info">
                      <div className="tryon-card-name">{p.name}</div>
                      <div className="tryon-card-price">₹{(p.price||0).toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
          }
        </div>

        {/* CENTER — MANNEQUIN */}
        <div className="tryon-center">
          <div className="tryon-center-label">Your Look</div>

          <div className="mannequin-wrap">
            <div className="m-top-zone">
              {selectedTop
                ? <img src={selectedTop.image} alt={selectedTop.name} onError={e => { e.target.src = "https://via.placeholder.com/200"; }} />
                : <div className="m-top-empty">
                    <span className="m-empty-icon">👕</span>
                    <span className="m-empty-text">Top</span>
                  </div>
              }
            </div>
            <div className="m-bottom-zone">
              {selectedBottom
                ? <img src={selectedBottom.image} alt={selectedBottom.name} onError={e => { e.target.src = "https://via.placeholder.com/200"; }} />
                : <div className="m-bottom-empty">
                    <span className="m-empty-icon">👖</span>
                    <span className="m-empty-text">Bottom</span>
                  </div>
              }
            </div>
            <MannequinSVG />
          </div>

          {/* Selected strip */}
          <div className="tryon-strip">
            {selectedTop && (
              <div className="tryon-strip-item">
                <img src={selectedTop.image} alt="" onError={e => { e.target.src = "https://via.placeholder.com/32"; }} />
                <div>
                  <div className="tryon-strip-label">Top</div>
                  <div className="tryon-strip-name">{selectedTop.name}</div>
                </div>
                <button className="tryon-strip-remove" onClick={() => { setSelectedTop(null); setVerdict(""); }}>✕</button>
              </div>
            )}
            {selectedBottom && (
              <div className="tryon-strip-item">
                <img src={selectedBottom.image} alt="" onError={e => { e.target.src = "https://via.placeholder.com/32"; }} />
                <div>
                  <div className="tryon-strip-label">Bottom</div>
                  <div className="tryon-strip-name">{selectedBottom.name}</div>
                </div>
                <button className="tryon-strip-remove" onClick={() => { setSelectedBottom(null); setVerdict(""); }}>✕</button>
              </div>
            )}
          </div>

          <button
            className="verdict-btn"
            onClick={getVerdict}
            disabled={(!selectedTop && !selectedBottom) || loading}
          >
            {loading
              ? <span className="loading-pulse">Analysing Style…</span>
              : "✦ Get Style Verdict"
            }
          </button>

          {verdict && <div className="verdict-box">{verdict}</div>}
        </div>

        {/* RIGHT — BOTTOM SELECTOR */}
        <div className="tryon-panel tryon-panel-right">
          <div className="tryon-panel-eyebrow">Step 2</div>
          <div className="tryon-panel-heading">Pick your <span>Bottom</span></div>
          {wearable.length === 0
            ? <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:"var(--sand)" }}>Loading…</div>
            : <div className="tryon-grid">
                {wearable.map(p => (
                  <div key={p.id}
                    className={`tryon-card ${selectedBottom?.id === p.id ? "selected" : ""}`}
                    onClick={() => { setSelectedBottom(selectedBottom?.id === p.id ? null : p); setVerdict(""); }}
                  >
                    {selectedBottom?.id === p.id && <span className="tryon-card-badge">Bottom ✓</span>}
                    <img src={p.image || "https://via.placeholder.com/200"} alt={p.name} onError={e => { e.target.src = "https://via.placeholder.com/200"; }} />
                    <div className="tryon-card-info">
                      <div className="tryon-card-name">{p.name}</div>
                      <div className="tryon-card-price">₹{(p.price||0).toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
          }
        </div>

      </div>

      <div style={{ background:"#2c2c2c", color:"#9e8f7e", textAlign:"center", padding:"1.5rem", fontFamily:"'DM Sans',sans-serif", fontSize:11, letterSpacing:"0.16em" }}>
        © 2025 REDHOT — All rights reserved
      </div>
    </div>
  );
}