import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getCitizenNotifications,
  getCitizenUnreadNotificationCount,
  markCitizenNotificationRead,
  markAllCitizenNotificationsRead,
  deleteCitizenNotification,
} from "../../services/api";
import "../../styles/user/CitizenNotifications.css";

const TYPE_META = {
  problem: { icon: "📍", label: "Problem" },
  assignment: { icon: "🧭", label: "Assignment" },
  solution: { icon: "🛠️", label: "Solution" },
  complaint: { icon: "⚑", label: "Complaint" },
  organization: { icon: "🏢", label: "Organization" },
  user: { icon: "👤", label: "Account" },
  status: { icon: "🔔", label: "Status update" },
  system: { icon: "✦", label: "System" },
};

const SKELETON_ROWS = [0, 1, 2, 3];

/* =========================================================
   HELPERS
   ========================================================= */

function extractNotifications(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.results)) return response.results;
  return [];
}

function typeKey(item) {
  return TYPE_META[item.notification_type] ? item.notification_type : "system";
}

/* "16 Oct 2026, 04:14 pm" */
function formatFull(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const day = date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const time = date
    .toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
    .toLowerCase();

  return `${day}, ${time}`;
}

function getSender(item) {
  return (
    item.sender_name ||
    item.from_name ||
    item.created_by_name ||
    item.source ||
    "System"
  );
}

/* numbers count up smoothly when they change */
function CountUp({ value }) {
  const [shown, setShown] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    const target = Number(value) || 0;
    const reduce =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduce) {
      fromRef.current = target;
      setShown(target);
      return undefined;
    }

    const from = fromRef.current;
    const duration = 700;
    const startTime = performance.now();
    let frame;

    const tick = (now) => {
      const p = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const next = Math.round(from + (target - from) * eased);

      fromRef.current = next;
      setShown(next);

      if (p < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, [value]);

  return <>{shown}</>;
}


/* =========================================================
   ILLUSTRATIONS
   ========================================================= */

/* hero backdrop: signal rings broadcasting from the right */
const SignalArt = () => (
  <svg className="cn-signal" viewBox="0 0 420 180" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <g fill="none" stroke="#7ff5e4">
      <circle cx="330" cy="100" r="46" strokeOpacity="0.1" />
      <circle cx="330" cy="100" r="96" strokeOpacity="0.07" />
      <circle cx="330" cy="100" r="150" strokeOpacity="0.05" />
      <circle className="cn-sig-ring" cx="330" cy="100" r="60" strokeOpacity="0.5" strokeWidth="1.4" />
      <circle className="cn-sig-ring cn-sig-2" cx="330" cy="100" r="60" strokeOpacity="0.5" strokeWidth="1.4" />
      <circle className="cn-sig-ring cn-sig-3" cx="330" cy="100" r="60" strokeOpacity="0.5" strokeWidth="1.4" />
    </g>
    <circle className="cn-twinkle" cx="250" cy="30" r="2" fill="#fff" />
    <circle className="cn-twinkle cn-d2" cx="392" cy="40" r="1.6" fill="#7ff5e4" />
    <circle className="cn-twinkle cn-d3" cx="300" cy="160" r="1.8" fill="#fff" />
  </svg>
);

