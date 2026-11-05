
import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getMyProblemDetails,
  getCitizenResolutionReview,
} from "../../services/api";
import "../../styles/user/CitizenProblemDetails.css";

const STATUS_LABELS = {
  open: "Open",
  under_review: "Under Review",
  assigned: "Assigned",
  in_progress: "In Progress",
  resolved: "Resolved",
  rejected: "Rejected",
  closed: "Closed",
};

const PRIORITY_LABELS = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

const WORKFLOW = [
  { label: "Reported", status: "open" },
  { label: "Under review", status: "under_review" },
  { label: "Assigned", status: "assigned" },
  { label: "In progress", status: "in_progress" },
  { label: "Resolved", status: "resolved" },
  { label: "Closed", status: "closed" },
];

const WORKFLOW_INDEX = {
  open: 0,
  under_review: 1,
  assigned: 2,
  in_progress: 3,
  resolved: 4,
  closed: 5,
};

const STATUS_PROGRESS = {
  open: 0,
  under_review: 20,
  assigned: 35,
  in_progress: 65,
  resolved: 100,
  closed: 100,
  rejected: 0,
};

const RING_LENGTH = 113.1;

function formatDate(value, includeTime = false) {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Not available";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(includeTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

function getStatusLabel(status) {
  return (
    STATUS_LABELS[status] ||
    String(status || "Unknown").replaceAll("_", " ")
  );
}

function getPriorityLabel(priority) {
  return PRIORITY_LABELS[priority] || priority || "Not specified";
}

function getOrganization(problem) {
  if (problem.assignment_details?.organization_name) {
    return problem.assignment_details.organization_name;
  }

  if (problem.assignments?.length) {
    const assignment = problem.assignments[0];

    return (
      assignment.organization_details?.organization_name ||
      assignment.organization_name ||
      "Assigned organization"
    );
  }

  return "Not yet assigned";
}

function getAttachmentUrl(attachment) {
  return (
    attachment?.file ||
    attachment?.file_url ||
    attachment?.url ||
    ""
  );
}

function isVideoAttachment(attachment, url) {
  const contentType = String(
    attachment?.content_type ||
      attachment?.mime_type ||
      attachment?.file_type ||
      ""
  ).toLowerCase();

  if (contentType.startsWith("video/")) return true;
  if (contentType.startsWith("image/")) return false;

  const cleanUrl = url.split("?")[0].split("#")[0];
  return /\.(mp4|webm|ogg|mov|m4v)$/i.test(cleanUrl);
}

function isImageAttachment(attachment, url) {
  const contentType = String(
    attachment?.content_type ||
      attachment?.mime_type ||
      attachment?.file_type ||
      ""
  ).toLowerCase();

  if (contentType.startsWith("image/")) return true;
  if (contentType.startsWith("video/")) return false;

  const cleanUrl = url.split("?")[0].split("#")[0];
  return /\.(png|jpe?g|gif|webp|bmp|svg|avif)$/i.test(cleanUrl);
}

function getProblemCode(problem) {
  const code = problem?.problem_code || problem?.id;
  return code ? `CS-${String(code).toUpperCase()}` : "CivicSolve report";
}

/* =========================================================
   ILLUSTRATIONS
   ========================================================= */

const HeroArt = () => (
  <svg className="cpd-art" viewBox="0 0 400 140" aria-hidden="true">
    <defs>
      <linearGradient id="pdGlass" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#ffffff" stopOpacity="0.24" />
        <stop offset="1" stopColor="#ffffff" stopOpacity="0.06" />
      </linearGradient>
      <linearGradient id="pdPinGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#7ff5e4" />
        <stop offset="1" stopColor="#12b5a0" />
      </linearGradient>
    </defs>

    <circle className="cpd-twinkle" cx="22" cy="14" r="1.5" fill="#fff" />
    <circle className="cpd-twinkle cpd-d2" cx="210" cy="6" r="1.3" fill="#fff" />
    <circle className="cpd-twinkle cpd-d3" cx="382" cy="20" r="1.5" fill="#7ff5e4" />
    <circle className="cpd-twinkle cpd-d4" cx="300" cy="10" r="1.2" fill="#fff" />

    <g fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.15)">
      <rect x="4" y="84" width="26" height="56" rx="4" />
      <rect x="34" y="66" width="22" height="74" rx="4" />
      <rect x="372" y="88" width="24" height="52" rx="4" />
    </g>

    <path
      className="cpd-art-route"
      d="M90 84 C104 70 112 70 128 78"
      fill="none"
      stroke="#7ff5e4"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeDasharray="4 5"
    />

    <ellipse className="cpd-ring" cx="76" cy="113" rx="16" ry="5" fill="none" stroke="#7ff5e4" strokeWidth="1.4" />
    <ellipse className="cpd-ring cpd-ring-2" cx="76" cy="113" rx="16" ry="5" fill="none" stroke="#7ff5e4" strokeWidth="1.4" />

    <g className="cpd-art-pin">
      <path d="M76 111 C76 111 62 95 62 83 a14 14 0 0 1 28 0 C90 95 76 111 76 111z" fill="url(#pdPinGrad)" />
      <circle cx="76" cy="83" r="5.5" fill="#06162a" />
      <circle cx="76" cy="83" r="2.3" fill="#7ff5e4" />
    </g>

    <g className="cpd-art-doc">
      <rect x="128" y="8" width="144" height="118" rx="13" fill="url(#pdGlass)" stroke="rgba(255,255,255,0.3)" />
      <rect x="142" y="21" width="46" height="9" rx="4.5" fill="rgba(127,245,228,0.35)" />
      <rect x="142" y="38" width="96" height="6" rx="3" fill="rgba(255,255,255,0.75)" />
      <rect x="142" y="50" width="72" height="5" rx="2.5" fill="rgba(255,255,255,0.4)" />
      <rect x="142" y="60" width="84" height="5" rx="2.5" fill="rgba(255,255,255,0.3)" />
      <rect x="146" y="94" width="108" height="3" rx="1.5" fill="rgba(255,255,255,0.18)" />
      <rect className="cpd-art-fill" x="146" y="94" width="72" height="3" rx="1.5" fill="#7ff5e4" />
      <circle cx="146" cy="95.5" r="5" fill="#7ff5e4" />
      <circle cx="182" cy="95.5" r="5" fill="#7ff5e4" />
      <circle cx="218" cy="95.5" r="5" fill="#7ff5e4" />
      <circle className="cpd-art-now" cx="218" cy="95.5" r="5" fill="none" stroke="#7ff5e4" strokeWidth="1.5" />
      <circle cx="254" cy="95.5" r="5" fill="#0b3a45" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
      <rect x="136" y="106" width="20" height="3" rx="1.5" fill="rgba(255,255,255,0.3)" />
      <rect x="172" y="106" width="20" height="3" rx="1.5" fill="rgba(255,255,255,0.3)" />
      <rect x="208" y="106" width="20" height="3" rx="1.5" fill="rgba(255,255,255,0.3)" />
      <rect x="244" y="106" width="20" height="3" rx="1.5" fill="rgba(255,255,255,0.18)" />
    </g>

    <g className="cpd-art-stamp">
      <circle cx="266" cy="18" r="13" fill="#7ff5e4" />
      <path d="M260 18.4l4.2 4.2 8-8.4" fill="none" stroke="#06162a" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </g>

    <g className="cpd-art-photo">
      <rect x="292" y="28" width="70" height="54" rx="9" fill="url(#pdGlass)" stroke="rgba(255,255,255,0.3)" />
      <circle cx="344" cy="42" r="5" fill="#ffd447" />
      <path d="M298 76 L316 52 L330 68 L340 58 L356 76 Z" fill="rgba(127,245,228,0.5)" />
    </g>

    <g className="cpd-art-scan">
      <circle cx="338" cy="104" r="14" fill="rgba(127,245,228,0.12)" stroke="#7ff5e4" strokeWidth="3" />
      <line x1="348" y1="114" x2="360" y2="127" stroke="#7ff5e4" strokeWidth="4" strokeLinecap="round" />
    </g>
  </svg>
);

