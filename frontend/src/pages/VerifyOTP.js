import React, { useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import {
  citizenVerifyOTP,
  organizationVerifyOTP,
} from "../services/api";

import "../styles/VerifyOTP.css";

/* =========================================================
   PERSON CHECKING HER PHONE FOR THE REGISTRATION CODE
   ========================================================= */
function PhoneUser() {
  return (
    <svg
      className="vp-person-svg"
      viewBox="0 0 320 360"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="vpShirt" x1="0" y1="0" x2="0.7" y2="1">
          <stop offset="0" stopColor="#34d27a" />
          <stop offset="1" stopColor="#0f9d84" />
        </linearGradient>

        <linearGradient id="vpHair" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2b1d17" />
          <stop offset="1" stopColor="#5a3a2d" />
        </linearGradient>

        <linearGradient id="vpScreen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f0fdf9" />
          <stop offset="1" stopColor="#bdf0e2" />
        </linearGradient>
      </defs>

      <g className="vp-body">
        <g className="vp-head">
          <path
            d="M104 134 C94 80 130 46 162 46 C196 46 228 80 218 134 C224 190 232 230 226 270 L96 270 C92 230 100 186 104 134Z"
            fill="url(#vpHair)"
          />
        </g>

        <path
          d="M66 360 V312 Q68 270 108 260 L132 250 H190 L214 260 Q254 270 256 312 V360Z"
          fill="url(#vpShirt)"
        />

        <path
          d="M138 250 Q160 274 184 250"
          stroke="#0a5c4a"
          strokeWidth="3"
          fill="none"
          opacity="0.5"
        />

        <g className="vp-head">
          <rect x="148" y="214" width="26" height="42" rx="10" fill="#e6ad86" />
          <ellipse cx="161" cy="154" rx="46" ry="54" fill="#f2c4a0" />

          <ellipse className="vp-eye" cx="144" cy="156" rx="4.4" ry="5.4" fill="#1f2937" />
          <ellipse className="vp-eye" cx="180" cy="156" rx="4.4" ry="5.4" fill="#1f2937" />

          <circle cx="146" cy="158" r="1.6" fill="#fff" opacity="0.8" />
          <circle cx="182" cy="158" r="1.6" fill="#fff" opacity="0.8" />

          <path d="M132 142 Q143 136 154 141" stroke="#2b1d17" strokeWidth="3" strokeLinecap="round" fill="none" />
          <path d="M170 141 Q181 136 192 142" stroke="#2b1d17" strokeWidth="3" strokeLinecap="round" fill="none" />

          <path
            className="vp-mouth-wait"
            d="M153 184 Q161 188 170 184"
            stroke="#b8574a"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />

          <path
            className="vp-mouth-happy"
            d="M150 182 Q161 198 173 182 Z"
            fill="#fff"
            stroke="#b8574a"
            strokeWidth="3"
            strokeLinejoin="round"
          />

          <circle cx="133" cy="170" r="7" fill="#ff9aa2" opacity="0.3" />
          <circle cx="190" cy="170" r="7" fill="#ff9aa2" opacity="0.3" />

          <path
            d="M114 144 C111 102 134 86 162 88 C190 88 210 106 208 144 C198 120 182 110 160 110 C140 110 122 122 114 144Z"
            fill="url(#vpHair)"
          />
        </g>

        <path d="M92 268 L96 322" stroke="#0f9d84" strokeWidth="36" strokeLinecap="round" />
        <path d="M96 326 L100 356" stroke="#f2c4a0" strokeWidth="19" strokeLinecap="round" />

        <path d="M230 268 L240 322" stroke="#12a77f" strokeWidth="36" strokeLinecap="round" />
        <path d="M240 322 L232 262" stroke="#f2c4a0" strokeWidth="19" strokeLinecap="round" />

        <g transform="rotate(8 226 232)">
          <rect x="204" y="188" width="46" height="80" rx="9" fill="#0a1b30" />
          <rect className="vp-screen" x="208" y="194" width="38" height="68" rx="6" fill="url(#vpScreen)" />
          <rect x="220" y="190" width="14" height="2.5" rx="1.2" fill="#1d3550" />
          <rect x="213" y="202" width="28" height="18" rx="4" fill="#fff" />

          <path
            d="M215 205 L227 214 L239 205"
            stroke="#0f9d84"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <rect x="213" y="226" width="28" height="4" rx="2" fill="#0f9d84" opacity="0.5" />
          <rect x="213" y="234" width="20" height="4" rx="2" fill="#0f9d84" opacity="0.35" />
          <rect x="213" y="246" width="28" height="9" rx="4.5" fill="#0a5c4a" />
        </g>

        <ellipse cx="206" cy="246" rx="7" ry="10" fill="#f2c4a0" />
        <ellipse cx="246" cy="236" rx="5" ry="9" fill="#f2c4a0" />
      </g>

      <g fill="none" stroke="#14d3ac" strokeWidth="3" strokeLinecap="round">
        <path className="vp-wave vp-wave-1" d="M262 190 a22 22 0 0 1 0 -30" />
        <path className="vp-wave vp-wave-2" d="M274 198 a36 36 0 0 0 0 -46" />
        <path className="vp-wave vp-wave-3" d="M286 206 a50 50 0 0 0 0 -62" />
      </g>
    </svg>
  );
}

/* =========================================================
   VERIFY OTP — CITIZEN AND ORGANIZATION REGISTRATION
   ========================================================= */
function VerifyOTP() {
  const navigate = useNavigate();
  const location = useLocation();
  const inputRef = useRef(null);

  // Resolve the email before using it.
  const params = new URLSearchParams(location.search);

  const urlEmail = params.get("email") || "";
  const stateEmail = location.state?.email || "";
  const storedEmail = localStorage.getItem("civicsolve_otp_email") || "";

  const email = (
    urlEmail || stateEmail || storedEmail
  ).trim().toLowerCase();

  // Organization and citizen accounts use different OTP endpoints.
  const storedType = (
    localStorage.getItem("civicsolve_otp_type") || ""
  ).trim().toLowerCase();

  const stateType = (
    location.state?.accountType || ""
  ).trim().toLowerCase();

  const queryType = (
    params.get("type") || ""
  ).trim().toLowerCase();

  const accountType =
    stateType ||
    queryType ||
    storedType ||
    "citizen";

  const isOrganization = accountType === "organization";

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const complete = otp.length === 6;
  const verified = Boolean(success);

  const handleVerify = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!email) {
      setError("Registration email not found. Please register again.");
      return;
    }

    if (!/^\d{6}$/.test(otp.trim())) {
      setError("Please enter the complete 6-digit OTP.");
      return;
    }

    try {
      setLoading(true);

      const verifyOTP = isOrganization
        ? organizationVerifyOTP
        : citizenVerifyOTP;

      const response = await verifyOTP({
        email,
        otp: otp.trim(),
      });

      // Supports both Axios responses and helpers returning response data.
      const responseData = response?.data ?? response;

      if (responseData?.success === false) {
        throw new Error(
          responseData.message || "OTP verification failed."
        );
      }

      setSuccess(
        responseData?.message ||
          "Email verified successfully."
      );

      localStorage.removeItem("civicsolve_otp_email");
      localStorage.removeItem("civicsolve_otp_type");
      localStorage.removeItem("civicsolve_otp_message");

      // Organization accounts still require administrator approval.
      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 1500);
    } catch (err) {
      console.error("OTP Verification Error:", err);

      setError(
        err?.response?.data?.message ||
          err?.response?.data?.detail ||
          err?.response?.data?.error ||
          err?.message ||
          "Invalid or expired OTP. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const RING = 176;
  const ringOffset = verified
    ? 0
    : RING - (RING * otp.length) / 6;

  const statusText = verified
    ? "Email verified"
    : complete
      ? "Ready to verify"
      : "Pending verification";

  return (
    <div className="vp-page">
      <div className="vp-particles" aria-hidden="true">
        {Array.from({ length: 9 }).map((_, i) => (
          <span
            key={i}
            className={`vp-particle vp-particle-${i + 1}`}
          />
        ))}
      </div>

      <div className="vp-layout">
        {/* Illustration */}
        <div
          className={`vp-scene ${complete ? "is-complete" : ""} ${
            verified ? "is-verified" : ""
          }`}
        >
          <div className="vp-cloud-bg" />

          <svg
            className="vp-decor"
            viewBox="0 0 560 440"
            aria-hidden="true"
            focusable="false"
          >
            <g className="vp-drift">
              <ellipse cx="70" cy="60" rx="32" ry="12" fill="#fff" opacity="0.85" />
              <ellipse cx="94" cy="54" rx="22" ry="13" fill="#fff" opacity="0.85" />
            </g>

            <g className="vp-drift vp-drift-2">
              <ellipse cx="470" cy="40" rx="30" ry="11" fill="#fff" opacity="0.7" />
              <ellipse cx="492" cy="35" rx="20" ry="12" fill="#fff" opacity="0.7" />
            </g>

            <g className="vp-float">
              <rect x="20" y="110" width="132" height="34" rx="17" fill="#fff" stroke="#cdeee3" strokeWidth="2" />
              <circle cx="40" cy="127" r="9" fill="#22c55e" />
              <path d="M35 127 l4 4 l7 -8" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              <text x="56" y="132" fontSize="13" fontWeight="700" fill="#0a5c4a">
                Details submitted
              </text>
            </g>

            <g className="vp-float vp-float-2">
              <path d="M488 290 l28 -10 l28 10 v26 c0 20 -14 32 -28 38 c-14 -6 -28 -18 -28 -38z" fill="#e4faf3" stroke="#0a5c4a" strokeWidth="2" />
              <path d="M502 316 l9 9 l17 -19" stroke="#14d3ac" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </g>

            <g className="vp-float vp-float-3">
              <rect x="20" y="230" width="78" height="44" rx="13" fill="#fff" stroke="#cdeee3" strokeWidth="2" />
              <path d="M40 274 l-7 13 l20 -13z" fill="#fff" stroke="#cdeee3" strokeWidth="2" strokeLinejoin="round" />
              <circle className="vp-typing" cx="45" cy="252" r="4" fill="#14d3ac" />
              <circle className="vp-typing vp-typing-2" cx="59" cy="252" r="4" fill="#38bdf8" />
              <circle className="vp-typing vp-typing-3" cx="73" cy="252" r="4" fill="#22c55e" />
            </g>

            <g className="vp-fly">
              <rect x="40" y="150" width="50" height="35" rx="7" fill="#fff" stroke="#cdeee3" strokeWidth="2" />
              <path d="M43 156 L65 172 L87 156" stroke="#14d3ac" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </g>

            <g className="vp-fly vp-fly-2">
              <rect x="40" y="150" width="38" height="27" rx="6" fill="#d9f7ee" stroke="#a9e6d6" strokeWidth="2" />
              <path d="M43 155 L59 167 L75 155" stroke="#0f9d84" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </g>

            <path className="vp-star" d="M300 40 l4 10 l10 4 l-10 4 l-4 10 l-4 -10 l-10 -4 l10 -4z" fill="#14d3ac" />
            <path className="vp-star vp-star-2" d="M530 170 l3 8 l8 3 l-8 3 l-3 8 l-3 -8 l-8 -3 l8 -3z" fill="#38bdf8" />
          </svg>

          <div className="vp-person-wrap">
            <PhoneUser />
          </div>

          <div className="vp-account">
            <div className="vp-account-bar" />

            <div className="vp-avatar">
              <svg viewBox="0 0 72 72" focusable="false">
                <circle
                  cx="36"
                  cy="36"
                  r="28"
                  fill="none"
                  stroke="#d5e7e2"
                  strokeWidth="5"
                />

                <circle
                  className="vp-ring"
                  cx="36"
                  cy="36"
                  r="28"
                  fill="none"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray={RING}
                  strokeDashoffset={ringOffset}
                />

                <circle cx="36" cy="36" r="21" fill="#e4faf3" />
                <circle cx="36" cy="30" r="7.5" fill="#0f9d84" />
                <path d="M22 50 a14 12 0 0 1 28 0z" fill="#0f9d84" />
              </svg>

              <span className="vp-avatar-ok">✓</span>
            </div>

            <div className="vp-line vp-line-1" />
            <div className="vp-line vp-line-2" />
            <div className="vp-status">{statusText}</div>
          </div>

          <div className="vp-confetti" aria-hidden="true">
            {Array.from({ length: 12 }).map((_, i) => (
              <span
                key={i}
                className={`vp-conf vp-conf-${i + 1}`}
              />
            ))}
          </div>

          <div className="vp-ground" />
        </div>

        {/* Verification card */}
        <div className="vp-card">
          <div className="vp-badge" aria-hidden="true">
            <span className="vp-badge-ring" />

            <svg viewBox="0 0 48 48" focusable="false">
              <rect x="8" y="12" width="32" height="24" rx="5" fill="#fff" />
              <path d="M10 16 L24 27 L38 16" stroke="#0f9d84" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          <h1>Verify Your Email</h1>

          <p className="vp-subtitle">
            We sent a 6-digit verification code to
          </p>

          <div className="vp-email-pill">
            {email || "your email address"}
          </div>

          <ol className="vp-steps" aria-label="Registration steps">
            <li className="done">✓ Register</li>
            <li className="active">Verify</li>
            <li>Login</li>
          </ol>

          <form onSubmit={handleVerify} noValidate>
            <div className="vp-group">
              <label htmlFor="otp">Enter OTP</label>

              <div
                className={`vp-boxes ${error ? "has-error" : ""}`}
                onClick={() => inputRef.current?.focus()}
              >
                {Array.from({ length: 6 }).map((_, i) => (
                  <span
                    key={i}
                    className={`vp-box ${otp[i] ? "filled" : ""} ${
                      i === otp.length && !complete ? "current" : ""
                    }`}
                  >
                    {otp[i] || ""}
                  </span>
                ))}

                <input
                  id="otp"
                  ref={inputRef}
                  className="vp-hidden-input"
                  type="text"
                  inputMode="numeric"
                  value={otp}
                  onChange={(e) => {
                    setOtp(
                      e.target.value.replace(/\D/g, "").slice(0, 6)
                    );
                    setError("");
                  }}
                  placeholder="Enter 6-digit OTP"
                  maxLength={6}
                  autoComplete="one-time-code"
                  autoFocus
                  aria-label="Enter your six-digit verification code"
                />
              </div>
            </div>

            {error && (
              <div className="vp-error" role="alert">
                {error}
              </div>
            )}

            {success && (
              <div className="vp-success" role="status">
                {success}
              </div>
            )}

            <button
              type="submit"
              className="vp-submit"
              disabled={loading || verified}
            >
              {loading
                ? "Verifying..."
                : verified
                  ? "Verified"
                  : "Verify OTP"}
            </button>
          </form>

          <button
            type="button"
            className="vp-back"
            onClick={() => navigate("/register")}
          >
            ← Back to Registration
          </button>
        </div>
      </div>

      <p className="vp-footer">
        © 2026 CivicSolve. Building better communities together.
      </p>
    </div>
  );
}

export default VerifyOTP;