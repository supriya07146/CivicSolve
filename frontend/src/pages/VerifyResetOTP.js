import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { verifyResetOTP } from "../services/api";
import "../styles/VerifyResetOTP.css";

/* =========================================================
   PERSON CHECKING HER PHONE FOR THE CODE
   - signal waves pulse from the phone
   - an envelope flies into the phone
   - when all 6 digits are entered she smiles
   ========================================================= */
function PhoneUser() {
  return (
    <svg className="vo-person-svg" viewBox="0 0 320 360" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="voShirt" x1="0" y1="0" x2="0.7" y2="1">
          <stop offset="0" stopColor="#34d27a" />
          <stop offset="1" stopColor="#0f9d84" />
        </linearGradient>
        <linearGradient id="voHair" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2b1d17" />
          <stop offset="1" stopColor="#5a3a2d" />
        </linearGradient>
        <linearGradient id="voScreen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f0fdf9" />
          <stop offset="1" stopColor="#bdf0e2" />
        </linearGradient>
      </defs>

      <g className="vo-body">
        {/* hair behind */}
        <g className="vo-head">
          <path d="M104 134 C94 80 130 46 162 46 C196 46 228 80 218 134 C224 190 232 230 226 270 L96 270 C92 230 100 186 104 134Z" fill="url(#voHair)" />
        </g>

        {/* shirt */}
        <path d="M66 360 V312 Q68 270 108 260 L132 250 H190 L214 260 Q254 270 256 312 V360Z" fill="url(#voShirt)" />
        <path d="M138 250 Q160 274 184 250" stroke="#0a5c4a" strokeWidth="3" fill="none" opacity="0.5" />
        <path d="M120 300 Q160 316 200 300" stroke="#0a5c4a" strokeWidth="2" fill="none" opacity="0.18" />

        {/* head (tilted slightly toward the phone) */}
        <g className="vo-head">
          <rect x="148" y="214" width="26" height="42" rx="10" fill="#e6ad86" />
          <ellipse cx="161" cy="154" rx="46" ry="54" fill="#f2c4a0" />
          <ellipse className="vo-eye" cx="144" cy="156" rx="4.4" ry="5.4" fill="#1f2937" />
          <ellipse className="vo-eye" cx="180" cy="156" rx="4.4" ry="5.4" fill="#1f2937" />
          <circle cx="146" cy="158" r="1.6" fill="#fff" opacity="0.8" />
          <circle cx="182" cy="158" r="1.6" fill="#fff" opacity="0.8" />
          <path d="M132 142 Q143 136 154 141" stroke="#2b1d17" strokeWidth="3" strokeLinecap="round" fill="none" />
          <path d="M170 141 Q181 136 192 142" stroke="#2b1d17" strokeWidth="3" strokeLinecap="round" fill="none" />
          <path className="vo-mouth-wait" d="M153 184 Q161 188 170 184" stroke="#b8574a" strokeWidth="3" strokeLinecap="round" fill="none" />
          <path className="vo-mouth-happy" d="M150 182 Q161 198 173 182 Z" fill="#fff" stroke="#b8574a" strokeWidth="3" strokeLinejoin="round" />
          <circle cx="133" cy="170" r="7" fill="#ff9aa2" opacity="0.3" />
          <circle cx="190" cy="170" r="7" fill="#ff9aa2" opacity="0.3" />
          <path d="M114 144 C111 102 134 86 162 88 C190 88 210 106 208 144 C198 120 182 110 160 110 C140 110 122 122 114 144Z" fill="url(#voHair)" />
        </g>

        {/* arm hanging on the left */}
        <path d="M92 268 L96 322" stroke="#0f9d84" strokeWidth="36" strokeLinecap="round" />
        <path d="M96 326 L100 356" stroke="#f2c4a0" strokeWidth="19" strokeLinecap="round" />

        {/* arm raised with the phone */}
        <path d="M230 268 L240 322" stroke="#12a77f" strokeWidth="36" strokeLinecap="round" />
        <path d="M240 322 L232 262" stroke="#f2c4a0" strokeWidth="19" strokeLinecap="round" />

        {/* phone */}
        <g className="vo-phone" transform="rotate(8 226 232)">
          <rect x="204" y="188" width="46" height="80" rx="9" fill="#0a1b30" />
          <rect className="vo-screen" x="208" y="194" width="38" height="68" rx="6" fill="url(#voScreen)" />
          <rect x="220" y="190" width="14" height="2.5" rx="1.2" fill="#1d3550" />
          <rect x="213" y="202" width="28" height="18" rx="4" fill="#fff" />
          <path d="M215 205 L227 214 L239 205" stroke="#0f9d84" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="213" y="226" width="28" height="4" rx="2" fill="#0f9d84" opacity="0.5" />
          <rect x="213" y="234" width="20" height="4" rx="2" fill="#0f9d84" opacity="0.35" />
          <rect x="213" y="246" width="28" height="9" rx="4.5" fill="#0a5c4a" />
        </g>
        <ellipse cx="206" cy="246" rx="7" ry="10" fill="#f2c4a0" />
        <ellipse cx="246" cy="236" rx="5" ry="9" fill="#f2c4a0" />
      </g>

      {/* signal waves from the phone */}
      <g className="vo-waves" fill="none" stroke="#14d3ac" strokeWidth="3" strokeLinecap="round">
        <path className="vo-wave vo-wave-1" d="M262 190 a22 22 0 0 1 0 -30" />
        <path className="vo-wave vo-wave-2" d="M274 198 a36 36 0 0 0 0 -46" />
        <path className="vo-wave vo-wave-3" d="M286 206 a50 50 0 0 0 0 -62" />
      </g>
    </svg>
  );
}

