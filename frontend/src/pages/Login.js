import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/login.css";
import { login as loginAPI } from "../services/api";
import { useToast } from "../components/toast/ToastContext";

/* =========================================================
   WALKER — 12-frame walking sprite + standing pose
   ========================================================= */
const SPRITE_SRC = "/images/walker-sprite.png";
const IDLE_SRC = "/images/walker-idle.png";
const SPRITE_FRAMES = 12;

/* distance he moves per walking cycle / his width.
   1.04 matches the drawn stride. If his feet slide forward, lower it;
   if they slide backward, raise it. */
const STRIDE_RATIO = 1.04;
const WALK_FRACTION = 0.8;   // walks in from this fraction of the viewport width
const MAX_CYCLES = 9;

function RealWalker() {
  const [sprite, setSprite] = useState(null);
  const figureRef = useRef(null);

  useEffect(() => {
    const img = new Image();
    img.onload = () =>
      setSprite({ ratio: img.naturalWidth / SPRITE_FRAMES / img.naturalHeight });
    img.src = SPRITE_SRC;
  }, []);

  // fit a whole number of strides into the walk-in distance
  useLayoutEffect(() => {
    const fig = figureRef.current;
    const scene = fig && fig.closest(".login-scene");
    if (!fig || !scene) return;
    const w = fig.offsetWidth || 150;
    const stride = w * STRIDE_RATIO;
    const want = window.innerWidth * WALK_FRACTION;
    const cycles = Math.min(MAX_CYCLES, Math.max(2, Math.round(want / stride)));
    scene.style.setProperty("--cycles", cycles);
    scene.style.setProperty("--walk-dist", `${cycles * stride}px`);
  }, [sprite]);

  return (
    <div className="walker-figure" ref={figureRef}>
      {sprite && (
        <>
          <div
            className="walker-sprite"
            role="img"
            aria-label="Boy walking towards the login"
            style={{
              backgroundImage: `url(${SPRITE_SRC})`,
              "--frames": SPRITE_FRAMES,
              aspectRatio: sprite.ratio,
            }}
          />
          <img className="walker-idle" src={IDLE_SRC} alt="" draggable="false" />
        </>
      )}
      <span className="walker-aura" />
      <span className="walker-shadow" />
      <span className="walker-dust dust-1" />
      <span className="walker-dust dust-2" />
      <span className="walker-dust dust-3" />
    </div>
  );
}

/* =========================================================
   SCENE DECOR — clouds, skyline, floating icons, sparkles
   ========================================================= */