/* hero: a report pin sends a paper plane to a new message */
const FlightArt = () => (
  <svg className="cn-flight-art" viewBox="0 0 320 130" aria-hidden="true">
    <defs>
      <linearGradient id="cnPin" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#ffb08a" />
        <stop offset="1" stopColor="#ff6f61" />
      </linearGradient>
      <linearGradient id="cnEnv" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#ffffff" stopOpacity="0.26" />
        <stop offset="1" stopColor="#ffffff" stopOpacity="0.07" />
      </linearGradient>
    </defs>

    <circle className="cn-twinkle" cx="20" cy="20" r="1.6" fill="#fff" />
    <circle className="cn-twinkle cn-d2" cx="300" cy="18" r="1.5" fill="#7ff5e4" />
    <circle className="cn-twinkle cn-d3" cx="160" cy="12" r="1.3" fill="#fff" />

    <g className="cn-cloud">
      <rect x="96" y="100" width="76" height="16" rx="8" fill="rgba(255,255,255,0.1)" />
      <circle cx="116" cy="100" r="10" fill="rgba(255,255,255,0.1)" />
      <circle cx="140" cy="96" r="13" fill="rgba(255,255,255,0.1)" />
    </g>

    {/* problem pin */}
    <ellipse className="cn-wave-ring" cx="36" cy="98" rx="16" ry="4.5" fill="none" stroke="#ffb08a" strokeWidth="1.3" />
    <ellipse className="cn-wave-ring cn-wave-ring-2" cx="36" cy="98" rx="16" ry="4.5" fill="none" stroke="#ffb08a" strokeWidth="1.3" />
    <g className="cn-pin">
      <path d="M36 54 a13 13 0 0 1 13 13 c0 10 -13 26 -13 26 s-13 -16 -13 -26 a13 13 0 0 1 13 -13z" fill="url(#cnPin)" />
      <circle cx="36" cy="67" r="5" fill="#ffffff" />
    </g>

    {/* flight path */}
    <path className="cn-trail" d="M46 86 C 100 30, 170 20, 222 62" fill="none" stroke="#7ff5e4" strokeWidth="1.6" strokeLinecap="round" strokeDasharray="1 7" />

    {/* message */}
    <g className="cn-env">
      <rect x="216" y="50" width="86" height="58" rx="11" fill="url(#cnEnv)" stroke="rgba(255,255,255,0.38)" />
      <path d="M220 58 L259 84 L298 58" fill="none" stroke="#7ff5e4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="228" y="92" width="34" height="4" rx="2" fill="rgba(255,255,255,0.55)" />
      <circle className="cn-badge-dot" cx="300" cy="52" r="7" fill="#ff8a5c" />
    </g>

    {/* rising pips */}
    <circle className="cn-pip" cx="236" cy="46" r="2.4" fill="#7ff5e4" />
    <circle className="cn-pip cn-pip-2" cx="262" cy="42" r="2" fill="#ffd447" />
    <circle className="cn-pip cn-pip-3" cx="284" cy="46" r="2.2" fill="#b9a7ff" />

    {/* paper plane */}
    <g className="cn-plane">
      <path d="M-11 -6 L13 0 L-11 6 L-7 0z" fill="#ffffff" />
      <path d="M-7 0 L-11 6 L2 1.5z" fill="#bfeee7" />
    </g>
  </svg>
);

/* hero title icon: a glass tile with a ringing bell and a pulsing badge */
const HeroBell = ({ active }) => (
  <span className="cn-hero-bell" aria-hidden="true">
    <svg viewBox="0 0 48 48">
      <defs>
        <linearGradient id="cnHeroBell" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7ff5e4" />
          <stop offset="1" stopColor="#12b5a0" />
        </linearGradient>
      </defs>
      <circle className="cn-wave-ring" cx="24" cy="26" r="14" fill="none" stroke="#7ff5e4" strokeWidth="1.2" />
      <g className="cn-bell-swing">
        <rect x="22.5" y="6" width="3" height="5" rx="1.5" fill="#7ff5e4" />
        <path d="M24 10 a12 12 0 0 1 12 12 c0 10 4 13 4 13 H8 s4-3 4-13 a12 12 0 0 1 12-12z" fill="url(#cnHeroBell)" />
        <circle cx="24" cy="39.5" r="3.5" fill="#7ff5e4" />
      </g>
    </svg>
    {active && <i className="cn-hero-bell-dot" />}
  </span>
);

/* heading icon: envelope with typing dots */
const ListIcon = () => (
  <span className="cn-title-icon" aria-hidden="true">
    <svg viewBox="0 0 40 40">
      <rect x="5" y="9" width="26" height="19" rx="5" fill="#ffffff" fillOpacity="0.95" />
      <path d="M9 14l9 6 9-6" fill="none" stroke="#0b9f94" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle className="cn-ti-dot" cx="31" cy="11" r="6" fill="#ff8a5c" />
      <circle className="cn-typing cn-typing-1" cx="13" cy="33" r="2" fill="#7ff5e4" />
      <circle className="cn-typing cn-typing-2" cx="20" cy="33" r="2" fill="#7ff5e4" />
      <circle className="cn-typing cn-typing-3" cx="27" cy="33" r="2" fill="#7ff5e4" />
    </svg>
  </span>
);

