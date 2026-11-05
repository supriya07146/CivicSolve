import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import {
  getOrganizationProblemDetails,
  acceptOrganizationAssignment,
} from "../../services/api";

import "../../styles/organization/AcceptProblem.css";

const AVAILABLE_ROUTE = "/organization/available-problems";

const labelOf = (value) => {
  if (!value) return "";
  if (typeof value === "object") return value.name || value.title || "";
  return String(value);
};

const pretty = (value) => String(value || "").replaceAll("_", " ");

/* calm line-art: the assignment card, a short path, and the shield that
   confirms responsibility. Drawn once on load. */
function AcceptArt() {
  return (
    <svg className="oa-art" viewBox="0 0 340 120" aria-hidden="true">
      <g fill="none" stroke="#7be8d0" strokeOpacity="0.22">
        <rect x="2" y="2" width="336" height="116" rx="14" />
      </g>

      {/* assignment card */}
      <g transform="translate(22 22)">
        <rect width="86" height="76" rx="9" fill="rgba(31,214,176,0.07)" stroke="#7be8d0" strokeOpacity="0.5" strokeWidth="1.4" />
        <rect x="10" y="11" width="30" height="5" rx="2.5" fill="rgba(255,255,255,0.6)" />
        <g fill="rgba(255,255,255,0.28)">
          <rect x="10" y="24" width="62" height="4" rx="2" />
          <rect x="10" y="34" width="50" height="4" rx="2" />
          <rect x="10" y="44" width="58" height="4" rx="2" />
        </g>
        <rect x="10" y="56" width="34" height="9" rx="4.5" fill="rgba(245,176,76,0.85)" />
      </g>

      {/* path from card to shield */}
      <line className="oa-art-base" x1="120" y1="60" x2="222" y2="60" />
      <line className="oa-art-progress" x1="120" y1="60" x2="222" y2="60" />
      <g transform="translate(171 60)">
        <circle className="oa-art-dot" r="4" fill="#fff" />
      </g>

      {/* shield */}
      <g transform="translate(272 60)">
        <circle className="oa-art-ring" r="30" fill="none" stroke="#5ce0b6" strokeWidth="1.4" />
        <path d="M0 -28 L22 -20 V2 C22 16 12 25 0 30 C-12 25 -22 16 -22 2 V-20 Z" fill="#0d4a4b" stroke="#52e5c6" strokeWidth="2" />
        <path className="oa-art-check" pathLength="1" d="M-10 2 L-3 9 L11 -8" />
      </g>
    </svg>
  );
}

