import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getOrganizationNotifications,
  getOrganizationUnreadNotificationCount,
  markOrganizationNotificationRead,
  markAllOrganizationNotificationsRead,
} from "../../services/api";
import "../../styles/organization/Notifications.css";

const FILTERS = [
  { label: "All", value: "all" },
  { label: "Unread", value: "unread" },
  { label: "Read", value: "read" },
];

const TYPE_DETAILS = {
  assignment: { label: "Assignment", icon: "↗" },
  solution: { label: "Solution", icon: "✓" },
  problem: { label: "Problem", icon: "⌂" },
  complaint: { label: "Complaint", icon: "!" },
  organization: { label: "Organization", icon: "▦" },
  status: { label: "Status update", icon: "↻" },
  user: { label: "User", icon: "◉" },
  system: { label: "System", icon: "✦" },
};

const getNotificationList = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.results)) return response.results;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.notifications)) return response.notifications;
  return [];
};

const getType = (notification) => {
  const type = String(notification?.notification_type || "system")
    .toLowerCase()
    .trim();

  return TYPE_DETAILS[type] ? type : "system";
};

const getSeverity = (notification) => {
  const text = `${notification?.title || ""} ${
    notification?.message || ""
  }`.toLowerCase();

  if (
    /overdue|urgent|critical|deadline missed|rejected|suspended|disputed/.test(
      text
    )
  ) {
    return "urgent";
  }

  if (
    /reminder|deadline|pending|action required|changes requested/.test(text)
  ) {
    return "warning";
  }

  if (!notification?.is_read) return "fresh";

  return "read";
};

const formatDate = (value) => {
  if (!value) return "Date unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

const getRelativeTime = (value) => {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const difference = Date.now() - date.getTime();
  const minutes = Math.floor(difference / 60000);

  if (minutes < 1 && minutes >= 0) return "Just now";
  if (minutes < 60 && minutes >= 0) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24 && hours >= 0) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7 && days >= 0) return `${days}d ago`;

  return formatDate(value);
};

function NotificationIllustration() {
  return (
    <svg
      viewBox="0 0 340 250"
      role="img"
      aria-label="Illustration of organization notifications"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient id="onGlow">
          <stop offset="0%" stopColor="#7ce7ce" stopOpacity=".55" />
          <stop offset="100%" stopColor="#7ce7ce" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="onBellGradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#bcefe3" />
        </linearGradient>
        <linearGradient id="onCardGradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e3f8f1" />
        </linearGradient>
      </defs>

      <circle className="on-art-glow" cx="170" cy="130" r="112" fill="url(#onGlow)" />

      <g className="on-art-spark" fill="#a7f0db">
        <circle cx="43" cy="70" r="3" />
        <circle cx="278" cy="49" r="4" />
        <circle cx="300" cy="161" r="3" />
      </g>

      <circle className="on-art-wave" cx="95" cy="54" r="42" fill="none" stroke="#7ce7ce" strokeWidth="2" />
      <circle className="on-art-wave on-art-wave-2" cx="95" cy="54" r="56" fill="none" stroke="#7ce7ce" strokeWidth="1.5" />

      <g className="on-art-card on-art-card-1">
        <rect x="177" y="42" width="123" height="43" rx="11" fill="url(#onCardGradient)" />
        <circle cx="194" cy="63" r="7" fill="#12b894" />
        <path d="M191 63l2 2 4-5" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="207" y="56" width="76" height="4" rx="2" fill="#315469" />
        <rect x="207" y="65" width="53" height="3" rx="1.5" fill="#a9bbc4" />
      </g>

      <g className="on-art-card on-art-card-2">
        <rect x="197" y="101" width="112" height="40" rx="10" fill="#ffffff" />
        <circle cx="213" cy="121" r="6" fill="#f2b544" />
        <path d="M213 117v5m0 3v.5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
        <rect x="226" y="114" width="68" height="4" rx="2" fill="#315469" />
        <rect x="226" y="123" width="45" height="3" rx="1.5" fill="#a9bbc4" />
      </g>

      <g className="on-art-card on-art-card-3">
        <rect x="183" y="158" width="126" height="42" rx="10" fill="#ffffff" />
        <circle cx="200" cy="179" r="7" fill="#8d7ce8" />
        <path d="M197 179l2 2 4-5" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="213" y="172" width="81" height="4" rx="2" fill="#315469" />
        <rect x="213" y="181" width="56" height="3" rx="1.5" fill="#a9bbc4" />
      </g>

      <g className="on-art-bell">
        <path
          d="M62 88c8-7 12-16 12-29V48c0-14 9-25 22-25s22 11 22 25v11c0 13 4 22 12 29l5 6H57z"
          fill="url(#onBellGradient)"
          stroke="#7ce7ce"
          strokeWidth="2"
        />
        <path d="M84 101c2 8 6 12 12 12s10-4 12-12" fill="#7ce7ce" />
        <path d="M86 31c3-3 7-4 10-4" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
      </g>

      <g className="on-art-badge">
        <circle cx="128" cy="31" r="15" fill="#f05c70" stroke="#163d50" strokeWidth="3" />
        <text x="128" y="36" textAnchor="middle" fontSize="14" fontWeight="800" fill="#fff">!</text>
      </g>

      <path d="M48 211h246" stroke="#7ce7ce" strokeWidth="2" strokeLinecap="round" opacity=".55" />
      <circle cx="64" cy="211" r="4" fill="#7ce7ce" />
      <circle cx="278" cy="211" r="4" fill="#7ce7ce" />
    </svg>
  );
}

