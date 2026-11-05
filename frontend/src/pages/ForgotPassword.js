import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import { forgotPassword } from "../services/api";
import "../styles/ForgotPassword.css";

/* =========================================================
   THINKING PERSON — hand on chin, key in a thought bubble.
   When a valid email is typed the bubble turns into a mail
   and the question marks turn into ticks.
   ========================================================= */
function Thinker() {
  return (
    <svg className="fp-thinker" viewBox="0 0 320 340" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="fpShirt" x1="0" y1="0" x2="0.7" y2="1">
          <stop offset="0" stopColor="#34d27a" />
          <stop offset="1" stopColor="#0f9d84" />
        </linearGradient>
        <linearGradient id="fpHair" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6b3f35" />
          <stop offset="1" stopColor="#8a5648" />
        </linearGradient>
        <linearGradient id="fpBubble" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#14d3ac" />
          <stop offset="1" stopColor="#0f9d84" />
        </linearGradient>
      </defs>

      {/* thought bubble */}
      <g className="fp-bubble">
        <ellipse cx="62" cy="86" rx="54" ry="38" fill="url(#fpBubble)" />
        <g className="fp-key">
          <circle cx="40" cy="86" r="12" fill="none" stroke="#fff" strokeWidth="5" />
          <path d="M52 86 H92 M80 86 v10 M90 86 v8" stroke="#fff" strokeWidth="5" strokeLinecap="round" fill="none" />
        </g>
        <g className="fp-mail">
          <rect x="38" y="68" width="48" height="36" rx="6" fill="#fff" />
          <path d="M41 73 L62 90 L83 73" stroke="#0f9d84" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </g>
      <circle className="fp-dot fp-dot-1" cx="108" cy="134" r="7" fill="#14d3ac" />
      <circle className="fp-dot fp-dot-2" cx="124" cy="156" r="4.5" fill="#14d3ac" />

      {/* question marks / ticks */}
      <g className="fp-q fp-q-1"><text x="170" y="52" fontSize="46" fontWeight="800" fill="#22c55e">?</text></g>
      <g className="fp-q fp-q-2"><text x="244" y="104" fontSize="58" fontWeight="800" fill="#38bdf8">?</text></g>
      <g className="fp-q fp-q-3"><text x="100" y="34" fontSize="30" fontWeight="800" fill="#0f9d84">?</text></g>
      <g className="fp-ok">
        <circle cx="200" cy="40" r="16" fill="#22c55e" />
        <path d="M192 40 l6 6 l11 -12" stroke="#fff" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </g>

      <g className="fp-person">
        {/* hair behind */}
        <g className="fp-head">
          <path d="M104 132 C94 78 130 44 162 44 C196 44 228 78 218 132 C224 186 234 226 228 262 L94 262 C90 226 100 184 104 132Z" fill="url(#fpHair)" />
        </g>

        {/* shirt */}
        <path d="M66 340 V304 Q68 264 108 254 L132 246 H190 L214 254 Q254 264 256 304 V340Z" fill="url(#fpShirt)" />
        <path d="M138 246 Q160 270 184 246" stroke="#0a5c4a" strokeWidth="3" fill="none" opacity="0.5" />

        {/* head */}
        <g className="fp-head">
          <rect x="148" y="212" width="26" height="42" rx="10" fill="#e6ad86" />
          <ellipse cx="161" cy="152" rx="46" ry="54" fill="#f2c4a0" />
          <ellipse cx="143" cy="152" rx="4.6" ry="5.6" fill="#1f2937" className="fp-eye" />
          <ellipse cx="179" cy="152" rx="4.6" ry="5.6" fill="#1f2937" className="fp-eye" />
          <path d="M131 138 Q142 132 153 138" stroke="#4a2c24" strokeWidth="3" strokeLinecap="round" fill="none" />
          <path d="M170 132 Q181 124 192 133" stroke="#4a2c24" strokeWidth="3" strokeLinecap="round" fill="none" className="fp-brow" />
          <path d="M153 182 Q161 178 171 183" stroke="#b8574a" strokeWidth="3" strokeLinecap="round" fill="none" />
          <circle cx="132" cy="168" r="7" fill="#ff9aa2" opacity="0.3" />
          <circle cx="190" cy="168" r="7" fill="#ff9aa2" opacity="0.3" />
          <path d="M113 142 C110 100 134 84 162 86 C190 86 210 104 208 142 C198 118 182 108 160 108 C140 108 122 120 113 142Z" fill="url(#fpHair)" />
        </g>

        {/* arms: one across the body, one up to the chin */}
        <path d="M92 266 L100 312" stroke="#0f9d84" strokeWidth="36" strokeLinecap="round" />
        <path d="M100 316 L200 322" stroke="#f2c4a0" strokeWidth="19" strokeLinecap="round" />
        <path d="M230 264 L208 318" stroke="#12a77f" strokeWidth="36" strokeLinecap="round" />
        <path d="M208 318 L182 226" stroke="#f2c4a0" strokeWidth="20" strokeLinecap="round" />
        <g className="fp-finger">
          <ellipse cx="174" cy="208" rx="14" ry="12" fill="#f2c4a0" />
          <path d="M168 200 q-5 -9 2 -14" stroke="#f2c4a0" strokeWidth="7" strokeLinecap="round" fill="none" />
        </g>
      </g>
    </svg>
  );
}

