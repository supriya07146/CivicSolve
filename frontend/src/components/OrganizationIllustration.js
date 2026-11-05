import React from "react";

/*
  Registration illustration (computer person) recoloured to the
  CivicSolve green theme. Pure inline SVG: no image file needed.
  Save as: src/components/OrganizationIllustration.js
*/
function OrganizationIllustration() {
    return (
        <svg
            className="org-illustration-svg"
            viewBox="0 0 560 560"
            xmlns="http://www.w3.org/2000/svg"
            role="img"
            aria-label="Person registering an organization on a laptop"
        >
            {/* soft background blob */}
            <path
                d="M300 150c90-20 190 20 200 120 10 90-40 160-110 200-60 34-150 40-210 10-70-35-90-120-60-190 30-70 90-120 180-140z"
                fill="#d9f7ee"
            />

            {/* floor shadow */}
            <ellipse cx="280" cy="516" rx="250" ry="12" fill="#bfeadd" />

            {/* chair */}
            <path
                d="M40 380c0-22 14-34 34-34h8v170H48c-6 0-8-3-8-8z"
                fill="#0f9d84"
            />

            {/* check bubble */}
            <path
                d="M100 118a62 62 0 1 1 52 84l4 34-42-28A62 62 0 0 1 100 118z"
                fill="#f2fdf9"
                stroke="#0a1b30"
                strokeWidth="3"
            />
            <path
                d="M92 150l22 22 42-44"
                fill="none"
                stroke="#0f9d84"
                strokeWidth="11"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M82 96c10-14 28-22 44-22"
                fill="none"
                stroke="#0a1b30"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray="2 8"
            />

            {/* registration card */}
            <rect
                x="252"
                y="78"
                width="244"
                height="252"
                rx="22"
                fill="#ffffff"
                stroke="#0a1b30"
                strokeWidth="4"
            />
            <circle
                cx="374"
                cy="76"
                r="38"
                fill="#ffffff"
                stroke="#0a1b30"
                strokeWidth="4"
            />
            <circle
                cx="374"
                cy="68"
                r="11"
                fill="none"
                stroke="#0f9d84"
                strokeWidth="5"
            />
            <path
                d="M350 100c2-16 12-22 24-22s22 6 24 22"
                fill="none"
                stroke="#0f9d84"
                strokeWidth="5"
                strokeLinecap="round"
            />
            <text
                x="374"
                y="160"
                textAnchor="middle"
                fontFamily="Plus Jakarta Sans, system-ui, sans-serif"
                fontWeight="800"
                fontSize="28"
                fill="#0a1b30"
                letterSpacing="0.5"
            >
                REGISTRATION
            </text>
            <rect x="272" y="178" width="88" height="18" rx="5" fill="#e9fbf6" stroke="#0a1b30" strokeWidth="2.5" />
            <rect x="384" y="178" width="92" height="18" rx="5" fill="#e9fbf6" stroke="#0a1b30" strokeWidth="2.5" />
            <rect x="272" y="212" width="204" height="18" rx="5" fill="#e9fbf6" stroke="#0a1b30" strokeWidth="2.5" />
            <rect x="272" y="244" width="204" height="18" rx="5" fill="#e9fbf6" stroke="#0a1b30" strokeWidth="2.5" />
            <rect x="334" y="284" width="80" height="26" rx="6" fill="#0a5c4a" />
            <text
                x="374"
                y="302"
                textAnchor="middle"
                fontFamily="Plus Jakarta Sans, system-ui, sans-serif"
                fontWeight="800"
                fontSize="14"
                fill="#ffffff"
            >
                CREATE
            </text>

            {/* plant */}
            <path d="M474 440c-6-60-30-60-40-80 22-6 40 10 44 40 4-40 10-54 30-70 6 30-6 54-20 80z" fill="#14d3ac" />
            <path d="M490 440c4-30 20-50 44-56-4 28-18 46-44 56z" fill="#0a5c4a" />
            <path d="M478 440c-4-24-14-34-30-44" fill="none" stroke="#06402f" strokeWidth="3" strokeLinecap="round" />
            <path d="M458 440h50l-6 56h-38z" fill="#0a1b30" />

            {/* person: torso */}
            <path
                d="M70 516c-10-70 10-170 70-200l40-8 70 14c40 24 54 120 44 194z"
                fill="#1f2a3d"
            />
            {/* collar + tie */}
            <path d="M152 304l30 38 30-40-18-10z" fill="#e9fbf6" />
            <path d="M176 340l-10 16 6 120 20-6 6-118-10-14z" fill="#d2f5ea" />
            {/* neck */}
            <path d="M160 272h44v38l-22 18-22-18z" fill="#f1b894" />
            {/* head */}
            <ellipse cx="182" cy="236" rx="40" ry="46" fill="#f8c9a6" />
            <ellipse cx="144" cy="244" rx="7" ry="11" fill="#f1b894" />
            <ellipse cx="220" cy="244" rx="7" ry="11" fill="#f1b894" />
            {/* hair */}
            <path
                d="M140 226c-6-40 14-62 44-64 22-14 54 4 56 30 4 12 0 24-6 32-6-14-18-24-34-26-20 8-42 8-60 28z"
                fill="#1f2a3d"
            />
            {/* face */}
            <circle cx="166" cy="238" r="3.5" fill="#1f2a3d" />
            <circle cx="202" cy="238" r="3.5" fill="#1f2a3d" />
            <path d="M168 262c8 8 24 8 32 0" fill="none" stroke="#1f2a3d" strokeWidth="3" strokeLinecap="round" />

            {/* arms + laptop */}
            <path d="M92 380c-6 40 20 100 90 110l60-8-4-40-70-8c-20-20-24-50-24-80z" fill="#2a3850" />
            <path d="M200 478l180-8-12-92c-2-14-10-20-22-20H236c-10 0-18 6-20 16z" fill="#e9fbf6" stroke="#bfeadd" strokeWidth="2" />
            <circle cx="290" cy="428" r="16" fill="#14d3ac" />
            <path d="M162 506c20 4 120 8 220 0v10H162z" fill="#0a1b30" />
            <path d="M198 476c-14 2-24 10-30 22l30 6 24-4z" fill="#f8c9a6" />
        </svg>
    );
}

export default OrganizationIllustration;