const LoadingArt = () => (
  <svg className="cpd-loading-art" viewBox="0 0 120 110" aria-hidden="true">
    <defs>
      <clipPath id="pdDocClip">
        <rect x="30" y="10" width="60" height="86" rx="10" />
      </clipPath>
    </defs>
    <ellipse cx="60" cy="102" rx="32" ry="4" fill="rgba(12,38,56,0.08)" />
    <rect x="30" y="10" width="60" height="86" rx="10" fill="#e6f7f3" stroke="#bfe3dc" />
    <rect x="42" y="28" width="36" height="6" rx="3" fill="#9fd6cb" />
    <rect x="42" y="42" width="26" height="6" rx="3" fill="#c4e6df" />
    <rect x="42" y="56" width="32" height="6" rx="3" fill="#c4e6df" />
    <rect x="42" y="70" width="20" height="6" rx="3" fill="#c4e6df" />
    <g clipPath="url(#pdDocClip)">
      <rect className="cpd-scanline" x="30" y="10" width="60" height="10" fill="rgba(18,181,160,0.35)" />
    </g>
  </svg>
);

const ErrorArt = () => (
  <svg className="cpd-error-art" viewBox="0 0 120 110" aria-hidden="true">
    <ellipse cx="60" cy="102" rx="32" ry="4" fill="rgba(12,38,56,0.08)" />
    <rect x="30" y="10" width="60" height="86" rx="10" fill="#fff5f3" stroke="#f1cfc9" />
    <rect x="42" y="28" width="36" height="6" rx="3" fill="#f0c9c2" />
    <rect x="42" y="42" width="26" height="6" rx="3" fill="#f7ddd9" />
    <rect x="42" y="56" width="32" height="6" rx="3" fill="#f7ddd9" />
    <g className="cpd-error-badge">
      <circle cx="84" cy="78" r="16" fill="#ef7b6c" />
      <rect x="82" y="68" width="4" height="12" rx="2" fill="#fff" />
      <circle cx="84" cy="85" r="2.4" fill="#fff" />
    </g>
  </svg>
);