/* =========================================================
   VERIFY RESET OTP
   ========================================================= */
function VerifyResetOTP() {
  const navigate = useNavigate();
  const inputRef = useRef(null);

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const storedEmail = localStorage.getItem("reset_email") || "";

    if (!storedEmail) {
      navigate("/forgot-password", { replace: true });
      return;
    }

    setEmail(storedEmail);
  }, [navigate]);

  const complete = otp.length === 6;

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    const cleanOTP = otp.trim();

    if (!email) {
      setError("Reset session expired. Please request a new OTP.");
      return;
    }

    if (!/^\d{6}$/.test(cleanOTP)) {
      setError("Please enter the 6-digit verification code.");
      return;
    }

    try {
      setLoading(true);

      const response = await verifyResetOTP({
        email: email.trim().toLowerCase(),
        otp: cleanOTP,
      });

      /* Your API helper returns the JSON data directly, NOT an Axios response. */
      const resetToken = response?.reset_token;

      if (!resetToken) {
        throw new Error("Reset verification failed. Please request a new OTP.");
      }

      localStorage.setItem("reset_token", resetToken);
      navigate("/reset-password");
    } catch (err) {
      console.error("Reset OTP verification error:", err);
      setError(err?.message || "Invalid or expired OTP.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="vo-page">
      <div className="vo-particles" aria-hidden="true">
        {Array.from({ length: 9 }).map((_, i) => (
          <span key={i} className={`vo-particle vo-particle-${i + 1}`} />
        ))}
      </div>

      <div className="vo-layout">
        {/* ---------- illustration ---------- */}
        <div className={`vo-scene ${complete ? "is-complete" : ""}`}>
          <div className="vo-cloud-bg" />

          <svg className="vo-decor" viewBox="0 0 520 430" aria-hidden="true" focusable="false">
            <g className="vo-drift">
              <ellipse cx="70" cy="60" rx="32" ry="12" fill="#fff" opacity="0.85" />
              <ellipse cx="94" cy="54" rx="22" ry="13" fill="#fff" opacity="0.85" />
            </g>
            <g className="vo-drift vo-drift-2">
              <ellipse cx="430" cy="48" rx="30" ry="11" fill="#fff" opacity="0.7" />
              <ellipse cx="452" cy="43" rx="20" ry="12" fill="#fff" opacity="0.7" />
            </g>

            {/* shield */}
            <g className="vo-float">
              <path d="M26 230 l30 -11 l30 11 v28 c0 21 -15 34 -30 40 c-15 -6 -30 -19 -30 -40z" fill="#e4faf3" stroke="#0a5c4a" strokeWidth="2" />
              <path className="vo-shield-check" d="M41 258 l10 10 l18 -20" stroke="#14d3ac" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </g>

            {/* chat bubble with dots */}
            <g className="vo-float vo-float-2">
              <rect x="420" y="250" width="78" height="44" rx="13" fill="#fff" stroke="#cdeee3" strokeWidth="2" />
              <path d="M440 294 l-7 13 l20 -13z" fill="#fff" stroke="#cdeee3" strokeWidth="2" strokeLinejoin="round" />
              <circle className="vo-typing" cx="445" cy="272" r="4" fill="#14d3ac" />
              <circle className="vo-typing vo-typing-2" cx="459" cy="272" r="4" fill="#38bdf8" />
              <circle className="vo-typing vo-typing-3" cx="473" cy="272" r="4" fill="#22c55e" />
            </g>

            {/* envelopes flying toward the phone */}
            <g className="vo-fly">
              <rect x="40" y="130" width="50" height="35" rx="7" fill="#fff" stroke="#cdeee3" strokeWidth="2" />
              <path d="M43 136 L65 152 L87 136" stroke="#14d3ac" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </g>
            <g className="vo-fly vo-fly-2">
              <rect x="40" y="130" width="38" height="27" rx="6" fill="#d9f7ee" stroke="#a9e6d6" strokeWidth="2" />
              <path d="M43 135 L59 147 L75 135" stroke="#0f9d84" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </g>

            {/* sparkles */}
            <path className="vo-star" d="M380 110 l4 10 l10 4 l-10 4 l-4 10 l-4 -10 l-10 -4 l10 -4z" fill="#14d3ac" />
            <path className="vo-star vo-star-2" d="M500 170 l3 8 l8 3 l-8 3 l-3 8 l-3 -8 l-8 -3 l8 -3z" fill="#38bdf8" />
            <circle className="vo-float" cx="36" cy="330" r="4" fill="#22c55e" opacity="0.6" />
          </svg>

          {/* digits fill in as the user types */}
          <div className="vo-chips" aria-hidden="true">
            {Array.from({ length: 6 }).map((_, i) => (
              <span key={i} className={i < otp.length ? "lit" : ""}>
                {i < otp.length ? "✓" : ""}
              </span>
            ))}
          </div>

          <div className="vo-person-wrap">
            <PhoneUser />
          </div>

          <div className="vo-ground" />
        </div>

        {/* ---------- card ---------- */}
        <div className="vo-card">
          <div className="vo-badge" aria-hidden="true">
            <span className="vo-badge-ring" />
            <svg viewBox="0 0 48 48" focusable="false">
              <rect x="8" y="12" width="32" height="24" rx="5" fill="#fff" />
              <path d="M10 16 L24 27 L38 16" stroke="#0f9d84" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          <h1>Verify your email</h1>

          <p className="vo-subtitle">Enter the 6-digit verification code sent to</p>

          <div className="vo-email-pill">{email || "your email address"}</div>

          <ol className="vo-steps" aria-label="Reset steps">
            <li className="done">✓ Email</li>
            <li className="active">Code</li>
            <li>New password</li>
          </ol>

          {error && (
            <div className="vo-error" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={submit} noValidate>
            <div className="vo-group">
              <label htmlFor="otp">Verification Code</label>

              <div
                className={`vo-boxes ${error ? "has-error" : ""}`}
                onClick={() => inputRef.current && inputRef.current.focus()}
              >
                {Array.from({ length: 6 }).map((_, i) => (
                  <span
                    key={i}
                    className={`vo-box ${otp[i] ? "filled" : ""} ${
                      i === otp.length && !complete ? "current" : ""
                    }`}
                  >
                    {otp[i] || ""}
                  </span>
                ))}

                <input
                  id="otp"
                  ref={inputRef}
                  className="vo-hidden-input"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={otp}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                    setOtp(value);
                    setError("");
                  }}
                  maxLength="6"
                  placeholder="000000"
                  autoFocus
                />
              </div>
            </div>

            <button type="submit" className="vo-submit" disabled={loading || otp.length !== 6}>
              {loading ? "Verifying..." : "Verify Code"}
            </button>
          </form>

          <button type="button" className="vo-back" onClick={() => navigate("/forgot-password")}>
            ← Change Email
          </button>
        </div>
      </div>

      <p className="vo-footer">© 2026 CivicSolve. Building better communities together.</p>
    </div>
  );
}

export default VerifyResetOTP;