import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import { resetPassword } from "../services/api";
import "../styles/ResetPassword.css";

/* =========================================================
   PERSON WITH A KEY — she reaches toward the padlock.
   The padlock beside her closes as the password gets stronger.
   ========================================================= */
function KeyPerson() {
  return (
    <svg className="rp-person-svg" viewBox="0 0 320 360" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="rpShirt" x1="0" y1="0" x2="0.7" y2="1">
          <stop offset="0" stopColor="#34d27a" />
          <stop offset="1" stopColor="#0f9d84" />
        </linearGradient>
        <linearGradient id="rpHair" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2b1d17" />
          <stop offset="1" stopColor="#5a3a2d" />
        </linearGradient>
      </defs>

      <g className="rp-body">
        <g className="rp-head">
          <path d="M104 134 C94 80 130 46 162 46 C196 46 228 80 218 134 C224 190 232 230 226 270 L96 270 C92 230 100 186 104 134Z" fill="url(#rpHair)" />
        </g>

        <path d="M66 360 V312 Q68 270 108 260 L132 250 H190 L214 260 Q254 270 256 312 V360Z" fill="url(#rpShirt)" />
        <path d="M138 250 Q160 274 184 250" stroke="#0a5c4a" strokeWidth="3" fill="none" opacity="0.5" />

        <g className="rp-head">
          <rect x="148" y="214" width="26" height="42" rx="10" fill="#e6ad86" />
          <ellipse cx="161" cy="154" rx="46" ry="54" fill="#f2c4a0" />
          <ellipse className="rp-eye" cx="146" cy="156" rx="4.4" ry="5.4" fill="#1f2937" />
          <ellipse className="rp-eye" cx="182" cy="156" rx="4.4" ry="5.4" fill="#1f2937" />
          <circle cx="148" cy="154" r="1.6" fill="#fff" opacity="0.8" />
          <circle cx="184" cy="154" r="1.6" fill="#fff" opacity="0.8" />
          <path className="rp-brow" d="M133 141 Q144 136 155 141" stroke="#2b1d17" strokeWidth="3" strokeLinecap="round" fill="none" />
          <path className="rp-brow" d="M171 141 Q182 136 193 141" stroke="#2b1d17" strokeWidth="3" strokeLinecap="round" fill="none" />
          <path className="rp-mouth-calm" d="M152 183 Q162 192 174 183" stroke="#b8574a" strokeWidth="3" strokeLinecap="round" fill="none" />
          <path className="rp-mouth-happy" d="M148 181 Q162 200 176 181 Z" fill="#fff" stroke="#b8574a" strokeWidth="3" strokeLinejoin="round" />
          <circle cx="134" cy="170" r="7" fill="#ff9aa2" opacity="0.3" />
          <circle cx="190" cy="170" r="7" fill="#ff9aa2" opacity="0.3" />
          <path d="M114 144 C111 102 134 86 162 88 C190 88 210 106 208 144 C198 120 182 110 160 110 C140 110 122 122 114 144Z" fill="url(#rpHair)" />
        </g>

        {/* left arm: hand on hip */}
        <path d="M92 268 L84 318" stroke="#0f9d84" strokeWidth="36" strokeLinecap="round" />
        <path d="M84 322 L126 302" stroke="#f2c4a0" strokeWidth="19" strokeLinecap="round" />

        {/* right arm: reaching toward the lock with a key */}
        <g className="rp-reach">
          <path d="M230 268 L262 300" stroke="#12a77f" strokeWidth="36" strokeLinecap="round" />
          <path d="M262 300 L296 262" stroke="#f2c4a0" strokeWidth="19" strokeLinecap="round" />
          <g className="rp-key" transform="rotate(30 300 258)">
            <circle cx="300" cy="238" r="11" fill="none" stroke="#fbbf24" strokeWidth="5" />
            <path d="M300 249 V292 M300 272 h10 M300 284 h8" stroke="#fbbf24" strokeWidth="5" strokeLinecap="round" fill="none" />
          </g>
          <ellipse cx="300" cy="262" rx="9" ry="8" fill="#f2c4a0" />
        </g>
      </g>
    </svg>
  );
}

// characters that float up through the scene
const GLYPHS = ["•", "*", "#", "@", "7", "$", "A", "•"];

/* =========================================================
   RESET PASSWORD
   ========================================================= */
