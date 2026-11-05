import React from "react";

import "../styles/user/HeroScene.css";


/* =========================================================
   Small helpers (inline SVG, no image files needed)
   ========================================================= */

/* a flower drawn inside the big scene SVG.  (x, y) = where the stem touches the ground */
function SceneFlower({ x, y, s = 1, petal = "#ff8fb1", center = "#ffd447", delay = 0 }) {
    return (
        <g transform={`translate(${x - 12 * s} ${y - 44 * s}) scale(${s})`}>
            <g className="hs-fl" style={{ animationDelay: `${delay}s` }}>
                <path d="M12 44 C12 34 11 26 12 17" stroke="#2fbf8f" strokeWidth="2" fill="none" strokeLinecap="round" />
                <path d="M12 35 C6 34 4 30 4 27 C9 27 12 30 12 35Z" fill="#2fbf8f" />
                <path d="M12 30 C18 29 20 25 20 22 C15 22 12 25 12 30Z" fill="#26a77c" />
                <g className="hs-fl-head">
                    {[0, 60, 120, 180, 240, 300].map((angle) => (
                        <ellipse key={angle} cx="12" cy="7.5" rx="3" ry="5" fill={petal}
                            transform={`rotate(${angle} 12 12)`} />
                    ))}
                    <circle cx="12" cy="12" r="3" fill={center} />
                </g>
            </g>
        </g>
    );
}

function Butterfly({ x, y, className, color }) {
    return (
        <g transform={`translate(${x} ${y})`}>
            <g className={className}>
                <g className="hs-wings">
                    <ellipse cx="-3.4" cy="-1.4" rx="3.6" ry="2.6" fill={color} transform="rotate(-25 -3.4 -1.4)" />
                    <ellipse cx="3.4" cy="-1.4" rx="3.6" ry="2.6" fill={color} transform="rotate(25 3.4 -1.4)" />
                    <ellipse cx="-2.6" cy="1.8" rx="2.4" ry="1.8" fill={color} opacity="0.8" />
                    <ellipse cx="2.6" cy="1.8" rx="2.4" ry="1.8" fill={color} opacity="0.8" />
                </g>
                <rect x="-0.6" y="-3" width="1.2" height="7" rx="0.6" fill="#0a1b30" />
            </g>
        </g>
    );
}

function Sparkle({ x, y, s = 1, delay = 0 }) {
    return (
        <g transform={`translate(${x} ${y}) scale(${s})`}>
            <path
                className="hs-spark"
                style={{ animationDelay: `${delay}s` }}
                d="M0 -4 L1 -1 L4 0 L1 1 L0 4 L-1 1 L-4 0 L-1 -1Z"
                fill="#ffe27a"
            />
        </g>
    );
}


/* =========================================================
   THE SCENE: little person standing in a flower garden
   ========================================================= */

