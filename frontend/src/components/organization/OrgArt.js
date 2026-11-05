import React, { useEffect, useRef, useState } from "react";
import "../../styles/organization/OrgArt.css";

/*
  Shared illustrations + small animation helpers for the organization portal.
  Used by AvailableProblems (and can be reused by the other organization pages).
*/

export const fmt = (value) => Number(value || 0).toLocaleString("en-IN");

/* ---------- hooks / helpers ---------- */
export function useCountUp(target, active = true, duration = 900) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const end = Number(target) || 0;
    if (!active) return setValue(0);
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce || end === 0) return setValue(end);
    let raf;
    let start;
    const tick = (t) => {
      if (!start) start = t;
      const p = Math.min(1, (t - start) / duration);
      setValue(Math.round(end * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, active, duration]);
  return value;
}

export function CountUp({ value, loading = false, suffix = "" }) {
  const shown = useCountUp(value, !loading);
  if (loading) return <span className="oa-skeleton" />;
  return (
    <>
      {fmt(shown)}
      {suffix}
    </>
  );
}

/* fades/slides a block in when it scrolls into view */
export function Reveal({ as: Tag = "div", className = "", children, ...rest }) {
  const ref = useRef(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (!("IntersectionObserver" in window)) {
      setSeen(true);
      return undefined;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold: 0.12 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <Tag ref={ref} className={`${className} oa-reveal${seen ? " in" : ""}`} {...rest}>
      {children}
    </Tag>
  );
}

/* ---------- illustrations ---------- */
export function Worker({ variant = "wave" }) {
  return (
    <svg className="oa-worker" viewBox="0 0 120 170" aria-hidden="true">
      <ellipse cx="60" cy="164" rx="38" ry="5" fill="rgba(0,0,0,.28)" />
      <rect x="44" y="114" width="13" height="42" rx="5" fill="#1d4660" />
      <rect x="63" y="114" width="13" height="42" rx="5" fill="#1d4660" />
      <ellipse cx="50" cy="158" rx="10" ry="5" fill="#0c2330" />
      <ellipse cx="70" cy="158" rx="10" ry="5" fill="#0c2330" />
      <rect x="37" y="62" width="46" height="58" rx="15" fill="#14c8a4" />
      <rect x="37" y="86" width="46" height="6" fill="#f7e463" />
      <rect x="37" y="98" width="46" height="4" fill="#f7e463" opacity=".8" />
      <line x1="42" y1="72" x2="38" y2="100" stroke="#14c8a4" strokeWidth="11" strokeLinecap="round" />
      <g className="oa-clip">
        <rect x="22" y="94" width="24" height="30" rx="3" fill="#fff" />
        <rect x="29" y="91" width="10" height="6" rx="2" fill="#6a8fa0" />
        <path d="M27 105h14M27 111h14M27 117h8" stroke="#14c8a4" strokeWidth="2" strokeLinecap="round" />
      </g>
      <g className={variant === "search" ? "oa-search" : "oa-wave"}>
        <line x1="78" y1="70" x2="98" y2="44" stroke="#14c8a4" strokeWidth="11" strokeLinecap="round" />
        <circle cx="99" cy="40" r="6.5" fill="#f2c7a5" />
        {variant === "search" && (
          <g>
            <line x1="101" y1="37" x2="107" y2="30" stroke="#d9f7ef" strokeWidth="4" strokeLinecap="round" />
            <circle cx="111" cy="24" r="9" fill="rgba(190,255,240,.18)" stroke="#d9f7ef" strokeWidth="3" />
            <path d="M106 22a6 6 0 0 1 5-4" stroke="#fff" strokeWidth="1.6" fill="none" strokeLinecap="round" />
          </g>
        )}
      </g>
      <circle cx="60" cy="43" r="17" fill="#f2c7a5" />
      <path d="M42 40c0-14 8-21 18-21s18 7 18 21z" fill="#ffc83d" />
      <rect x="38" y="38" width="44" height="6" rx="3" fill="#f0b21f" />
      <rect x="57" y="19" width="6" height="12" rx="3" fill="#f0b21f" />
      <circle cx="53" cy="49" r="1.8" fill="#26343d" />
      <circle cx="67" cy="49" r="1.8" fill="#26343d" />
      <path d="M54 55q6 5 12 0" stroke="#26343d" strokeWidth="2" fill="none" strokeLinecap="round" />
      <circle cx="49" cy="53" r="3" fill="#f5a5a5" opacity=".5" />
      <circle cx="71" cy="53" r="3" fill="#f5a5a5" opacity=".5" />
    </svg>
  );
}

const FLOWER_COLORS = ["#ff7eb6", "#a98bff", "#ffd166", "#7be8d0", "#ff9d7a"];

function Flower({ x, y, r = 6, color, delay = 0, stem = 28 }) {
  const petals = [0, 72, 144, 216, 288];
  return (
    <g className="oa-flower" style={{ animationDelay: `${delay}s`, transformOrigin: `${x}px ${y + stem}px` }}>
      <line x1={x} y1={y} x2={x} y2={y + stem} stroke="#2fb67a" strokeWidth="2" strokeLinecap="round" />
      <path d={`M${x} ${y + stem * 0.6} q-8 -2 -9 -9 q8 0 9 9z`} fill="#27a56d" />
      {petals.map((a) => (
        <circle
          key={a}
          cx={x + Math.cos((a * Math.PI) / 180) * r * 0.85}
          cy={y + Math.sin((a * Math.PI) / 180) * r * 0.85}
          r={r * 0.62}
          fill={color}
        />
      ))}
      <circle cx={x} cy={y} r={r * 0.45} fill="#ffe27a" />
    </g>
  );
}

export function FlowerRow({ className, count, width, height = 56, seed = 0 }) {
  const gap = width / count;
  return (
    <svg className={className} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => {
        const stem = 18 + ((i * 7 + seed) % 5) * 5;
        return (
          <Flower
            key={i}
            x={gap * i + gap / 2}
            y={height - stem - 4}
            stem={stem}
            r={5 + ((i + seed) % 3) * 1.5}
            color={FLOWER_COLORS[(i + seed) % FLOWER_COLORS.length]}
            delay={i * 0.35}
          />
        );
      })}
    </svg>
  );
}