function ResetPassword() {
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  // counts submit attempts, so the shake animation replays on every error
  const [attempt, setAttempt] = useState(0);

  const getPasswordStrength = () => {
    if (!password) {
      return { text: "", level: 0 };
    }

    let score = 0;

    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 2) return { text: "Weak password", level: 1 };
    if (score <= 4) return { text: "Medium password", level: 2 };
    return { text: "Strong password", level: 3 };
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setAttempt((a) => a + 1);

    const resetToken = localStorage.getItem("reset_token");

    if (!resetToken) {
      setError("Your password reset session has expired. Please start again.");
      return;
    }

    if (!password) {
      setError("Please enter a new password.");
      return;
    }

    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (!/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(password)) {
      setError("Password must contain uppercase, lowercase, number and special character.");
      return;
    }

    if (!confirmPassword) {
      setError("Please confirm your new password.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      const response = await resetPassword({
        reset_token: resetToken,
        password: password,
        confirm_password: confirmPassword,
      });

      /* Reset token must never be reused. */
      localStorage.removeItem("reset_token");
      localStorage.removeItem("reset_email");

      alert(response?.message || "Your password has been changed successfully.");

      navigate("/login", { replace: true });
    } catch (err) {
      console.error("Password reset error:", err);
      setError(err?.message || "Unable to change your password.");
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = getPasswordStrength();

  const rules = [
    { label: "8+ characters", ok: password.length >= 8 },
    { label: "Uppercase", ok: /[A-Z]/.test(password) },
    { label: "Lowercase", ok: /[a-z]/.test(password) },
    { label: "Number", ok: /\d/.test(password) },
    { label: "Symbol", ok: /[^A-Za-z0-9]/.test(password) },
  ];

  const allRules = rules.every((r) => r.ok);
  const matches = Boolean(confirmPassword) && password === confirmPassword;
  const complete = allRules && matches;

  const sceneClass = [
    "rp-scene",
    `lvl-${passwordStrength.level}`,
    complete ? "is-complete" : "",
  ].join(" ");

  // the speech bubble reacts to what the user is typing
  let bubble = "Let's lock your account tight!";
  if (complete) bubble = "All set! Nice and secure 🎉";
  else if (passwordStrength.level === 3) bubble = "Strong! Now confirm it 💪";
  else if (passwordStrength.level === 2) bubble = "Getting better… add more";
  else if (passwordStrength.level === 1) bubble = "Too weak, try more symbols";

  return (
    <div className="rp-page">
      <div className="rp-particles" aria-hidden="true">
        {Array.from({ length: 9 }).map((_, i) => (
          <span key={i} className={`rp-particle rp-particle-${i + 1}`} />
        ))}
      </div>

      <div className="rp-layout">
        {/* ---------- illustration ---------- */}
        <div className={sceneClass}>
          {/* the stage is centred vertically inside the scene */}
          <div className="rp-stage">
            <div className="rp-cloud-bg" />

            <svg className="rp-decor" viewBox="0 0 560 440" aria-hidden="true" focusable="false">
              <g className="rp-drift">
                <ellipse cx="70" cy="60" rx="32" ry="12" fill="#fff" opacity="0.85" />
                <ellipse cx="94" cy="54" rx="22" ry="13" fill="#fff" opacity="0.85" />
              </g>
              <g className="rp-drift rp-drift-2">
                <ellipse cx="470" cy="40" rx="30" ry="11" fill="#fff" opacity="0.7" />
                <ellipse cx="492" cy="35" rx="20" ry="12" fill="#fff" opacity="0.7" />
              </g>

              {/* verified pill */}
              <g className="rp-float">
                <rect x="20" y="110" width="116" height="34" rx="17" fill="#fff" stroke="#cdeee3" strokeWidth="2" />
                <circle cx="40" cy="127" r="9" fill="#22c55e" />
                <path d="M35 127 l4 4 l7 -8" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                <text x="56" y="132" fontSize="13" fontWeight="700" fill="#0a5c4a">Email verified</text>
              </g>

              {/* shield */}
              <g className="rp-float rp-float-2">
                <path d="M488 250 l28 -10 l28 10 v26 c0 20 -14 32 -28 38 c-14 -6 -28 -18 -28 -38z" fill="#e4faf3" stroke="#0a5c4a" strokeWidth="2" />
                <path className="rp-shield-tick" d="M502 276 l9 9 l17 -19" stroke="#14d3ac" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </g>

              {/* gear */}
              <g className="rp-spin">
                <circle cx="40" cy="300" r="14" fill="none" stroke="#8edcc8" strokeWidth="8" />
                <circle cx="40" cy="300" r="22" fill="none" stroke="#8edcc8" strokeWidth="7" strokeDasharray="6 6" />
              </g>
              <g className="rp-spin rp-spin-rev">
                <circle cx="500" cy="380" r="9" fill="none" stroke="#a5e6f7" strokeWidth="6" />
                <circle cx="500" cy="380" r="16" fill="none" stroke="#a5e6f7" strokeWidth="5" strokeDasharray="5 5" />
              </g>

              <path className="rp-star" d="M300 40 l4 10 l10 4 l-10 4 l-4 10 l-4 -10 l-10 -4 l10 -4z" fill="#14d3ac" />
              <path className="rp-star rp-star-2" d="M530 170 l3 8 l8 3 l-8 3 l-3 8 l-3 -8 l-8 -3 l8 -3z" fill="#38bdf8" />
              <path className="rp-star rp-star-3" d="M150 200 l3 8 l8 3 l-8 3 l-3 8 l-3 -8 l-8 -3 l8 -3z" fill="#22c55e" />
              <circle className="rp-float" cx="200" cy="90" r="4" fill="#22c55e" opacity="0.6" />
            </svg>

            {/* characters floating up like typed letters */}
            <div className="rp-glyphs" aria-hidden="true">
              {GLYPHS.map((g, i) => (
                <span key={i} className={`rp-glyph rp-glyph-${i + 1}`}>{g}</span>
              ))}
            </div>

            {/* password dots fill as you type (max 8) */}
            <div className="rp-dots" aria-hidden="true">
              {Array.from({ length: 8 }).map((_, i) => (
                <span key={i} className={i < password.length ? "lit" : ""} />
              ))}
            </div>

            {/* speech bubble that reacts to the password */}
            <div className="rp-bubble" key={bubble} aria-live="polite">
              {bubble}
            </div>

            <div className="rp-person-wrap">
              <KeyPerson />
            </div>

            {/* the padlock */}
            <div className="rp-lock-wrap">
              <span className="rp-lock-halo" />
              <span className="rp-lock-orbit" />

              <div className={`rp-shake-wrap ${error ? "shake" : ""}`} key={attempt}>
                <svg className="rp-lock" viewBox="0 0 160 200" aria-hidden="true" focusable="false">
                  <path className="rp-shackle" d="M42 92 V64 a38 38 0 0 1 76 0 V92" stroke="#c7d6d2" strokeWidth="16" strokeLinecap="round" fill="none" />
                  <rect className="rp-lock-body" x="18" y="88" width="124" height="98" rx="18" />
                  <rect x="18" y="88" width="124" height="22" rx="11" fill="#fff" opacity="0.18" />
                  <circle cx="80" cy="130" r="11" fill="#fff" />
                  <rect x="76" y="136" width="8" height="24" rx="4" fill="#fff" />
                </svg>
              </div>

              <span className="rp-lock-ok">✓</span>
              <span className="rp-lock-ring" />
            </div>

            <div className="rp-chip" aria-hidden="true">
              <span>🔐</span> Encrypted
            </div>

            <div className="rp-confetti" aria-hidden="true">
              {Array.from({ length: 12 }).map((_, i) => (
                <span key={i} className={`rp-conf rp-conf-${i + 1}`} />
              ))}
            </div>

            <div className="rp-ground" />
          </div>
        </div>

        {/* ---------- card ---------- */}
        <div className="rp-card">
          <div className="rp-badge" aria-hidden="true">
            <span className="rp-badge-ring" />
            <svg viewBox="0 0 48 48" focusable="false">
              <path d="M16 22 v-6 a8 8 0 0 1 16 0 v6" stroke="#fff" strokeWidth="4" strokeLinecap="round" fill="none" />
              <rect x="11" y="22" width="26" height="20" rx="5" fill="#fff" />
              <circle cx="24" cy="31" r="3" fill="#0f9d84" />
            </svg>
          </div>

          <h1>Create new password</h1>

          <p className="rp-subtitle">
            Your email has been verified. Create a new secure password for your CivicSolve account.
          </p>

          <ol className="rp-steps" aria-label="Reset steps">
            <li className="done">✓ Email</li>
            <li className="done">✓ Code</li>
            <li className="active">New password</li>
          </ol>

          {error && (
            <div className="rp-error" role="alert" key={attempt}>
              {error}
            </div>
          )}

          <form onSubmit={submit} noValidate>
            <div className="rp-group">
              <label htmlFor="password">New Password</label>

              <div className="rp-input-wrap">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                  }}
                  placeholder="Create a strong password"
                  autoComplete="new-password"
                />
                <button type="button" className="rp-toggle" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>

              {password && (
                <div className="rp-strength">
                  <div className={`rp-strength-bars lvl-${passwordStrength.level}`}>
                    <span className={passwordStrength.level >= 1 ? "active" : ""} />
                    <span className={passwordStrength.level >= 2 ? "active" : ""} />
                    <span className={passwordStrength.level >= 3 ? "active" : ""} />
                  </div>
                  <small className={`lvl-${passwordStrength.level}`}>{passwordStrength.text}</small>
                </div>
              )}

              <ul className="rp-rules">
                {rules.map((r) => (
                  <li key={r.label} className={r.ok ? "ok" : ""}>
                    <span>{r.ok ? "✓" : ""}</span>
                    {r.label}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rp-group">
              <label htmlFor="confirmPassword">Confirm New Password</label>

              <div className="rp-input-wrap">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setError("");
                  }}
                  placeholder="Re-enter your new password"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="rp-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? "Hide" : "Show"}
                </button>
              </div>

              {confirmPassword && (
                <small className={`rp-match ${matches ? "yes" : "no"}`}>
                  {matches ? "✓ Passwords match" : "Passwords do not match yet"}
                </small>
              )}
            </div>

            <button type="submit" className="rp-submit" disabled={loading}>
              {loading ? "Changing password..." : "Change Password"}
            </button>
          </form>

          <button type="button" className="rp-back" onClick={() => navigate("/login")}>
            ← Back to Login
          </button>
        </div>
      </div>

      <p className="rp-footer">© 2026 CivicSolve. Building better communities together.</p>
    </div>
  );
}

export default ResetPassword;