function SceneDecor() {
  return (
    <svg
      className="login-decor"
      viewBox="0 0 520 400"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      focusable="false"
    >
      {/* Clouds */}
      <g className="decor-cloud">
        <ellipse cx="90" cy="50" rx="34" ry="13" fill="#fff" opacity="0.85" />
        <ellipse cx="116" cy="44" rx="24" ry="14" fill="#fff" opacity="0.85" />
      </g>
      <g className="decor-cloud decor-cloud-2">
        <ellipse cx="380" cy="30" rx="30" ry="11" fill="#fff" opacity="0.7" />
        <ellipse cx="402" cy="25" rx="20" ry="12" fill="#fff" opacity="0.7" />
      </g>

      {/* City skyline */}
      <g opacity="0.55">
        <rect x="20" y="300" width="34" height="80" rx="3" fill="#bfeadf" />
        <rect x="58" y="270" width="40" height="110" rx="3" fill="#a9e6d6" />
        <rect x="102" y="312" width="30" height="68" rx="3" fill="#cdeee3" />
        <rect x="360" y="290" width="38" height="90" rx="3" fill="#a9e6d6" />
        <rect x="402" y="260" width="44" height="120" rx="3" fill="#bfeadf" />
        <rect x="450" y="305" width="36" height="75" rx="3" fill="#cdeee3" />
      </g>

      {/* Browser window */}
      <g className="decor-float">
        <rect x="270" y="70" width="210" height="150" rx="14" fill="#d9f7ee" />
        <path d="M270 84 a14 14 0 0 1 14 -14 h182 a14 14 0 0 1 14 14 v18 h-210 z" fill="#22c55e" />
        <circle cx="288" cy="86" r="3.4" fill="#fff" />
        <circle cx="301" cy="86" r="3.4" fill="#fff" />
        <circle cx="314" cy="86" r="3.4" fill="#fff" />
        <rect x="292" y="118" width="166" height="18" rx="5" fill="#fff" opacity="0.9" />
        <rect x="292" y="146" width="166" height="18" rx="5" fill="#fff" opacity="0.9" />
        <rect x="292" y="174" width="110" height="18" rx="5" fill="#fff" opacity="0.9" />
      </g>

      {/* Map pin */}
      <g className="decor-float decor-float-2">
        <path d="M60 100 a22 22 0 1 1 44 0 c0 18 -22 40 -22 40 s-22 -22 -22 -40z" fill="#14d3ac" />
        <circle cx="82" cy="100" r="8" fill="#fff" />
      </g>

      {/* Chat bubble */}
      <g className="decor-float decor-float-3">
        <rect x="150" y="150" width="86" height="48" rx="14" fill="#fff" stroke="#cdeee3" strokeWidth="2" />
        <path d="M172 198 l-8 14 l22 -14z" fill="#fff" stroke="#cdeee3" strokeWidth="2" strokeLinejoin="round" />
        <circle cx="178" cy="174" r="4" fill="#14d3ac" />
        <circle cx="193" cy="174" r="4" fill="#38bdf8" />
        <circle cx="208" cy="174" r="4" fill="#22c55e" />
      </g>

      {/* Light bulb */}
      <g className="decor-float">
        <circle cx="440" cy="300" r="18" fill="#fde68a" />
        <rect x="431" y="316" width="18" height="9" rx="3" fill="#0f9d84" />
        <path d="M440 242 v-8 M472 252 l6 -6 M408 252 l-6 -6" stroke="#fbbf24" strokeWidth="3" strokeLinecap="round" />
      </g>

      {/* Shield check */}
      <g className="decor-float decor-float-2">
        <path d="M30 210 l28 -10 l28 10 v26 c0 20 -14 32 -28 38 c-14 -6 -28 -18 -28 -38z" fill="#e4faf3" stroke="#0a5c4a" strokeWidth="2" />
        <path d="M44 236 l9 9 l17 -19" stroke="#14d3ac" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </g>

      {/* Sparkle stars + dots */}
      <path className="decor-star" d="M230 40 l4 10 l10 4 l-10 4 l-4 10 l-4 -10 l-10 -4 l10 -4z" fill="#14d3ac" />
      <path className="decor-star decor-star-2" d="M500 150 l3 8 l8 3 l-8 3 l-3 8 l-3 -8 l-8 -3 l8 -3z" fill="#38bdf8" />
      <circle className="decor-dot" cx="190" cy="100" r="4" fill="#22c55e" opacity="0.6" />
      <circle className="decor-dot decor-dot-2" cx="500" cy="250" r="4" fill="#38bdf8" opacity="0.6" />
    </svg>
  );
}

/* =========================================================
   SIDE DECOR
   ========================================================= */
