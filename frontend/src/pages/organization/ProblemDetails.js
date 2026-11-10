import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  getOrganizationProblemDetails,
  cancelOrganizationAssignment,
  getProblemDiscussions,
  createProblemDiscussion,
} from "../../services/api";
import "../../styles/organization/ProblemDetails.css";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
const AVAILABLE_ROUTE = "/organization/available-problems";
const acceptRoute = (id) => `/organization/problems/${encodeURIComponent(id)}/accept`;

const STATUS_LABELS = {
  open: "Open",
  under_review: "Under Review",
  assigned: "Assigned",
  accepted: "Accepted",
  in_progress: "In Progress",
  resolved: "Resolved",
  completed: "Completed",
  rejected: "Rejected",
  closed: "Closed",
  pending: "Pending Review",
  approved: "Approved",
  changes_requested: "Changes Requested",
  cancelled: "Cancelled",
};

const LABEL = (value) =>
  STATUS_LABELS[value] ||
  String(value || "Not available")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

function formatDate(value, includeTime = false) {
  if (!value) return "Not recorded";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(includeTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(date);
}

const formatDateOrEmpty = (value, includeTime = false) =>
  value ? formatDate(value, includeTime).replace("Not recorded", "") : "";

function shortDate(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function initials(value = "") {
  return (
    String(value)
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0] || "")
      .join("")
      .toUpperCase() || "CS"
  );
}

function priorityClass(value) {
  return ["low", "medium", "high", "urgent"].includes(value) ? value : "medium";
}

const PRIORITY_LEVEL = { low: 1, medium: 2, high: 3, urgent: 4 };
const EMPTY_LIST = [];

/* Count-up for the metric numbers (instant when reduced motion). */
function useCountUp(target, duration = 900) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (target === null || target === undefined) return undefined;

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduce) {
      setValue(target);
      return undefined;
    }

    let raf;
    const start = performance.now();

    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      setValue(target * (1 - Math.pow(1 - t, 3)));
      if (t < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}

