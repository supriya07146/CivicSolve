import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import logo from "../assets/logo-mark-white.png";
import "../styles/LandingPage.css";

/* ------------------------------------------------------------------ */
/*  Hero image setting                                                 */
/*  false = animated SVG illustration (needs no file)                  */
/*  true  = PNG from public/hero-illustration.png (falls back to SVG) */
/* ------------------------------------------------------------------ */
const USE_PNG = false;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

// Counts up to `end` the first time the element scrolls into view
function Counter({ end, decimals = 0, suffix = "", duration = 1600 }) {
  const ref = useRef(null);
  const [value, setValue] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        const start = performance.now();
        const tick = (now) => {
          const p = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          setValue(end * eased);
          if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.4 }
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [end, duration]);

  const text =
    decimals > 0
      ? value.toFixed(decimals)
      : Math.round(value).toLocaleString("en-IN");

  return (
    <span ref={ref}>
      {text}
      {suffix}
    </span>
  );
}

// Adds .is-visible to every .cs-reveal element when it enters the viewport
function useReveal() {
  useEffect(() => {
    const items = document.querySelectorAll(".cs-reveal");
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            observer.unobserve(e.target);
          }
        }),
      { threshold: 0.12 }
    );
    items.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

// All styles for the hero illustration live here, so it works even if
// LandingPage.css is old or cached. Selectors are prefixed for strength.
const HERO_ART_CSS = `
.cs-landing .cs-hero-inner { display: grid; grid-template-columns: 0.85fr 1.15fr; gap: 30px; align-items: center; }
.cs-landing .cs-hero-art { display: block; min-width: 0; }
.cs-landing .csx-art { --mx: 0; --my: 0; position: relative; display: block; width: 100%; max-width: 680px; margin: 0 auto; }
.cs-landing .csx-art-svg, .cs-landing .csx-art-img { max-width: none; max-height: none; position: absolute; top: 0; left: 0; z-index: 2; width: 100%; height: 100%; display: block; object-fit: contain; filter: drop-shadow(0 24px 30px rgba(10,27,48,0.12)); translate: calc(var(--mx) * 12px) calc(var(--my) * 9px); transition: translate 0.25s ease-out; }
.cs-landing .csx-art-img { border-radius: 24px; animation: csxImgFloat 6s ease-in-out infinite; }

.cs-landing .csx-art-blob { position: absolute; z-index: 1; top: 6%; left: 4%; right: 4%; bottom: 4%; background: radial-gradient(circle at 50% 45%, rgba(255,255,255,0.95), rgba(20,211,172,0.18) 70%, transparent 72%); border-radius: 50%; animation: csxBlob 9s ease-in-out infinite; }
.cs-landing .csx-art-ring { position: absolute; z-index: 1; top: 0; bottom: 0; left: 10%; right: 10%; border: 2px dashed rgba(15,157,132,0.3); border-radius: 50%; animation: csxSpin 46s linear infinite; pointer-events: none; }
.cs-landing .csx-art-ring-2 { top: 7%; bottom: 7%; left: 17%; right: 17%; border: 2px dotted rgba(14,165,198,0.4); animation: csxSpinBack 60s linear infinite; }

.cs-landing .csx-tree { transform-box: fill-box; transform-origin: 50% 100%; animation: csxSway 5s ease-in-out infinite; }
.cs-landing .csx-person { transform-box: fill-box; transform-origin: 50% 100%; animation: csxBob 3.2s ease-in-out infinite; }
.cs-landing .csx-cloud-1 { animation: csxDrift 11s ease-in-out infinite; }
.cs-landing .csx-cloud-2 { animation: csxDrift 14s ease-in-out infinite reverse; }
.cs-landing .csx-bulb { animation: csxBulbBob 3s ease-in-out infinite; }
.cs-landing .csx-bulb-glow { transform-box: fill-box; transform-origin: center; animation: csxBulbGlow 2.6s ease-in-out infinite; }
.cs-landing .csx-rays { animation: csxRays 2.6s ease-in-out infinite; }
.cs-landing .csx-orbit { transform-box: fill-box; transform-origin: center; animation: csxSpin 16s linear infinite; }
.cs-landing .csx-bird { animation: csxFly 16s linear infinite; }
.cs-landing .csx-bird-2 { animation-duration: 21s; }
.cs-landing .csx-bird > path { transform-box: fill-box; transform-origin: center; animation: csxFlap 0.5s ease-in-out infinite; }
.cs-landing .csx-star { transform-box: fill-box; transform-origin: center; animation: csxTwinkle 2.8s ease-in-out infinite; }
.cs-landing .csx-lit { opacity: 0; animation: csxLit 6s ease-in-out infinite; }
.cs-landing .csx-car { animation: csxDrive 9s linear infinite; }
.cs-landing .csx-pin { transform-box: fill-box; transform-origin: 50% 100%; animation: csxPinBounce 2.2s ease-in-out infinite; }
.cs-landing .csx-ripple { transform-box: fill-box; transform-origin: center; animation: csxRipple 2.2s ease-out infinite; }
.cs-landing .csx-ripple-2 { animation-delay: -1.1s; }

.cs-landing .csx-float-card { position: absolute; z-index: 3; display: inline-flex; align-items: center; gap: 8px; padding: 9px 14px; font-size: 12.5px; font-weight: 700; color: #0a1b30; background: rgba(255,255,255,0.95); border: 1px solid #e3ecf1; border-radius: 14px; box-shadow: 0 24px 60px rgba(10,27,48,0.14); animation: csxChip 4.5s ease-in-out infinite; translate: calc(var(--mx) * -16px) calc(var(--my) * -12px); transition: translate 0.25s ease-out; }
.cs-landing .csx-float-card span { font-size: 15px; }
.cs-landing .csx-fc-1 { top: 14%; left: 0; }
.cs-landing .csx-fc-2 { top: 40%; right: -2%; animation-delay: -1.5s; }
.cs-landing .csx-fc-3 { bottom: 12%; left: 2%; animation-delay: -3s; }
.cs-landing .csx-fc-4 { bottom: 4%; right: 6%; animation-delay: -4.2s; }

@keyframes csxBob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
@keyframes csxSway { 0%,100% { transform: rotate(-1.6deg); } 50% { transform: rotate(1.6deg); } }
@keyframes csxDrift { 0%,100% { transform: translateX(-14px); } 50% { transform: translateX(18px); } }
@keyframes csxBulbGlow { 0%,100% { opacity: 0.55; transform: scale(0.92); } 50% { opacity: 1; transform: scale(1.12); } }
@keyframes csxRays { 0%,100% { opacity: 0.25; } 50% { opacity: 1; } }
@keyframes csxBulbBob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
@keyframes csxBlob { 0%,100% { transform: scale(1); } 50% { transform: scale(1.04); } }
@keyframes csxChip { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
@keyframes csxImgFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
@keyframes csxSpin { to { transform: rotate(360deg); } }
@keyframes csxSpinBack { to { transform: rotate(-360deg); } }
@keyframes csxFly { 0% { transform: translate(0,0); opacity: 0; } 8% { opacity: 1; } 50% { transform: translate(300px,-16px); } 92% { opacity: 1; } 100% { transform: translate(620px,4px); opacity: 0; } }
@keyframes csxFlap { 0%,100% { transform: scaleY(1); } 50% { transform: scaleY(0.45); } }
@keyframes csxTwinkle { 0%,100% { opacity: 0.2; transform: scale(0.5) rotate(0deg); } 50% { opacity: 1; transform: scale(1.15) rotate(45deg); } }
@keyframes csxLit { 0%,38%,100% { opacity: 0; } 50%,80% { opacity: 0.95; } }
@keyframes csxDrive { 0% { transform: translateX(0); opacity: 0; } 8% { opacity: 1; } 92% { opacity: 1; } 100% { transform: translateX(340px); opacity: 0; } }
@keyframes csxPinBounce { 0%,100% { transform: translateY(0) scale(1,1); } 45% { transform: translateY(-14px) scale(0.96,1.05); } 60% { transform: translateY(0) scale(1.1,0.88); } }
@keyframes csxRipple { 0% { transform: scale(0.4); opacity: 0.9; } 100% { transform: scale(3.2); opacity: 0; } }

@media (max-width: 980px) {
  .cs-landing .cs-hero-inner { grid-template-columns: 1fr; }
  .cs-landing .csx-art { max-width: 540px; }
}
@media (max-width: 640px) {
  .cs-landing .csx-float-card { font-size: 11px; padding: 7px 10px; }
  .cs-landing .csx-fc-2 { right: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .cs-landing .csx-art * , .cs-landing .csx-art { animation: none !important; transition: none !important; }
  .cs-landing .csx-lit { opacity: 0.9; }
}
`;