const EvidenceArt = () => (
  <svg className="cpd-evidence-art" viewBox="0 0 150 100" aria-hidden="true">
    <ellipse cx="75" cy="94" rx="40" ry="4" fill="rgba(12,38,56,0.08)" />
    <g className="cpd-photo-back">
      <rect x="22" y="18" width="52" height="42" rx="8" fill="#e0f3f9" stroke="#bfe0ea" transform="rotate(-8 48 39)" />
    </g>
    <g className="cpd-photo-front">
      <rect x="60" y="14" width="56" height="46" rx="9" fill="#e6f7f3" stroke="#bfe3dc" />
      <circle cx="102" cy="28" r="5" fill="#ffd447" />
      <path d="M66 54 L82 34 L94 46 L102 40 L112 54 Z" fill="#9fd6cb" />
    </g>
    <g className="cpd-camera">
      <rect x="52" y="52" width="46" height="32" rx="9" fill="#12b5a0" />
      <rect x="62" y="46" width="14" height="9" rx="3" fill="#0f9d84" />
      <circle cx="75" cy="68" r="10" fill="#e9fbf6" />
      <circle cx="75" cy="68" r="5.5" fill="#0f9d84" />
    </g>
    <circle className="cpd-twinkle" cx="18" cy="30" r="2.2" fill="#7ff5e4" />
    <circle className="cpd-twinkle cpd-d2" cx="132" cy="22" r="2" fill="#12b5a0" />
  </svg>
);

