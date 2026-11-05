import React from "react";

/*
  Split illustration for the organization page.
  PersonIllustration -> fixed on the left of the card
  PlantIllustration  -> fixed on the right of the card
  Save as: src/components/OrganizationScene.js
*/

export function PersonIllustration() {
    return (
        <svg
            className="org-person-svg"
            viewBox="30 50 370 480"
            xmlns="http://www.w3.org/2000/svg"
            role="img"
            aria-label="Person registering an organization on a laptop"
        >
            {/* chair */}
            <path d="M40 380c0-22 14-34 34-34h8v170H48c-6 0-8-3-8-8z" fill="#0f9d84" />

            {/* check bubble */}
            <g className="org-bubble">
                <path
                    d="M100 118a62 62 0 1 1 52 84l4 34-42-28A62 62 0 0 1 100 118z"
                    fill="#f2fdf9" stroke="#0a1b30" strokeWidth="3"
                />
                <path className="org-check" pathLength="100" d="M92 150l22 22 42-44" fill="none" stroke="#0f9d84" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" />
            </g>
            <path className="org-arc" d="M82 96c10-14 28-22 44-22" fill="none" stroke="#0a1b30" strokeWidth="3" strokeLinecap="round" strokeDasharray="2 8" />

            {/* torso */}
            <path d="M70 516c-10-70 10-170 70-200l40-8 70 14c40 24 54 120 44 194z" fill="#1f2a3d" />
            {/* collar + tie */}
            <path d="M152 304l30 38 30-40-18-10z" fill="#e9fbf6" />
            <path d="M176 340l-10 16 6 120 20-6 6-118-10-14z" fill="#d2f5ea" />
            {/* head group nods gently */}
            <g className="org-head">
            {/* neck */}
            <path d="M160 272h44v38l-22 18-22-18z" fill="#f1b894" />
            {/* head */}
            <ellipse cx="182" cy="236" rx="40" ry="46" fill="#f8c9a6" />
            <ellipse cx="144" cy="244" rx="7" ry="11" fill="#f1b894" />
            <ellipse cx="220" cy="244" rx="7" ry="11" fill="#f1b894" />
            {/* hair */}
            <path d="M140 226c-6-40 14-62 44-64 22-14 54 4 56 30 4 12 0 24-6 32-6-14-18-24-34-26-20 8-42 8-60 28z" fill="#1f2a3d" />
            {/* face */}
            <circle className="org-eye" cx="166" cy="238" r="3.5" fill="#1f2a3d" />
            <circle className="org-eye" cx="202" cy="238" r="3.5" fill="#1f2a3d" />
            <path d="M168 262c8 8 24 8 32 0" fill="none" stroke="#1f2a3d" strokeWidth="3" strokeLinecap="round" />
            </g>

            {/* arms + laptop */}
            <path className="org-arm" d="M92 380c-6 40 20 100 90 110l60-8-4-40-70-8c-20-20-24-50-24-80z" fill="#2a3850" />
            <path d="M200 478l180-8-12-92c-2-14-10-20-22-20H236c-10 0-18 6-20 16z" fill="#e9fbf6" stroke="#bfeadd" strokeWidth="2" />
            <circle className="org-laptop-dot" cx="290" cy="428" r="16" fill="#14d3ac" />
            <path d="M162 506c20 4 120 8 220 0v10H162z" fill="#0a1b30" />
            <path className="org-hand" d="M198 476c-14 2-24 10-30 22l30 6 24-4z" fill="#f8c9a6" />
        </svg>
    );
}

export function PlantIllustration() {
    return (
        <svg
            className="org-plant-svg"
            viewBox="420 330 130 175"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
        >
            <g className="org-leaves">
                <path d="M474 440c-6-60-30-60-40-80 22-6 40 10 44 40 4-40 10-54 30-70 6 30-6 54-20 80z" fill="#14d3ac" />
                <path d="M490 440c4-30 20-50 44-56-4 28-18 46-44 56z" fill="#0a5c4a" />
                <path d="M478 440c-4-24-14-34-30-44" fill="none" stroke="#06402f" strokeWidth="3" strokeLinecap="round" />
            </g>
            <path d="M458 440h50l-6 56h-38z" fill="#0a1b30" />
        </svg>
    );
}

/* small decorative extras that float around the scene */
export function SceneExtras() {
    return (
        <>
            <svg className="org-float org-float-mail" viewBox="0 0 120 80" aria-hidden="true">
                <rect x="2" y="2" width="116" height="76" rx="6" fill="#bfeadd" />
                <path d="M4 6l56 40L116 6" fill="none" stroke="#f2fdf9" strokeWidth="5" strokeLinejoin="round" />
            </svg>

            <svg className="org-float org-float-gear" viewBox="0 0 100 100" aria-hidden="true">
                <path
                    d="M43 6h14l3 12 9 4 11-6 10 10-6 11 4 9 12 3v14l-12 3-4 9 6 11-10 10-11-6-9 4-3 12H43l-3-12-9-4-11 6-10-10 6-11-4-9-12-3V43l12-3 4-9-6-11 10-10 11 6 9-4z"
                    fill="#bfeadd"
                />
                <circle cx="50" cy="50" r="17" fill="#eafaf5" />
            </svg>

            <span className="org-dot org-dot-1" />
            <span className="org-dot org-dot-2" />
            <span className="org-dot org-dot-3" />
            <span className="org-dot org-dot-4" />
        </>
    );
}