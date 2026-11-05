import React from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/register.css";

/* ------------------------------------------------------------------
   Illustration parts (your separate PNG files).
   If your file names are different, change ONLY the file names below.
------------------------------------------------------------------- */
import girlImg from "../assets/girl.png";
import plantImg from "../assets/plant.png";
import thumbImg from "../assets/thumb.png";
import lockImg from "../assets/lock.png";
import gearImg from "../assets/gear.png";
import envelopeImg from "../assets/envelope.png";

/* Simple line icons (no emojis, so the page looks consistent on every device) */
const UserIcon = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20c0-4 3.6-6 8-6s8 2 8 6" />
  </svg>
);

const BuildingIcon = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="4" y="3" width="11" height="18" rx="1.5" />
    <path d="M15 9h4a1 1 0 0 1 1 1v11H15" />
    <path d="M8 7h3M8 11h3M8 15h3" />
  </svg>
);

const ArrowIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);

function Register() {
  const navigate = useNavigate();

  return (
    <div className="register-page">

      <main className="register-stage">

        {/* ============ ILLUSTRATION SCENE ============
            The big green phone card IS the registration panel. */}
        <div className="register-scene">

          {/* ---------- background parts (behind the phone) ---------- */}
          <div className="scene-decor" aria-hidden="true">

            <span className="scene-ground"></span>

            {/* browser window (built with CSS, top right) */}
            <div className="deco deco-browser">
              <div className="deco-browser-bar">
                <i></i><i></i><i></i>
              </div>
              <div className="deco-browser-body">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>

            {/* verified card (built with CSS, left) */}
            <div className="deco deco-check">
              <span className="deco-check-line deco-check-line-1"></span>
              <span className="deco-check-line deco-check-line-2"></span>
              <span className="deco-check-badge">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#22c870" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
              </span>
            </div>

            <img src={envelopeImg} alt="" className="deco deco-envelope" draggable="false" />
            <img src={lockImg} alt="" className="deco deco-lock" draggable="false" />
            <img src={thumbImg} alt="" className="deco deco-thumb" draggable="false" />
            <img src={gearImg} alt="" className="deco deco-gear" draggable="false" />
          </div>


          {/* ---------- THE PHONE CARD = REGISTRATION PANEL ---------- */}
          <section className="register-phone" aria-labelledby="register-title">

            <span className="phone-edge" aria-hidden="true"></span>
            <span className="phone-notch" aria-hidden="true"></span>

            <div className="selection-header">

              <span className="selection-label">
                JOIN CIVICSOLVE
              </span>

              <h1 id="register-title">Create your account</h1>

              <p>
                Choose how you want to participate in building
                better and stronger communities.
              </p>

            </div>


            {/* Registration Options */}
            <div className="registration-options">

              {/* Citizen */}
              <button
                type="button"
                className="registration-option citizen-option"
                onClick={() => navigate("/register/citizen")}
              >

                <div className="option-icon citizen-icon">
                  <UserIcon />
                </div>

                <div className="option-content">

                  <div className="option-title-row">
                    <h2>Citizen</h2>

                    <span className="option-arrow">
                      <ArrowIcon />
                    </span>
                  </div>

                  <p>
                    Report community problems, track their progress,
                    participate in discussions, and verify solutions.
                  </p>

                  <div className="option-features">
                    <span><CheckIcon /> Report Problems</span>
                    <span><CheckIcon /> Track Solutions</span>
                    <span><CheckIcon /> Community Impact</span>
                  </div>

                </div>

              </button>


              {/* Organization */}
              <button
                type="button"
                className="registration-option organization-option"
                onClick={() => navigate("/register/organization")}
              >

                <div className="option-icon organization-icon">
                  <BuildingIcon />
                </div>

                <div className="option-content">

                  <div className="option-title-row">
                    <h2>Organization</h2>

                    <span className="option-arrow">
                      <ArrowIcon />
                    </span>
                  </div>

                  <p>
                    Join CivicSolve as a responsible organization and
                    help solve verified community problems.
                  </p>

                  <div className="option-features">
                    <span><CheckIcon /> Accept Problems</span>
                    <span><CheckIcon /> Provide Solutions</span>
                    <span><CheckIcon /> Create Impact</span>
                  </div>

                </div>

              </button>

            </div>


            {/* Login */}
            <div className="registration-login">
              <span>Already have an account?</span>
              <Link to="/login">Login</Link>
            </div>


            {/* Back to home */}
            <Link to="/" className="back-home">
              ← Back to CivicSolve
            </Link>

          </section>


          {/* ---------- front parts (in front of the phone) ---------- */}
          <div className="scene-front" aria-hidden="true">
            <img src={girlImg} alt="" className="deco deco-girl" draggable="false" />
            <img src={plantImg} alt="" className="deco deco-plant" draggable="false" />
          </div>

        </div>


        {/* Footer */}
        <p className="registration-footer">
          © 2026 CivicSolve. Building better communities together.
        </p>

      </main>

    </div>
  );
}

export default Register;