function CountUp({ value, suffix = "" }) {
  const n = Number(value);
  const finite = value !== null && value !== undefined && Number.isFinite(n);
  const animated = useCountUp(finite ? n : null);

  if (!finite) return <>{value}</>;
  return (
    <>
      {Math.round(animated)}
      {suffix}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Icons & illustrations                                              */
/* ------------------------------------------------------------------ */
const ICON_PATHS = {
  pin: "M10 18s6-5.2 6-9.6A6 6 0 0 0 4 8.4C4 12.8 10 18 10 18Zm0-7.4a2.2 2.2 0 1 1 0-4.4 2.2 2.2 0 0 1 0 4.4Z",
  user: "M10 10a3.4 3.4 0 1 0 0-6.8 3.4 3.4 0 0 0 0 6.8Zm-6.2 7c.4-3 2.8-4.6 6.2-4.6s5.8 1.6 6.2 4.6",
  building: "M4 17V4.5h8V17M12 8h4v9M2.5 17h15M7 7.5h2M7 10.5h2M7 13.5h2",
  calendar: "M4 6h12v10H4zM4 9h12M7 3.5V7M13 3.5V7",
  clock: "M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm0-11v4.4l2.8 1.6",
  flag: "M5 17V3.5M5 4.5h9l-1.8 3 1.8 3H5",
  check: "M4.5 10.5l3.5 3.5 7.5-8",
  chat: "M3.5 5.5h13v8h-6l-3.5 3v-3h-3.5z",
  report: "M5 3h7l3 3v11H5zM12 3v3.5h3M7.5 10h5M7.5 13h5",
  doc: "M5 3h7l3 3v11H5zM12 3v3.5h3",
  download: "M10 3.5v9M6.5 9.5l3.5 3.5 3.5-3.5M4 16.5h12",
  camera: "M3.5 7h3l1.2-2h4.6l1.2 2h3v9h-13zM10 14.2a2.7 2.7 0 1 0 0-5.4 2.7 2.7 0 0 0 0 5.4Z",
  hourglass: "M6 3.5h8M6 16.5h8M6.5 3.5c0 3.2 3.5 3.8 3.5 6.5S6.5 13.300 6.5 16.5M13.500 3.5c0 3.2-3.500 3.800-3.500 6.500s3.500 3.300 3.500 6.500",
  bell: "M10 3.5a4.500 4.500 0 0 0-4.500 4.500c0 4-1.500 5-1.500 5h12s-1.500-1-1.500-5A4.500 4.500 0 0 0 10 3.500ZM8.300 15.500a1.800 1.800 0 0 0 3.400 0",
  eye: "M2 10s3 -5.500 8 -5.500S18 10 18 10s-3 5.500-8 5.500S2 10 2 10Zm8 2.200a2.200 2.200 0 1 0 0-4.400 2.200 2.200 0 0 0 0 4.400Z",
};

function Icon({ name, size = 14 }) {
  return (
    <svg
      className="pd-icon"
      viewBox="0 0 20 20"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={ICON_PATHS[name]} />
    </svg>
  );
}

/* calm line-art: a case file and its lifecycle track, drawn once on load */
function HeroArt() {
  const nodes = [
    { x: 150, label: "Reported" },
    { x: 205, label: "Assigned" },
    { x: 260, label: "In progress" },
    { x: 315, label: "Resolved" },
  ];

  return (
    <svg className="pd-hero-art" viewBox="0 0 340 120" aria-hidden="true">
      <g fill="none" stroke="#7be8d0" strokeOpacity="0.22">
        <rect x="2" y="2" width="336" height="116" rx="14" />
      </g>

      {/* case file */}
      <g transform="translate(20 22)">
        <rect width="74" height="76" rx="9" fill="rgba(31,214,176,0.07)" stroke="#7be8d0" strokeOpacity="0.5" strokeWidth="1.4" />
        <rect x="10" y="11" width="28" height="5" rx="2.5" fill="rgba(255,255,255,0.6)" />
        <g fill="rgba(255,255,255,0.28)">
          <rect x="10" y="24" width="52" height="4" rx="2" />
          <rect x="10" y="34" width="44" height="4" rx="2" />
          <rect x="10" y="44" width="50" height="4" rx="2" />
        </g>
        <g transform="translate(54 58)">
          <g className="pd-stamp">
            <circle r="9" fill="#2fe0bd" />
            <path d="M-4 0.5l3 3 5.500-6" stroke="#063e3b" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        </g>
      </g>

      {/* lifecycle track */}
      <line className="pd-track-base" x1="150" y1="52" x2="315" y2="52" />
      <line className="pd-track-progress" x1="150" y1="52" x2="315" y2="52" />

      {nodes.map((n, i) => (
        <g key={n.label} transform={`translate(${n.x} 52)`}>
          {i === nodes.length - 1 && <circle className="pd-node-ring" r="11" fill="none" stroke="#5ce0b6" strokeWidth="1.4" />}
          <circle className="pd-node" r="7.5" stroke="rgba(255,255,255,0.35)" strokeWidth="1.4" style={{ animationDelay: `${0.5 + i * 0.45}s` }} />
          <path className="pd-node-check" d="M-3 0.2l2 2 3.800-4.200" stroke="#063e3b" strokeWidth="1.9" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ animationDelay: `${0.6 + i * 0.45}s` }} />
          <text y="25" textAnchor="middle" fontSize="8" fontWeight="600" fill="rgba(255,255,255,0.72)">
            {n.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

function LocationMap({ location, coordinates, mapUrl }) {
  return (
    <div className="pd-map">
      <svg viewBox="0 0 600 170" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <rect width="600" height="170" fill="#e4f2ee" />

        {/* river */}
        <path d="M250 -10 L318 -10 L418 180 L350 180 Z" fill="#cfe7f1" />
        <path d="M270 -10 L370 180" stroke="#fff" strokeOpacity="0.7" strokeWidth="2" strokeDasharray="6 14" fill="none" />

        {/* blocks */}
        <g fill="#f4faf8">
          <rect x="196" y="16" width="44" height="44" rx="6" />
          <rect x="430" y="14" width="70" height="46" rx="6" />
          <rect x="520" y="14" width="64" height="46" rx="6" />
          <rect x="430" y="120" width="76" height="40" rx="6" />
          <rect x="520" y="120" width="64" height="40" rx="6" />
          <rect x="196" y="120" width="44" height="40" rx="6" />
        </g>

        {/* park */}
        <rect x="14" y="16" width="150" height="70" rx="12" fill="#cde9db" />
        <g fill="#a9d6bf">
          <circle cx="44" cy="44" r="10" />
          <circle cx="80" cy="60" r="12" />
          <circle cx="122" cy="40" r="9" />
          <circle cx="140" cy="66" r="7" />
        </g>

        {/* roads */}
        <path d="M0 104 H600" stroke="#fff" strokeWidth="17" />
        <path d="M180 0 V170" stroke="#fff" strokeWidth="10" opacity="0.85" />
        <path d="M470 0 V170" stroke="#fff" strokeWidth="12" />

        {/* reported location */}
        <g transform="translate(470 104)">
          <circle className="pd-map-ripple" r="16" fill="none" stroke="#0fb59a" strokeWidth="2" />
          <g className="pd-map-pin">
            <circle r="14" fill="#0fb59a" stroke="#fff" strokeWidth="3.500" />
            <path d="M0 7 C -5.500 1.500 -5.500 -2 -5.500 -3 A5.500 5.500 0 0 1 5.500 -3 C 5.500 -2 5.500 1.500 0 7 Z" fill="#fff" />
            <circle cy="-3" r="2" fill="#0fb59a" />
          </g>
        </g>
      </svg>

      <span className="pd-map-address">
        <i />
        {location || "Location not recorded"}
        {coordinates ? ` · ${coordinates}` : ""} · Illustrative map
      </span>

      {mapUrl && (
        <a href={mapUrl} target="_blank" rel="noreferrer" className="pd-map-link">
          Open map ↗
        </a>
      )}
    </div>
  );
}

function ProgressRing({ value }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  const circumference = 2 * Math.PI * 20;
  const offset = circumference * (1 - pct / 100);

  return (
    <svg className="pd-ring" viewBox="0 0 52 52" aria-hidden="true">
      <circle cx="26" cy="26" r="20" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="5" />
      <circle
        className="pd-ring-value"
        cx="26"
        cy="26"
        r="20"
        fill="none"
        stroke="#fff"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={circumference}
        style={{ "--pd-ring-from": circumference, "--pd-ring-to": offset }}
        transform="rotate(-90 26 26)"
      />
    </svg>
  );
}

function PriorityMeter({ priority }) {
  const level = PRIORITY_LEVEL[priority] || 2;
  return (
    <span className="pd-meter" aria-hidden="true">
      {[1, 2, 3, 4].map((n) => (
        <i key={n} className={n <= level ? "is-on" : ""} style={{ "--pd-n": n }} />
      ))}
    </span>
  );
}

function DayBars({ days }) {
  const count = Math.max(0, Math.min(14, Number(days) || 0));
  return (
    <span className="pd-daybars" aria-hidden="true">
      {Array.from({ length: 14 }, (_, i) => (
        <i key={i} className={i < count ? "is-on" : ""} style={{ "--pd-n": i }} />
      ))}
    </span>
  );
}

function TypingDots() {
  return (
    <span className="pd-typing" aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
  );
}

function CameraArt() {
  return (
    <svg className="pd-empty-svg" viewBox="0 0 120 90" aria-hidden="true">
      <ellipse cx="60" cy="80" rx="38" ry="5" fill="#d8ece7" />
      <g className="pd-empty-float">
        <rect x="26" y="26" width="68" height="46" rx="10" fill="#fff" stroke="#cfe5df" strokeWidth="2" />
        <path d="M44 26l4-8h24l4 8" fill="#e2f8f1" stroke="#cfe5df" strokeWidth="2" strokeLinejoin="round" />
        <circle cx="60" cy="49" r="13" fill="rgba(15,181,154,0.12)" stroke="#0fb59a" strokeWidth="3" />
        <circle cx="60" cy="49" r="5" fill="#0fb59a" />
      </g>
      <g className="pd-empty-spark" fill="#f2b44d">
        <path d="M100 20 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 l5 -2 z" />
      </g>
    </svg>
  );
}

function ChatArt() {
  return (
    <svg className="pd-empty-svg" viewBox="0 0 120 80" aria-hidden="true">
      <g className="pd-empty-float">
        <rect x="14" y="12" width="64" height="34" rx="12" fill="rgba(255,255,255,0.1)" stroke="rgba(93,228,205,0.5)" strokeWidth="2" />
        <path d="M30 46 l-6 12 l16 -12z" fill="rgba(255,255,255,0.1)" stroke="rgba(93,228,205,0.5)" strokeWidth="2" strokeLinejoin="round" />
        <rect x="28" y="24" width="36" height="5" rx="2.500" fill="rgba(255,255,255,0.4)" />
        <rect x="28" y="34" width="22" height="5" rx="2.500" fill="rgba(255,255,255,0.22)" />
        <rect x="58" y="40" width="48" height="26" rx="10" fill="#0fb59a" opacity="0.85" />
        <circle cx="72" cy="53" r="2.800" fill="#fff" className="pd-chat-dot" />
        <circle cx="82" cy="53" r="2.800" fill="#fff" className="pd-chat-dot pd-chat-dot-2" />
        <circle cx="92" cy="53" r="2.800" fill="#fff" className="pd-chat-dot pd-chat-dot-3" />
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Small components                                                   */
/* ------------------------------------------------------------------ */
function StatusPill({ value }) {
  return (
    <span className={`pd-status pd-status--${value || "unknown"}`}>
      <span className="pd-status-dot" />
      {LABEL(value)}
    </span>
  );
}

function MetricCard({ label, children, hint, icon, tone, art, delay = 0 }) {
  return (
    <article className={`pd-metric pd-metric--${tone}`} style={{ "--pd-d": `${delay}ms` }}>
      <div className="pd-metric-top">
        <span>{label}</span>
        <span className="pd-metric-icon">
          <Icon name={icon} size={15} />
        </span>
      </div>
      <strong>{children}</strong>
      <span className="pd-metric-hint">{hint}</span>
      {art}
    </article>
  );
}

function EmptyState({ art, title, text }) {
  return (
    <div className="pd-empty">
      {art}
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  );
}

function EvidenceTile({ item, onOpen }) {
  const [loaded, setLoaded] = useState(false);
  const isAfter = item.evidenceType === "After";
  const stamp = formatDateOrEmpty(item.created_at || item.uploaded_at, true);

  return (
    <figure className={`pd-evidence ${isAfter ? "is-after" : ""}`}>
      <button
        className={`pd-evidence-btn ${loaded ? "is-loaded" : ""}`}
        onClick={() => onOpen(item)}
        type="button"
        disabled={!item.url}
        aria-label={`View ${item.evidenceType} evidence`}
      >
        {item.url ? (
          <img
            src={item.url}
            alt={item.caption || item.evidenceType}
            loading="lazy"
            onLoad={() => setLoaded(true)}
          />
        ) : (
          <span className="pd-evidence-missing">Image unavailable</span>
        )}
        <span className="pd-image-zoom">↗</span>
        {isAfter && (
          <span className="pd-sparkle" aria-hidden="true">
            ✦
          </span>
        )}
      </button>

      <figcaption>
        <span className="pd-evidence-badge">{item.evidenceType}</span>
        <span className="pd-evidence-text">
          {[stamp, item.caption].filter(Boolean).join(" · ")}
        </span>
      </figcaption>
    </figure>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function ProblemDetails() {
  const { problemId, id } = useParams();
  const selectedId = problemId || id;
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeImage, setActiveImage] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const [discussionText, setDiscussionText] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [sendingDiscussion, setSendingDiscussion] = useState(false);
  const [discussionError, setDiscussionError] = useState("");
  const [discussionNotice, setDiscussionNotice] = useState("");

  const loadDetails = useCallback(async () => {
    if (!selectedId) {
      setError("No problem ID was provided in the URL.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await getOrganizationProblemDetails(selectedId);
      setData(result);
    } catch (err) {
      setError(err.message || "Unable to load problem details.");
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  const refreshDiscussion = useCallback(async () => {
    const result = await getProblemDiscussions(selectedId);

    const messages = Array.isArray(result)
      ? result
      : result?.results || result?.messages || [];

    setData((previous) => {
      if (!previous) return previous;

      return {
        ...previous,
        discussion: {
          ...(previous.discussion || {}),
          count: result?.count ?? messages.length,
          messages,
        },
      };
    });
  }, [selectedId]);

  const handleSendDiscussion = async (event) => {
    event.preventDefault();

    const message = discussionText.trim();

    if (!message || sendingDiscussion) return;

    setSendingDiscussion(true);
    setDiscussionError("");
    setDiscussionNotice("");

    try {
      await createProblemDiscussion(selectedId, {
        message,
        ...(replyTo ? { parent: replyTo } : {}),
      });

      setDiscussionText("");
      setReplyTo(null);

      await refreshDiscussion();

      setDiscussionNotice(
        "Your message has been posted successfully."
      );
    } catch (err) {
      setDiscussionError(
        err.message || "Unable to post your message. Please try again."
      );
    } finally {
      setSendingDiscussion(false);
    }
  };

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  /* close the lightbox with Escape */
  useEffect(() => {
    if (!activeImage) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") setActiveImage(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeImage]);

  const problem = data?.problem;
  const report = data?.report || {};
  const assignment = data?.assignment || {};
  const metrics = data?.metrics || {};
  const solutions = data?.solutions || EMPTY_LIST;
  const timeline = data?.timeline || EMPTY_LIST;
  const discussion = data?.discussion?.messages || [];
  const followUp = data?.follow_up || {};

  const evidence = useMemo(() => {
    const original = (report.attachments || []).map((item) => ({
      ...item,
      url: item.url || item.file || null,
      evidenceType: "Original report",
    }));

    const resolution = solutions.flatMap((solution) =>
      (solution.evidence || []).map((item) => ({
        ...item,
        url: item.url || item.file || null,
        evidenceType: item.type === "after" ? "After" : "Before",
        solutionTitle: solution.title,
      }))
    );

    return [...original, ...resolution];
  }, [report.attachments, solutions]);

  const latestSolution = solutions[0];

  const mapUrl = useMemo(() => {
    if (!problem) return null;

    const hasCoordinates =
      problem.latitude !== null &&
      problem.latitude !== undefined &&
      problem.longitude !== null &&
      problem.longitude !== undefined;

    const query = hasCoordinates
      ? `${problem.latitude},${problem.longitude}`
      : problem.location;

    return query
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
      : null;
  }, [problem]);

  /* recorded events + a pending "Closed" step while the case is still open */
  const lifecycle = useMemo(() => {
    const events = timeline.map((event) => ({ ...event, state: "done" }));
    const finished = ["closed", "cancelled", "rejected"].includes(problem?.status);

    if (events.length && !finished) {
      events.push({ label: "Closed", state: "pending", at: null });
    }
    return events;
  }, [timeline, problem?.status]);

  const canAct =
    Boolean(assignment.id) && ["assigned", "pending"].includes(assignment.status);

  const handleCancelAssignment = async () => {
    if (!assignment.id || cancelling) {
      if (!assignment.id) {
        window.alert("Assignment ID is missing from the API response.");
      }
      return;
    }

    const reason = window.prompt(
      "Please enter a reason for cancelling this assignment:"
    );

    if (reason === null) return;

    if (!reason.trim()) {
      window.alert("Please provide a cancellation reason.");
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to cancel this assignment?"
    );

    if (!confirmed) return;

    setCancelling(true);

    try {
      await cancelOrganizationAssignment(assignment.id, reason.trim());

      window.alert("Assignment cancelled successfully.");
      await loadDetails();
    } catch (err) {
      window.alert(err.message || "Unable to cancel assignment.");
    } finally {
      setCancelling(false);
    }
  };

  const handleExport = () => {
    if (!data || exporting) return;

    setExporting(true);

    try {
      const reportData = {
        exported_at: new Date().toISOString(),
        problem,
        original_report: report,
        assignment,
        metrics,
        solutions,
        timeline,
        discussion: data.discussion,
        follow_up: followUp,
      };

      const blob = new Blob([JSON.stringify(reportData, null, 2)], {
        type: "application/json",
      });

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `CivicSolve-${problem.problem_code || selectedId}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const scrollToSection = (sectionId) => {
    document.getElementById(sectionId)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  /* ---------------- loading ---------------- */
  if (loading) {
    return (
      <main className="pd-page">
        <div className="pd-loading-hero">
          <div className="pd-wrap">
            <div className="pd-skeleton pd-sk-short" />
            <div className="pd-skeleton pd-sk-title" />
            <div className="pd-skeleton pd-sk-line" />
          </div>
        </div>
        <div className="pd-wrap">
          <div className="pd-loading-banner pd-skeleton-card">
            <div className="pd-skeleton pd-sk-short" />
            <div className="pd-skeleton pd-sk-title" />
          </div>
          <div className="pd-loading-grid">
            {Array.from({ length: 4 }, (_, index) => (
              <div className="pd-skeleton-card" key={index}>
                <div className="pd-skeleton pd-sk-short" />
                <div className="pd-skeleton pd-sk-number" />
                <div className="pd-skeleton pd-sk-line" />
              </div>
            ))}
          </div>
          <p className="pd-loading-label">
            <span className="pd-spinner" />
            Loading your problem workspace…
          </p>
        </div>
      </main>
    );
  }

  /* ---------------- error ---------------- */
  if (error || !problem) {
    return (
      <main className="pd-page">
        <section className="pd-error-card">
          <span className="pd-error-icon">!</span>
          <p className="pd-eyebrow">Organization workspace</p>
          <h1>Problem details unavailable</h1>
          <p>{error || "No problem details were returned by the server."}</p>
          <div className="pd-error-actions">
            <button className="pd-button pd-button--primary" onClick={loadDetails}>
              ↻ Try again
            </button>
            <button
              className="pd-button pd-button--light"
              onClick={() => navigate(AVAILABLE_ROUTE)}
            >
              ← Available problems
            </button>
          </div>
        </section>
      </main>
    );
  }

  const isResolved = ["resolved", "closed"].includes(problem.status);
  const orgName = assignment.organization_name || data?.organization?.name || "";
  const expectedDate = formatDateOrEmpty(
    problem.expected_resolution_date || assignment.expected_date
  );
  const daysOpen = metrics.days_open ?? problem.days_open ?? "—";
  const resolutionPct = metrics.resolution_complete ?? (isResolved ? 100 : 0);
  const commentCount = data.discussion?.count ?? discussion.length;

  const daysHint =
    isResolved && problem.created_at && problem.resolved_at
      ? `${shortDate(problem.created_at)} → ${shortDate(problem.resolved_at)}`
      : isResolved
        ? "Time to resolution"
        : "Since report submitted";

  const coordinates =
    problem.latitude != null && problem.longitude != null
      ? `${problem.latitude}, ${problem.longitude}`
      : "";

  const responsibleName =
    assignment.responsible_member ||
    assignment.assigned_to ||
    assignment.member_name ||
    "Assigned organization";

  return (
    <main className="pd-page">
      {/* ===== Header card (own class names: pdh-*) ===== */}
      <div className="pdh-card">
        <div className="pdh-inner">
          <div className="pdh-copy">
            <Link to={AVAILABLE_ROUTE} className="pdh-back">
              <span aria-hidden="true">←</span> Back to Available Problems
            </Link>
            <p className="pdh-eyebrow">Organization workspace · 03</p>
            <h1 className="pdh-title">Problem Details</h1>
            <p className="pdh-subtitle">
              Review the complete report and your organization’s responsibility.
            </p>
          </div>

          <div className="pdh-scene">
            <HeroArt />
          </div>

          <div className="pdh-actions">
            <button
              type="button"
              className="pd-button pd-button--hero"
              onClick={() => scrollToSection("pd-work-record")}
            >
              {solutions.length || isResolved
                ? "View Resolution Record"
                : "View Work Record"}
            </button>
          </div>
        </div>
      </div>

      {/* ===== Status strip ===== */}
      <div className="pdh-strip">
        <div className="pdh-strip-inner">
          <span className="pdh-strip-dot" />
          <span className="pdh-strip-text">
            <strong>{problem.problem_code}</strong>
            {orgName ? ` · ${orgName}` : ""} · {LABEL(problem.status)}
            {problem.is_escalated ? " · Escalated for attention" : ""}
            {followUp.message ? ` — ${followUp.message}` : ""}
          </span>
          <button
            type="button"
            className="pdh-strip-link"
            onClick={() => scrollToSection("pd-followup")}
          >
            {isResolved ? "Resolution record available" : "Follow-up"} »
          </button>
        </div>
      </div>

      <div className="pd-wrap pd-content">
        <nav className="pd-breadcrumbs" aria-label="Breadcrumb">
          <Link to="/organization/dashboard">Organization workspace</Link>
          <span>/</span>
          <Link to={AVAILABLE_ROUTE}>Available problems</Link>
          <span>/</span>
          <span>{problem.problem_code}</span>
        </nav>

        {/* ===== Problem banner ===== */}
        <section className="pd-banner pd-animate">
          <div className="pd-tags">
            <span className="pd-tag pd-tag--code">{problem.problem_code}</span>
            {problem.category && (
              <span className="pd-tag">
                {typeof problem.category === "object"
                  ? problem.category.name
                  : problem.category}
              </span>
            )}
            <StatusPill value={problem.status} />
            {problem.is_escalated && (
              <span className="pd-tag pd-tag--warning">⚠ Escalated</span>
            )}
            {followUp.required && (
              <span className="pd-tag pd-tag--amber">
                <i />
                {followUp.badge || "Action required"}
              </span>
            )}
          </div>

          <h2>{problem.title}</h2>

          <div className="pd-meta">
            <span>
              <Icon name="pin" />
              {problem.location || "Location not recorded"}
            </span>
            <span>
              <Icon name="user" />
              Reported by {report.reported_by || "Community member"}
            </span>
            {orgName && (
              <span>
                <Icon name="building" />
                {orgName}
              </span>
            )}
            <span>
              <Icon name="calendar" />
              {expectedDate
                ? `Expected ${expectedDate}`
                : `Reported ${formatDate(problem.created_at)}`}
            </span>
          </div>

          {canAct && (
            <div className="pd-assignment-actions">
              <button
                type="button"
                className="pd-button pd-button--primary"
                onClick={() => navigate(acceptRoute(selectedId))}
              >
                ✓ Accept Assignment
              </button>

              <button
                type="button"
                className="pd-button pd-button--light"
                onClick={handleCancelAssignment}
                disabled={cancelling}
              >
                {cancelling ? "Cancelling…" : "✕ Cancel Assignment"}
              </button>
            </div>
          )}
        </section>

        {/* ===== Metrics ===== */}
        <section className="pd-metrics">
          <MetricCard
            label="Days open"
            tone="mint"
            icon="clock"
            hint={daysHint}
            delay={60}
            art={<DayBars days={daysOpen} />}
          >
            <CountUp value={daysOpen} />
          </MetricCard>

          <MetricCard
            label="Priority"
            tone={`priority pd-priority-${priorityClass(problem.priority)}`}
            icon="flag"
            hint={problem.is_escalated ? "Escalated for attention" : "Reviewer confirmed"}
            delay={120}
            art={<PriorityMeter priority={priorityClass(problem.priority)} />}
          >
            {LABEL(problem.priority)}
          </MetricCard>

          <MetricCard
            label="Resolution"
            tone="teal"
            icon="check"
            hint={isResolved ? "Evidence submitted" : "Awaiting final resolution"}
            delay={180}
            art={<ProgressRing value={resolutionPct} />}
          >
            <CountUp value={resolutionPct} suffix="%" />
          </MetricCard>

          <MetricCard
            label="Comments"
            tone="lavender"
            icon="chat"
            hint="Community active"
            delay={240}
            art={<TypingDots />}
          >
            <CountUp value={commentCount} />
          </MetricCard>
        </section>

        {/* ===== Two-column layout ===== */}
        <div className="pd-grid">
          <div className="pd-col">
            {/* ----- Original report ----- */}
            <section className="pd-card pd-animate pd-delay-2" id="pd-original-report">
              <div className="pd-card-heading">
                <span className="pd-heading-icon pd-heading-icon--teal">
                  <Icon name="report" size={16} />
                </span>
                <div>
                  <h3>Original Report</h3>
                  <p>The citizen’s original report and evidence</p>
                </div>
                <span className="pd-date-chip">
                  {formatDate(report.created_at || problem.created_at)}
                </span>
              </div>

              <p className="pd-description">
                {report.description ||
                  problem.description ||
                  "No description was provided."}
              </p>

              {evidence.length > 0 ? (
                <div className="pd-evidence-grid">
                  {evidence.map((item) => (
                    <EvidenceTile
                      key={`${item.evidenceType}-${item.id}`}
                      item={item}
                      onOpen={setActiveImage}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  art={<CameraArt />}
                  title="No evidence photos yet"
                  text="Uploaded report and resolution evidence will appear here."
                />
              )}

              <LocationMap
                location={problem.location}
                coordinates={coordinates}
                mapUrl={mapUrl}
              />

              <div className="pd-reporter">
                <span className="pd-avatar">{initials(report.reported_by)}</span>
                <span>
                  <strong>
                    Reporter: {report.reported_by || "Community member"}
                  </strong>
                  <small>
                    Received {formatDate(report.created_at || problem.created_at)}
                    {report.verified_by
                      ? ` · Evidence checked by ${report.verified_by}`
                      : ""}
                  </small>
                </span>
              </div>
            </section>

            {/* ----- Assignment & work ----- */}
            <section className="pd-card pd-animate pd-delay-3" id="pd-work-record">
              <div className="pd-card-heading">
                <span className="pd-heading-icon pd-heading-icon--navy">
                  <Icon name="doc" size={16} />
                </span>
                <div>
                  <h3>Assignment &amp; Work Record</h3>
                  <p>Responsibility and recorded progress</p>
                </div>
                <StatusPill value={assignment.status} />
              </div>

              <div className="pd-assignment-grid">
                <div className="pd-cell">
                  <span>Assigned by</span>
                  <strong>{assignment.assigned_by || "Not recorded"}</strong>
                  <small>Administrator</small>
                  <small>
                    {formatDate(assignment.assigned_at)}
                    {assignment.code ? ` · Assignment ${assignment.code}` : ""}
                  </small>
                </div>

                <div className="pd-cell">
                  <span>Responsible member</span>
                  <strong>{responsibleName}</strong>
                  <small>{assignment.member_role || `Assignment status: ${LABEL(assignment.status)}`}</small>
                  <small>
                    {orgName ||
                      `Accepted ${formatDate(assignment.accepted_at)}`}
                  </small>
                </div>
              </div>

              {assignment.notes && (
                <div className="pd-notes">
                  <strong>Work notes</strong>
                  <p>{assignment.notes}</p>
                </div>
              )}

              <div className="pd-work-footer">
                <span className={`pd-work-indicator ${isResolved ? "is-complete" : ""}`} />
                <div>
                  <strong>
                    {isResolved
                      ? "Resolution status recorded"
                      : latestSolution
                        ? `Latest solution: ${LABEL(latestSolution.status)}`
                        : "Work record is active"}
                  </strong>
                  <p>
                    {latestSolution
                      ? latestSolution.title
                      : followUp.message ||
                      "Review the assigned work and update its progress."}
                  </p>
                </div>
              </div>

              {solutions.length > 0 && (
                <div className="pd-solutions">
                  <h4>Solution records</h4>
                  {solutions.map((solution) => (
                    <article className="pd-solution" key={solution.id}>
                      <div className="pd-solution-top">
                        <strong>{solution.title}</strong>
                        <StatusPill value={solution.status} />
                      </div>
                      <p>{solution.description}</p>
                      {solution.proposed_action && (
                        <p>
                          <b>Action:</b> {solution.proposed_action}
                        </p>
                      )}
                      {solution.admin_review_notes && (
                        <p>
                          <b>Review notes:</b> {solution.admin_review_notes}
                        </p>
                      )}
                      <small>
                        Submitted {formatDate(solution.created_at, true)}
                      </small>
                    </article>
                  ))}
                </div>
              )}
            </section>

            {/* ----- Community ----- */}
            {/* ----- Community ----- */}
            <section
              className="pd-community pd-animate"
              id="pd-community"
            >
              <div className="pd-community-glow" />

              <div className="pd-card-heading">
                <span className="pd-heading-icon pd-heading-icon--outline">
                  <Icon name="chat" size={16} />
                </span>

                <div>
                  <h3>Community Communication</h3>
                  <p>
                    Respond to citizen comments and keep everyone informed
                  </p>
                </div>

                <span className="pd-count">{commentCount}</span>
              </div>

              {discussion.length > 0 ? (
                <div className="pd-messages">
                  {discussion.map((message) => {
                    const parentId =
                      message.parent_id ?? message.parent ?? null;

                    const author =
                      message.author ||
                      message.author_name ||
                      "Community member";

                    const authorType = String(
                      message.author_type || message.role || ""
                    ).toLowerCase();

                    const isOrganization =
                      authorType.includes("organization") ||
                      authorType === "org";

                    return (
                      <article
                        className={[
                          "pd-message",
                          parentId ? "pd-message--reply" : "",
                          isOrganization
                            ? "pd-message--organization"
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        key={message.id}
                      >
                        <span className="pd-message-avatar">
                          {initials(author)}
                        </span>

                        <div className="pd-message-body">
                          <div className="pd-message-meta">
                            <strong>
                              {author}

                              {isOrganization && (
                                <em className="pd-org-author-badge">
                                  Organization
                                </em>
                              )}

                              {!isOrganization && message.role && (
                                <em> · {message.role}</em>
                              )}
                            </strong>

                            <span>
                              {formatDate(message.created_at, true)}
                            </span>
                          </div>

                          {parentId && (
                            <span className="pd-reply-label">
                              <Icon name="chat" size={12} />
                              Reply
                            </span>
                          )}

                          <p>{message.message}</p>

                          <button
                            type="button"
                            className="pd-inline-reply"
                            onClick={() => {
                              setReplyTo({
                                id: message.id,
                                author,
                              });
                              setDiscussionError("");
                              setDiscussionNotice("");

                              document
                                .getElementById("pd-discussion-composer")
                                ?.scrollIntoView({
                                  behavior: "smooth",
                                  block: "center",
                                });
                            }}
                          >
                            Reply
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="pd-community-empty">
                  <ChatArt />
                  <p>
                    No discussion messages have been posted yet.
                    Start the conversation with a helpful update.
                  </p>
                </div>
              )}

              {/* Organization reply composer */}
              <form
                id="pd-discussion-composer"
                className="pd-discussion-composer"
                onSubmit={handleSendDiscussion}
              >
                <div className="pd-composer-heading">
                  <div>
                    <strong>Write a message</strong>
                    <p>
                      Your response will be visible in the problem discussion.
                    </p>
                  </div>
                </div>

                {replyTo && (
                  <div className="pd-replying-to">
                    <span>
                      Replying to <strong>{replyTo.author}</strong>
                    </span>

                    <button
                      type="button"
                      onClick={() => setReplyTo(null)}
                      aria-label="Cancel reply"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                <textarea
                  className="pd-discussion-input"
                  value={discussionText}
                  onChange={(event) => {
                    setDiscussionText(event.target.value);

                    if (discussionError) {
                      setDiscussionError("");
                    }
                  }}
                  placeholder={
                    replyTo
                      ? `Reply to ${replyTo.author}...`
                      : "Write an update or respond to a citizen's comment..."
                  }
                  rows={3}
                  maxLength={2000}
                  required
                  disabled={sendingDiscussion}
                  aria-label="Discussion message"
                />

                <div className="pd-composer-footer">
                  <span className="pd-character-count">
                    {discussionText.length}/2000
                  </span>

                  <button
                    type="submit"
                    className="pd-button pd-button--primary pd-send-message"
                    disabled={
                      sendingDiscussion || !discussionText.trim()
                    }
                  >
                    {sendingDiscussion
                      ? "Posting..."
                      : replyTo
                        ? "Post reply"
                        : "Post message"}
                  </button>
                </div>

                {discussionError && (
                  <p className="pd-discussion-feedback is-error" role="alert">
                    {discussionError}
                  </p>
                )}

                {discussionNotice && (
                  <p
                    className="pd-discussion-feedback is-success"
                    role="status"
                  >
                    {discussionNotice}
                  </p>
                )}
              </form>

              <button
                type="button"
                className="pd-discussion-link"
                onClick={() => navigate(AVAILABLE_ROUTE)}
              >
                <Icon name="chat" />

                <span>
                  {discussion.length
                    ? `Discussion · ${commentCount} messages`
                    : "Discussion · No messages yet"}
                </span>

                <span className="pd-discussion-view">
                  Back to problems →
                </span>
              </button>
            </section>
          </div>

          {/* ===== Sidebar ===== */}
          <aside className="pd-side">
            <section className="pd-card pd-animate pd-delay-2">
              <div className="pd-card-heading">
                <span className="pd-heading-icon pd-heading-icon--teal">
                  <Icon name="clock" size={16} />
                </span>
                <div>
                  <h3>Report Lifecycle</h3>
                  <p>Recorded workflow history</p>
                </div>
              </div>

              {lifecycle.length > 0 ? (
                <ol className="pd-timeline">
                  {lifecycle.map((event, index) => {
                    const lastDone =
                      event.state === "done" &&
                      lifecycle[index + 1]?.state !== "done";

                    return (
                      <li
                        className={`pd-step is-${event.state} ${lastDone ? "is-current" : ""} ${index === lifecycle.length - 1 ? "is-last" : ""
                          }`}
                        key={`${event.event || event.label}-${event.at}-${index}`}
                        style={{ "--pd-i": index }}
                      >
                        <span className="pd-step-dot">
                          {event.state === "done" ? "✓" : ""}
                        </span>
                        <div className="pd-step-copy">
                          <strong>{event.label}</strong>
                          <small>
                            {event.state === "pending"
                              ? "Pending"
                              : formatDate(event.at, true)}
                          </small>
                          {event.solution_status && (
                            <span>{LABEL(event.solution_status)}</span>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <EmptyState
                  art={<CameraArt />}
                  title="No lifecycle events"
                  text="Recorded events will appear here."
                />
              )}
            </section>

            <section className="pd-card pd-followup pd-animate pd-delay-3" id="pd-followup">
              <div className="pd-card-heading">
                <span
                  className={`pd-heading-icon pd-heading-icon--amber ${followUp.required ? "is-ringing" : ""
                    }`}
                >
                  <Icon name={followUp.required ? "hourglass" : "bell"} size={16} />
                </span>
                <div>
                  <h3>Required Follow-up</h3>
                  <p>Next recommended step</p>
                </div>
              </div>

              <span
                className={`pd-followup-badge ${followUp.required ? "is-required" : "is-clear"
                  }`}
              >
                {followUp.required ? "Action required" : "No immediate action"}
              </span>

              <p>{followUp.message || "Review the latest problem records."}</p>

              {followUp.action === "await_review" && (
                <div className="pd-followup-note">
                  Your submitted solution is waiting for the review process.
                </div>
              )}

              {canAct && (
                <Link
                  to={acceptRoute(selectedId)}
                  className="pd-text-action pd-text-action--accept"
                >
                  Accept this assignment <span>→</span>
                </Link>
              )}

              <button
                className="pd-text-action"
                onClick={() => scrollToSection("pd-work-record")}
              >
                View work record <span>→</span>
              </button>
            </section>

            <section className="pd-card pd-quick pd-animate pd-delay-3">
              <div className="pd-card-heading">
                <div>
                  <h3>Quick Actions</h3>
                  <p>Shortcuts for this record</p>
                </div>
              </div>

              {canAct && (
                <Link
                  to={acceptRoute(selectedId)}
                  className="pd-quick-action pd-quick-action--accept"
                >
                  <span>
                    <Icon name="check" />
                  </span>
                  Accept this assignment
                </Link>
              )}

              <button
                className="pd-quick-action pd-quick-action--primary"
                onClick={() => scrollToSection("pd-work-record")}
              >
                <span>
                  <Icon name="check" />
                </span>
                Review work record
              </button>

              <button
                className="pd-quick-action"
                onClick={() => scrollToSection("pd-community")}
              >
                <span>
                  <Icon name="chat" />
                </span>
                View community discussion
              </button>

              <button
                className="pd-quick-action"
                onClick={handleExport}
                disabled={exporting}
              >
                <span>
                  <Icon name="download" />
                </span>
                {exporting ? "Preparing report…" : "Export problem report"}
              </button>

              <button
                className="pd-quick-action"
                onClick={() =>
                  scrollToSection(latestSolution ? "pd-work-record" : "pd-original-report")
                }
              >
                <span>
                  <Icon name="eye" />
                </span>
                View resolution evidence
              </button>
            </section>
          </aside>
        </div>

        <footer className="pd-footer">
          <span>CivicSolve · Building safer, more connected communities</span>
          <span>Problem reference: {problem.problem_code}</span>
        </footer>
      </div>

      {/* ===== Lightbox ===== */}
      {activeImage && (
        <div
          className="pd-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Evidence image preview"
          onClick={() => setActiveImage(null)}
        >
          <button
            className="pd-lightbox-close"
            onClick={() => setActiveImage(null)}
            aria-label="Close image preview"
          >
            ×
          </button>
          {activeImage.url && (
            <img
              src={activeImage.url}
              alt={activeImage.caption || activeImage.evidenceType}
              onClick={(event) => event.stopPropagation()}
            />
          )}
          <div className="pd-lightbox-caption">
            <strong>{activeImage.caption || activeImage.evidenceType}</strong>
            <span>{activeImage.evidenceType}</span>
          </div>
        </div>
      )}
    </main>
  );
}