/* admin-alert card: a bell with radiating rings */
const AlertArt = () => (
  <svg className="cn-alert-art" viewBox="0 0 110 90" aria-hidden="true">
    <defs>
      <linearGradient id="cnAlertBell" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#7ff5e4" />
        <stop offset="1" stopColor="#12b5a0" />
      </linearGradient>
    </defs>
    <circle className="cn-wave-ring" cx="55" cy="46" r="22" fill="none" stroke="#7ff5e4" strokeWidth="1.4" />
    <circle className="cn-wave-ring cn-wave-ring-2" cx="55" cy="46" r="22" fill="none" stroke="#7ff5e4" strokeWidth="1.4" />
    <g className="cn-bell-swing">
      <rect x="53" y="18" width="4" height="7" rx="2" fill="#7ff5e4" />
      <path d="M55 24 a15 15 0 0 1 15 15 c0 13 6 17 6 17 H34 s6-4 6-17 a15 15 0 0 1 15-15z" fill="url(#cnAlertBell)" />
      <circle cx="55" cy="60" r="4.5" fill="#7ff5e4" />
    </g>
    <circle className="cn-twinkle" cx="16" cy="22" r="1.8" fill="#fff" />
    <circle className="cn-twinkle cn-d2" cx="96" cy="64" r="1.8" fill="#7ff5e4" />
    <circle className="cn-twinkle cn-d3" cx="20" cy="70" r="1.5" fill="#fff" />
  </svg>
);

/* audit-trail card: a shield with a check mark */
const ShieldArt = () => (
  <svg className="cn-shield-art" viewBox="0 0 90 90" aria-hidden="true">
    <defs>
      <linearGradient id="cnShield" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#9a8cf5" />
        <stop offset="1" stopColor="#5b4fd8" />
      </linearGradient>
    </defs>
    <ellipse cx="45" cy="82" rx="22" ry="3.5" fill="rgba(12,38,56,0.08)" />
    <circle className="cn-wave-ring cn-shield-ring" cx="45" cy="42" r="24" fill="none" stroke="#9a8cf5" strokeWidth="1.4" />
    <g className="cn-shield">
      <path d="M45 12 L70 22 V42 C70 58 58 68 45 74 C32 68 20 58 20 42 V22z" fill="url(#cnShield)" />
      <path d="M33 43l8 8 16-17" fill="none" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
    </g>
    <circle className="cn-twinkle" cx="12" cy="24" r="1.8" fill="#9a8cf5" />
    <circle className="cn-twinkle cn-d2" cx="78" cy="14" r="1.6" fill="#ffd447" />
  </svg>
);

/* sparkles */
const SparkArt = () => (
  <svg className="cn-spark-art" viewBox="0 0 90 60" aria-hidden="true">
    <path className="cn-spark cn-spark-1" d="M30 8l4 12 12 4-12 4-4 12-4-12-12-4 12-4z" fill="#7ff5e4" />
    <path className="cn-spark cn-spark-2" d="M64 26l2.6 7.4 7.4 2.6-7.4 2.6L64 46l-2.6-7.4L54 36l7.4-2.6z" fill="#b9a7ff" />
    <path className="cn-spark cn-spark-3" d="M70 6l1.6 4.4 4.4 1.6-4.4 1.6L70 18l-1.6-4.4L64 12l4.4-1.6z" fill="#ffd447" />
  </svg>
);

