import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getOrganizationProgressAssignments,
  submitOrganizationProgress,
  getOrganizationProgressHistory,
} from "../../services/api";
import "../../styles/organization/UpdateProgress.css";
import { useToast } from "../../components/toast/ToastContext";

function formatDate(value) {
  if (!value) return "Not updated yet";

  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getErrorMessage(error) {
  return error?.message || "Something went wrong. Please try again.";
}

export default function UpdateProgress() {
  const { showToast } = useToast();

  const [assignments, setAssignments] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [history, setHistory] = useState([]);
  const [progress, setProgress] = useState(0);
  const [notes, setNotes] = useState("");
  const [evidence, setEvidence] = useState(null);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const selectedAssignment =
    assignments.find(
      (item) => String(item.assignment_id) === String(selectedId)
    ) || null;
  const selectedAssignmentProgress = selectedAssignment?.latest_progress;

  const loadAssignments = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await getOrganizationProgressAssignments();

      const items = Array.isArray(data)
        ? data
        : Array.isArray(data?.results)
          ? data.results
          : [];

      setAssignments(items);

      setSelectedId((current) => {
        if (
          items.some(
            (item) => String(item.assignment_id) === String(current)
          )
        ) {
          return current;
        }

        return items.length ? String(items[0].assignment_id) : "";
      });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  const loadHistory = useCallback(async () => {
    if (!selectedId) {
      setHistory([]);
      return;
    }

    setHistoryLoading(true);

    try {
      const data = await getOrganizationProgressHistory(selectedId);
      setHistory(Array.isArray(data) ? data : []);
    } catch (err) {
      setHistory([]);
      setError(getErrorMessage(err));
    } finally {
      setHistoryLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    setProgress(Number(selectedAssignmentProgress || 0));

    setNotes("");
    setEvidence(null);
    setSuccess("");
  }, [selectedAssignmentProgress, selectedId]); // Reset form when another assignment is selected.

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!selectedId) {
      showToast(
        "warning",
        "Missing Information",
        "Select an active assignment first."
      );
      return;
    }

    if (!notes.trim()) {
      showToast(
        "warning",
        "Missing Information",
        "Please describe the work completed."
      );
      return;
    }

    if (
      !Number.isInteger(Number(progress)) ||
      Number(progress) < 0 ||
      Number(progress) > 100
    ) {
      showToast(
        "warning",
        "Invalid Progress",
        "Progress must be a whole number between 0 and 100."
      );
      return;
    }

    if (evidence && !evidence.type.startsWith("image/")) {
      showToast(
        "warning",
        "Invalid Evidence",
        "Please select an image file."
      );
      return;
    }

    if (evidence && evidence.size > 5 * 1024 * 1024) {
      showToast(
        "warning",
        "File Too Large",
        "The image must be 5 MB or smaller."
      );
      return;
    }

    setSubmitting(true);

    try {
      await submitOrganizationProgress(selectedId, {
        progress_percentage: Number(progress),
        update_notes: notes,
        evidence,
      });

      setSuccess("");
      setError("");

      showToast(
        "success",
        "Progress Updated",
        "Your progress update has been submitted successfully."
      );

      setNotes("");
      setEvidence(null);

      await loadAssignments();
      await loadHistory();
    } catch (err) {
      showToast(
        "error",
        "Update Failed",
        getErrorMessage(err)
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="org-progress-page">
      {/* ================= HERO HEADER ================= */}

      <section className="org-progress-hero">
        <span
          className="org-progress-orb org-progress-orb-1"
          aria-hidden="true"
        />

        <span
          className="org-progress-orb org-progress-orb-2"
          aria-hidden="true"
        />

        <span
          className="org-progress-hero-grid"
          aria-hidden="true"
        />

        <div className="org-progress-hero-copy">
          <div className="org-progress-hero-top">
            <Link
              className="org-progress-back-link"
              to="/organization/dashboard"
            >
              ← Back to Dashboard
            </Link>

            <span
              className="org-progress-hero-divider"
              aria-hidden="true"
            />

            <span className="org-progress-eyebrow">
              ORGANIZATION WORKSPACE
            </span>
          </div>

          <h1>Update Progress</h1>

          <p>
            Track fieldwork, share progress with the community,
            and keep a clear record of every update.
          </p>
        </div>

        {/* ================= HERO ILLUSTRATION ================= */}

        <div className="org-progress-hero-art" aria-hidden="true">
          <svg
            viewBox="0 0 340 260"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient
                id="orgProgressCard"
                x1="0"
                y1="0"
                x2="1"
                y2="1"
              >
                <stop offset="0" stopColor="#ffffff" />
                <stop offset="1" stopColor="#e3f6f1" />
              </linearGradient>

              <linearGradient
                id="orgProgressPhoto"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0" stopColor="#ffd98a" />
                <stop offset="1" stopColor="#f29f4c" />
              </linearGradient>
            </defs>

            <circle
              className="org-progress-art-glow"
              cx="170"
              cy="125"
              r="105"
              fill="rgba(124,231,206,0.14)"
            />

            {/* Dashboard card */}

            <g className="org-progress-art-float">
              <rect
                x="70"
                y="40"
                width="200"
                height="170"
                rx="16"
                fill="url(#orgProgressCard)"
              />

              <rect
                x="88"
                y="54"
                width="60"
                height="7"
                rx="3.5"
                fill="#c9d9e2"
              />

              {/* Gauge */}

              <circle
                cx="125"
                cy="108"
                r="34"
                fill="none"
                stroke="#dbeee9"
                strokeWidth="10"
              />

              <circle
                className="org-progress-art-ring"
                cx="125"
                cy="108"
                r="34"
                fill="none"
                stroke="#0e9f86"
                strokeWidth="10"
                strokeLinecap="round"
                transform="rotate(-90 125 108)"
              />

              <path
                d="M113 108 l9 9 l16 -18"
                fill="none"
                stroke="#10253c"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Animated progress bars */}

              <rect
                className="org-progress-art-bar"
                x="182"
                y="118"
                width="14"
                height="24"
                rx="4"
                fill="#7ce7ce"
              />

              <rect
                className="org-progress-art-bar"
                x="202"
                y="102"
                width="14"
                height="40"
                rx="4"
                fill="#46d7b0"
              />

              <rect
                className="org-progress-art-bar"
                x="222"
                y="86"
                width="14"
                height="56"
                rx="4"
                fill="#0e9f86"
              />

              <rect
                className="org-progress-art-bar"
                x="242"
                y="74"
                width="14"
                height="68"
                rx="4"
                fill="#087d73"
              />

              {/* Timeline */}

              <rect
                x="95"
                y="176"
                width="150"
                height="6"
                rx="3"
                fill="#dbeee9"
              />

              <rect
                className="org-progress-art-line"
                x="95"
                y="176"
                width="150"
                height="6"
                rx="3"
                fill="#0e9f86"
              />

              <circle cx="98" cy="179" r="6" fill="#0e9f86" />

              <circle cx="170" cy="179" r="6" fill="#0e9f86" />

              <circle
                cx="242"
                cy="179"
                r="6"
                fill="#ffffff"
                stroke="#0e9f86"
                strokeWidth="3"
              />

              <rect
                x="95"
                y="194"
                width="90"
                height="6"
                rx="3"
                fill="#c9d9e2"
              />
            </g>

            {/* Location pin */}

            <g className="org-progress-art-pin">
              <path
                d="M268 74 c-12 -14 -18 -22 -18 -30 a18 18 0 0 1 36 0 c0 8 -6 16 -18 30 z"
                fill="#ffc857"
              />

              <circle
                cx="268"
                cy="44"
                r="6"
                fill="#10253c"
              />
            </g>

            {/* Photo card */}

            <g className="org-progress-art-float org-progress-art-float-delay">
              <g transform="rotate(-8 72 196)">
                <rect
                  x="40"
                  y="168"
                  width="66"
                  height="56"
                  rx="10"
                  fill="#ffffff"
                />

                <rect
                  x="46"
                  y="174"
                  width="54"
                  height="34"
                  rx="6"
                  fill="url(#orgProgressPhoto)"
                />

                <circle
                  cx="86"
                  cy="184"
                  r="5"
                  fill="#fff6c9"
                />

                <path
                  d="M46 208 l16 -18 l12 11 l8 -7 l18 14 z"
                  fill="#c4672a"
                />

                <rect
                  x="46"
                  y="213"
                  width="30"
                  height="5"
                  rx="2.5"
                  fill="#c9d9e2"
                />
              </g>
            </g>

            {/* Decorative sparkles */}

            <g
              className="org-progress-art-spark"
              fill="#ffffff"
            >
              <circle cx="305" cy="140" r="4" />
              <circle cx="30" cy="90" r="3" />
              <circle cx="200" cy="20" r="3" />
            </g>
          </svg>
        </div>
      </section>

      {/* ================= ERROR MESSAGE ================= */}

      {error && (
        <div
          className="org-progress-alert org-progress-alert-error"
          role="alert"
        >
          <span>!</span>

          {error}

          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}

      {/* ================= SUCCESS MESSAGE ================= */}

      {success && (
        <div
          className="org-progress-alert org-progress-alert-success"
          role="status"
        >
          <span>✓</span>

          {success}

          <button
            type="button"
            onClick={() => setSuccess("")}
            aria-label="Dismiss success"
          >
            ×
          </button>
        </div>
      )}

      {/* ================= LOADING / EMPTY / WORKSPACE ================= */}

      {loading ? (
        <div className="org-progress-state">
          <div className="org-progress-spinner" />
          <p>Loading your active assignments...</p>
        </div>
      ) : assignments.length === 0 ? (
        <div className="org-progress-empty">
          <div className="org-progress-empty-icon">✓</div>

          <h2>No active assignments</h2>

          <p>
            Accepted and in-progress assignments will appear here
            when they are ready for progress updates.
          </p>
        </div>
      ) : (
        <div className="org-progress-workspace">
          {/* ================= ASSIGNMENT LIST ================= */}

          <aside className="org-progress-assignment-panel">
            <div className="org-progress-section-heading">
              <div>
                <span className="org-progress-kicker">
                  YOUR WORK
                </span>

                <h2>Active assignments</h2>
              </div>

              <span className="org-progress-count">
                {assignments.length}
              </span>
            </div>

            <div className="org-progress-assignment-list">
              {assignments.map((item) => {
                const active =
                  String(item.assignment_id) === String(selectedId);

                const percentage = Number(
                  item.latest_progress || 0
                );

                const priority = String(
                  item.priority || "medium"
                ).toLowerCase();

                return (
                  <button
                    type="button"
                    key={item.assignment_id}
                    className={`org-progress-assignment-card${
                      active ? " is-selected" : ""
                    }`}
                    onClick={() =>
                      setSelectedId(String(item.assignment_id))
                    }
                  >
                    <div className="org-progress-card-top">
                      <span className="org-progress-problem-code">
                        {item.problem_code
                          ? `#${String(item.problem_code).slice(0, 8)}`
                          : `Assignment ${item.assignment_id}`}
                      </span>

                      <span className="org-progress-card-arrow">
                        ↗
                      </span>
                    </div>

                    <h3>{item.title}</h3>

                    <div className="org-progress-card-meta">
                      <span>{item.category || "General"}</span>

                      <span
                        className={`org-progress-priority org-progress-priority-${priority}`}
                      >
                        {item.priority || "Medium"}
                      </span>
                    </div>

                    <div className="org-progress-mini-progress">
                      <div>
                        <span>Progress</span>
                        <strong>{percentage}%</strong>
                      </div>

                      <div className="org-progress-progress-track">
                        <span
                          style={{
                            width: `${Math.min(
                              100,
                              Math.max(0, percentage)
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* ================= MAIN CONTENT ================= */}

          <section className="org-progress-main-panel">
            {selectedAssignment && (
              <>
                {/* Assignment details */}

                <div className="org-progress-problem-heading">
                  <div>
                    <span className="org-progress-kicker">
                      ASSIGNMENT DETAILS
                    </span>

                    <h2>{selectedAssignment.title}</h2>

                    <p>
                      {selectedAssignment.category ||
                        "General category"}

                      {selectedAssignment.location
                        ? ` · ${selectedAssignment.location}`
                        : ""}
                    </p>
                  </div>

                  <span className="org-progress-status">
                    {String(
                      selectedAssignment.status || "assigned"
                    ).replaceAll("_", " ")}
                  </span>
                </div>

                {/* Current progress */}

                <div className="org-progress-current-progress">
                  <div className="org-progress-current-copy">
                    <div>
                      <span className="org-progress-kicker">
                        LATEST RECORDED PROGRESS
                      </span>

                      <h3>
                        {selectedAssignment.latest_progress || 0}%
                      </h3>
                    </div>

                    <span className="org-progress-progress-icon">
                      ↗
                    </span>
                  </div>

                  <div className="org-progress-progress-track org-progress-progress-track-large">
                    <span
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(
                            0,
                            Number(
                              selectedAssignment.latest_progress || 0
                            )
                          )
                        )}%`,
                      }}
                    />
                  </div>

                  <p>
                    Last update:{" "}
                    {formatDate(selectedAssignment.latest_update_at)}
                  </p>
                </div>

                {/* ================= PROGRESS FORM ================= */}

                <form
                  className="org-progress-form"
                  onSubmit={handleSubmit}
                >
                  <div className="org-progress-form-heading">
                    <div>
                      <span className="org-progress-kicker">
                        FIELD REPORT
                      </span>

                      <h3>Submit a progress update</h3>
                    </div>

                    <span className="org-progress-required">
                      * Required
                    </span>
                  </div>

                  {/* Progress percentage */}

                  <div className="org-progress-progress-input">
                    <div className="org-progress-input-label">
                      <label htmlFor="org-progress-percentage">
                        Completion percentage *
                      </label>

                      <strong>{progress}%</strong>
                    </div>

                    <input
                      id="org-progress-percentage"
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={progress}
                      onChange={(event) =>
                        setProgress(Number(event.target.value))
                      }
                    />

                    <div className="org-progress-range-labels">
                      <span>0% · Not started</span>
                      <span>100% · Work complete</span>
                    </div>

                    <p className="org-progress-field-hint">
                      This records reported progress; it does not
                      automatically resolve the community problem.
                    </p>
                  </div>

                  {/* Work notes */}

                  <div className="org-progress-field">
                    <label htmlFor="org-progress-notes">
                      Work completed and next steps *
                    </label>

                    <textarea
                      id="org-progress-notes"
                      rows="5"
                      value={notes}
                      onChange={(event) =>
                        setNotes(event.target.value)
                      }
                      placeholder="Describe the work completed, any challenges, and the next steps..."
                      maxLength={3000}
                      required
                    />

                    <div className="org-progress-character-count">
                      {notes.length}/3000
                    </div>
                  </div>

                  {/* Evidence upload */}

                  <div className="org-progress-field">
                    <label htmlFor="org-progress-evidence">
                      Photo evidence <span>(optional)</span>
                    </label>

                    <label
                      className="org-progress-upload"
                      htmlFor="org-progress-evidence"
                    >
                      <span className="org-progress-upload-icon">
                        ↑
                      </span>

                      <span>
                        <strong>
                          {evidence
                            ? evidence.name
                            : "Choose a photo"}
                        </strong>

                        <small>
                          JPG, PNG or WebP · Maximum 5 MB
                        </small>
                      </span>

                      <span className="org-progress-upload-action">
                        Browse
                      </span>
                    </label>

                    <input
                      className="org-progress-file-input"
                      id="org-progress-evidence"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(event) => {
                        const file =
                          event.target.files?.[0] || null;

                        if (!file) {
                          setEvidence(null);
                          return;
                        }

                        if (!file.type.startsWith("image/")) {
                          showToast(
                            "warning",
                            "Invalid Evidence",
                            "Please select an image file."
                          );

                          event.target.value = "";
                          setEvidence(null);
                          return;
                        }

                        if (file.size > 5 * 1024 * 1024) {
                          showToast(
                            "warning",
                            "File Too Large",
                            "The image must be 5 MB or smaller."
                          );

                          event.target.value = "";
                          setEvidence(null);
                          return;
                        }

                        setEvidence(file);

                        showToast(
                          "success",
                          "Evidence Selected",
                          "Your photo is ready to be submitted with the progress update."
                        );
                      }}
                    />

                    {evidence && (
                      <button
                        type="button"
                        className="org-progress-remove-file"
                        onClick={() => {
                          setEvidence(null);

                          const fileInput = document.getElementById(
                            "org-progress-evidence"
                          );

                          if (fileInput) {
                            fileInput.value = "";
                          }
                        }}
                      >
                        Remove selected photo
                      </button>
                    )}
                  </div>

                  {/* Submit */}

                  <button
                    className="org-progress-submit"
                    type="submit"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <span className="org-progress-button-spinner" />
                        Submitting update...
                      </>
                    ) : (
                      <>
                        Submit progress update <span>↗</span>
                      </>
                    )}
                  </button>
                </form>

                {/* ================= PROGRESS HISTORY ================= */}

                <section className="org-progress-history">
                  <div className="org-progress-form-heading">
                    <div>
                      <span className="org-progress-kicker">
                        AUDIT TRAIL
                      </span>

                      <h3>Progress history</h3>
                    </div>

                    <span className="org-progress-count">
                      {history.length}
                    </span>
                  </div>

                  {historyLoading ? (
                    <p className="org-progress-muted">
                      Loading update history...
                    </p>
                  ) : history.length === 0 ? (
                    <div className="org-progress-history-empty">
                      <span>◷</span>

                      <p>
                        No progress updates recorded yet.
                      </p>
                    </div>
                  ) : (
                    <div className="org-progress-timeline">
                      {history.map((item) => (
                        <article
                          className="org-progress-timeline-item"
                          key={item.id}
                        >
                          <div className="org-progress-timeline-dot" />

                          <div className="org-progress-history-card">
                            <div className="org-progress-history-top">
                              <strong>
                                {item.progress_percentage}% complete
                              </strong>

                              <time>
                                {formatDate(item.created_at)}
                              </time>
                            </div>

                            <p>{item.update_notes}</p>

                            {item.evidence_url && (
                              <a
                                className="org-progress-evidence-link"
                                href={item.evidence_url}
                                target="_blank"
                                rel="noreferrer"
                              >
                                View attached evidence ↗
                              </a>
                            )}
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </section>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}