export default function AcceptProblem() {
  const { problemId, id } = useParams();
  const selectedId = problemId || id;
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadProblem() {
      try {
        const result = await getOrganizationProblemDetails(selectedId);
        if (active) setData(result);
      } catch (err) {
        if (active) setError(err.message || "Unable to load assignment details.");
      } finally {
        if (active) setLoading(false);
      }
    }

    if (selectedId) {
      loadProblem();
    } else {
      setError("Problem ID is missing.");
      setLoading(false);
    }

    return () => {
      active = false;
    };
  }, [selectedId]);

  const problem = data?.problem;
  const assignment = data?.assignment || {};

  async function handleAccept() {
    if (!assignment.id) {
      setError(
        "The assignment ID was not returned by the API. " +
          "Please check the problem-details response."
      );
      return;
    }

    if (!confirmed) {
      setError("Please acknowledge responsibility before accepting.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      // The backend requires acknowledgement: true.
      const response = await acceptOrganizationAssignment(assignment.id, true);

      if (response?.success === false) {
        throw new Error(response.message || "Unable to accept this assignment.");
      }

      navigate(AVAILABLE_ROUTE, {
        replace: true,
        state: {
          message: response?.message || "Assignment accepted successfully.",
        },
      });
    } catch (err) {
      setError(err.message || "Unable to accept this assignment.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="oa-page">
        <div className="oa-loading-hero" />
        <div className="oa-loading">
          <span className="oa-spinner" />
          Loading assignment details…
        </div>
      </main>
    );
  }

  if (error && !problem) {
    return (
      <main className="oa-page">
        <section className="oa-card oa-error-card">
          <span className="oa-icon">!</span>
          <h1>Assignment unavailable</h1>
          <p>{error}</p>

          <Link className="oa-button oa-button--secondary" to={AVAILABLE_ROUTE}>
            ← Available problems
          </Link>
        </section>
      </main>
    );
  }

  if (!problem) return null;

  const detailsRoute = `/organization/problems/${selectedId}/details`;
  const priority = problem.priority || "medium";

  return (
    <main className="oa-page">
      {/* ===== Hero (same card as Available Problems) ===== */}
      <header className="oa-hero">
        <div className="oa-wrap oa-hero-inner">
          <div className="oa-hero-copy">
            <Link to={detailsRoute} className="oa-back">
              <span aria-hidden="true">←</span> Back to Problem Details
            </Link>

            <span className="oa-eyebrow">CivicSolve · Organization workspace</span>

            <h1>Accept Assignment</h1>

            <p>
              Review the responsibility and confirm that your organization is
              ready to take action.
            </p>
          </div>

          <div className="oa-hero-scene">
            <AcceptArt />
          </div>
        </div>
      </header>

      <div className="oa-wrap oa-body">
        <div className="oa-layout">
          <section className="oa-card oa-summary">
            <div className="oa-section-heading">
              <span className="oa-section-icon">▣</span>

              <div>
                <h2>Assignment overview</h2>
                <p>Review the reported community issue.</p>
              </div>
            </div>

            <div className="oa-reference">
              <span>Problem reference</span>
              <strong>{problem.problem_code || selectedId}</strong>
            </div>

            <h3>{problem.title}</h3>

            <p className="oa-description">
              {problem.description || "No additional description is available."}
            </p>

            <div className="oa-detail-grid">
              <div>
                <span>Category</span>
                <strong>{labelOf(problem.category) || "Not specified"}</strong>
              </div>

              <div>
                <span>Priority</span>
                <strong className={`oa-priority oa-priority--${priority}`}>
                  {pretty(priority)}
                </strong>
              </div>

              <div>
                <span>Location</span>
                <strong>{problem.location || "Not recorded"}</strong>
              </div>

              <div>
                <span>Current status</span>
                <strong>{pretty(problem.status || "assigned")}</strong>
              </div>
            </div>

            <div className="oa-responsibility">
              <span className="oa-responsibility-icon">◎</span>

              <div>
                <strong>Your organization's commitment</strong>
                <p>
                  By accepting, your organization confirms its willingness to
                  take responsibility for the assignment and update progress
                  through CivicSolve.
                </p>
              </div>
            </div>
          </section>

          <aside className="oa-card oa-confirm">
            <div className="oa-confirm-art" aria-hidden="true">
              <div className="oa-art-badge">
                <svg viewBox="0 0 52 52">
                  <circle className="oa-badge-ring" cx="26" cy="26" r="22" />
                  <path className="oa-badge-check" pathLength="1" d="M16 27l7 7 13-15" />
                </svg>
              </div>
            </div>

            <span className="oa-eyebrow oa-green">Ready to take action?</span>

            <h2>Confirm acceptance</h2>

            <p>
              Please review the assignment before confirming. Once accepted,
              follow your organization's workflow for updating its progress.
            </p>

            <label className={`oa-checkbox ${confirmed ? "is-checked" : ""}`}>
              <input
                type="checkbox"
                checked={confirmed}
                disabled={submitting}
                onChange={(event) => {
                  setConfirmed(event.target.checked);
                  setError("");
                }}
              />

              <span>
                I confirm that our organization is prepared to handle this
                assignment.
              </span>
            </label>

            {error && (
              <div className="oa-error" role="alert">
                {error}
              </div>
            )}

            <button
              type="button"
              className="oa-button oa-button--primary"
              onClick={handleAccept}
              disabled={submitting || !confirmed}
            >
              {submitting ? "Accepting assignment…" : "✓ Confirm & Accept"}
            </button>

            <Link className="oa-button oa-button--secondary" to={detailsRoute}>
              Review details
            </Link>

            <small className="oa-secure-note">
              CivicSolve · Community • Action • Impact
            </small>
          </aside>
        </div>
      </div>
    </main>
  );
}