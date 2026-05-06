import { useState, useEffect, useRef } from "react";

export default function RedhotIntro({ onComplete }) {
  const [phase, setPhase] = useState(0);
  const audioCtxRef = useRef(null);

  // 0 = cream screen
  // 1 = thunder bg + flash
  // 2 = logo appears
  // 3 = tagline appears
  // 4 = exit fade

  const playThunder = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = ctx;
      const rumbleDuration = 2.8;
      const sampleRate = ctx.sampleRate;
      const bufferSize = sampleRate * rumbleDuration;
      const buffer = ctx.createBuffer(2, bufferSize, sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const data = buffer.getChannelData(ch);
        for (let i = 0; i < bufferSize; i++) {
          const t = i / sampleRate;
          const crack = t < 0.08 ? Math.exp(-t * 30) * (Math.random() * 2 - 1) * 1.5 : 0;
          const rumble = Math.exp(-t * 1.2) * (Math.random() * 2 - 1) * 0.6;
          const tail = t > 0.3 ? Math.exp(-(t - 0.3) * 0.8) * (Math.random() * 2 - 1) * 0.2 : 0;
          data[i] = crack + rumble + tail;
        }
      }
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const lowpass = ctx.createBiquadFilter();
      lowpass.type = "lowpass";
      lowpass.frequency.value = 400;
      const lowpass2 = ctx.createBiquadFilter();
      lowpass2.type = "lowpass";
      lowpass2.frequency.value = 200;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(1.2, ctx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + rumbleDuration);
      source.connect(lowpass);
      lowpass.connect(lowpass2);
      lowpass2.connect(gain);
      gain.connect(ctx.destination);
      source.start();
      const crackBuffer = ctx.createBuffer(1, sampleRate * 0.15, sampleRate);
      const crackData = crackBuffer.getChannelData(0);
      for (let i = 0; i < crackData.length; i++) {
        const t = i / sampleRate;
        crackData[i] = Math.exp(-t * 60) * (Math.random() * 2 - 1) * 2;
      }
      const crackSrc = ctx.createBufferSource();
      crackSrc.buffer = crackBuffer;
      const crackGain = ctx.createGain();
      crackGain.gain.value = 1.5;
      crackSrc.connect(crackGain);
      crackGain.connect(ctx.destination);
      crackSrc.start(ctx.currentTime + 0.01);
    } catch (e) {}
  };

  useEffect(() => {
    const t0 = setTimeout(() => { setPhase(1); playThunder(); }, 300);
    const t1 = setTimeout(() => setPhase(2), 900);
    const t2 = setTimeout(() => setPhase(3), 1800);
    const t3 = setTimeout(() => setPhase(4), 3200);
    const t4 = setTimeout(() => { if (onComplete) onComplete(); }, 4000);
    return () => [t0, t1, t2, t3, t4].forEach(clearTimeout);
  }, []);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 99999,
      background: "#f7f5f2",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      overflow: "hidden",
      opacity: phase === 4 ? 0 : 1,
      transition: phase === 4 ? "opacity 0.8s ease" : "none",
      pointerEvents: phase === 4 ? "none" : "all",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');

        @keyframes screenFlash {
          0%   { opacity: 0; }
          10%  { opacity: 0.7; }
          20%  { opacity: 0.1; }
          30%  { opacity: 0.5; }
          50%  { opacity: 0; }
          100% { opacity: 0; }
        }
        @keyframes logoReveal {
          0%   { opacity: 0; transform: scale(0.85) translateY(10px); }
          60%  { opacity: 1; transform: scale(1.02) translateY(-2px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes taglineIn {
          0%   { opacity: 0; transform: translateY(12px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes glowPulse {
          0%, 100% { filter: drop-shadow(0 0 8px rgba(200,30,30,0.5)); }
          50%       { filter: drop-shadow(0 0 20px rgba(200,30,30,0.9)) drop-shadow(0 0 40px rgba(200,30,30,0.4)); }
        }
        @keyframes crackBg {
          0%   { opacity: 0; transform: scale(0.6) rotate(-5deg); }
          30%  { opacity: 0.12; transform: scale(1.05) rotate(0deg); }
          60%  { opacity: 0.07; }
          100% { opacity: 0.09; transform: scale(1) rotate(0deg); }
        }
        @keyframes lineGrow {
          from { width: 0; }
          to   { width: 100%; }
        }
      `}</style>

      {/* FLASH */}
      {phase >= 1 && (
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse at center, #fff5f5 0%, rgba(200,30,30,0.15) 60%, transparent 100%)",
          animation: "screenFlash 0.8s ease forwards",
          pointerEvents: "none",
          zIndex: 10,
        }} />
      )}

      {/* BG THUNDER CRACK */}
      {phase >= 1 && (
        <svg viewBox="0 0 400 600" style={{
          position: "absolute",
          width: "clamp(300px, 70vw, 500px)",
          height: "auto",
          opacity: 0,
          animation: "crackBg 1.2s ease forwards",
          pointerEvents: "none",
        }}>
          <path
            d="M220,0 L170,180 L210,180 L140,380 L190,380 L100,600 L160,600 L130,420 L185,420 L240,220 L200,220 L260,0 Z"
            fill="none" stroke="#c81e1e" strokeWidth="3" opacity="0.3"
          />
          <path d="M185,420 L220,480 L200,480 L230,540" fill="none" stroke="#c81e1e" strokeWidth="1.5" opacity="0.2" />
          <path d="M240,220 L280,280 L260,280 L290,330" fill="none" stroke="#c81e1e" strokeWidth="1.5" opacity="0.2" />
        </svg>
      )}

      {/* MAIN CONTENT */}
      <div style={{ position: "relative", zIndex: 5, textAlign: "center" }}>

        {/* LOGO */}
        {phase >= 2 && (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            gap: "0.2em",
            opacity: 0,
            animation: "logoReveal 0.7s cubic-bezier(0.22,1,0.36,1) forwards",
          }}>
            <svg viewBox="0 0 28 44" style={{
              width: "clamp(28px,5vw,44px)", height: "auto", flexShrink: 0,
              animation: "glowPulse 1.8s ease-in-out 0.7s infinite",
            }}>
              <path d="M18,1 L6,22 L13,22 L8,43 L24,18 L16,18 L22,1 Z"
                fill="#c81e1e" stroke="#c81e1e" strokeWidth="0.5" strokeLinejoin="round" />
              <path d="M8,43 L4,36 M8,43 L11,39"
                stroke="#c81e1e" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.6" />
            </svg>
            <span style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontWeight: 700,
              fontSize: "clamp(3.2rem, 10vw, 7rem)",
              lineHeight: 1,
              letterSpacing: "0.02em",
              color: "#c81e1e",
            }}>redhot</span>
            <span style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontWeight: 300,
              fontSize: "clamp(1.4rem, 4vw, 2.8rem)",
              lineHeight: 1,
              color: "#9e8f7e",
              alignSelf: "flex-end",
              marginBottom: "0.3em",
              letterSpacing: "0.05em",
            }}>-7</span>
          </div>
        )}

        {/* RED LINE */}
        {phase >= 2 && (
          <div style={{
            height: "1.5px",
            background: "linear-gradient(90deg, transparent, #c81e1e, transparent)",
            marginTop: "0.6rem",
            boxShadow: "0 0 10px rgba(200,30,30,0.5)",
            animation: "lineGrow 0.6s ease 0.4s both",
          }} />
        )}

        {/* TAGLINE — always visible once phase >= 3 */}
        {phase >= 3 && (
          <div style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "clamp(0.65rem, 1.6vw, 0.8rem)",
            letterSpacing: "0.38em",
            textTransform: "uppercase",
            color: "#9e8f7e",
            marginTop: "1.1rem",
            animation: "taglineIn 0.7s ease forwards",
          }}>
            Curated & Coveted
          </div>
        )}
      </div>

      {/* BOTTOM STAMP */}
      {phase >= 3 && (
        <div style={{
          position: "absolute", bottom: "2rem",
          fontFamily: "'DM Sans', sans-serif",
          fontSize: "0.6rem",
          letterSpacing: "0.5em",
          color: "#d4c9b8",
          textTransform: "uppercase",
          animation: "taglineIn 1s ease 0.2s both",
        }}>
          New Arrivals
        </div>
      )}
    </div>
  );
}