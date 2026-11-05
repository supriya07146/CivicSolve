import React from "react";

/*
  Citizen illustration drawn as inline SVG, so you don't need an image file.
  Put this file in:  src/components/CitizenIllustration.js

  Colours used here (change the hex values to restyle it):
    coat blue  #1d4ed8     hair/pants  #1f2a3c     skin  #f6c9a6
    leaves     #1f9e6a     pin         #2563eb
*/
function CitizenIllustration() {
  return (
    <svg
      className="cr-illustration"
      viewBox="0 0 460 640"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {/* one leaf shape, reused many times (base at 0,0 pointing up) */}
        <path id="crLeaf" d="M0 0C-24 -40 -22 -92 0 -124C22 -92 24 -40 0 0Z" />
      </defs>

      {/* ground shadow */}
      <ellipse cx="230" cy="606" rx="160" ry="15" fill="#06382f" opacity="0.16" />

      {/* ---------- clipboard (left, on the white side) ---------- */}
      <g transform="rotate(-9 70 260)">
        <rect x="22" y="180" width="104" height="146" rx="10" fill="#eef3f2" stroke="#dbe5e3" strokeWidth="2" />
        <rect x="52" y="170" width="44" height="20" rx="6" fill="#cfdad8" />
        <rect x="40" y="214" width="68" height="8" rx="4" fill="#d9e4e2" />
        <rect x="40" y="236" width="52" height="8" rx="4" fill="#d9e4e2" />
        <rect x="40" y="258" width="68" height="8" rx="4" fill="#d9e4e2" />
        <circle cx="52" cy="298" r="10" fill="none" stroke="#0f9d84" strokeWidth="3" />
        <path d="M47 298l4 4 7-8" fill="none" stroke="#0f9d84" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="70" y="294" width="40" height="8" rx="4" fill="#d9e4e2" />
      </g>

      {/* ---------- leaves, bottom left (pale) + small blue one ---------- */}
      <g fill="#e1eae8">
        <use href="#crLeaf" transform="translate(66 612) rotate(-22) scale(0.95)" />
        <use href="#crLeaf" transform="translate(66 612) rotate(14) scale(0.78)" />
        <use href="#crLeaf" transform="translate(66 612) rotate(-52) scale(0.6)" />
      </g>
      <g transform="translate(128 612) rotate(18) scale(0.5)">
        <use href="#crLeaf" fill="#2563eb" />
        <path d="M0 -4V-112" stroke="#fff" strokeWidth="4" opacity="0.55" />
      </g>

      {/* ---------- leaves, bottom right (green) ---------- */}
      <g transform="translate(398 612) rotate(15) scale(0.95)">
        <use href="#crLeaf" fill="#1f9e6a" />
        <path d="M0 -4V-112" stroke="#fff" strokeWidth="3" opacity="0.4" />
      </g>
      <g transform="translate(398 612) rotate(-25) scale(0.8)">
        <use href="#crLeaf" fill="#2cb67d" />
        <path d="M0 -4V-112" stroke="#fff" strokeWidth="3" opacity="0.4" />
      </g>
      <g transform="translate(398 612) rotate(46) scale(0.6)">
        <use href="#crLeaf" fill="#178a5c" />
      </g>

      {/* ---------- the citizen ---------- */}
      {/* legs + shoes */}
      <rect x="160" y="460" width="64" height="130" rx="10" fill="#1f2a3c" />
      <rect x="236" y="460" width="64" height="130" rx="10" fill="#1f2a3c" />
      <path d="M150 596Q150 584 172 584H226V604H156Q150 604 150 596Z" fill="#111827" />
      <path d="M310 596Q310 584 288 584H234V604H304Q310 604 310 596Z" fill="#111827" />

      {/* hair (back) + bun */}
      <circle cx="230" cy="80" r="27" fill="#1f2a3c" />
      <ellipse cx="230" cy="150" rx="64" ry="68" fill="#1f2a3c" />

      {/* neck */}
      <rect x="217" y="200" width="26" height="40" rx="8" fill="#eebb94" />

      {/* coat */}
      <path d="M158 250Q230 222 302 250L324 336L330 472H130L136 336Z" fill="#1d4ed8" />
      <path d="M230 330V472" stroke="#1740b8" strokeWidth="3" opacity="0.6" />

      {/* shirt + lapels */}
      <path d="M204 236L230 312L256 236Z" fill="#ffffff" />
      <path d="M196 238L226 318L204 330L172 262Z" fill="#1a44c4" />
      <path d="M264 238L234 318L256 330L288 262Z" fill="#1a44c4" />

      {/* face */}
      <ellipse cx="230" cy="158" rx="43" ry="51" fill="#f6c9a6" />
      <path d="M185 150Q184 104 230 100Q278 104 275 150Q258 124 232 126Q206 128 185 150Z" fill="#1f2a3c" />
      <circle cx="214" cy="160" r="3.4" fill="#1f2a3c" />
      <circle cx="246" cy="160" r="3.4" fill="#1f2a3c" />
      <path d="M205 148Q214 143 222 148M238 148Q246 143 255 148" fill="none" stroke="#1f2a3c" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="204" cy="177" r="7" fill="#f4a58a" opacity="0.5" />
      <circle cx="256" cy="177" r="7" fill="#f4a58a" opacity="0.5" />
      <path d="M220 188Q230 197 240 188" fill="none" stroke="#b4443f" strokeWidth="3" strokeLinecap="round" />

      {/* lanyard + citizen ID badge */}
      <path d="M214 240L228 364M246 240L232 364" stroke="#dbe4f5" strokeWidth="4" fill="none" strokeLinecap="round" />
      <rect x="203" y="362" width="54" height="66" rx="6" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.5" />
      <path d="M203 368a6 6 0 0 1 6-6h42a6 6 0 0 1 6 6v8H203z" fill="#0f9d84" />
      <circle cx="230" cy="394" r="8" fill="#cbd5e1" />
      <rect x="213" y="408" width="34" height="5" rx="2.5" fill="#d9e4e2" />
      <rect x="219" y="417" width="22" height="5" rx="2.5" fill="#d9e4e2" />

      {/* crossed arms */}
      <path d="M290 266Q318 330 276 344L182 318" fill="none" stroke="#1a47c9" strokeWidth="38" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M170 266Q142 330 186 342L284 312" fill="none" stroke="#2160ee" strokeWidth="38" strokeLinecap="round" strokeLinejoin="round" />
      <ellipse cx="288" cy="310" rx="15" ry="12" fill="#f6c9a6" />
      <ellipse cx="178" cy="318" rx="15" ry="12" fill="#f6c9a6" />

      {/* ---------- location pin (right, floats) ---------- */}
      <g className="cr-float">
        <ellipse cx="382" cy="304" rx="20" ry="5" fill="none" stroke="#fff" strokeWidth="2" opacity="0.5" />
        <path d="M382 208C362 208 350 224 350 240C350 264 382 294 382 294C382 294 414 264 414 240C414 224 402 208 382 208Z" fill="#2563eb" />
        <circle cx="382" cy="239" r="12" fill="#ffffff" />
      </g>

      {/* ---------- "problem solved" bubble (right, floats) ---------- */}
      <g className="cr-float cr-float-2">
        <rect x="338" y="338" width="76" height="54" rx="14" fill="#ffffff" />
        <path d="M356 392l-4 14 16-14z" fill="#ffffff" />
        <path d="M364 365l9 9 17-18" fill="none" stroke="#0f9d84" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

export default CitizenIllustration;