const BellArt = () => (
  <svg className="cpd-bell-art" viewBox="0 0 130 100" aria-hidden="true">
    <defs>
      <linearGradient id="pdBell" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#3de0c6" />
        <stop offset="1" stopColor="#0f9d84" />
      </linearGradient>
    </defs>
    <circle className="cpd-ring-big" cx="65" cy="52" r="26" fill="none" stroke="#12b5a0" strokeWidth="1.4" />
    <circle className="cpd-ring-big cpd-ring-big-2" cx="65" cy="52" r="26" fill="none" stroke="#12b5a0" strokeWidth="1.4" />
    <g className="cpd-bell-swing">
      <path d="M65 26 a17 17 0 0 1 17 17 c0 15 6 19 6 19 H42 s6-4 6-19 a17 17 0 0 1 17-17z" fill="url(#pdBell)" />
      <circle cx="65" cy="67" r="5" fill="#0b7a68" />
      <rect x="63" y="20" width="4" height="7" rx="2" fill="#0f9d84" />
    </g>
    <circle className="cpd-dot-pulse" cx="83" cy="32" r="6" fill="#f5a524" />
  </svg>
);

const MiniMap = ({ label }) => (
  <div className="cpd-map" aria-hidden="true">
    <span className="cpd-map-park">Park</span>
    <span className="cpd-map-road cpd-map-road-h" />
    <span className="cpd-map-road cpd-map-road-v" />
    <span className="cpd-map-water" />
    <span className="cpd-map-street">Main Rd</span>
    <span className="cpd-map-pin">
      <span className="cpd-map-ripple" />
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 21s7-6.2 7-11.5A7 7 0 005 9.5C5 14.8 12 21 12 21z" />
        <circle cx="12" cy="9.5" r="2.4" />
      </svg>
    </span>
    <span className="cpd-map-address">{label}</span>
  </div>
);

const ProgressRing = ({ value }) => (
  <div className="cpd-ring-wrap" aria-hidden="true">
    <svg viewBox="0 0 44 44" width="46" height="46">
      <circle cx="22" cy="22" r="18" fill="none" stroke="#e3ece8" strokeWidth="4" />
      <circle
        className="cpd-ring-fill"
        cx="22"
        cy="22"
        r="18"
        fill="none"
        stroke="#12b5a0"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={RING_LENGTH}
        style={{ "--off": RING_LENGTH * (1 - value / 100) }}
        transform="rotate(-90 22 22)"
      />
    </svg>
    <b>{value}%</b>
  </div>
);

/* =========================================================
   APPROVED ORGANIZATION SOLUTIONS
   ========================================================= */