// Animated hero illustration (SVG, or your PNG when USE_PNG = true)
function HeroIllustration() {
  // if the PNG is missing or fails to load, the drawn SVG is shown instead
  const [pngFailed, setPngFailed] = useState(false);
  const showPng = USE_PNG && !pngFailed;

  // gentle mouse parallax: layers move a little as the pointer moves
  const handleMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
    e.currentTarget.style.setProperty("--my", ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
  };
  const handleLeave = (e) => {
    e.currentTarget.style.setProperty("--mx", "0");
    e.currentTarget.style.setProperty("--my", "0");
  };

  return (
    <div
      className="csx-art"
      style={{ position: "relative", width: "100%", maxWidth: "680px", margin: "0 auto" }}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
    >
      <style>{HERO_ART_CSS}</style>

      {/* spacer: keeps the 520 x 430 shape of the picture */}
      <div style={{ paddingTop: "82.7%" }} aria-hidden="true" />

      <div className="csx-art-ring" />
      <div className="csx-art-ring csx-art-ring-2" />
      <div className="csx-art-blob" />

      {showPng ? (
        <img
          src="/hero-illustration.png"
          alt="Citizens and a worker improving a community"
          className="csx-art-img"
          style={{ position: "absolute", top: 0, left: 0, display: "block", width: "100%", height: "100%", objectFit: "contain" }}
          onError={() => setPngFailed(true)}
        />
      ) : (
        <svg viewBox="0 0 520 430" className="csx-art-svg" style={{ position: "absolute", top: 0, left: 0, display: "block", width: "100%", height: "100%" }} role="img" aria-label="Citizens and a worker improving a community">
          <defs>
            <pattern id="csWin" width="14" height="18" patternUnits="userSpaceOnUse">
              <rect x="3" y="4" width="7" height="9" rx="1.5" fill="#a9cfe8" />
            </pattern>
          </defs>

          <g className="csx-cloud csx-cloud-1" fill="#fff">
            <ellipse cx="90" cy="70" rx="30" ry="12" />
            <ellipse cx="112" cy="62" rx="20" ry="12" />
          </g>
          <g className="csx-cloud csx-cloud-2" fill="#fff">
            <ellipse cx="430" cy="48" rx="26" ry="10" />
            <ellipse cx="448" cy="42" rx="16" ry="10" />
          </g>

          {/* birds flying across */}
          <g transform="translate(-30 52)">
            <g className="csx-bird" style={{ animationDelay: "0s" }}>
              <path d="M0 0 q6 -7 12 0 q6 -7 12 0" fill="none" stroke="#3b6f87" strokeWidth="2" strokeLinecap="round" />
            </g>
          </g>
          <g transform="translate(-30 88)">
            <g className="csx-bird csx-bird-2" style={{ animationDelay: "-6s" }}>
              <path d="M0 0 q5 -6 10 0 q5 -6 10 0" fill="none" stroke="#3b6f87" strokeWidth="1.8" strokeLinecap="round" />
            </g>
          </g>

          <rect x="60" y="135" width="70" height="230" rx="4" fill="#cfe6f5" />
          <rect x="60" y="135" width="70" height="230" rx="4" fill="url(#csWin)" />
          <rect x="140" y="185" width="58" height="180" rx="4" fill="#dbeefa" />
          <rect x="140" y="185" width="58" height="180" rx="4" fill="url(#csWin)" />
          <rect x="330" y="115" width="62" height="250" rx="4" fill="#cfe6f5" />
          <rect x="330" y="115" width="62" height="250" rx="4" fill="url(#csWin)" />
          <rect x="400" y="175" width="64" height="190" rx="4" fill="#dbeefa" />
          <rect x="400" y="175" width="64" height="190" rx="4" fill="url(#csWin)" />
          <polygon points="470,110 488,150 488,365 452,365 452,150" fill="#bcd9ee" />

          {/* windows that light up one by one */}
          <rect className="csx-lit" style={{ animationDelay: "0s" }} x="77" y="175" width="7" height="9" rx="1.5" fill="#ffd978" />
          <rect className="csx-lit" style={{ animationDelay: "-1.2s" }} x="105" y="211" width="7" height="9" rx="1.5" fill="#ffd978" />
          <rect className="csx-lit" style={{ animationDelay: "-2.4s" }} x="119" y="157" width="7" height="9" rx="1.5" fill="#ffd978" />
          <rect className="csx-lit" style={{ animationDelay: "-0.6s" }} x="157" y="207" width="7" height="9" rx="1.5" fill="#ffd978" />
          <rect className="csx-lit" style={{ animationDelay: "-1.8s" }} x="185" y="261" width="7" height="9" rx="1.5" fill="#ffd978" />
          <rect className="csx-lit" style={{ animationDelay: "-3s" }} x="347" y="155" width="7" height="9" rx="1.5" fill="#ffd978" />
          <rect className="csx-lit" style={{ animationDelay: "-0.3s" }} x="375" y="227" width="7" height="9" rx="1.5" fill="#ffd978" />
          <rect className="csx-lit" style={{ animationDelay: "-2.1s" }} x="333" y="263" width="7" height="9" rx="1.5" fill="#ffd978" />
          <rect className="csx-lit" style={{ animationDelay: "-1.5s" }} x="417" y="215" width="7" height="9" rx="1.5" fill="#ffd978" />
          <rect className="csx-lit" style={{ animationDelay: "-2.7s" }} x="445" y="287" width="7" height="9" rx="1.5" fill="#ffd978" />

          <g transform="translate(262 78)">
            <g className="csx-orbit">
              <circle r="70" fill="none" stroke="#14d3ac" strokeOpacity="0.55" strokeWidth="1.8" strokeDasharray="4 9" />
              <circle cx="70" r="4.5" fill="#14d3ac" />
              <circle cx="-70" r="4.5" fill="#38bdf8" />
            </g>
            <circle className="csx-bulb-glow" r="52" fill="rgba(20,211,172,0.22)" />
            <g className="csx-rays" stroke="#14d3ac" strokeWidth="3" strokeLinecap="round">
              <line x1="0" y1="-48" x2="0" y2="-60" />
              <line x1="34" y1="-34" x2="43" y2="-43" />
              <line x1="-34" y1="-34" x2="-43" y2="-43" />
              <line x1="48" y1="0" x2="60" y2="0" />
              <line x1="-48" y1="0" x2="-60" y2="0" />
            </g>
            <g className="csx-bulb">
              <circle r="26" fill="#10b981" />
              <circle r="26" fill="none" stroke="#fff" strokeOpacity="0.5" strokeWidth="2" />
              <path d="M-8 4 L0 -10 L8 4 M0 -10 V12" stroke="#fff" strokeWidth="3.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              <rect x="-11" y="26" width="22" height="7" rx="3" fill="#0a1b30" />
              <rect x="-8" y="33" width="16" height="6" rx="3" fill="#5b6b7c" />
            </g>
          </g>

          {/* sparkles around the idea bulb */}
          <g transform="translate(200 46)"><g className="csx-star" style={{ animationDelay: "0s" }}><path d="M0 -7 V7 M-7 0 H7" stroke="#14d3ac" strokeWidth="2.4" strokeLinecap="round" /></g></g>
          <g transform="translate(330 40)"><g className="csx-star" style={{ animationDelay: "-0.8s" }}><path d="M0 -7 V7 M-7 0 H7" stroke="#38bdf8" strokeWidth="2.4" strokeLinecap="round" /></g></g>
          <g transform="translate(334 112)"><g className="csx-star" style={{ animationDelay: "-1.6s" }}><path d="M0 -7 V7 M-7 0 H7" stroke="#14d3ac" strokeWidth="2.4" strokeLinecap="round" /></g></g>
          <g transform="translate(196 118)"><g className="csx-star" style={{ animationDelay: "-2.4s" }}><path d="M0 -7 V7 M-7 0 H7" stroke="#38bdf8" strokeWidth="2.4" strokeLinecap="round" /></g></g>
          <g transform="translate(262 10)"><g className="csx-star" style={{ animationDelay: "-1.2s" }}><path d="M0 -7 V7 M-7 0 H7" stroke="#10b981" strokeWidth="2.4" strokeLinecap="round" /></g></g>

          <ellipse cx="260" cy="372" rx="255" ry="46" fill="#bfeacd" />
          <ellipse cx="260" cy="382" rx="200" ry="30" fill="#a6dfba" />

          {/* road with a car driving along it */}
          <path d="M70 399 L450 399" stroke="#8fb9a3" strokeOpacity="0.55" strokeWidth="16" strokeLinecap="round" />
          <path d="M82 399 L438 399" stroke="#fff" strokeOpacity="0.7" strokeWidth="2.2" strokeDasharray="10 12" />
          <g className="csx-car">
            <rect x="84" y="383" width="46" height="13" rx="4" fill="#0f9d84" />
            <path d="M94 383 l6 -9 h18 l6 9z" fill="#14d3ac" />
            <path d="M98 382 l4 -6 h6 v6z M111 382 v-6 h6 l4 6z" fill="#e9fbf6" />
            <circle cx="96" cy="397" r="4.5" fill="#0a1b30" />
            <circle cx="120" cy="397" r="4.5" fill="#0a1b30" />
          </g>

          <g className="csx-tree" style={{ animationDelay: "0s" }}>
            <rect x="66" y="305" width="9" height="62" rx="3" fill="#8a5a3c" />
            <circle cx="70" cy="278" r="40" fill="#2fb074" />
            <circle cx="48" cy="306" r="26" fill="#1f9d6a" />
            <circle cx="94" cy="306" r="26" fill="#3cc283" />
          </g>
          <g className="csx-tree" style={{ animationDelay: "-1.2s" }}>
            <rect x="452" y="300" width="9" height="66" rx="3" fill="#8a5a3c" />
            <circle cx="457" cy="270" r="42" fill="#2fb074" />
            <circle cx="434" cy="302" r="26" fill="#1f9d6a" />
            <circle cx="482" cy="302" r="26" fill="#3cc283" />
          </g>
          <g className="csx-tree" style={{ animationDelay: "-2.2s" }}>
            <rect x="398" y="322" width="6" height="44" rx="2" fill="#8a5a3c" />
            <circle cx="401" cy="306" r="24" fill="#3cc283" />
          </g>

          <rect x="235" y="272" width="125" height="94" fill="#f6efe0" />
          <polygon points="224,274 297,224 371,274" fill="#f2d28b" />
          <rect x="285" y="306" width="28" height="60" rx="3" fill="#38bdf8" />
          <rect x="246" y="296" width="26" height="24" rx="3" fill="#a9cfe8" />
          <rect x="324" y="296" width="26" height="24" rx="3" fill="#a9cfe8" />

          {/* location pin with a ripple */}
          <g transform="translate(297 216)">
            <ellipse className="csx-ripple" cx="0" cy="2" rx="10" ry="4" fill="none" stroke="#14d3ac" strokeWidth="2" />
            <ellipse className="csx-ripple csx-ripple-2" cx="0" cy="2" rx="10" ry="4" fill="none" stroke="#14d3ac" strokeWidth="2" />
            <g className="csx-pin">
              <path d="M0 0 c-9 -12 -14 -18 -14 -26 a14 14 0 1 1 28 0 c0 8 -5 14 -14 26z" fill="#10b981" />
              <circle cy="-26" r="5.5" fill="#fff" />
            </g>
          </g>

          <g className="csx-person" style={{ animationDelay: "-0.6s" }}>
            <rect x="157" y="326" width="11" height="42" rx="4" fill="#26407f" />
            <rect x="173" y="326" width="11" height="42" rx="4" fill="#26407f" />
            <rect x="152" y="278" width="38" height="56" rx="14" fill="#f5b82e" />
            <circle cx="171" cy="264" r="13" fill="#f2c9a0" />
            <path d="M158 262 a13 13 0 0 1 26 -2 q-6 -8 -13 -6 q-9 -2 -13 8z" fill="#3a2a22" />
            <rect x="186" y="286" width="9" height="15" rx="2" fill="#0a1b30" />
          </g>

          <g className="csx-person" style={{ animationDelay: "-1.4s" }}>
            <rect x="253" y="326" width="12" height="42" rx="4" fill="#26407f" />
            <rect x="270" y="326" width="12" height="42" rx="4" fill="#26407f" />
            <rect x="246" y="276" width="42" height="58" rx="12" fill="#2f5fb3" />
            <rect x="258" y="276" width="18" height="58" fill="#f5b82e" />
            <circle cx="267" cy="262" r="13" fill="#f2c9a0" />
            <path d="M253 260 a14 14 0 0 1 28 0z" fill="#f5b82e" />
            <rect x="250" y="258" width="34" height="5" rx="2.5" fill="#e09a14" />
          </g>

          <g className="csx-person" style={{ animationDelay: "-2s" }}>
            <rect x="371" y="326" width="11" height="42" rx="4" fill="#26407f" />
            <rect x="387" y="326" width="11" height="42" rx="4" fill="#26407f" />
            <rect x="366" y="278" width="38" height="56" rx="14" fill="#ffffff" stroke="#d8e6ee" />
            <circle cx="385" cy="264" r="13" fill="#f2c9a0" />
            <path d="M372 262 a13 13 0 0 1 26 -2 q-4 -9 -13 -7 q-9 -1 -13 9z" fill="#2a1d18" />
            <rect x="396" y="268" width="8" height="14" rx="2" fill="#0a1b30" />
          </g>

          <ellipse cx="215" cy="372" rx="22" ry="9" fill="#3cc283" />
          <ellipse cx="330" cy="374" rx="26" ry="10" fill="#2fb074" />
        </svg>
      )}

      <div className="csx-float-card csx-fc-1"><span>✅</span> Verified fix</div>
      <div className="csx-float-card csx-fc-2"><span>📍</span> New report</div>
      <div className="csx-float-card csx-fc-3"><span>👍</span> 98 votes</div>
      <div className="csx-float-card csx-fc-4"><span>⏱️</span> Fixed in 3 days</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const tickerItems = [
  "Streetlight fixed on MG Road — verified by 12 neighbours",
  "Water Board accepted a pipeline leak in Ward 14",
  "Garbage overflow cleared at Market Junction",
  "Pothole on State Ave resolved in 2 days",
  "New: 6 organizations joined this week",
];

// sample organizations for the logo strip
const partners = [
  { name: "City Roads Dept.", color: "teal", icon: "🛣️" },
  { name: "Metro Water Board", color: "blue", icon: "💧" },
  { name: "Power Utility Co.", color: "amber", icon: "⚡" },
  { name: "Clean City Mission", color: "violet", icon: "♻️" },
  { name: "Traffic Police", color: "rose", icon: "🚦" },
  { name: "Parks Authority", color: "teal", icon: "🌳" },
  { name: "Municipal Corp.", color: "blue", icon: "🏛️" },
];

const statMeta = [
  { label: "Problems Reported", icon: "📢", tone: "teal" },
  { label: "Solutions Verified", icon: "✅", tone: "blue" },
  { label: "Active Organizations", icon: "🏛️", tone: "violet" },
  { label: "Avg. Resolution Time", icon: "⚡", tone: "amber", decimals: 1, suffix: " Days" },
];

const statValues = {
  week: [[312, "+8% vs last week"], [268, "85.9% rate"], [86, "+2 new"], [3.6, "-0.2 days"]],
  month: [[4821, "+12% this month"], [4120, "85.4% rate"], [86, "+6 new"], [3.8, "-0.6 days"]],
  all: [[18240, "since launch"], [15310, "83.9% rate"], [86, "all active"], [4.2, "overall avg"]],
};

const steps = [
  { icon: "👥", title: "Citizens", text: "Report a problem with photos, location and a short description.", color: "teal" },
  { icon: "🤖", title: "AI Review", text: "Duplicates are merged and the category and priority are suggested.", color: "blue" },
  { icon: "🗳️", title: "Community Vote", text: "Neighbours confirm the issue is real and worth fixing first.", color: "violet" },
  { icon: "🛠️", title: "Tech Evidence", text: "The organization uploads progress photos and work updates.", color: "amber" },
  { icon: "🏁", title: "Issues Fixed", text: "The community verifies the fix before the case is closed.", color: "rose" },
];

const trustFeatures = [
  { icon: "🎯", title: "Problem Classification", text: "AI sorts every report into the right category.", color: "teal" },
  { icon: "🛡️", title: "AI Review", text: "Spam, fakes and duplicates are removed automatically.", color: "blue" },
  { icon: "🗳️", title: "Community Vote", text: "Upvotes show which problems matter most.", color: "violet" },
  { icon: "📸", title: "Tech Evidence", text: "Before and after photos prove the work was done.", color: "amber" },
  { icon: "✔️", title: "Issues Fixed", text: "Only community-verified fixes are marked solved.", color: "rose" },
];

const domains = [
  { icon: "🛣️", name: "Roads & Circulation", count: "1,240 issues", color: "teal" },
  { icon: "💧", name: "Water & Sanitation", count: "860 issues", color: "blue" },
  { icon: "💡", name: "Electricity & Lighting", count: "710 issues", color: "amber" },
  { icon: "♻️", name: "Waste & Cleaning", count: "930 issues", color: "violet" },
  { icon: "🚦", name: "Public Safety", count: "520 issues", color: "rose" },
  { icon: "🌳", name: "Parks & Forests", count: "310 issues", color: "green" },
];

const dispatches = [
  {
    title: "Flowing Water on Canal",
    text: "A broken pipe is letting clean water run into the canal for two days.",
    status: "In Progress",
    tone: "progress",
    pct: 60,
    time: "5h ago",
    place: "Canal Road, Ward 14",
    votes: 98,
  },
  {
    title: "Major Roadwork on State Ave",
    text: "A deep trench was left open after cable work and is blocking one lane.",
    status: "Under Review",
    tone: "review",
    pct: 25,
    time: "1d ago",
    place: "State Avenue",
    votes: 52,
  },
  {
    title: "Traffic Signal Malfunction",
    text: "The signal at the main junction stays red in every direction at night.",
    status: "Solved",
    tone: "solved",
    pct: 100,
    time: "3d ago",
    place: "Market Junction",
    votes: 134,
  },
];

// sample testimonials (replace with real ones later)
const stories = [
  {
    name: "Ananya R.",
    role: "Resident, Ward 14",
    text: "I reported a leaking pipe on Monday. By Thursday the Water Board had fixed it and my neighbours confirmed it in the app.",
    color: "teal",
  },
  {
    name: "Ravi Kumar",
    role: "Engineer, Roads Department",
    text: "Verified reports with exact locations save us site visits. Uploading before and after photos builds trust with residents.",
    color: "blue",
  },
  {
    name: "Meena S.",
    role: "Community volunteer",
    text: "Votes show us which problems matter most. Our streetlight request moved to the top of the list within a day.",
    color: "violet",
  },
];

const faqs = [
  {
    q: "Is it free to report a problem?",
    a: "Yes. Citizens can register and report problems for free, with photos and an exact map location.",
  },
  {
    q: "Who fixes the problem after I report it?",
    a: "Registered organizations such as municipal departments and utilities accept problems in their service area and update the work until it is done.",
  },
  {
    q: "How do you stop spam and duplicate reports?",
    a: "An AI review checks every report for fakes and merges duplicates. Admins also review anything that is flagged.",
  },
  {
    q: "When is a problem marked as solved?",
    a: "Only after the organization uploads proof and neighbours in the area confirm that the fix is real.",
  },
  {
    q: "Can my organization join CivicSolve?",
    a: "Yes. Register your organization, an admin approves it, and you can start accepting problems for your service area.",
  },
];

const stakeholders = {
  user: {
    label: "Community Users",
    title: "Community User Suite",
    text: "Report problems in under a minute and follow each one until it is fixed.",
    points: [
      "Report with photos and an exact map location",
      "Vote on problems in your area",
      "Get a notification at every status change",
      "Confirm the fix before the case closes",
    ],
    cta: "Join as a Citizen",
    rows: [
      ["Broken Streetlight", "Solved"],
      ["Garbage Overflow", "In Progress"],
      ["Water Leakage", "Under Review"],
    ],
    window: "My Reports",
  },
  org: {
    label: "Organizations",
    title: "Organization Workspace",
    text: "Accept the problems you are responsible for and show your progress openly.",
    points: [
      "See verified problems for your service area",
      "Accept, assign and update work in one place",
      "Upload before and after evidence",
      "Track your response time and ratings",
    ],
    cta: "Register Your Organization",
    rows: [
      ["Pipeline Leak — Ward 14", "In Progress"],
      ["Open Trench — State Ave", "Assigned"],
      ["Signal Repair — Junction", "Solved"],
    ],
    window: "Assigned Work",
  },
  admin: {
    label: "Admin Panel",
    title: "Admin Control Centre",
    text: "Keep the platform trusted with moderation, approvals and clear reports.",
    points: [
      "Approve organizations and manage users",
      "Review flagged and duplicate reports",
      "Monitor resolution rates by area",
      "Export reports for audits",
    ],
    cta: "Request Admin Access",
    rows: [
      ["Organization approvals", "6 pending"],
      ["Flagged reports", "14 open"],
      ["Weekly resolution rate", "85.4%"],
    ],
    window: "Admin Overview",
  },
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

function LandingPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [statView, setStatView] = useState("month");
  const [caseView, setCaseView] = useState("before");
  const [role, setRole] = useState("user");
  const [openFaq, setOpenFaq] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showTop, setShowTop] = useState(false);
  const [progress, setProgress] = useState(0);
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  useReveal();

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setScrolled(y > 20);
      setShowTop(y > 500);
      setProgress(max > 0 ? (y / max) * 100 : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    navigate("/register");
  };

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubscribed(true);
    setEmail("");
  };

  const closeMenu = () => setMenuOpen(false);
  const active = stakeholders[role];

  return (
    <div className="cs-landing" id="top">
      {/* ================= NAVBAR ================= */}
      <header className={`cs-navbar ${scrolled ? "is-scrolled" : ""}`}>
        <span className="cs-progress" style={{ width: `${progress}%` }} />
        <div className="cs-container cs-navbar-inner">
          <Link to="/" className="cs-brand" onClick={closeMenu}>
            <span className="cs-brand-icon">
              <img src={logo} alt="CivicSolve" />
            </span>
            <span className="cs-brand-text">
              <strong>CivicSolve</strong>
              <small>Community • Action • Impact</small>
            </span>
          </Link>

          <nav className={`cs-nav-links ${menuOpen ? "is-open" : ""}`}>
            <a href="#how-it-works" onClick={closeMenu}>How It Works</a>
            <a href="#trust" onClick={closeMenu}>Why Trust Us</a>
            <a href="#domains" onClick={closeMenu}>Domains</a>
            <a href="#dispatches" onClick={closeMenu}>Dispatches</a>
            <a href="#stakeholders" onClick={closeMenu}>For Everyone</a>
            <a href="#faq" onClick={closeMenu}>FAQ</a>

            {/* visible only inside the mobile menu */}
            <div className="cs-nav-mobile-cta">
              <Link to="/login" className="cs-btn cs-btn-light" onClick={closeMenu}>Login</Link>
              <Link to="/register" className="cs-btn cs-btn-primary" onClick={closeMenu}>Register</Link>
            </div>
          </nav>

          <div className="cs-nav-actions">
            <Link to="/login" className="cs-btn cs-btn-ghost cs-btn-login">Login</Link>
            <Link to="/register" className="cs-btn cs-btn-primary cs-btn-register cs-shine">Register</Link>
            <button
              className={`cs-burger ${menuOpen ? "is-open" : ""}`}
              aria-label="Toggle menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <span /><span /><span />
            </button>
          </div>
        </div>
      </header>

      {/* ================= LIVE TICKER ================= */}
      <div className="cs-ticker" aria-label="Latest community updates">
        <div className="cs-ticker-track">
          {[...tickerItems, ...tickerItems].map((t, i) => (
            <span key={i} className="cs-ticker-item">
              <i className="cs-live-dot" /> {t}
            </span>
          ))}
        </div>
      </div>

      <main>
        {/* ================= HERO ================= */}
        <section className="cs-hero">
          <div className="cs-orb cs-orb-1" />
          <div className="cs-orb cs-orb-2" />
          <div className="cs-orb cs-orb-3" />
          <div className="cs-grid-bg" />

          <div className="cs-container cs-hero-inner">
            <div className="cs-hero-copy">
              <div className="cs-badge cs-pop">
                <i className="cs-live-dot" /> The unified platform for community problem solving
              </div>

              <h1 className="cs-hero-title cs-pop cs-d1">
                Report Problems. Connect Solutions.
                <span className="cs-gradient-text"> Improve Communities.</span>
              </h1>

              <p className="cs-hero-sub cs-pop cs-d2">
                CivicSolve connects citizens with responsible organizations. Every
                report is verified, tracked and confirmed fixed by the community.
              </p>

              <div className="cs-hero-buttons cs-pop cs-d3">
                <Link to="/register" className="cs-btn cs-btn-primary cs-btn-lg cs-shine">
                  📍 Report a Community Problem
                </Link>
                <a href="#dispatches" className="cs-btn cs-btn-light cs-btn-lg">
                  ✔ View Verified Fixes
                </a>
              </div>

              <form className="cs-search cs-pop cs-d4" onSubmit={handleSearch}>
                <span className="cs-search-icon">🔍</span>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search a problem, area or organization..."
                  aria-label="Search problems"
                />
                <button type="submit" className="cs-btn cs-btn-dark cs-shine">Search</button>
              </form>
            </div>

            <div className="cs-hero-art cs-pop cs-d2" style={{ display: "block", minWidth: 0 }}>
              <HeroIllustration />
            </div>

            <div className="cs-hero-stats cs-pop cs-d5">
              <div className="cs-chip-stat tone-teal">
                <strong><Counter end={86} suffix="+" /></strong>
                <span>Organizations</span>
              </div>
              <div className="cs-chip-stat tone-blue">
                <strong><Counter end={4120} suffix="+" /></strong>
                <span>Solutions Verified</span>
              </div>
              <div className="cs-chip-stat tone-violet">
                <strong><Counter end={12450} suffix="+" /></strong>
                <span>Active Citizens</span>
              </div>
              <div className="cs-chip-stat tone-amber">
                <strong><Counter end={3.8} decimals={1} suffix=" Days" /></strong>
                <span>Avg. Resolution</span>
              </div>
            </div>
          </div>
        </section>

        {/* ================= PARTNER STRIP ================= */}
        <section className="cs-partners" aria-label="Organizations on CivicSolve">
          <p className="cs-partners-title">Organizations already solving problems on CivicSolve</p>
          <div className="cs-partners-viewport">
            <div className="cs-partners-track">
              {[...partners, ...partners].map((p, i) => (
                <span key={i} className={`cs-partner tone-${p.color}`}>
                  <i>{p.icon}</i>{p.name}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ================= COMMUNITY ACTION IN MOTION (navy) ================= */}
        <section className="cs-motion">
          <div className="cs-motion-glow" />
          <div className="cs-motion-glow cs-motion-glow-2" />
          <div className="cs-container">
            <div className="cs-motion-head cs-reveal">
              <div>
                <span className="cs-label cs-label-light">Live platform data</span>
                <h2>Community Action in Motion</h2>
              </div>
              <div className="cs-toggle cs-toggle-dark" role="tablist">
                {[["week", "This Week"], ["month", "This Month"], ["all", "All Time"]].map(([k, l]) => (
                  <button
                    key={k}
                    role="tab"
                    aria-selected={statView === k}
                    className={statView === k ? "is-active" : ""}
                    onClick={() => setStatView(k)}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <div className="cs-motion-grid">
              {statMeta.map((s, i) => {
                const [end, tag] = statValues[statView][i];
                return (
                  <div key={s.label} className={`cs-motion-card tone-${s.tone} cs-reveal cs-reveal-zoom`} style={{ "--d": `${i * 90}ms` }}>
                    <div className="cs-motion-top">
                      <span className="cs-motion-icon">{s.icon}</span>
                      <span className="cs-tag-glow">{tag}</span>
                    </div>
                    <strong className="cs-motion-num">
                      <Counter key={statView} end={end} decimals={s.decimals || 0} suffix={s.suffix || ""} />
                    </strong>
                    <span className="cs-motion-label">{s.label}</span>
                    <div className="cs-spark">
                      {[40, 65, 50, 80, 62, 90, 74].map((h, j) => (
                        <i key={j} style={{ height: `${h}%`, animationDelay: `${j * 80}ms` }} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ================= HOW IT WORKS (mint) ================= */}
        <section className="cs-section cs-sec-mint" id="how-it-works">
          <div className="cs-deco cs-deco-a" />
          <div className="cs-deco cs-deco-b" />
          <div className="cs-container">
            <div className="cs-heading cs-reveal">
              <span className="cs-label">Transparent civic science</span>
              <h2>How CivicSolve Works: From Problem to Verified Fix</h2>
              <p>Five clear stages keep every report honest, visible and accountable.</p>
            </div>

            <div className="cs-steps">
              {steps.map((s, i) => (
                <div key={s.title} className={`cs-step tone-${s.color} cs-reveal`} style={{ "--d": `${i * 110}ms` }}>
                  <span className="cs-step-num">{i + 1}</span>
                  <div className="cs-step-icon">{s.icon}</div>
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                </div>
              ))}
            </div>

            {/* Before / after case */}
            <div className="cs-case cs-reveal cs-reveal-zoom">
              <div className="cs-case-photo-wrap">
                <div className={`cs-case-photo ${caseView === "after" ? "is-fixed" : ""}`}>
                  {/* To use a real photo: replace this div's children with <img src="..." alt="..." /> */}
                  <div className="cs-road-lines" />
                  <div className="cs-pothole" />
                  <div className="cs-fixed-patch">✔</div>
                  <span className="cs-photo-badge">
                    {caseView === "before" ? "● Before repair" : "● After repair"}
                  </span>
                </div>
              </div>

              <div className="cs-case-body">
                <div className="cs-case-top">
                  <div className="cs-pills">
                    <span className="cs-pill cs-pill-teal">Roads & Circulation</span>
                    <span className="cs-pill cs-pill-amber">High Priority</span>
                    <small>Posted 1d ago</small>
                  </div>
                  <div className="cs-toggle" role="tablist">
                    <button className={caseView === "before" ? "is-active" : ""} onClick={() => setCaseView("before")}>Before</button>
                    <button className={caseView === "after" ? "is-active" : ""} onClick={() => setCaseView("after")}>After Fix</button>
                  </div>
                </div>

                <h3>Sub-surface Pothole &amp; Drainage Trench Collapse</h3>
                <p>
                  A collapsed drain under State Avenue opened a deep pothole. 140
                  neighbours confirmed it, the Roads Department accepted the case and
                  uploaded repair evidence within four days.
                </p>

                <div className="cs-case-meta">
                  <div><small>Location</small><strong>State Ave, Ward 9</strong></div>
                  <div><small>Reports</small><strong>140 votes</strong></div>
                  <div><small>Resolution</small><strong>4 days</strong></div>
                </div>

                <div className="cs-case-foot">
                  <span className="cs-live-dot" /> Verified fixed by 38 residents
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================= TRUST FEATURES (violet) ================= */}
        <section className="cs-section cs-sec-violet" id="trust">
          <div className="cs-deco cs-deco-a" />
          <div className="cs-deco cs-deco-b" />
          <div className="cs-container">
            <div className="cs-heading cs-reveal">
              <span className="cs-label">Trust and accuracy</span>
              <h2>Built for Accuracy, Speed, and Zero Spam</h2>
              <p>Every report passes five checks before it is called solved.</p>
            </div>

            <div className="cs-trust-grid">
              {trustFeatures.map((f, i) => (
                <div key={f.title} className={`cs-trust-card tone-${f.color} cs-reveal`} style={{ "--d": `${i * 90}ms` }}>
                  <div className="cs-trust-icon">{f.icon}</div>
                  <h3>{f.title}</h3>
                  <p>{f.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ================= DOMAINS (warm amber) ================= */}
        <section className="cs-section cs-sec-amber" id="domains">
          <div className="cs-deco cs-deco-a" />
          <div className="cs-deco cs-deco-b" />
          <div className="cs-container">
            <div className="cs-heading-row cs-reveal">
              <div>
                <span className="cs-label">Service sectors</span>
                <h2>Explore Community Domains</h2>
              </div>
              <Link to="/register" className="cs-link-btn">View all domains</Link>
            </div>

            <div className="cs-domain-grid">
              {domains.map((d, i) => (
                <Link to="/register" key={d.name} className={`cs-domain tone-${d.color} cs-reveal cs-reveal-zoom`} style={{ "--d": `${i * 80}ms` }}>
                  <span className="cs-domain-icon">{d.icon}</span>
                  <strong>{d.name}</strong>
                  <small>{d.count}</small>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ================= DISPATCHES (sky blue) ================= */}
        <section className="cs-section cs-sec-sky" id="dispatches">
          <div className="cs-deco cs-deco-a" />
          <div className="cs-deco cs-deco-b" />
          <div className="cs-container">
            <div className="cs-heading-row cs-reveal">
              <div>
                <span className="cs-label">Live from your area</span>
                <h2>Recent Community Dispatches</h2>
              </div>
              <span className="cs-pill cs-pill-teal"><i className="cs-live-dot" /> Showing latest 3</span>
            </div>

            <div className="cs-dispatch-grid">
              {dispatches.map((d, i) => (
                <article key={d.title} className={`cs-dispatch is-${d.tone} cs-reveal`} style={{ "--d": `${i * 120}ms`, "--p": `${d.pct}%` }}>
                  <div className="cs-dispatch-top">
                    <h3>{d.title}</h3>
                    <span className={`cs-status ${d.tone}`}>{d.status}</span>
                  </div>
                  <p>{d.text}</p>
                  <div className="cs-prog" aria-label={`${d.pct}% complete`}><i /></div>
                  <div className="cs-dispatch-meta">
                    <span>📍 {d.place}</span>
                    <span>{d.time}</span>
                  </div>
                  <div className="cs-dispatch-foot">
                    <span>👍 {d.votes} votes</span>
                    <Link to="/login">Open case →</Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ================= STORIES (rose) ================= */}
        <section className="cs-section cs-sec-rose" id="stories">
          <div className="cs-deco cs-deco-a" />
          <div className="cs-deco cs-deco-b" />
          <div className="cs-container">
            <div className="cs-heading cs-reveal">
              <span className="cs-label">Community voices</span>
              <h2>People Are Seeing Real Change</h2>
              <p>Citizens, engineers and volunteers share what happened after they used CivicSolve.</p>
            </div>

            <div className="cs-story-grid">
              {stories.map((s, i) => (
                <figure key={s.name} className={`cs-story tone-${s.color} cs-reveal`} style={{ "--d": `${i * 130}ms` }}>
                  <div className="cs-stars" aria-label="5 out of 5 stars">★★★★★</div>
                  <blockquote>{s.text}</blockquote>
                  <figcaption>
                    <span className="cs-avatar">{s.name.charAt(0)}</span>
                    <span>
                      <strong>{s.name}</strong>
                      <small>{s.role}</small>
                    </span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        {/* ================= STAKEHOLDERS (dark teal) ================= */}
        <section className="cs-section cs-sec-dark" id="stakeholders">
          <div className="cs-deco cs-deco-a" />
          <div className="cs-deco cs-deco-b" />
          <div className="cs-container">
            <div className="cs-heading cs-reveal">
              <span className="cs-label cs-label-light">Three panels, one goal</span>
              <h2>Engineered for Every Civic Stakeholder</h2>
              <p>Pick a role to see what CivicSolve gives you.</p>
              <div className="cs-toggle cs-toggle-dark cs-toggle-center" role="tablist">
                {Object.entries(stakeholders).map(([k, v]) => (
                  <button key={k} role="tab" aria-selected={role === k} className={role === k ? "is-active" : ""} onClick={() => setRole(k)}>
                    {v.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="cs-stake" key={role}>
              <div className="cs-stake-text">
                <h3>{active.title}</h3>
                <p>{active.text}</p>
                <ul>
                  {active.points.map((p) => (
                    <li key={p}><span>✔</span>{p}</li>
                  ))}
                </ul>
                <Link to="/register" className="cs-btn cs-btn-primary cs-shine">{active.cta}</Link>
              </div>

              <div className="cs-window">
                <div className="cs-window-bar">
                  <i /><i /><i />
                  <span>{active.window}</span>
                </div>
                <div className="cs-window-body">
                  {active.rows.map(([name, status], i) => (
                    <div key={name} className="cs-window-row" style={{ animationDelay: `${i * 120}ms` }}>
                      <span>{name}</span>
                      <em>{status}</em>
                    </div>
                  ))}
                  <div className="cs-window-bar-chart">
                    {[35, 55, 45, 75, 60, 88, 70, 95].map((h, i) => (
                      <i key={i} style={{ height: `${h}%`, animationDelay: `${i * 70}ms` }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================= FAQ (white / mint) ================= */}
        <section className="cs-section cs-sec-faq" id="faq">
          <div className="cs-container cs-faq-wrap">
            <div className="cs-faq-intro cs-reveal cs-reveal-left">
              <span className="cs-label">Questions</span>
              <h2>Frequently Asked Questions</h2>
              <p>Quick answers about reporting, fixing and verifying community problems.</p>
              <Link to="/register" className="cs-btn cs-btn-primary cs-shine">Get started free</Link>
            </div>

            <div className="cs-faq-list cs-reveal cs-reveal-right">
              {faqs.map((f, i) => (
                <div key={f.q} className={`cs-faq ${openFaq === i ? "is-open" : ""}`}>
                  <button
                    className="cs-faq-q"
                    aria-expanded={openFaq === i}
                    onClick={() => setOpenFaq(openFaq === i ? -1 : i)}
                  >
                    <span>{f.q}</span>
                    <i aria-hidden="true">+</i>
                  </button>
                  <div className="cs-faq-a"><p>{f.a}</p></div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ================= CTA ================= */}
        <section className="cs-cta-wrap">
          <div className="cs-container">
            <div className="cs-reveal cs-reveal-zoom">
              <div className="cs-cta">
                <div className="cs-cta-glow" />
                <div className="cs-cta-shape cs-cta-shape-1" />
                <div className="cs-cta-shape cs-cta-shape-2" />
                <div className="cs-cta-text">
                  <h2>Make Your Neighborhood Better Today. It Takes Less than 60 Seconds.</h2>
                  <p>Join thousands of citizens and organizations turning complaints into verified fixes.</p>
                </div>
                <div className="cs-cta-buttons">
                  <Link to="/register" className="cs-btn cs-btn-white cs-btn-lg cs-shine">Report a Problem</Link>
                  <Link to="/register" className="cs-btn cs-btn-outline cs-btn-lg">Register Your Organization</Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ================= FOOTER ================= */}
      <footer className="cs-footer">
        <div className="cs-container">
          <div className="cs-footer-grid">
            <div className="cs-footer-brand">
              <div className="cs-brand">
                <span className="cs-brand-icon">
              <img src={logo} alt="CivicSolve" />
            </span>
                <span className="cs-brand-text">
                  <strong>CivicSolve</strong>
                  <small>Community • Action • Impact</small>
                </span>
              </div>
              <p>Building better communities, one verified solution at a time.</p>
              <div className="cs-footer-mail">✉ support@civicsolve.com</div>

              <form className="cs-news" onSubmit={handleSubscribe}>
                {subscribed ? (
                  <span className="cs-news-ok">✔ Thanks! You are on the list.</span>
                ) : (
                  <>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email for monthly impact updates"
                      aria-label="Email address"
                    />
                    <button type="submit" className="cs-btn cs-btn-primary">Join</button>
                  </>
                )}
              </form>
            </div>

            <div>
              <h4>For Citizens</h4>
              <a href="#how-it-works">How it works</a>
              <a href="#dispatches">Recent dispatches</a>
              <Link to="/register">Report a problem</Link>
              <Link to="/login">Track my reports</Link>
            </div>

            <div>
              <h4>For Organizations</h4>
              <Link to="/register">Register organization</Link>
              <a href="#domains">Service domains</a>
              <a href="#stakeholders">Organization workspace</a>
              <Link to="/login">Login</Link>
            </div>

            <div>
              <h4>Transparency &amp; Trust</h4>
              <a href="#trust">Verification process</a>
              <a href="#trust">Spam protection</a>
              <a href="#stakeholders">Admin oversight</a>
              <a href="#faq">FAQ</a>
            </div>
          </div>

          <div className="cs-footer-bottom">
            <span>© 2026 CivicSolve. All rights reserved.</span>
            <span>Designed &amp; developed with care for communities.</span>
          </div>
        </div>
      </footer>

      <button
        className={`cs-top ${showTop ? "is-show" : ""}`}
        aria-label="Back to top"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      >
        ↑
      </button>
    </div>
  );
}

export default LandingPage;