export const PETALS = [
  { l: "6%", d: 0, c: "#f7a6c8" },
  { l: "18%", d: 3, c: "#ffd166" },
  { l: "34%", d: 6, c: "#a98bff" },
  { l: "52%", d: 1.5, c: "#7be8d0" },
  { l: "66%", d: 4.5, c: "#f7a6c8" },
  { l: "80%", d: 7.5, c: "#ffd166" },
  { l: "92%", d: 2.5, c: "#a98bff" },
];

export function Petals() {
  return (
    <div className="oa-sky" aria-hidden="true">
      {PETALS.map((p, i) => (
        <span key={i} className="oa-petal" style={{ left: p.l, animationDelay: `${p.d}s`, background: p.c }} />
      ))}
    </div>
  );
}

/* radar that "finds" verified problems around your service area */
export function MatchScene() {
  const pins = [
    { x: 58, y: 38, d: 0 },
    { x: 112, y: 116, d: 1.6 },
    { x: 252, y: 36, d: 3.2 },
    { x: 292, y: 102, d: 4.8 },
    { x: 226, y: 126, d: 6.4 },
  ];
  return (
    <svg className="oa-scene" viewBox="0 0 340 150" aria-hidden="true">
      <g stroke="#7be8d0" strokeOpacity="0.2" fill="none">
        <rect x="2" y="2" width="336" height="146" rx="14" />
        <path d="M2 50H338M2 100H338M85 2V148M170 2V148M255 2V148" />
      </g>

      {pins.map((p) => (
        <line
          key={`l${p.x}`}
          className="oa-link"
          x1="170"
          y1="76"
          x2={p.x}
          y2={p.y}
          stroke="#6be8cf"
          strokeOpacity="0.5"
          strokeWidth="1.4"
          strokeDasharray="4 6"
          style={{ animationDelay: `${p.d}s` }}
        />
      ))}

      <g stroke="#2bdcb8" fill="none" strokeOpacity="0.35">
        <circle cx="170" cy="76" r="20" />
        <circle cx="170" cy="76" r="40" />
        <circle cx="170" cy="76" r="60" />
      </g>
      <g className="oa-radar">
        <path d="M170 76 L170 16 A60 60 0 0 1 222 46 Z" fill="rgba(43,220,184,.22)" />
        <line x1="170" y1="76" x2="170" y2="16" stroke="#2bdcb8" strokeWidth="1.6" strokeLinecap="round" />
      </g>

      <g className="oa-core">
        <circle className="oa-core-ping" cx="170" cy="76" r="9" />
        <circle cx="170" cy="76" r="8" fill="#0d4a4b" stroke="#52e5c6" strokeWidth="2" />
        <circle cx="170" cy="76" r="3" fill="#7bf2d8" />
      </g>

      {pins.map((p) => (
        <g key={p.x} className="oa-mpin" style={{ animationDelay: `${p.d}s`, transformOrigin: `${p.x}px ${p.y}px` }}>
          <circle cx={p.x} cy={p.y} r="10" fill="#14c8a4" fillOpacity="0.22" />
          <circle cx={p.x} cy={p.y} r="7" fill="#14c8a4" />
          <path
            d={`M${p.x - 3} ${p.y} l2.4 2.6 l4.2 -5`}
            fill="none"
            stroke="#04332c"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      ))}
    </svg>
  );
}