export function HeroScene({ name = "there" }) {
    return (
        <div className="hs-scene" aria-hidden="true">

            <span className="hs-bubble">Hi, {name}!</span>

            <svg viewBox="0 0 200 160" className="hs-scene-svg">

                {/* soft glow behind the person */}
                <defs>
                    <radialGradient id="hsGlow" cx="50%" cy="55%" r="50%">
                        <stop offset="0%" stopColor="#14d3ac" stopOpacity="0.38" />
                        <stop offset="100%" stopColor="#14d3ac" stopOpacity="0" />
                    </radialGradient>
                </defs>
                <circle className="hs-glow" cx="100" cy="95" r="70" fill="url(#hsGlow)" />

                {/* ground */}
                <path d="M-6 160 C30 148 70 150 100 151 C135 150 170 148 206 160Z" fill="rgba(20,211,172,0.22)" />
                <ellipse cx="100" cy="156" rx="30" ry="3" fill="rgba(0,0,0,0.25)" />

                {/* flowers behind */}
                <SceneFlower x={26} y={158} s={1.45} petal="#ff8fb1" delay={0} />
                <SceneFlower x={150} y={158} s={1.6} petal="#b9a7ff" delay={-1.3} />
                <SceneFlower x={46} y={158} s={1.05} petal="#ffd447" center="#ff8fb1" delay={-2.1} />
                <SceneFlower x={172} y={158} s={1.15} petal="#ff8fb1" delay={-0.7} />
                <SceneFlower x={188} y={158} s={0.85} petal="#7ff5e4" center="#ffd447" delay={-1.8} />

                {/* the person (own viewport so the arm rotates around the shoulder) */}
                <svg x="62" y="36" width="75" height="120" viewBox="0 0 30 48" overflow="visible">
                    <g className="hs-person">
                        {/* legs + shoes */}
                        <rect x="11" y="30" width="3.6" height="14" rx="1.6" fill="#16324a" />
                        <rect x="16.4" y="30" width="3.6" height="14" rx="1.6" fill="#16324a" />
                        <ellipse cx="12.8" cy="45" rx="3.6" ry="2" fill="#0a1b30" />
                        <ellipse cx="18.2" cy="45" rx="3.6" ry="2" fill="#0a1b30" />

                        {/* dress */}
                        <path d="M9 16 Q15 13 21 16 L23.5 32 H6.5 Z" fill="#14d3ac" />
                        <path d="M8 25 H22" stroke="#0f9d84" strokeWidth="1.6" strokeLinecap="round" />

                        {/* resting arm */}
                        <rect x="5" y="16.5" width="3.2" height="12" rx="1.6" fill="#f5cfae"
                            transform="rotate(8 6.6 17)" />

                        {/* waving arm */}
                        <g className="hs-wave">
                            <rect x="21.4" y="6" width="3.2" height="12" rx="1.6" fill="#f5cfae" />
                            <circle cx="23" cy="5.4" r="2.3" fill="#f5cfae" />
                        </g>

                        {/* head */}
                        <ellipse cx="22.6" cy="9.5" rx="2" ry="3.6" fill="#2a1f45" />
                        <circle cx="15" cy="9" r="6.2" fill="#f5cfae" />
                        <path d="M8.6 9 C8.4 3 13 1.4 15.6 1.8 C20 2.2 22 5.6 21.4 9.6 C19.4 6.6 14 6 8.6 9Z" fill="#2a1f45" />
                        <circle cx="11" cy="12" r="1.1" fill="#ff9d9d" opacity="0.55" />
                        <circle cx="19" cy="12" r="1.1" fill="#ff9d9d" opacity="0.55" />
                        <g className="hs-eyes">
                            <circle cx="12.8" cy="10.2" r="0.85" fill="#2a1f45" />
                            <circle cx="17.2" cy="10.2" r="0.85" fill="#2a1f45" />
                        </g>
                        <path d="M13.2 12.7 Q15 14.2 16.8 12.7" stroke="#c0675a" strokeWidth="0.9" fill="none" strokeLinecap="round" />
                    </g>
                </svg>

                {/* flowers in front */}
                <SceneFlower x={72} y={159} s={0.8} petal="#ffd447" center="#ff8fb1" delay={-0.4} />
                <SceneFlower x={130} y={159} s={0.75} petal="#ff8fb1" delay={-1.6} />

                {/* butterflies + sparkles */}
                <Butterfly x={16} y={70} className="hs-bfly-1" color="#ffb3c8" />
                <Butterfly x={140} y={40} className="hs-bfly-2" color="#9fe8ff" />

                <Sparkle x={34} y={34} s={1.1} delay={0} />
                <Sparkle x={60} y={18} s={0.7} delay={-1} />
                <Sparkle x={168} y={62} s={0.9} delay={-1.8} />
                <Sparkle x={112} y={14} s={0.6} delay={-0.5} />

            </svg>

        </div>
    );
}


/* =========================================================
   FLOWERS GROWING ALONG THE BOTTOM EDGE OF THE HERO
   ========================================================= */

const FLORA = [
    { left: "66%",   petal: "#ff8fb1", center: "#ffd447", size: 24, delay: 0 },
    { left: "69%",   petal: "#ffd447", center: "#ff8fb1", size: 17, delay: -1.1 },
    { left: "73.5%", petal: "#b9a7ff", center: "#ffd447", size: 21, delay: -0.5 },
    { left: "78%",   petal: "#7ff5e4", center: "#ffd447", size: 16, delay: -1.8 },
    { left: "83%",   petal: "#ff8fb1", center: "#ffd447", size: 19, delay: -0.9 },
    { left: "91%",   petal: "#ffd447", center: "#ff8fb1", size: 17, delay: -2.2 },
    { left: "95.5%", petal: "#b9a7ff", center: "#ffd447", size: 22, delay: -1.4 },
];

function FloraFlower({ petal, center, size, delay, left }) {
    return (
        <svg
            viewBox="0 0 24 44"
            className="hs-flora-item"
            style={{ left, width: size, height: size * 1.83, animationDelay: `${delay}s` }}
            aria-hidden="true"
        >
            <path d="M12 44 C12 34 11 26 12 17" stroke="#2fbf8f" strokeWidth="2" fill="none" strokeLinecap="round" />
            <path d="M12 35 C6 34 4 30 4 27 C9 27 12 30 12 35Z" fill="#2fbf8f" />
            <path d="M12 30 C18 29 20 25 20 22 C15 22 12 25 12 30Z" fill="#26a77c" />
            <g className="hs-fl-head">
                {[0, 60, 120, 180, 240, 300].map((angle) => (
                    <ellipse key={angle} cx="12" cy="7.5" rx="3" ry="5" fill={petal}
                        transform={`rotate(${angle} 12 12)`} />
                ))}
                <circle cx="12" cy="12" r="3" fill={center} />
            </g>
        </svg>
    );
}

export function HeroFlora() {
    return (
        <div className="hs-flora" aria-hidden="true">
            {FLORA.map((item) => (
                <FloraFlower key={item.left} {...item} />
            ))}
        </div>
    );
}

export default HeroScene;