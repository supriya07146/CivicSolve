import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  getCitizenDashboardSummary,
  getCitizenRecentProblems,
  getCitizenNotifications,
  getCitizenUnreadNotificationCount,
  markCitizenNotificationRead,
  markAllCitizenNotificationsRead,
} from "../../services/api";

import "../../styles/user/UserDashboard.css";

import "../../styles/user/UserDashboard.css";
import { HeroScene, HeroFlora } from "../../components/HeroScene";


/* =========================================================
   HELPERS
   ========================================================= */

const EMPTY_SUMMARY = {
  total_reports: 0,
  pending_reports: 0,
  in_progress_reports: 0,
  resolved_reports: 0,
  open_reports: 0,
  under_review_reports: 0,
  assigned_reports: 0,
  rejected_reports: 0,
  closed_reports: 0,
};

function formatStatus(status = "") {
  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getStatusClass(status = "") {
  switch (status.toLowerCase()) {
    case "resolved":
    case "closed":
      return "cd-status-resolved";

    case "assigned":
    case "in_progress":
      return "cd-status-progress";

    default:
      return "cd-status-review";
  }
}

function getProgressClass(status = "") {
  switch (status.toLowerCase()) {
    case "resolved":
    case "closed":
      return "cd-progress-resolved";

    case "assigned":
    case "in_progress":
      return "cd-progress-progress";

    default:
      return "cd-progress-review";
  }
}

function formatDate(value) {
  if (!value) return "Date unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getNotificationList(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.results)) return response.results;
  if (Array.isArray(response?.notifications)) return response.notifications;
  if (Array.isArray(response?.data)) return response.data;
  return [];
}

function getUnreadCount(response) {
  if (typeof response === "number") return response;
  return response?.unread_count ?? response?.count ?? response?.total ?? 0;
}

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}


/* Animated number: counts up from 0 whenever the target changes */
function CountUp({ value, loading }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (loading) return undefined;

    if (prefersReducedMotion()) {
      setDisplay(value);
      return undefined;
    }

    let frame;
    const start = performance.now();
    const duration = 900;

    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);

      setDisplay(Math.round(value * eased));

      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, [value, loading]);

  return <>{loading ? "—" : display}</>;
}


/* Small decorative map (illustration only) */
function MiniMap({ label }) {
  return (
    <div className="cd-map" aria-hidden="true">
      <span className="cd-map-park">Willow Park</span>
      <span className="cd-map-road cd-map-road-h" />
      <span className="cd-map-road cd-map-road-v" />
      <span className="cd-map-water" />
      <span className="cd-map-street">Maple Avenue</span>

      <span className="cd-map-pin">
        <i className="cd-map-ripple" />
        <svg viewBox="0 0 24 24" width="16" height="16">
          <path
            d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
          <circle cx="12" cy="10" r="2.6" fill="currentColor" />
        </svg>
      </span>

      <span className="cd-map-address">{label} · Illustrative map</span>
    </div>
  );
}


/* =========================================================
   PAGE
   ========================================================= */

function UserDashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  });

  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [problems, setProblems] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [notificationError, setNotificationError] = useState("");
  const [notificationActionError, setNotificationActionError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [barsIn, setBarsIn] = useState(false);

  const loadDashboard = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
      setBarsIn(false);
    } else {
      setLoading(true);
    }

    setError("");
    setNotificationError("");

    try {
      const [summaryResult, problemsResult] = await Promise.all([
        getCitizenDashboardSummary(),
        getCitizenRecentProblems(5),
      ]);

      setSummary({
        ...EMPTY_SUMMARY,
        ...(summaryResult || {}),
      });

      const problemList = Array.isArray(problemsResult)
        ? problemsResult
        : problemsResult?.results ??
        problemsResult?.data ??
        problemsResult?.problems ??
        [];

      setProblems(Array.isArray(problemList) ? problemList : []);
    } catch (requestError) {
      setError(
        requestError.message ||
        "Unable to load your dashboard. Please try again."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }

    // Notifications are independent of the dashboard statistics.
    try {
      const [notificationResult, unreadResult] = await Promise.all([
        getCitizenNotifications(5),
        getCitizenUnreadNotificationCount(),
      ]);

      setNotifications(getNotificationList(notificationResult));
      setUnreadCount(getUnreadCount(unreadResult));
    } catch (requestError) {
      setNotificationError(
        requestError.message || "Notifications are temporarily unavailable."
      );
    }
  }, []);

  useEffect(() => {
    try {
      setUser(JSON.parse(localStorage.getItem("user") || "{}"));
    } catch {
      setUser({});
    }

    loadDashboard();
  }, [loadDashboard]);

  // fill the progress bars a moment after the data arrives
  useEffect(() => {
    if (loading || refreshing) return undefined;

    const timer = setTimeout(() => setBarsIn(true), 250);
    return () => clearTimeout(timer);
  }, [loading, refreshing, problems]);

  const handleNotificationRead = async (notification) => {
    setNotificationActionError("");

    if (notification.is_read) {
      if (notification.target_url) navigate(notification.target_url);
      return;
    }

    try {
      await markCitizenNotificationRead(notification.id);

      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id ? { ...item, is_read: true } : item
        )
      );

      setUnreadCount((current) => Math.max(0, current - 1));

      if (notification.target_url) navigate(notification.target_url);
    } catch (requestError) {
      setNotificationActionError(
        requestError.message || "Could not mark notification as read."
      );
    }
  };

  const handleMarkAllRead = async () => {
    setNotificationActionError("");
    setActionLoading(true);

    try {
      await markAllCitizenNotificationsRead();

      setNotifications((current) =>
        current.map((item) => ({ ...item, is_read: true }))
      );

      setUnreadCount(0);
    } catch (requestError) {
      setNotificationActionError(
        requestError.message || "Could not update notifications."
      );
    } finally {
      setActionLoading(false);
    }
  };

  /* ---------- derived numbers ---------- */

  const totalReports = Number(summary.total_reports) || 0;
  const workInProgress =
    (Number(summary.in_progress_reports) || 0) +
    (Number(summary.assigned_reports) || 0);
  const awaitingConfirmation = Number(summary.resolved_reports) || 0;
  const closedReports = Number(summary.closed_reports) || 0;

  const thisMonth =
    summary.reports_this_month ?? summary.this_month_reports ?? null;

  const readyProblem = problems.find(
    (problem) => String(problem.status || "").toLowerCase() === "resolved"
  );

  const firstName =
    String(user.full_name || "").trim().split(" ")[0] || "there";

  let level = "New reporter";
  if (totalReports >= 10) level = "Neighborhood contributor";
  else if (totalReports >= 3) level = "Active reporter";

  const badges = [];
  if (totalReports >= 10) badges.push({ label: "Top Reporter", tone: "teal" });
  if (totalReports >= 3) badges.push({ label: "Active Member", tone: "gold" });
  if (closedReports >= 1) badges.push({ label: "Loop Closer", tone: "teal" });
  if (badges.length === 0) badges.push({ label: "Just getting started", tone: "teal" });

  const stats = [
    {
      key: "reports",
      label: "MY REPORTS",
      value: totalReports,
      note: thisMonth !== null ? `${thisMonth} this month` : "All your reports",
      tone: "teal",
    },
    {
      key: "progress",
      label: "WORK IN PROGRESS",
      value: workInProgress,
      note: "Updates from orgs",
      tone: "amber",
    },
    {
      key: "confirm",
      label: "AWAITING CONFIRMATION",
      value: awaitingConfirmation,
      note: "Help close the loop",
      tone: "highlight",
    },
    {
      key: "closed",
      label: "CLOSED REPORTS",
      value: closedReports,
      note: "Community-confirmed",
      tone: "violet",
    },
  ];

  return (
    <div className="cd-page">

      {/* ================= HERO ================= */}
      <section className="cd-hero">
        <div className="cd-hero-lines" aria-hidden="true" />
        <div className="cd-hero-orb" aria-hidden="true" />
        <div className="cd-hero-orb cd-hero-orb-2" aria-hidden="true" />

        <HeroFlora />

        <div className="cd-hero-inner">
          <HeroScene name={firstName} />

          <div className="cd-hero-text">
            <span className="cd-eyebrow">COMMUNITY WORKSPACE · CITIZEN</span>

            <h1>
              {getGreeting()}, {firstName}{" "}
              <span className="cd-sparkle" aria-hidden="true">✨</span>
            </h1>

            <p>
              Small actions. Real progress. Here's what's happening in your
              neighborhood.
            </p>
          </div>

          <Link to="/user/report" className="cd-hero-button">
            <span aria-hidden="true">+</span> Report a Problem
          </Link>
        </div>
      </section>

      {/* ================= ALERT BAR ================= */}
      <div className="cd-alert" role="status">
        <div className="cd-alert-inner">
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M8 12.5l3 3 5-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>

          {awaitingConfirmation > 0 ? (
            <p>
              A repair is ready for your review —{" "}
              {readyProblem
                ? `${readyProblem.problem_code ? String(readyProblem.problem_code).slice(0, 12) : "Report"} · ${readyProblem.title}`
                : `${awaitingConfirmation} report${awaitingConfirmation === 1 ? "" : "s"} awaiting confirmation`}
              .{" "}
              <Link to="/user/my-problems">
                View the evidence and confirm the outcome →
              </Link>
            </p>
          ) : (
            <p>
              Your voice matters. Track your reports and follow their progress
              right from this dashboard.
            </p>
          )}
        </div>
      </div>

      <div className="cd-content">

        {error && (
          <div className="cd-feedback cd-feedback-error" role="alert">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => loadDashboard(true)}
              disabled={refreshing}
            >
              Try again
            </button>
          </div>
        )}

        {/* ================= STATS ================= */}
        <section className="cd-stats" aria-label="Problem statistics">
          {stats.map((stat, index) => (
            <article
              key={stat.key}
              className={`cd-stat cd-stat-${stat.tone}`}
              style={{ "--i": index }}
            >
              <span className="cd-stat-label">{stat.label}</span>

              <strong className="cd-stat-value">
                <CountUp value={stat.value} loading={loading} />
              </strong>

              <span className="cd-stat-note">
                <i aria-hidden="true" />
                {stat.note}
              </span>
            </article>
          ))}
        </section>

        <div className="cd-grid">

          {/* ============ LEFT COLUMN ============ */}
          <div className="cd-main">

            <section className="cd-card cd-problems" style={{ "--i": 4 }}>

              <div className="cd-card-head">
                <div>
                  <h2>Your recent problems</h2>
                  <p>
                    {loading
                      ? "Loading your reports…"
                      : `${problems.length} recent report${problems.length === 1 ? "" : "s"} tracked`}
                  </p>
                </div>

                <div className="cd-head-actions">
                  <button
                    type="button"
                    className="cd-ghost-button"
                    onClick={() => loadDashboard(true)}
                    disabled={refreshing}
                  >
                    <span className={refreshing ? "cd-spin" : ""} aria-hidden="true">↻</span>{" "}
                    {refreshing ? "Refreshing" : "Refresh"}
                  </button>

                  <Link to="/user/my-problems" className="cd-ghost-button">
                    View all →
                  </Link>
                </div>
              </div>

              {loading ? (

                <div className="cd-skeleton-list" role="status" aria-label="Loading reports">
                  {[0, 1, 2].map((item) => (
                    <div key={item} className="cd-skeleton-row">
                      <span className="cd-skel cd-skel-wide" />
                      <span className="cd-skel" />
                      <span className="cd-skel" />
                      <span className="cd-skel" />
                    </div>
                  ))}
                </div>

              ) : problems.length === 0 ? (

                <div className="cd-empty">
                  <span className="cd-empty-icon" aria-hidden="true">◇</span>
                  <h3>No reports yet</h3>
                  <p>When you report a community problem, it will appear here.</p>

                  <Link to="/user/report" className="cd-solid-button">
                    Report your first problem
                  </Link>
                </div>

              ) : (

                <div className="cd-table-wrap">
                  <table className="cd-table">
                    <thead>
                      <tr>
                        <th>PROBLEM / LOCATION</th>
                        <th>STATUS</th>
                        <th>OWNERSHIP</th>
                        <th>PROGRESS</th>
                      </tr>
                    </thead>

                    <tbody>
                      {problems.map((problem, index) => {
                        const status = problem.status || "open";
                        const finished = ["resolved", "closed"].includes(status.toLowerCase());
                        const progress = Math.min(
                          100,
                          Math.max(0, Number(problem.progress) || 0)
                        );

                        return (
                          <tr
                            key={problem.id || problem.problem_code}
                            style={{ "--i": index }}
                          >
                            <td>
                              <strong>{problem.title || "Untitled problem"}</strong>
                              <small>
                                {problem.problem_code
                                  ? `${String(problem.problem_code).slice(0, 12)} · `
                                  : ""}
                                {problem.category_name || "Community report"}
                              </small>
                            </td>

                            <td>
                              <span className={`cd-status ${getStatusClass(status)}`}>
                                {formatStatus(status)}
                              </span>
                              {problem.priority && (
                                <small>{formatStatus(problem.priority)} priority</small>
                              )}
                            </td>

                            <td>
                              <strong className="cd-owner">
                                {problem.ownership?.organization || "Not yet assigned"}
                              </strong>
                              <small>
                                {problem.ownership?.organization
                                  ? finished
                                    ? formatDate(problem.updated_at || problem.created_at)
                                    : `Reported ${formatDate(problem.created_at)}`
                                  : "Pending review"}
                              </small>
                            </td>

                            <td>
                              <div className="cd-progress">
                                <div className="cd-progress-bar">
                                  <span
                                    className={`cd-progress-fill ${getProgressClass(status)}`}
                                    style={{ width: barsIn ? `${progress}%` : "0%" }}
                                  />
                                </div>

                                <div className="cd-progress-meta">
                                  <b>{progress}% complete</b>
                                  <Link to="/user/my-problems">View →</Link>
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

            </section>

            {/* ===== community contribution ===== */}
            <section className="cd-contribution" style={{ "--i": 5 }}>

              <svg className="cd-deco cd-deco-star" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
              </svg>

              <svg className="cd-deco cd-deco-bolt" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M13 2L4 14h6l-1 8 9-12h-6z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
              </svg>

              <div className="cd-contribution-body">
                <h2>Your community contribution</h2>

                <span className="cd-role">
                  <i aria-hidden="true" />
                  {level}
                </span>

                <strong className="cd-contribution-numbers">
                  {loading
                    ? "Loading your impact…"
                    : `${totalReports} report${totalReports === 1 ? "" : "s"} · ${closedReports} closed · ${awaitingConfirmation} awaiting confirmation`}
                </strong>

                <p>
                  Thank you for helping local teams focus on the places that
                  need care.
                </p>

                <div className="cd-badges">
                  {badges.map((badge, index) => (
                    <span
                      key={badge.label}
                      className={`cd-badge cd-badge-${badge.tone}`}
                      style={{ "--i": index }}
                    >
                      {badge.tone === "gold" ? "★" : "🏆"} {badge.label}
                    </span>
                  ))}
                </div>
              </div>

              <Link to="/user/profile" className="cd-solid-button">
                View recognition
              </Link>

            </section>

          </div>

          {/* ============ RIGHT COLUMN ============ */}
          <aside className="cd-side">

            {/* notifications */}
            <section className="cd-card" style={{ "--i": 2 }}>

              <div className="cd-side-head">
                <h3>Notifications</h3>
                <span className={`cd-count ${unreadCount > 0 ? "cd-count-live" : ""}`}>
                  {unreadCount}
                </span>
              </div>

              {notificationActionError && (
                <p className="cd-inline-error" role="alert">
                  {notificationActionError}
                </p>
              )}

              {notificationError ? (

                <div className="cd-state cd-state-compact">
                  <p>{notificationError}</p>
                  <button
                    type="button"
                    className="cd-ghost-button"
                    onClick={() => loadDashboard(true)}
                  >
                    Retry
                  </button>
                </div>

              ) : notifications.length === 0 ? (

                <div className="cd-empty cd-empty-compact">
                  <p>No notifications to show.</p>
                </div>

              ) : (

                <>
                  <div className="cd-notes">
                    {notifications.map((notification, index) => (
                      <article
                        key={notification.id}
                        className={`cd-note ${!notification.is_read ? "cd-note-highlight" : ""}`}
                        style={{ "--i": index }}
                      >
                        <div className="cd-note-top">
                          <strong>
                            <span
                              className={`cd-dot ${notification.is_read ? "cd-dot-amber" : "cd-dot-green cd-dot-live"}`}
                            />
                            {notification.title || "CivicSolve update"}
                          </strong>

                          <button
                            type="button"
                            className="cd-text-button"
                            onClick={() => handleNotificationRead(notification)}
                          >
                            View →
                          </button>
                        </div>

                        <p>{notification.message || "You have a new update."}</p>

                        <small>
                          {formatDate(notification.created_at)}
                          {!notification.is_read ? " · Unread" : ""}
                        </small>
                      </article>
                    ))}
                  </div>

                  {unreadCount > 0 && (
                    <button
                      type="button"
                      className="cd-mark-all"
                      onClick={handleMarkAllRead}
                      disabled={actionLoading}
                    >
                      {actionLoading ? "Updating…" : "Mark all as read"}
                    </button>
                  )}
                </>
              )}

            </section>

            {/* around you */}
            <section className="cd-card" style={{ "--i": 3 }}>

              <h3 className="cd-side-title">
                Around {user.city || "you"}
              </h3>

              <MiniMap label={user.address || user.city || "Your neighborhood"} />

              <p className="cd-nearby">
                <i aria-hidden="true" />
                See what neighbours have reported near you.
              </p>

              <Link to="/user/browse" className="cd-dark-button">
                Explore nearby problems →
              </Link>

            </section>

            {/* quick actions */}
            <section className="cd-card" style={{ "--i": 4 }}>

              <h3 className="cd-side-title">Quick Actions</h3>

              <div className="cd-actions">

                <Link to="/user/report" className="cd-action cd-action-primary">
                  <span className="cd-action-icon">+</span>
                  Report a new problem
                </Link>

                {awaitingConfirmation > 0 && (
                  <Link to="/user/my-problems" className="cd-action cd-action-dark">
                    <span className="cd-action-icon">✓</span>
                    {readyProblem && readyProblem.problem_code
                      ? `Confirm ${String(readyProblem.problem_code).slice(0, 12)} repair`
                      : "Confirm a repair"}
                  </Link>
                )}

                <Link to="/user/browse" className="cd-action">
                  <span className="cd-action-icon cd-action-icon-light">◎</span>
                  Browse nearby issues
                </Link>

                <Link to="/user/profile" className="cd-action">
                  <span className="cd-action-icon cd-action-icon-light">☺</span>
                  My profile
                </Link>

              </div>

            </section>

          </aside>

        </div>

      </div>

    </div>
  );
}

export default UserDashboard;