/* =========================================================
   FORGOT PASSWORD
   ========================================================= */
function ForgotPassword() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const emailReady = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setError("Please enter your email address.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    try {
      setLoading(true);

      await forgotPassword({ email: cleanEmail });

      /* The next screen needs the email for OTP verification. */
      localStorage.setItem("reset_email", cleanEmail);
      localStorage.removeItem("reset_token");

      navigate("/verify-reset-otp");
    } catch (err) {
      console.error("Forgot password error:", err);
      setError(err?.message || "Unable to process your request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fp-page">
      <div className="fp-particles" aria-hidden="true">
        {Array.from({ length: 9 }).map((_, i) => (
          <span key={i} className={`fp-particle fp-particle-${i + 1}`} />
        ))}
      </div>

      <div className="fp-layout">
        {/* ---------- illustration ---------- */}
        <div className={`fp-scene ${emailReady ? "is-ready" : ""}`}>
          <div className="fp-cloud-bg" />

          <svg className="fp-decor" viewBox="0 0 520 420" aria-hidden="true" focusable="false">
            <g className="fp-drift">
              <ellipse cx="70" cy="40" rx="32" ry="12" fill="#fff" opacity="0.85" />
              <ellipse cx="94" cy="34" rx="22" ry="13" fill="#fff" opacity="0.85" />
            </g>
            <g className="fp-drift fp-drift-2">
              <ellipse cx="420" cy="26" rx="30" ry="11" fill="#fff" opacity="0.7" />
              <ellipse cx="442" cy="21" rx="20" ry="12" fill="#fff" opacity="0.7" />
            </g>

            {/* shield */}
            <g className="fp-float">
              <path d="M24 250 l28 -10 l28 10 v26 c0 20 -14 32 -28 38 c-14 -6 -28 -18 -28 -38z" fill="#e4faf3" stroke="#0a5c4a" strokeWidth="2" />
              <path d="M38 276 l9 9 l17 -19" stroke="#14d3ac" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </g>

            {/* padlock */}
            <g className="fp-float fp-float-2">
              <rect x="430" y="270" width="48" height="38" rx="8" fill="#0f9d84" />
              <path d="M440 270 v-10 a14 14 0 0 1 28 0 v10" stroke="#0a5c4a" strokeWidth="6" fill="none" strokeLinecap="round" />
              <circle cx="454" cy="287" r="5" fill="#fff" />
            </g>

            {/* flying envelope */}
            <g className="fp-fly">
              <rect x="300" y="150" width="54" height="38" rx="7" fill="#fff" stroke="#cdeee3" strokeWidth="2" />
              <path d="M303 156 L327 174 L351 156" stroke="#14d3ac" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </g>

            {/* sparkles */}
            <path className="fp-star" d="M290 60 l4 10 l10 4 l-10 4 l-4 10 l-4 -10 l-10 -4 l10 -4z" fill="#14d3ac" />
            <path className="fp-star fp-star-2" d="M496 190 l3 8 l8 3 l-8 3 l-3 8 l-3 -8 l-8 -3 l8 -3z" fill="#38bdf8" />
            <circle className="fp-float" cx="40" cy="190" r="4" fill="#22c55e" opacity="0.6" />
          </svg>

          <div className="fp-person-wrap">
            <Thinker />
          </div>

          <div className="fp-ground" />
        </div>

        {/* ---------- card ---------- */}
        <div className="fp-card">
          <div className="fp-lock" aria-hidden="true">
            <span className="fp-lock-ring" />
            <svg viewBox="0 0 48 48" focusable="false">
              <path className="fp-shackle" d="M16 22 v-6 a8 8 0 0 1 16 0 v6" stroke="#fff" strokeWidth="4" strokeLinecap="round" fill="none" />
              <rect x="11" y="22" width="26" height="20" rx="5" fill="#fff" />
              <circle cx="24" cy="31" r="3" fill="#0f9d84" />
            </svg>
          </div>

          <h1>Forgot your password?</h1>

          <p className="fp-subtitle">
            Enter the email linked to your CivicSolve account and we'll send you a verification code.
          </p>

          <ol className="fp-steps" aria-label="Reset steps">
            <li className="active">Email</li>
            <li>Code</li>
            <li>New password</li>
          </ol>

          {error && (
            <div className="fp-error" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={submit} noValidate>
            <div className="fp-group">
              <label htmlFor="email">Email Address</label>

              <div className="fp-input-wrap">
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <rect x="3" y="5" width="18" height="14" rx="3" fill="none" stroke="currentColor" strokeWidth="2" />
                  <path d="M4 7 l8 6 l8 -6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError("");
                  }}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
                {emailReady && <span className="fp-tick">✓</span>}
              </div>
            </div>

            <button type="submit" className="fp-submit" disabled={loading}>
              {loading ? "Sending code..." : "Send Verification Code"}
            </button>
          </form>

          <button type="button" className="fp-back" onClick={() => navigate("/login")}>
            ← Back to Login
          </button>
        </div>
      </div>

      <p className="fp-footer">© 2026 CivicSolve. Building better communities together.</p>
    </div>
  );
}

export default ForgotPassword;