export default function Notifications() {
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [activeFilter, setActiveFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [serverUnreadCount, setServerUnreadCount] = useState(null);

  const loadNotifications = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    else setRefreshing(true);

    setError("");

    try {
      const [listResponse, countResponse] = await Promise.all([
        getOrganizationNotifications({ limit: 100 }),
        getOrganizationUnreadNotificationCount().catch(() => null),
      ]);

      const items = getNotificationList(listResponse);
      setNotifications(items);

      const count = Number(
        countResponse?.unread_count ??
          listResponse?.unread_count ??
          items.filter((item) => !item.is_read).length
      );

      setServerUnreadCount(Number.isFinite(count) ? count : 0);
    } catch (err) {
      setError(
        err?.message ||
          "Unable to load notifications. Please check your connection and try again."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.is_read).length,
    [notifications]
  );

  const totalCount = notifications.length;

  const typeCounts = useMemo(() => {
    const counts = {
      assignment: 0,
      solution: 0,
      problem: 0,
      complaint: 0,
      system: 0,
    };

    notifications.forEach((item) => {
      const type = getType(item);
      if (Object.prototype.hasOwnProperty.call(counts, type)) {
        counts[type] += 1;
      } else {
        counts.system += 1;
      }
    });

    return counts;
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    if (activeFilter === "unread") {
      return notifications.filter((item) => !item.is_read);
    }

    if (activeFilter === "read") {
      return notifications.filter((item) => item.is_read);
    }

    return notifications;
  }, [notifications, activeFilter]);

  const regularNotifications = filteredNotifications.filter(
    (item) => getSeverity(item) !== "urgent"
  );

  const actionNotifications = filteredNotifications.filter(
    (item) => getSeverity(item) === "urgent"
  );

  const handleMarkRead = async (notification) => {
    if (notification.is_read || processingId !== null) return;

    setProcessingId(notification.id);
    setError("");
    setSuccess("");

    try {
      await markOrganizationNotificationRead(notification.id);

      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id ? { ...item, is_read: true } : item
        )
      );

      setServerUnreadCount((current) =>
        current === null ? null : Math.max(0, current - 1)
      );

      setSuccess("Notification marked as read.");
    } catch (err) {
      setError(err?.message || "Could not mark this notification as read.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleMarkAllRead = async () => {
    if (unreadCount === 0 || markingAll) return;

    setMarkingAll(true);
    setError("");
    setSuccess("");

    try {
      await markAllOrganizationNotificationsRead();

      setNotifications((current) =>
        current.map((item) => ({ ...item, is_read: true }))
      );
      setServerUnreadCount(0);
      setSuccess("All notifications have been marked as read.");
    } catch (err) {
      setError(err?.message || "Could not mark all notifications as read.");
    } finally {
      setMarkingAll(false);
    }
  };

  const handleOpenNotification = async (notification) => {
    if (!notification.is_read) {
      await handleMarkRead(notification);
    }

    const target = notification.target_url;

    if (target && target.startsWith("/") && !target.startsWith("//")) {
      navigate(target);
    }
  };

  const dismissMessages = () => {
    setError("");
    setSuccess("");
  };

  const renderNotificationCard = (notification) => {
    const type = getType(notification);
    const severity = getSeverity(notification);
    const details = TYPE_DETAILS[type];
    const isProcessing = processingId === notification.id;

    return (
      <article
        className={`on-card on-card--${severity}`}
        key={notification.id}
      >
        <div className="on-card-body">
          <div className="on-card-title">
            <span
              className={`on-dot on-dot--${severity}`}
              aria-hidden="true"
            />
            <h3>{notification.title || "Notification"}</h3>
          </div>

          <p className="on-card-message">
            {notification.message || "You have a new notification."}
          </p>

          <div className="on-card-meta">
            <time dateTime={notification.created_at || undefined}>
              {formatDate(notification.created_at)}
            </time>

            <span className="on-sep" aria-hidden="true">
              •
            </span>

            <span title={formatDate(notification.created_at)}>
              {getRelativeTime(notification.created_at)}
            </span>

            <span className="on-sep" aria-hidden="true">
              •
            </span>

            <span className={`on-type on-type--${type}`}>
              {details.label}
            </span>

            {severity === "urgent" && (
              <span className="on-tag on-tag--urgent">ACTION NEEDED</span>
            )}

            {severity === "warning" && (
              <span className="on-tag on-tag--warning">REMINDER</span>
            )}

            {!notification.is_read && severity !== "urgent" && severity !== "warning" && (
              <span className="on-tag on-tag--fresh">NEW</span>
            )}
          </div>
        </div>

        <div className="on-card-action">
          {!notification.is_read ? (
            <button
              type="button"
              className="on-view-btn"
              onClick={() => handleOpenNotification(notification)}
              disabled={isProcessing || processingId !== null}
            >
              {isProcessing ? "Updating..." : "View"}
            </button>
          ) : notification.target_url ? (
            <button
              type="button"
              className="on-view-btn"
              onClick={() => handleOpenNotification(notification)}
            >
              Open
            </button>
          ) : (
            <span className="on-read-label">
              <span aria-hidden="true">✓</span> Read
            </span>
          )}
        </div>
      </article>
    );
  };

  const renderEmptyState = () => (
    <div className="on-state">
      <div className="on-empty-icon" aria-hidden="true">
        {activeFilter === "unread" ? "✓" : "♧"}
      </div>
      <h3>
        {activeFilter === "unread"
          ? "You're all caught up"
          : activeFilter === "read"
          ? "No read notifications yet"
          : "No notifications yet"}
      </h3>
      <p>
        {activeFilter === "unread"
          ? "New assignment updates and important organization alerts will appear here."
          : activeFilter === "read"
          ? "Notifications you have already read will appear here."
          : "When assignments, solutions, or important updates arrive, you'll see them here."}
      </p>
      {activeFilter !== "all" && (
        <button
          type="button"
          className="on-ghost-btn"
          onClick={() => setActiveFilter("all")}
        >
          View all notifications
        </button>
      )}
    </div>
  );

  return (
    <main className="org-notifications-page">
      <section className="on-hero">
        <div className="on-hero-grid" aria-hidden="true" />
        <div className="on-orb on-orb-1" aria-hidden="true" />
        <div className="on-orb on-orb-2" aria-hidden="true" />

        <div className="on-hero-copy">
          <div className="on-hero-top">
            <button
              type="button"
              className="on-back-link"
              onClick={() => navigate("/organization/dashboard")}
            >
              ← Organization dashboard
            </button>
            <span className="on-hero-divider" aria-hidden="true" />
            <span className="on-eyebrow">ORGANIZATION CENTER</span>
          </div>

          <h1>Your Notifications</h1>
          <p>
            Stay updated on assignments, solution reviews, community activity,
            and important changes to your organization's work.
          </p>

          <button
            type="button"
            className="on-hero-btn"
            onClick={() => loadNotifications(false)}
            disabled={loading || refreshing}
          >
            {refreshing ? "Refreshing..." : "↻ Refresh notifications"}
          </button>
        </div>

        <div className="on-hero-art">
          <NotificationIllustration />
        </div>
      </section>

      {unreadCount > 0 && (
        <section className="on-banner" aria-live="polite">
          <span className="on-banner-icon" aria-hidden="true">
            ✦
          </span>
          <p>
            You have <strong>{unreadCount}</strong> unread notification
            {unreadCount === 1 ? "" : "s"}. Review your updates to stay on top
            of your assignments.
          </p>
          <button
            type="button"
            onClick={handleMarkAllRead}
            disabled={markingAll || processingId !== null}
          >
            {markingAll ? "Updating..." : "Mark all as read"}
          </button>
        </section>
      )}

      <div className="on-toolbar">
        <div className="on-filters" role="group" aria-label="Filter notifications">
          {FILTERS.map((filter) => {
            const count =
              filter.value === "all"
                ? totalCount
                : filter.value === "unread"
                ? unreadCount
                : totalCount - unreadCount;

            return (
              <button
                key={filter.value}
                type="button"
                className={`on-filter ${
                  activeFilter === filter.value ? "active" : ""
                }`}
                onClick={() => setActiveFilter(filter.value)}
                aria-pressed={activeFilter === filter.value}
              >
                {filter.label}
                <span className="on-filter-count">{count}</span>
              </button>
            );
          })}
        </div>

        <span className="on-result-count">
          {loading
            ? "Loading notifications..."
            : `${filteredNotifications.length} notification${
                filteredNotifications.length === 1 ? "" : "s"
              } shown`}
        </span>
      </div>

      {error && (
        <div className="on-alert on-alert--error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={dismissMessages}>
            Dismiss
          </button>
        </div>
      )}

      {success && (
        <div className="on-alert on-alert--success" role="status">
          <span>{success}</span>
          <button type="button" onClick={dismissMessages}>
            Dismiss
          </button>
        </div>
      )}

      {loading ? (
        <div className="on-state" role="status" aria-live="polite">
          <div className="on-spinner" aria-hidden="true" />
          <h3>Loading your notifications</h3>
          <p>Fetching your latest organization updates...</p>
        </div>
      ) : error && notifications.length === 0 ? (
        <div className="on-state">
          <div className="on-empty-icon" aria-hidden="true">
            !
          </div>
          <h3>Notifications couldn't load</h3>
          <p>
            Check that you're logged in with your organization account and the
            backend server is running.
          </p>
          <button
            type="button"
            className="on-ghost-btn"
            onClick={() => loadNotifications()}
          >
            Try again
          </button>
        </div>
      ) : filteredNotifications.length === 0 ? (
        renderEmptyState()
      ) : (
        <div className="on-layout">
          <div className="on-main">
            {actionNotifications.length > 0 && (
              <section className="on-section on-section--action">
                <div className="on-section-head">
                  <h2>Needs Attention</h2>
                  <span className="on-count-pill on-count-pill--urgent">
                    {actionNotifications.length}
                  </span>
                </div>

                <div className="on-card-list">
                  {actionNotifications.map(renderNotificationCard)}
                </div>
              </section>
            )}

            {regularNotifications.length > 0 && (
              <section className="on-section">
                <div className="on-section-head">
                  <h2>Recent Activity</h2>
                  <span className="on-count-pill">
                    {regularNotifications.length}
                  </span>
                </div>

                <div className="on-card-list">
                  {regularNotifications.map(renderNotificationCard)}
                </div>
              </section>
            )}
          </div>

          <aside className="on-side">
            <div className="on-stats">
              <div className="on-stat on-stat--total">
                <strong>{totalCount}</strong>
                <span>TOTAL ALERTS</span>
              </div>

              <div className="on-stat on-stat--unread">
                <strong>{serverUnreadCount ?? unreadCount}</strong>
                <span>UNREAD</span>
              </div>
            </div>

            <section className="on-side-card">
              <h3 className="on-side-title">Notification categories</h3>

              <ul className="on-type-list">
                {Object.keys(TYPE_DETAILS)
                  .filter((type) =>
                    ["assignment", "solution", "problem", "complaint", "system"].includes(
                      type
                    )
                  )
                  .map((type) => (
                    <li key={type}>
                      <span
                        className={`on-type-icon on-type-icon--${type}`}
                        aria-hidden="true"
                      >
                        {TYPE_DETAILS[type].icon}
                      </span>
                      <span className="on-type-name">
                        {TYPE_DETAILS[type].label}
                      </span>
                      <strong>{typeCounts[type] || 0}</strong>
                    </li>
                  ))}
              </ul>

              <p className="on-side-note">
                Counts reflect the notifications currently loaded.
              </p>
            </section>

            <section className="on-dark-card">
              <div className="on-dark-head">
                <span className="on-dark-icon" aria-hidden="true">
                  ✓
                </span>
                <h3>Stay up to date</h3>
              </div>

              <p>
                Check assignment decisions, progress updates, and solution
                reviews regularly so your team can respond on time.
              </p>

              <button
                type="button"
                className="on-outline-btn"
                onClick={handleMarkAllRead}
                disabled={
                  unreadCount === 0 ||
                  markingAll ||
                  processingId !== null
                }
              >
                {markingAll ? "Updating..." : "✓ Mark all as read"}
              </button>
            </section>
          </aside>
        </div>
      )}
    </main>
  );
}
