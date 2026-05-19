import { useState, useEffect, useRef, useCallback } from "react";

export default function RedHotIntro({ onComplete }) {
  const [phase, setPhase] = useState(0);
  const [glitch, setGlitch] = useState(false);
  const audioCtxRef = useRef(null);
  const timersRef = useRef([]);

  const triggerGlitch = useCallback(() => {
    let count = 0;
    const interval = setInterval(() => {
      setGlitch((g) => !g);
      count++;
      if (count > 8) clearInterval(interval);
    }, 80);
  }, []);

  const playThunder = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === "suspended") ctx.resume();
      audioCtxRef.current = ctx;
      const rumbleDuration = 2.8;
      const sr = ctx.sampleRate;
      const buf = ctx.createBuffer(2, sr * rumbleDuration, sr);
      for (let ch = 0; ch < 2; ch++) {
        const d = buf.getChannelData(ch);
        for (let i = 0; i < d.length; i++) {
          const t = i / sr;
          const crack = t < 0.08 ? Math.exp(-t * 30) * (Math.random() * 2 - 1) * 1.5 : 0;
          const rumble = Math.exp(-t * 1.2) * (Math.random() * 2 - 1) * 0.6;
          const tail = t > 0.3 ? Math.exp(-(t - 0.3) * 0.8) * (Math.random() * 2 - 1) * 0.2 : 0;
          d[i] = crack + rumble + tail;
        }
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const lp1 = ctx.createBiquadFilter(); lp1.type = "lowpass"; lp1.frequency.value = 400;
      const lp2 = ctx.createBiquadFilter(); lp2.type = "lowpass"; lp2.frequency.value = 200;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(1.2, ctx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + rumbleDuration);
      src.connect(lp1); lp1.connect(lp2); lp2.connect(gain); gain.connect(ctx.destination);
      src.start();
      const cb = ctx.createBuffer(1, sr * 0.15, sr);
      const cd = cb.getChannelData(0);
      for (let i = 0; i < cd.length; i++) {
        const t = i / sr;
        cd[i] = Math.exp(-t * 60) * (Math.random() * 2 - 1) * 2;
      }
      const cs = ctx.createBufferSource(); cs.buffer = cb;
      const cg = ctx.createGain(); cg.gain.value = 1.5;
      cs.connect(cg); cg.connect(ctx.destination);
      cs.start(ctx.currentTime + 0.01);
    } catch { /* autoplay policy — silent fail */ }
  }, []);

  useEffect(() => {
    const t0 = setTimeout(() => { setPhase(1); playThunder(); }, 300);
    const t1 = setTimeout(() => setPhase(2), 900);
    const t2 = setTimeout(() => { setPhase(3); triggerGlitch(); }, 1800);
    const t3 = setTimeout(() => setPhase(4), 3200);
    const t4 = setTimeout(() => { if (onComplete) onComplete(); }, 4000);
    timersRef.current = [t0, t1, t2, t3, t4];
    return () => {
      timersRef.current.forEach(clearTimeout);
      if (audioCtxRef.current) audioCtxRef.current.close().catch(() => {});
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      role="presentation"
      style={{
        position: "fixed", inset: 0, zIndex: 99999,
        background: "#f7f5f2",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        overflow: "hidden",
        opacity: phase === 4 ? 0 : 1,
        transition: phase === 4 ? "opacity 0.8s ease" : "none",
        pointerEvents: phase === 4 ? "none" : "all",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
        @keyframes screenFlash { 0%{opacity:0} 10%{opacity:0.7} 20%{opacity:0.1} 30%{opacity:0.5} 50%,100%{opacity:0} }
        @keyframes logoReveal { 0%{opacity:0;transform:scale(0.85) translateY(10px)} 60%{opacity:1;transform:scale(1.02) translateY(-2px)} 100%{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes taglineIn { 0%{opacity:0;transform:translateY(12px)} 100%{opacity:1;transform:translateY(0)} }
        @keyframes glowPulse { 0%,100%{filter:drop-shadow(0 0 8px rgba(200,30,30,0.5))} 50%{filter:drop-shadow(0 0 20px rgba(200,30,30,0.9)) drop-shadow(0 0 40px rgba(200,30,30,0.4))} }
        @keyframes crackBg { 0%{opacity:0;transform:scale(0.6) rotate(-5deg)} 30%{opacity:0.12;transform:scale(1.05) rotate(0deg)} 60%{opacity:0.07} 100%{opacity:0.09;transform:scale(1) rotate(0deg)} }
        @keyframes lineGrow { from{width:0} to{width:100%} }
        @keyframes glitchA { 0%{clip-path:inset(0 0 95% 0);transform:translate(-4px,0)} 20%{clip-path:inset(30% 0 50% 0);transform:translate(4px,0)} 40%{clip-path:inset(60% 0 20% 0);transform:translate(-2px,0)} 60%{clip-path:inset(10% 0 80% 0);transform:translate(3px,0)} 80%{clip-path:inset(80% 0 5% 0);transform:translate(-3px,0)} 100%{clip-path:inset(0 0 95% 0);transform:translate(0,0)} }
        @keyframes glitchB { 0%{clip-path:inset(50% 0 30% 0);transform:translate(4px,0)} 25%{clip-path:inset(20% 0 60% 0);transform:translate(-4px,0)} 50%{clip-path:inset(70% 0 10% 0);transform:translate(2px,0)} 75%{clip-path:inset(5% 0 85% 0);transform:translate(-2px,0)} 100%{clip-path:inset(50% 0 30% 0);transform:translate(0,0)} }
        @keyframes scanline { 0%{transform:translateY(-100%)} 100%{transform:translateY(100vh)} }
        .glitch-wrap { position:relative; display:inline-block; }
        .glitch-wrap::before,.glitch-wrap::after { content:attr(data-text); position:absolute; inset:0; font-family:'Cormorant Garamond',serif; font-weight:700; font-size:inherit; line-height:1; letter-spacing:0.02em; }
        .glitch-wrap::before { color:#00ffff; animation:glitchA 0.15s steps(1) infinite; opacity:0.7; }
        .glitch-wrap::after  { color:#ff0055; animation:glitchB 0.15s steps(1) infinite; opacity:0.7; }
      `}</style>

      {phase >= 1 && (
        <div style={{ position:"absolute", inset:0, pointerEvents:"none", zIndex:20, overflow:"hidden" }}>
          <div style={{ position:"absolute", left:0, right:0, height:"2px", background:"rgba(200,30,30,0.3)", animation:"scanline 2s linear infinite" }} />
        </div>
      )}
      {phase >= 1 && (
        <div style={{ position:"absolute", inset:0, background:"radial-gradient(ellipse at center, #fff5f5 0%, rgba(200,30,30,0.15) 60%, transparent 100%)", animation:"screenFlash 0.8s ease forwards", pointerEvents:"none", zIndex:10 }} />
      )}
      {phase >= 1 && (
        <svg viewBox="0 0 400 600" aria-hidden="true" style={{ position:"absolute", width:"clamp(300px,70vw,500px)", height:"auto", opacity:0, animation:"crackBg 1.2s ease forwards", pointerEvents:"none" }}>
          <path d="M220,0 L170,180 L210,180 L140,380 L190,380 L100,600 L160,600 L130,420 L185,420 L240,220 L200,220 L260,0 Z" fill="none" stroke="#c81e1e" strokeWidth="3" opacity="0.3" />
          <path d="M185,420 L220,480 L200,480 L230,540" fill="none" stroke="#c81e1e" strokeWidth="1.5" opacity="0.2" />
          <path d="M240,220 L280,280 L260,280 L290,330" fill="none" stroke="#c81e1e" strokeWidth="1.5" opacity="0.2" />
        </svg>
      )}

      <div style={{ position:"relative", zIndex:5, textAlign:"center" }}>
        {phase >= 2 && (
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:"0.2em", opacity:0, animation:"logoReveal 0.7s cubic-bezier(0.22,1,0.36,1) forwards" }}>
            <svg viewBox="0 0 28 44" aria-hidden="true" style={{ width:"clamp(28px,5vw,44px)", height:"auto", flexShrink:0, animation:"glowPulse 1.8s ease-in-out 0.7s infinite" }}>
              <path d="M18,1 L6,22 L13,22 L8,43 L24,18 L16,18 L22,1 Z" fill="#c81e1e" stroke="#c81e1e" strokeWidth="0.5" strokeLinejoin="round" />
              <path d="M8,43 L4,36 M8,43 L11,39" stroke="#c81e1e" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.6" />
            </svg>
            <span className={glitch ? "glitch-wrap" : ""} data-text="redhot" style={{ fontFamily:"'Cormorant Garamond',serif", fontWeight:700, fontSize:"clamp(3.2rem,10vw,7rem)", lineHeight:1, letterSpacing:"0.02em", color:"#c81e1e", display:"inline-block" }}>redhot</span>
            <span style={{ fontFamily:"'Cormorant Garamond',serif", fontWeight:300, fontSize:"clamp(1.4rem,4vw,2.8rem)", lineHeight:1, color:"#9e8f7e", alignSelf:"flex-end", marginBottom:"0.3em", letterSpacing:"0.05em" }}>-7</span>
          </div>
        )}
        {phase >= 2 && (
          <div style={{ height:"1.5px", background:"linear-gradient(90deg,transparent,#c81e1e,transparent)", marginTop:"0.6rem", boxShadow:"0 0 10px rgba(200,30,30,0.5)", animation:"lineGrow 0.6s ease 0.4s both" }} />
        )}
        {phase >= 3 && (
          <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"clamp(0.65rem,1.6vw,0.8rem)", letterSpacing:"0.38em", textTransform:"uppercase", color:"#9e8f7e", marginTop:"1.1rem", animation:"taglineIn 0.7s ease forwards" }}>
            Curated &amp; Coveted
          </div>
        )}
      </div>

      {phase >= 3 && (
        <div style={{ position:"absolute", bottom:"2rem", fontFamily:"'DM Sans',sans-serif", fontSize:"0.6rem", letterSpacing:"0.5em", color:"#d4c9b8", textTransform:"uppercase", animation:"taglineIn 1s ease 0.2s both" }}>
          New Arrivals
        </div>
      )}
    </div>
  );
}
