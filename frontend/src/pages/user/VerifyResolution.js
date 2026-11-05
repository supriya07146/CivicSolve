
import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getCitizenResolutionReview,
  submitCitizenResolutionReview,
} from "../../services/api";
import "../../styles/user/VerifyResolution.css";

function VerifyResolution() {
  const { problemId } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [selectedSolution, setSelectedSolution] = useState(null);
  const [decision, setDecision] = useState("confirmed");
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadReview = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await getCitizenResolutionReview(problemId);
      const solutions = result.solutions || [];

      setData(result);

      const existingSolution = solutions.find(
        (solution) => solution.citizen_review
      );

      const initialSolution = existingSolution || solutions[0] || null;
      setSelectedSolution(initialSolution);

      if (initialSolution?.citizen_review) {
        setDecision(initialSolution.citizen_review.decision);
        setFeedback(initialSolution.citizen_review.feedback || "");
      } else {
        setDecision("confirmed");
        setFeedback("");
      }
    } catch (err) {
      setError(err.message || "Unable to load resolution details.");
    } finally {
      setLoading(false);
    }
  }, [problemId]);

  useEffect(() => {
    loadReview();
  }, [loadReview]);

  const handleSolutionChange = (solutionId) => {
    const solution = (data?.solutions || []).find(
      (item) => String(item.id) === String(solutionId)
    );

    setSelectedSolution(solution || null);
    setSuccess("");
    setError("");

    if (solution?.citizen_review) {
      setDecision(solution.citizen_review.decision);
      setFeedback(solution.citizen_review.feedback || "");
    } else {
      setDecision("confirmed");
      setFeedback("");
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!selectedSolution) {
      setError("There is no approved solution to review.");
      return;
    }

    if (decision === "unresolved" && !feedback.trim()) {
      setError(
        "Please explain why the problem is still unresolved."
      );
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      await submitCitizenResolutionReview(problemId, {
        solution_id: selectedSolution.id,
        decision,
        feedback: feedback.trim(),
      });

      setSuccess(
        decision === "confirmed"
          ? "Thank you! Your resolution confirmation has been recorded."
          : "Your feedback has been recorded for follow-up."
      );

      await loadReview();
    } catch (err) {
      setError(err.message || "Unable to submit your review.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="verify-resolution-page">
        <div className="vr-loading">
          <span className="vr-spinner" />
          <p>Loading resolution details...</p>
        </div>
      </main>
    );
  }

  if (error && !data) {
    return (
      <main className="verify-resolution-page">
        <button
          type="button"
          className="vr-back-button"
          onClick={() => navigate(-1)}
        >
          ← Back
        </button>

        <section className="vr-state-card">
          <div className="vr-state-icon vr-error-icon">!</div>
          <h2>Unable to load this resolution</h2>
          <p>{error}</p>
          <button
            type="button"
            className="vr-primary-button"
            onClick={loadReview}
          >
            Try again
          </button>
        </section>
      </main>
    );
  }

  const solutions = data?.solutions || [];
  const currentReview = selectedSolution?.citizen_review;

  return (
    <main className="verify-resolution-page">
      <header className="vr-page-header">
        <button
          type="button"
          className="vr-back-button"
          onClick={() => navigate(-1)}
        >
          <span aria-hidden="true">←</span> Back
        </button>

        <div className="vr-heading-row">
          <div>
            <div className="vr-eyebrow">
              CIVICSOLVE · CITIZEN SERVICES
            </div>
            <h1>Verify Resolution</h1>
            <p>
              Review the proposed solution and tell us whether the
              community problem has actually been resolved.
            </p>
          </div>

          <div className="vr-heading-icon" aria-hidden="true">
            ✓
          </div>
        </div>
      </header>

      <section className="vr-problem-card">
        <div className="vr-problem-top">
          <span className="vr-label">REPORTED PROBLEM</span>
          <span className={`vr-status vr-status-${data?.problem_status}`}>
            {(data?.problem_status || "unknown")
              .replaceAll("_", " ")}
          </span>
        </div>

        <h2>{data?.problem_title || "Community problem"}</h2>

        <div className="vr-problem-meta">
          <span>
            <span aria-hidden="true">#</span> Problem ID: {problemId}
          </span>
          <span>
            <span aria-hidden="true">◉</span> Resolution review
          </span>
        </div>
      </section>

      {error && (
        <div className="vr-alert vr-alert-error" role="alert">
          <span>!</span> {error}
        </div>
      )}

      {success && (
        <div className="vr-alert vr-alert-success" role="status">
          <span>✓</span> {success}
        </div>
      )}

      {solutions.length === 0 ? (
        <section className="vr-state-card">
          <div className="vr-state-icon">i</div>
          <h2>No approved solution available yet</h2>
          <p>
            You can review a resolution here once an approved solution
            is available for your reported problem.
          </p>
          <button
            type="button"
            className="vr-secondary-button"
            onClick={() => navigate("/user/dashboard")}
          >
            Return to dashboard
          </button>
        </section>
      ) : (
        <>
          <section className="vr-section">
            <div className="vr-section-heading">
              <div>
                <span className="vr-step">01</span>
                <h2>Review the solution</h2>
              </div>
              <p>Check the work and supporting evidence.</p>
            </div>

            {solutions.length > 1 && (
              <div className="vr-field">
                <label htmlFor="vr-solution">
                  Approved solution
                </label>
                <select
                  id="vr-solution"
                  value={selectedSolution?.id || ""}
                  onChange={(event) =>
                    handleSolutionChange(event.target.value)
                  }
                >
                  {solutions.map((solution) => (
                    <option key={solution.id} value={solution.id}>
                      {solution.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {selectedSolution && (
              <article className="vr-solution-card">
                <div className="vr-solution-top">
                  <span className="vr-approved-badge">
                    <span aria-hidden="true">✓</span> Admin approved
                  </span>
                  <span className="vr-solution-id">
                    Solution #{selectedSolution.id}
                  </span>
                </div>

                <h3>{selectedSolution.title}</h3>
                <p className="vr-solution-description">
                  {selectedSolution.description}
                </p>

                {selectedSolution.proposed_action && (
                  <div className="vr-action-box">
                    <h4>Action taken</h4>
                    <p>{selectedSolution.proposed_action}</p>
                  </div>
                )}

                <div className="vr-evidence-heading">
                  <h4>Supporting evidence</h4>
                  <span>
                    {(selectedSolution.evidence || []).length} file(s)
                  </span>
                </div>

                {(selectedSolution.evidence || []).length > 0 ? (
                  <div className="vr-evidence-grid">
                    {selectedSolution.evidence.map((item) => (
                      <a
                        className="vr-evidence-item"
                        key={item.id}
                        href={item.file}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <img
                          src={item.file}
                          alt={item.caption || `${item.evidence_type} evidence`}
                          loading="lazy"
                        />
                        <div className="vr-evidence-caption">
                          <span
                            className={`vr-evidence-type vr-evidence-${item.evidence_type}`}
                          >
                            {item.evidence_type === "before"
                              ? "Before"
                              : "After"}
                          </span>
                          <p>
                            {item.caption || "View evidence"}
                          </p>
                        </div>
                      </a>
                    ))}
                  </div>
                ) : (
                  <div className="vr-no-evidence">
                    No evidence images have been attached to this solution.
                  </div>
                )}
              </article>
            )}
          </section>

          <section className="vr-section vr-decision-section">
            <div className="vr-section-heading">
              <div>
                <span className="vr-step">02</span>
                <h2>Confirm the outcome</h2>
              </div>
              <p>Your feedback helps keep resolutions accountable.</p>
            </div>

            {!data?.can_review && !currentReview ? (
              <div className="vr-alert vr-alert-error">
                This problem is not currently marked as resolved, so a
                new resolution review cannot be submitted.
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                {currentReview && (
                  <div className="vr-existing-review">
                    <strong>Your previous response</strong>
                    <span>
                      {currentReview.decision === "confirmed"
                        ? "Resolution confirmed"
                        : "Problem reported as unresolved"}
                    </span>
                  </div>
                )}

                <div className="vr-decision-options">
                  <label
                    className={`vr-decision-card ${
                      decision === "confirmed" ? "is-selected" : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="resolution-decision"
                      value="confirmed"
                      checked={decision === "confirmed"}
                      onChange={() => setDecision("confirmed")}
                    />
                    <span className="vr-choice-icon vr-choice-positive">
                      ✓
                    </span>
                    <span className="vr-choice-content">
                      <strong>Yes, it is resolved</strong>
                      <small>
                        The solution has fixed the reported problem.
                      </small>
                    </span>
                    <span className="vr-radio-mark" />
                  </label>

                  <label
                    className={`vr-decision-card ${
                      decision === "unresolved" ? "is-selected" : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="resolution-decision"
                      value="unresolved"
                      checked={decision === "unresolved"}
                      onChange={() => setDecision("unresolved")}
                    />
                    <span className="vr-choice-icon vr-choice-negative">
                      !
                    </span>
                    <span className="vr-choice-content">
                      <strong>No, it is still unresolved</strong>
                      <small>
                        The issue remains or needs further attention.
                      </small>
                    </span>
                    <span className="vr-radio-mark" />
                  </label>
                </div>

                <div className="vr-field">
                  <label htmlFor="vr-feedback">
                    Additional feedback{" "}
                    {decision === "unresolved" ? (
                      <span className="vr-required">Required</span>
                    ) : (
                      <span className="vr-optional">Optional</span>
                    )}
                  </label>
                  <textarea
                    id="vr-feedback"
                    rows={4}
                    maxLength={5000}
                    value={feedback}
                    onChange={(event) =>
                      setFeedback(event.target.value)
                    }
                    placeholder={
                      decision === "unresolved"
                        ? "Describe what remains unresolved and what needs attention..."
                        : "Share any additional feedback about the resolution..."
                    }
                    required={decision === "unresolved"}
                  />
                  <div className="vr-character-count">
                    {feedback.length}/5000 characters
                  </div>
                </div>

                <div className="vr-form-footer">
                  <p>
                    Your response will be recorded against this solution.
                  </p>
                  <button
                    type="submit"
                    className="vr-primary-button"
                    disabled={submitting || !selectedSolution}
                  >
                    {submitting
                      ? "Submitting..."
                      : currentReview
                      ? "Update my response"
                      : "Submit verification"}
                    {!submitting && <span aria-hidden="true">→</span>}
                  </button>
                </div>
              </form>
            )}
          </section>
        </>
      )}
    </main>
  );
}

export default VerifyResolution;