function SideDecor() {
  return (
    <>
      <div className="login-side-decor side-envelope">
        <svg viewBox="0 0 120 92" aria-hidden="true" focusable="false">
          <rect x="0" y="10" width="112" height="76" rx="10" fill="#b7e8dc" />
          <path d="M3 15 L56 56 L109 15" stroke="#fff" strokeWidth="6" fill="none" strokeLinejoin="round" strokeLinecap="round" />
          <circle cx="108" cy="12" r="10" fill="#22c55e" />
          <path d="M103 12 l4 4 l7 -8" stroke="#fff" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <div className="login-side-decor side-gear">
        <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">
          <circle cx="50" cy="50" r="22" fill="none" stroke="#8edcc8" strokeWidth="11" />
          <circle cx="50" cy="50" r="33" fill="none" stroke="#8edcc8" strokeWidth="10" strokeDasharray="8.64 8.64" />
        </svg>
      </div>

      <div className="login-side-decor side-plant">
        <svg viewBox="0 0 100 112" aria-hidden="true" focusable="false">
          <g className="side-plant-leaves">
            <path d="M50 78 Q14 62 22 18 Q56 36 50 78 Z" fill="#22c55e" />
            <path d="M50 78 Q82 52 70 10 Q40 34 50 78 Z" fill="#34d399" />
            <path d="M50 78 Q92 76 98 40 Q64 40 50 78 Z" fill="#16a34a" />
            <path d="M50 78 L50 34" stroke="#bfeadf" strokeWidth="2" />
          </g>
          <path d="M26 76 h48 l-7 34 h-34 z" fill="#10273d" />
        </svg>
      </div>
    </>
  );
}

/* =========================================================
   LOGIN
   ========================================================= */