/* confetti when everything is read */
const CONFETTI = [
  { x: "8%", c: "#ffd447", d: "0s" },
  { x: "22%", c: "#ff8fb1", d: "0.5s" },
  { x: "36%", c: "#7ff5e4", d: "1s" },
  { x: "50%", c: "#8fb4ff", d: "0.3s" },
  { x: "64%", c: "#b9a7ff", d: "0.8s" },
  { x: "78%", c: "#ffd447", d: "1.3s" },
  { x: "90%", c: "#ff8fb1", d: "0.2s" },
];

const ConfettiArt = () => (
  <div className="cn-confetti" aria-hidden="true">
    {CONFETTI.map((piece, index) => (
      <span
        key={index}
        style={{ left: piece.x, background: piece.c, animationDelay: piece.d }}
      />
    ))}
  </div>
);

/* empty state: an inbox with a check mark */
const InboxArt = ({ caughtUp }) => (
  <svg className="cn-empty-art" viewBox="0 0 150 120" aria-hidden="true">
    <ellipse cx="75" cy="110" rx="40" ry="4" fill="rgba(12,38,56,0.08)" />
    <path d="M24 62 L40 28 H110 L126 62 V96 a8 8 0 0 1-8 8 H32 a8 8 0 0 1-8-8z" fill="#e6f7f3" stroke="#bfe3dc" />
    <path d="M24 62 H58 a8 8 0 0 1 8 8 a9 9 0 0 0 18 0 a8 8 0 0 1 8-8 H126" fill="#cfeee8" stroke="#bfe3dc" />
    <g className="cn-empty-pop">
      <circle cx="75" cy="30" r="15" fill={caughtUp ? "#12b5a0" : "#8fb4ff"} />
      {caughtUp ? (
        <path d="M67 30.5l5.5 5.5 10-10.5" fill="none" stroke="#ffffff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="M75 22 a7 7 0 0 1 7 7 c0 7 3 9 3 9 H65 s3-2 3-9 a7 7 0 0 1 7-7z" fill="#ffffff" />
      )}
    </g>
    <circle className="cn-twinkle" cx="22" cy="30" r="2.4" fill="#7ff5e4" />
    <circle className="cn-twinkle cn-d2" cx="128" cy="24" r="2" fill="#12b5a0" />
    <circle className="cn-twinkle cn-d3" cx="132" cy="70" r="1.8" fill="#ffc15a" />
  </svg>
);


/* =========================================================
   PAGE
   ========================================================= */