function OrganizationSolutions({ solutions, loading, error }) {
  if (loading) {
    return (
      <section className="cpd-card cpd-problem-solutions">
        <div className="cpd-section-heading">
          <div>
            <span className="cpd-section-kicker">RESOLUTION DETAILS</span>
            <h2>Organization solutions</h2>
          </div>
        </div>
        <p>Loading approved solutions...</p>
      </section>
    );
  }

  return (
    <section className="cpd-card cpd-problem-solutions">
      <div className="cpd-section-heading">
        <div>
          <span className="cpd-section-kicker">RESOLUTION DETAILS</span>
          <h2>Organization solutions</h2>
          <p>Approved solutions and supporting resolution evidence.</p>
        </div>
        <span className="cpd-heading-icon">04</span>
      </div>

      {error ? (
        <p className="cpd-solutions-message" role="status">
          Approved solutions could not be loaded right now. Please refresh the
          report to try again.
        </p>
      ) : solutions.length === 0 ? (
        <div className="cpd-solutions-empty">
          <strong>No approved solutions available yet</strong>
          <p>
            Once a solution is approved, its details and evidence will appear
            here.
          </p>
        </div>
      ) : (
        <div className="cpd-solutions-list">
          {solutions.map((solution) => {
            const evidence = Array.isArray(solution.evidence)
              ? solution.evidence
              : [];

            return (
              <article className="cpd-problem-solution-card" key={solution.id}>
                <div className="problem-solution-heading">
                  <h3>{solution.title || "Organization solution"}</h3>
                  <span className="solution-approved">Approved</span>
                </div>

                <p className="solution-organization">
                  <strong>Submitted by:</strong>{" "}
                  {solution.organization_name || "Responsible organization"}
                </p>

                {solution.description && (
                  <p className="cpd-solution-description">
                    {solution.description}
                  </p>
                )}

                {solution.proposed_action && (
                  <div className="cpd-proposed-action">
                    <strong>Action taken / proposed</strong>
                    <p>{solution.proposed_action}</p>
                  </div>
                )}

                {evidence.length > 0 && (
                  <div className="solution-evidence">
                    <h4>Resolution evidence</h4>
                    <div className="solution-evidence-grid">
                      {evidence.map((item, index) => {
                        const fileUrl =
                          typeof item.file === "string" ? item.file : "";
                        const evidenceType = String(
                          item.evidence_type || ""
                        ).toLowerCase();
                        const label =
                          evidenceType === "before"
                            ? "Before"
                            : evidenceType === "after"
                              ? "After"
                              : "Evidence";

                        return (
                          <figure
                            key={item.id ?? `${solution.id}-${index}`}
                          >
                            {fileUrl ? (
                              <a
                                href={fileUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="cpd-solution-image-link"
                                aria-label={`Open ${label.toLowerCase()} evidence`}
                              >
                                <img
                                  src={fileUrl}
                                  alt={
                                    item.caption ||
                                    `${label} resolution evidence`
                                  }
                                  loading="lazy"
                                />
                              </a>
                            ) : (
                              <div className="cpd-solution-file-unavailable">
                                Evidence file unavailable
                              </div>
                            )}

                            <figcaption>
                              <strong>{label}</strong>
                              {item.caption && ` — ${item.caption}`}
                            </figcaption>
                          </figure>
                        );
                      })}
                    </div>
                  </div>
                )}

                <p className="cpd-solution-date">
                  {solution.created_at
                    ? `Submitted ${formatDate(solution.created_at, true)}`
                    : ""}
                </p>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

/* =========================================================
   PAGE
   ========================================================= */

function ProblemDetails() {
  const { problemId } = useParams();
  const navigate = useNavigate();

  const [problem, setProblem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [solutions, setSolutions] = useState([]);
  const [solutionsLoading, setSolutionsLoading] = useState(true);
  const [solutionsError, setSolutionsError] = useState("");

  const noSelection = !problemId;

  const loadDetails = useCallback(async () => {
    if (!problemId) {
      setError("A report ID was not provided.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await getMyProblemDetails(problemId);

      if (!response?.problem) {
        throw new Error("The report details were not returned by the server.");
      }

      setProblem(response.problem);
    } catch (err) {
      setError(err.message || "Unable to load this report.");
    } finally {
      setLoading(false);
    }
  }, [problemId]);

  const loadSolutions = useCallback(async () => {
    if (!problemId) {
      setSolutions([]);
      setSolutionsLoading(false);
      return;
    }

    setSolutionsLoading(true);
    setSolutionsError("");

    try {
      const response = await getCitizenResolutionReview(problemId);
      setSolutions(
        Array.isArray(response?.solutions) ? response.solutions : []
      );
    } catch (err) {
      console.error("Unable to load approved organization solutions:", err);
      setSolutions([]);
      setSolutionsError(
        err.message || "Unable to load approved organization solutions."
      );
    } finally {
      setSolutionsLoading(false);
    }
  }, [problemId]);

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  useEffect(() => {
    loadSolutions();
  }, [loadSolutions]);

  if (loading) {
    return (
      <main className="cpd-page">
        <div className="cpd-container cpd-container-state">
          <div className="cpd-loading">
            <LoadingArt />
            <div className="cpd-spinner" />
            <h2>Loading report details</h2>
            <p>Retrieving the latest information from CivicSolve.</p>
          </div>
        </div>
      </main>
    );
  }

  if (error || !problem) {
    return (
      <main className="cpd-page">
        <div className="cpd-container cpd-container-state">
          <button
            type="button"
            className="cpd-back-button cpd-back-dark"
            onClick={() => navigate("/user/my-problems")}
          >
            ← Back to My Problems
          </button>

          <section className="cpd-error">
            <ErrorArt />
            <h1>{noSelection ? "No report selected" : "Report unavailable"}</h1>
            <p>
              {noSelection
                ? "Choose a report from My Problems to see its full details here."
                : error || "The requested report could not be found."}
            </p>

            <div className="cpd-error-actions">
              {!noSelection && (
                <button type="button" onClick={loadDetails}>
                  Try again
                </button>
              )}
              <button
                type="button"
                className={noSelection ? "" : "cpd-button-secondary"}
                onClick={() => navigate("/user/my-problems")}
              >
                Return to My Problems
              </button>
            </div>
          </section>
        </div>
      </main>
    );
  }

  const status = problem.status || "open";
  const priority = problem.priority || "medium";
  const currentIndex = WORKFLOW_INDEX[status];

  const attachments = Array.isArray(problem.attachments)
    ? problem.attachments
    : [];

  const isRejected = status === "rejected";

  const categoryName =
    problem.category_details?.name ||
    problem.category_details?.title ||
    "Uncategorized";

  const organization = getOrganization(problem);
  const progressValue = STATUS_PROGRESS[status] ?? 0;
  const hasCoordinates =
    problem.latitude != null && problem.longitude != null;

  return (
    <main className="cpd-page">
      {/* HERO */}
      <section className="cpd-hero">
        <div className="cpd-hero-bg" aria-hidden="true">
          <span className="cpd-blob cpd-blob-1" />
          <span className="cpd-blob cpd-blob-2" />
          <span className="cpd-petal cpd-petal-1" />
          <span className="cpd-petal cpd-petal-2" />
          <span className="cpd-petal cpd-petal-3" />
          <span className="cpd-petal cpd-petal-4" />
          <span className="cpd-petal cpd-petal-5" />
        </div>

        <div className="cpd-hero-inner">
          <button
            type="button"
            className="cpd-back-button"
            onClick={() => navigate("/user/my-problems")}
          >
            <span aria-hidden="true">←</span>
            Back to My Problems
          </button>

          <div className="cpd-hero-row">
            <div className="cpd-hero-content">
              <div className="cpd-eyebrow">
                <span className="cpd-eyebrow-dot" />
                COMMUNITY REPORT DETAILS
              </div>

              <p className="cpd-reference">{getProblemCode(problem)}</p>

              <h1>{problem.title || "Untitled report"}</h1>

              <p className="cpd-hero-description">
                Review your submitted report, evidence, assigned team, and
                the latest recorded progress.
              </p>

              <div className="cpd-hero-badges">
                <span className={`cpd-status status-${status}`}>
                  <span />
                  {getStatusLabel(status)}
                </span>

                <span className={`cpd-priority priority-${priority}`}>
                  {getPriorityLabel(priority)} priority
                </span>
              </div>
            </div>

            <div className="cpd-hero-art">
              <HeroArt />
            </div>
          </div>
        </div>

        <svg
          className="cpd-wave"
          viewBox="0 0 1440 60"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d="M0 42 C240 4 480 62 720 32 C960 2 1200 52 1440 20 L1440 60 L0 60Z"
            fill="#f1faf8"
          />
        </svg>
      </section>

      <div className="cpd-container">
        {/* WORKFLOW */}
        <section
          className="cpd-card cpd-workflow-card"
          style={{ "--d": "0.05s" }}
        >
          <div className="cpd-section-heading">
            <div>
              <span className="cpd-section-kicker">REPORT JOURNEY</span>
              <h2>Resolution progress</h2>
              <p>Track the recorded status of your report.</p>
            </div>

            <div className="cpd-workflow-meta">
              {!isRejected && <ProgressRing value={progressValue} />}

              <span className="cpd-workflow-label">
                {isRejected
                  ? "Review stopped"
                  : currentIndex === undefined
                    ? getStatusLabel(status)
                    : `${currentIndex + 1} of ${WORKFLOW.length} stages`}
              </span>
            </div>
          </div>

          {isRejected ? (
            <div className="cpd-rejected-message">
              <span>!</span>
              <div>
                <strong>This report was rejected</strong>
                <p>
                  Review the available report information and any notes
                  provided by the reviewing team.
                </p>
              </div>
            </div>
          ) : (
            <div className="cpd-workflow">
              {WORKFLOW.map((step, index) => {
                const activeIndex =
                  currentIndex === undefined ? 0 : currentIndex;

                const complete = index < activeIndex;
                const current = index === activeIndex;

                return (
                  <div
                    key={step.status}
                    style={{ "--i": index }}
                    className={[
                      "cpd-workflow-step",
                      complete ? "is-complete" : "",
                      current ? "is-current" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <div className="cpd-workflow-marker">
                      {complete ? "✓" : index + 1}
                    </div>
                    <span>{step.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <div className="cpd-main-grid">
          <div className="cpd-main-column">
            {/* DESCRIPTION */}
            <section className="cpd-card" style={{ "--d": "0.12s" }}>
              <div className="cpd-section-heading">
                <div>
                  <span className="cpd-section-kicker">REPORT INFORMATION</span>
                  <h2>Problem description</h2>
                </div>
                <span className="cpd-heading-icon">01</span>
              </div>

              <p className="cpd-description">
                {problem.description || "No description was provided."}
              </p>

              {problem.resolution_notes && (
                <div className="cpd-resolution-box">
                  <div className="cpd-resolution-icon-wrap">
                    <div className="cpd-resolution-icon">✓</div>
                    <span className="cpd-confetti" aria-hidden="true">
                      <i /><i /><i /><i /><i /><i />
                    </span>
                  </div>
                  <div>
                    <h3>Resolution notes</h3>
                    <p>{problem.resolution_notes}</p>

                    {problem.resolved_at && (
                      <span>
                        Recorded on {formatDate(problem.resolved_at, true)}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </section>

            {/* APPROVED ORGANIZATION SOLUTIONS */}
            <OrganizationSolutions
              solutions={solutions}
              loading={solutionsLoading}
              error={solutionsError}
            />

            {/* REPORT EVIDENCE */}
            <section className="cpd-card" style={{ "--d": "0.2s" }}>
              <div className="cpd-section-heading">
                <div>
                  <span className="cpd-section-kicker">SUPPORTING MATERIAL</span>
                  <h2>Evidence and attachments</h2>
                  <p>
                    {attachments.length} attachment
                    {attachments.length === 1 ? "" : "s"} linked to this report.
                  </p>
                </div>

                <span className="cpd-heading-icon">05</span>
              </div>

              {attachments.length === 0 ? (
                <div className="cpd-empty-evidence">
                  <EvidenceArt />
                  <strong>No evidence attachments</strong>
                  <p>
                    No uploaded images or videos are available for this report.
                  </p>
                </div>
              ) : (
                <div className="cpd-attachment-grid">
                  {attachments.map((attachment, index) => {
                    const url = getAttachmentUrl(attachment);
                    const video = url && isVideoAttachment(attachment, url);
                    const image = url && isImageAttachment(attachment, url);

                    return (
                      <article
                        className="cpd-attachment"
                        key={attachment.id ?? url ?? index}
                        style={{ "--i": index }}
                      >
                        <div className="cpd-attachment-preview">
                          {!url ? (
                            <div className="cpd-attachment-unavailable">
                              File URL unavailable
                            </div>
                          ) : video ? (
                            <video
                              controls
                              preload="metadata"
                              src={url}
                              aria-label="Uploaded video evidence"
                            >
                              Your browser does not support video playback.
                            </video>
                          ) : image ? (
                            <a
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="cpd-image-link"
                              aria-label="Open full-size evidence image"
                            >
                              <img
                                src={url}
                                alt={`Evidence for ${problem.title}`}
                                loading="lazy"
                              />
                            </a>
                          ) : (
                            <div className="cpd-file-preview">
                              <span>↗</span>
                              <strong>Uploaded file</strong>
                            </div>
                          )}
                        </div>

                        <div className="cpd-attachment-footer">
                          <div>
                            <strong>
                              {video
                                ? "Video evidence"
                                : image
                                  ? "Image evidence"
                                  : "Report attachment"}
                            </strong>
                            <span>
                              {attachment.uploaded_at
                                ? `Added ${formatDate(attachment.uploaded_at)}`
                                : "Supporting evidence"}
                            </span>
                          </div>

                          {url && (
                            <a
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="cpd-open-file"
                            >
                              Open ↗
                            </a>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            {/* LOCATION */}
            <section className="cpd-card" style={{ "--d": "0.28s" }}>
              <div className="cpd-section-heading">
                <div>
                  <span className="cpd-section-kicker">WHERE IT HAPPENED</span>
                  <h2>Problem location</h2>
                </div>
                <span className="cpd-heading-icon">06</span>
              </div>

              <MiniMap label={problem.location || "Location not provided"} />

              <div className="cpd-location-box">
                <div className="cpd-location-icon">⌖</div>

                <div className="cpd-location-text">
                  <span>Reported location</span>
                  <strong>
                    {problem.location || "Location not provided"}
                  </strong>

                  {hasCoordinates && (
                    <span className="cpd-coordinates">
                      {Number(problem.latitude).toFixed(5)},{" "}
                      {Number(problem.longitude).toFixed(5)}
                    </span>
                  )}
                </div>

                {hasCoordinates && (
                  <a
                    className="cpd-map-link"
                    href={`https://www.google.com/maps?q=${encodeURIComponent(
                      `${problem.latitude},${problem.longitude}`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open map ↗
                  </a>
                )}
              </div>

              {hasCoordinates && (
                <p className="cpd-map-note">
                  The picture above is an illustration. Use Open map to see the
                  exact position.
                </p>
              )}
            </section>
          </div>

          {/* SIDEBAR */}
          <aside className="cpd-side-column">
            <section
              className="cpd-card cpd-facts-card"
              style={{ "--d": "0.15s" }}
            >
              <span className="cpd-section-kicker">AT A GLANCE</span>
              <h2>Report summary</h2>

              <div className="cpd-fact" style={{ "--i": 0 }}>
                <span className="cpd-fact-icon">▤</span>
                <div>
                  <span>Report reference</span>
                  <strong>{getProblemCode(problem)}</strong>
                </div>
              </div>

              <div className="cpd-fact" style={{ "--i": 1 }}>
                <span className="cpd-fact-icon">◈</span>
                <div>
                  <span>Category</span>
                  <strong>{categoryName}</strong>
                </div>
              </div>

              <div className="cpd-fact" style={{ "--i": 2 }}>
                <span className="cpd-fact-icon">◷</span>
                <div>
                  <span>Reported on</span>
                  <strong>{formatDate(problem.created_at, true)}</strong>
                </div>
              </div>

              <div className="cpd-fact" style={{ "--i": 3 }}>
                <span className="cpd-fact-icon">↻</span>
                <div>
                  <span>Last updated</span>
                  <strong>{formatDate(problem.updated_at, true)}</strong>
                </div>
              </div>

              <div className="cpd-fact" style={{ "--i": 4 }}>
                <span className="cpd-fact-icon">✓</span>
                <div>
                  <span>Responsible organization</span>
                  <strong>{organization}</strong>
                </div>
              </div>

              {problem.assignment_details?.assigned_at && (
                <div className="cpd-fact" style={{ "--i": 5 }}>
                  <span className="cpd-fact-icon">↗</span>
                  <div>
                    <span>Assigned on</span>
                    <strong>
                      {formatDate(problem.assignment_details.assigned_at, true)}
                    </strong>
                  </div>
                </div>
              )}
            </section>

            <section className="cpd-help-card" style={{ "--d": "0.25s" }}>
              <BellArt />
              <div className="cpd-help-icon">i</div>
              <h2>Stay informed</h2>
              <p>
                Your report status reflects the latest information returned
                by CivicSolve. Refresh the details to check for updates.
              </p>

              <button
                type="button"
                onClick={() => {
                  loadDetails();
                  loadSolutions();
                }}
              >
                Refresh details <span aria-hidden="true">↻</span>
              </button>
            </section>

            <button
              type="button"
              className="cpd-all-reports-button"
              style={{ "--d": "0.35s" }}
              onClick={() => navigate("/user/my-problems")}
            >
              ← View all my reports
            </button>
          </aside>
        </div>
      </div>
    </main>
  );
}

export default ProblemDetails;