function Login() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState("");
  const [panel, setPanel] = useState("");
  const [formData, setFormData] = useState({ email: "", password: "", remember: false });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
    setServerError("");
  };

  const validate = () => {
    const newErrors = {};
    if (!panel) newErrors.panel = "Please select Citizen or Organization.";
    if (!formData.email.trim()) {
      newErrors.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = "Enter a valid email address.";
    }
    if (!formData.password) newErrors.password = "Password is required.";
    return newErrors;
  };


  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationErrors = validate();
    setErrors(validationErrors);
    setServerError("");

    if (Object.keys(validationErrors).length > 0) return;

    setIsLoading(true);

    try {
      const response = await loginAPI({
        panel: panel,
        email: formData.email.trim(),
        password: formData.password,
      });

      const accessToken =
        response.access_token ||
        response.access ||
        response.tokens?.access;

      const refreshToken =
        response.refresh_token ||
        response.refresh ||
        response.tokens?.refresh;

      if (!accessToken) {
        throw new Error(
          "Login response did not contain an access token. Check the backend login response."
        );
      }

      const account =
        response.user ||
        response.citizen ||
        response.organization ||
        response.data?.user ||
        response.data?.citizen ||
        response.data?.organization;

      const accountRole =
        account?.role ||
        response.account_type ||
        response.actor_type ||
        response.role;

      if (
        panel === "citizen" &&
        accountRole &&
        accountRole !== "citizen"
      ) {
        throw new Error(
          "This account is not a citizen account. Please select the correct panel."
        );
      }

      if (
        panel === "organization" &&
        accountRole &&
        accountRole !== "organization"
      ) {
        throw new Error(
          "This account is not an organization account. Please select the correct panel."
        );
      }

      localStorage.setItem("access_token", accessToken);

      if (refreshToken) {
        localStorage.setItem("refresh_token", refreshToken);
      } else {
        localStorage.removeItem("refresh_token");
      }

      localStorage.setItem("account_type", panel);

      if (account) {
        localStorage.setItem("user", JSON.stringify(account));
      } else {
        localStorage.removeItem("user");
      }

      if (panel === "citizen") {
        showToast(
          "success",
          "Login Successful",
          "Welcome back to CivicSolve!"
        );

        navigate("/user/dashboard");
      } else {
        showToast(
          "success",
          "Organization Login Successful",
          "Welcome back! Your organization dashboard is ready."
        );

        navigate("/organization/dashboard");
      }
    } catch (error) {
      const errorMessage =
        error?.message || "Unable to log in. Please try again.";

      setServerError(errorMessage);

      showToast(
        "error",
        "Login Failed",
        errorMessage
      );
    } finally {
      setIsLoading(false);
    }
  };


  const handlePanelSelect = (selectedPanel) => {
    setPanel(selectedPanel);
    setErrors((prev) => ({ ...prev, panel: "" }));
    setServerError("");
  };

  return (
    <div className="login-page">
      {/* floating confetti / particles across the page */}
      <div className="login-particles" aria-hidden="true">
        {Array.from({ length: 10 }).map((_, i) => (
          <span key={i} className={`particle particle-${i + 1}`} />
        ))}
      </div>

      <div className="login-container">
        <div className="login-layout">
          {/* Scene with a real person walking in */}
          <div className="login-scene">
            <SceneDecor />
            <div className="login-ground" />
            <div className="login-path" />
            <div className="walker-arrows" aria-hidden="true">
              <span>›</span><span>›</span><span>›</span>
            </div>

            <div className="login-walker">
              <div className="login-bubble">
                {panel ? "Great! Now enter your details." : "Welcome back! Pick your panel."}
              </div>
              <RealWalker />
            </div>
          </div>

          {/* Login card */}
          <div className="login-card-wrap">
            <SideDecor />

            <div className="login-card">
              <div className="login-header">
                <span className="login-label">WELCOME BACK</span>
                <h1>Login to CivicSolve</h1>
              </div>

              <div className="login-panels">
                <button
                  type="button"
                  className={`login-panel ${panel === "citizen" ? "selected" : ""}`}
                  onClick={() => handlePanelSelect("citizen")}
                  aria-pressed={panel === "citizen"}
                >
                  <div className="login-panel-icon citizen-panel-icon">👤</div>
                  <div className="login-panel-content">
                    <h2>Citizen</h2>
                    <p>Report and track community problems.</p>
                  </div>
                  <div className="panel-check">{panel === "citizen" ? "✓" : ""}</div>
                </button>

                <button
                  type="button"
                  className={`login-panel ${panel === "organization" ? "selected" : ""}`}
                  onClick={() => handlePanelSelect("organization")}
                  aria-pressed={panel === "organization"}
                >
                  <div className="login-panel-icon organization-panel-icon">🏢</div>
                  <div className="login-panel-content">
                    <h2>Organization</h2>
                    <p>Accept problems and provide solutions.</p>
                  </div>
                  <div className="panel-check">{panel === "organization" ? "✓" : ""}</div>
                </button>
              </div>

              {errors.panel && (
                <small className="login-error panel-error">{errors.panel}</small>
              )}

              <form onSubmit={handleSubmit} noValidate>
                {serverError && (
                  <div className="login-server-error" role="alert">
                    {serverError}
                  </div>
                )}

                <div className="login-form-group">
                  <label htmlFor="login-email">Email Address</label>
                  <input
                    id="login-email"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Enter your email"
                    autoComplete="username"
                    aria-invalid={Boolean(errors.email)}
                    aria-describedby={errors.email ? "login-email-error" : undefined}
                    required
                  />
                  {errors.email && (
                    <small id="login-email-error" className="login-error">
                      {errors.email}
                    </small>
                  )}
                </div>

                <div className="login-form-group">
                  <label htmlFor="login-password">Password</label>
                  <div className="login-password-wrapper">
                    <input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      aria-invalid={Boolean(errors.password)}
                      aria-describedby={errors.password ? "login-password-error" : undefined}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => !p)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                  {errors.password && (
                    <small id="login-password-error" className="login-error">
                      {errors.password}
                    </small>
                  )}
                </div>

                {/* Remember me + Forgot password on one row */}
                <div className="login-options">
                  <label className="remember-login">
                    <input
                      type="checkbox"
                      name="remember"
                      checked={formData.remember}
                      onChange={handleChange}
                    />
                    <span>Remember me</span>
                  </label>
                  <Link to="/forgot-password">Forgot password?</Link>
                </div>

                <button type="submit" className="login-submit-button" disabled={isLoading}>
                  {isLoading ? "Signing in..." : "Login"}
                </button>
              </form>

              <div className="login-register">
                <span>Don't have an account?</span>
                <Link to="/register">Create an account</Link>
              </div>
            </div>
          </div>
        </div>

        <p className="login-footer">
          © 2026 CivicSolve. Building better communities together.
        </p>
      </div>
    </div>
  );
}

export default Login;