export default function Notifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [leavingId, setLeavingId] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [listResponse, countResponse] = await Promise.all([
        getCitizenNotifications(50),
        getCitizenUnreadNotificationCount(),
      ]);

      setNotifications(extractNotifications(listResponse));
      setUnreadCount(
        Number(
          countResponse?.unread_count ??
          countResponse?.count ??
          0
        )
      );
    } catch (err) {
      setError(err.message || "Unable to load notifications.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const readCount = Math.max(0, notifications.length - unreadCount);

  const visibleNotifications = useMemo(() => {
    const query = search.trim().toLowerCase();

    return notifications.filter((item) => {
      if (filter === "unread" && item.is_read) return false;
      if (filter === "read" && !item.is_read) return false;
      if (typeFilter && typeKey(item) !== typeFilter) return false;

      if (!query) return true;

      return [item.title, item.message, TYPE_META[typeKey(item)].label, getSender(item)]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [notifications, filter, typeFilter, search]);

  const typeBreakdown = useMemo(() => {
    const counts = {};

    notifications.forEach((item) => {
      const key = typeKey(item);
      counts[key] = (counts[key] || 0) + 1;
    });

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([key, count]) => ({ key, count, ...TYPE_META[key] }));
  }, [notifications]);

  const weekActivity = useMemo(() => {
    const days = [];

    for (let offset = 6; offset >= 0; offset -= 1) {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - offset);

      days.push({
        key: date.getTime(),
        label: date.toLocaleDateString(undefined, { weekday: "short" }).slice(0, 3),
        isToday: offset === 0,
        count: 0,
      });
    }

    notifications.forEach((item) => {
      const created = new Date(item.created_at);
      if (Number.isNaN(created.getTime())) return;

      created.setHours(0, 0, 0, 0);

      const match = days.find((day) => day.key === created.getTime());
      if (match) match.count += 1;
    });

    const max = Math.max(1, ...days.map((day) => day.count));

    return days.map((day) => ({
      ...day,
      height: day.count === 0 ? 6 : 14 + Math.round((day.count / max) * 86),
    }));
  }, [notifications]);

  const handleMarkRead = async (item) => {
    if (item.is_read) return;

    setBusyId(item.id);
    setNotice("");
    setError("");

    try {
      await markCitizenNotificationRead(item.id);
      setNotifications((current) =>
        current.map((notification) =>
          notification.id === item.id
            ? { ...notification, is_read: true }
            : notification
        )
      );
      setUnreadCount((count) => Math.max(0, count - 1));
    } catch (err) {
      setError(err.message || "Could not mark the notification as read.");
    } finally {
      setBusyId(null);
    }
  };

  const handleMarkAllRead = async () => {
    if (unreadCount === 0) return;

    setMarkingAll(true);
    setNotice("");
    setError("");

    try {
      await markAllCitizenNotificationsRead();
      setNotifications((current) =>
        current.map((item) => ({ ...item, is_read: true }))
      );
      setUnreadCount(0);
      setNotice("All notifications marked as read.");
    } catch (err) {
      setError(err.message || "Could not update notifications.");
    } finally {
      setMarkingAll(false);
    }
  };

  const handleDelete = async (id) => {
    setBusyId(id);
    setNotice("");
    setError("");

    const existing = notifications.find((item) => item.id === id);

    try {
      await deleteCitizenNotification(id);

      // let the row slide out before it leaves the list
      setLeavingId(id);

      window.setTimeout(() => {
        setNotifications((current) =>
          current.filter((item) => item.id !== id)
        );
        setLeavingId(null);
      }, 320);

      if (existing && !existing.is_read) {
        setUnreadCount((count) => Math.max(0, count - 1));
      }

      setNotice("Notification deleted.");
    } catch (err) {
      setError(err.message || "Could not delete the notification.");
    } finally {
      setBusyId(null);
    }
  };

  const handleOpen = async (item) => {
    if (!item.is_read) {
      await handleMarkRead(item);
    }

    const target = item.target_url || "";

    if (target.startsWith("/user/")) {
      navigate(target);
    } else if (
      target === "/citizen/problems" ||
      target === "/citizen/my-problems"
    ) {
      navigate("/user/my-problems");
    } else if (target.startsWith("/user")) {
      navigate(target);
    } else {
      navigate("/user/my-problems");
    }
  };

  const clearFilters = () => {
    setFilter("all");
    setTypeFilter("");
    setSearch("");
  };

  const tabs = [
    { value: "all", label: "All notifications", count: notifications.length },
    { value: "unread", label: "Unread", count: unreadCount },
    { value: "read", label: "Read", count: readCount },
  ];

  const hasFilters = Boolean(filter !== "all" || typeFilter || search.trim());
  const caughtUp = !loading && notifications.length > 0 && unreadCount === 0;

  return (
    <main className="cn-page">

      {/* =====================  HERO / HEADER  ===================== */}
      <section className="cn-hero">

        <div className="cn-hero-bg" aria-hidden="true">
          <span className="cn-blob cn-blob-1" />
          <span className="cn-blob cn-blob-2" />
          <SignalArt />
          <span className="cn-mote cn-mote-1" />
          <span className="cn-mote cn-mote-2" />
          <span className="cn-mote cn-mote-3" />
          <span className="cn-mote cn-mote-4" />
          <span className="cn-mote cn-mote-5" />
          <svg className="cn-wave" viewBox="0 0 1440 60" preserveAspectRatio="none">
            <path d="M0 42 C240 4 480 62 720 32 C960 2 1200 52 1440 20 L1440 60 L0 60Z" fill="#f1faf8" />
          </svg>
        </div>

        <div className="cn-hero-inner">
          <div className="cn-hero-content">
            <div className="cn-eyebrow-row">
              <span className="cn-crumbs">Community workspace / <b>Notifications</b></span>
              <span className="cn-live-chip">
                <i /> {loading ? "…" : unreadCount} unread
              </span>
            </div>

            <div className="cn-title-row">
              <HeroBell active={!loading && unreadCount > 0} />
              <h1>Notifications</h1>
            </div>

            <p>Stay informed about your reports and community progress.</p>
          </div>

          <div className="cn-hero-art">
            <FlightArt />
          </div>
        </div>
      </section>

      <div className="cn-content">

        {/* =====================  TABS  ===================== */}
        <nav className="cn-tabs" role="tablist" aria-label="Notification filter">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={filter === tab.value}
              className={`cn-tab ${filter === tab.value ? "active" : ""}`}
              onClick={() => setFilter(tab.value)}
            >
              <span className="cn-tab-dot" />
              {tab.label} · {loading ? "…" : <CountUp value={tab.count} />}
            </button>
          ))}
        </nav>

        <div className="cn-layout">

          {/* =====================  HISTORY CARD  ===================== */}
          <section className="cn-card cn-history" style={{ "--d": "0.12s" }}>
            <div className="cn-history-orb" aria-hidden="true" />

            <div className="cn-history-head">
              <div className="cn-history-title">
                <ListIcon />
                <div>
                  <h2>Notification history</h2>
                  <p>
                    {loading
                      ? "Checking for new activity…"
                      : `${visibleNotifications.length} ${visibleNotifications.length === 1 ? "record" : "records"} found`}
                  </p>
                </div>
              </div>

              <div className="cn-history-actions">
                <button
                  type="button"
                  className="cn-refresh"
                  onClick={loadNotifications}
                  disabled={loading}
                >
                  <span className={`cn-refresh-icon ${loading ? "spin" : ""}`} aria-hidden="true">↻</span>
                  Refresh
                </button>

                <button
                  type="button"
                  className="cn-mark-all"
                  onClick={handleMarkAllRead}
                  disabled={markingAll || unreadCount === 0}
                >
                  {markingAll ? "Updating..." : "✓ Mark all as read"}
                </button>
              </div>
            </div>

            <label className="cn-search">
              <span aria-hidden="true">⌕</span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search notifications..."
                aria-label="Search notifications"
              />
            </label>

            {error && (
              <div className="cn-alert cn-alert-error" role="alert">
                {error}
                <button type="button" onClick={() => setError("")} aria-label="Dismiss error">
                  ×
                </button>
              </div>
            )}

            {notice && (
              <div className="cn-alert cn-alert-success" role="status">
                ✓ {notice}
                <button type="button" onClick={() => setNotice("")} aria-label="Dismiss message">
                  ×
                </button>
              </div>
            )}

            <div className="cn-list" aria-busy={loading}>
              {loading ? (
                SKELETON_ROWS.map((i) => (
                  <div className="cn-row cn-skel-row" key={i} style={{ "--i": i }}>
                    <span className="cn-skel-icon" />
                    <div className="cn-skel-body">
                      <span className="cn-skel w40 tall" />
                      <span className="cn-skel w80" />
                      <span className="cn-skel w50" />
                    </div>
                  </div>
                ))
              ) : visibleNotifications.length === 0 ? (
                <div className="cn-state">
                  <InboxArt caughtUp={notifications.length > 0 || hasFilters} />
                  <strong>
                    {notifications.length === 0
                      ? "No notifications yet"
                      : filter === "unread" && !search && !typeFilter
                        ? "You're all caught up"
                        : "No notifications match"}
                  </strong>
                  <p>
                    {notifications.length === 0
                      ? "Updates about your reports and community activity will appear here."
                      : filter === "unread" && !search && !typeFilter
                        ? "There are no unread updates right now."
                        : "Try another search term or clear the filters."}
                  </p>
                  {hasFilters && (
                    <button type="button" onClick={clearFilters}>
                      Clear filters
                    </button>
                  )}
                </div>
              ) : (
                visibleNotifications.map((item, index) => {
                  const key = typeKey(item);
                  const meta = TYPE_META[key];

                  return (
                    <article
                      className={`cn-row ${item.is_read ? "is-read" : "is-unread"} ${leavingId === item.id ? "is-leaving" : ""}`}
                      key={item.id}
                      style={{ "--i": index }}
                    >
                      <div className={`cn-row-icon type-${key}`}>
                        <span>{meta.icon}</span>
                      </div>

                      <button
                        type="button"
                        className="cn-row-content"
                        onClick={() => handleOpen(item)}
                        disabled={busyId === item.id}
                      >
                        <h3>
                          {item.title}
                          {!item.is_read && <i className="cn-unread-dot" />}
                        </h3>

                        <p>{item.message}</p>

                        <div className="cn-row-meta">
                          <span className={`cn-type-chip type-${key}`}>{meta.label}</span>
                          <span>From: {getSender(item)}</span>
                          <time dateTime={item.created_at || undefined}>
                            {formatFull(item.created_at)}
                          </time>
                          <span className="cn-open-link">
                            View details <b aria-hidden="true">→</b>
                          </span>
                        </div>
                      </button>

                      <div className="cn-row-actions">
                        {!item.is_read && (
                          <button
                            type="button"
                            className="cn-read-btn"
                            onClick={() => handleMarkRead(item)}
                            disabled={busyId === item.id}
                            aria-label={`Mark ${item.title} as read`}
                          >
                            Mark read
                          </button>
                        )}
                        <button
                          type="button"
                          className="cn-delete"
                          onClick={() => handleDelete(item.id)}
                          disabled={busyId === item.id}
                          aria-label={`Delete ${item.title}`}
                        >
                          Delete
                        </button>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </section>

          {/* =====================  SIDEBAR  ===================== */}
          <aside className="cn-side">

            <article className="cn-card cn-side-card" style={{ "--d": "0.18s" }}>
              <h2>Notification types</h2>

              {typeBreakdown.length === 0 ? (
                <p className="cn-muted">Types will appear once you have updates.</p>
              ) : (
                <ul className="cn-types">
                  {typeBreakdown.map((row, index) => (
                    <li key={row.key} style={{ "--i": index }}>
                      <button
                        type="button"
                        className={`cn-type-row ${typeFilter === row.key ? "active" : ""}`}
                        onClick={() =>
                          setTypeFilter((current) => (current === row.key ? "" : row.key))
                        }
                        aria-pressed={typeFilter === row.key}
                      >
                        <span className={`cn-type-icon type-${row.key}`}>{row.icon}</span>
                        <span className="cn-type-name">{row.label}</span>
                        <b>{row.count}</b>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </article>

            <article className="cn-alerts-card" style={{ "--d": "0.24s" }}>
              <AlertArt />
              <div className="cn-alerts-head">
                <h2>Administrator alerts</h2>
                <span className="cn-alerts-count">{loading ? "…" : unreadCount}</span>
              </div>
              <p>
                {unreadCount === 0
                  ? "You're all caught up. No unread alerts."
                  : `${unreadCount} unread ${unreadCount === 1 ? "alert is" : "alerts are"} waiting for you.`}
              </p>
              <SparkArt />
            </article>

            <article className="cn-audit-card" style={{ "--d": "0.3s" }}>
              <ShieldArt />
              <h3><i /> Audit trail active</h3>
              <p>Changes you make here are saved to CivicSolve.</p>
            </article>

            <article className="cn-card cn-side-card cn-activity-card" style={{ "--d": "0.36s" }}>
              {caughtUp && <ConfettiArt />}
              <h2>This week</h2>

              <div className="cn-activity" role="img" aria-label="Notifications received over the last 7 days">
                {weekActivity.map((day, index) => (
                  <div className="cn-activity-col" key={day.key} style={{ "--i": index }}>
                    <span className="cn-activity-count">{day.count}</span>
                    <span
                      className={`cn-activity-bar ${day.isToday ? "is-today" : ""}`}
                      style={{ "--h": `${day.height}%` }}
                    />
                    <small>{day.label}</small>
                  </div>
                ))}
              </div>
            </article>
          </aside>
        </div>
      </div>
    </main>
  );
}