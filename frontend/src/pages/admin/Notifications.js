import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
    getNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
} from "../../services/notificationApi";

import "../../styles/admin/Notifications.css";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDate(value) {
    if (!value) return "Just now";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "";

    return new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
}

function getTypeLabel(type) {
    const labels = {
        problem: "Problem",
        assignment: "Assignment",
        solution: "Solution",
        complaint: "Complaint",
        organization: "Organization",
        user: "Citizen",
        status: "Status update",
        system: "System",
    };

    return labels[type] || "Notification";
}

function getTypeIcon(type) {
    const icons = {
        problem: "📍",
        assignment: "📋",
        solution: "💡",
        complaint: "⚠",
        organization: "🏢",
        user: "👤",
        status: "🔄",
        system: "🔔",
    };

    return icons[type] || "🔔";
}

const TABS = [
    { value: "all", label: "All notifications" },
    { value: "unread", label: "Unread" },
    { value: "read", label: "Read" },
];

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function Notifications() {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [filter, setFilter] = useState("all");
    const [typeFilter, setTypeFilter] = useState("");
    const [search, setSearch] = useState("");
    const [busyId, setBusyId] = useState(null);
    const [markingAll, setMarkingAll] = useState(false);

    const listRef = useRef(null);

    /* ---------------- data loading ---------------- */

    const loadNotifications = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const response = await getNotifications();
            setNotifications(Array.isArray(response.data) ? response.data : []);
        } catch (err) {
            setError(err.message || "Unable to load notifications.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadNotifications();
    }, [loadNotifications]);

    /* ---------------- derived data ---------------- */

    const unreadCount = notifications.filter((n) => !n.is_read).length;
    const readCount = notifications.length - unreadCount;

    const counts = { all: notifications.length, unread: unreadCount, read: readCount };

    const unreadList = useMemo(
        () => notifications.filter((n) => !n.is_read),
        [notifications]
    );

    const typeCounts = useMemo(() => {
        const map = {};
        notifications.forEach((n) => {
            const key = n.notification_type || "other";
            map[key] = (map[key] || 0) + 1;
        });
        return Object.entries(map).sort((a, b) => b[1] - a[1]);
    }, [notifications]);

    const filteredNotifications = useMemo(() => {
        const query = search.trim().toLowerCase();

        return notifications.filter((notification) => {
            if (filter === "unread" && notification.is_read) return false;
            if (filter === "read" && !notification.is_read) return false;

            if (typeFilter && (notification.notification_type || "other") !== typeFilter) {
                return false;
            }

            if (!query) return true;

            return [
                notification.title,
                notification.message,
                notification.notification_type,
                notification.actor_name,
            ].some((value) => String(value || "").toLowerCase().includes(query));
        });
    }, [notifications, filter, typeFilter, search]);

    const hasFilters = Boolean(search || filter !== "all" || typeFilter);

    /* ---------------- actions ---------------- */

    async function handleMarkRead(notification) {
        if (notification.is_read || busyId !== null) return;

        setBusyId(notification.id);
        setError("");
        setSuccess("");

        try {
            await markNotificationRead(notification.id);

            setNotifications((current) =>
                current.map((item) =>
                    item.id === notification.id ? { ...item, is_read: true } : item
                )
            );

            setSuccess("Notification marked as read.");
        } catch (err) {
            setError(err.message || "Unable to update notification.");
        } finally {
            setBusyId(null);
        }
    }

    async function handleMarkAllRead() {
        if (unreadCount === 0 || markingAll) return;

        setMarkingAll(true);
        setError("");
        setSuccess("");

        try {
            await markAllNotificationsRead();

            setNotifications((current) => current.map((item) => ({ ...item, is_read: true })));

            setSuccess("All notifications marked as read.");
        } catch (err) {
            setError(err.message || "Unable to update notifications.");
        } finally {
            setMarkingAll(false);
        }
    }

    async function handleDelete(notification) {
        if (busyId !== null) return;

        if (!window.confirm("Are you sure you want to delete this notification?")) return;

        setBusyId(notification.id);
        setError("");
        setSuccess("");

        try {
            await deleteNotification(notification.id);

            setNotifications((current) => current.filter((item) => item.id !== notification.id));

            setSuccess("Notification deleted.");
        } catch (err) {
            setError(err.message || "Unable to delete notification.");
        } finally {
            setBusyId(null);
        }
    }

    function showUnread() {
        setFilter("unread");
        setTypeFilter("");
        setSearch("");
        listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    function clearFilters() {
        setSearch("");
        setFilter("all");
        setTypeFilter("");
    }

    /* ---------------- render ---------------- */

    return (
        <main className="admin-notifications-page">

            {/* attention strip — full width, like the dashboard alert */}
            {unreadCount > 0 && (
                <div className="nt-banner">
                    <div className="nt-container nt-banner-inner">
                        <span className="nt-banner-icon">✓</span>
                        <p>
                            ✦ {unreadCount} unread alert{unreadCount === 1 ? " requires" : "s require"} your attention.{" "}
                            <button type="button" onClick={showUnread}>View unread →</button>
                        </p>
                    </div>
                </div>
            )}

            <div className="nt-container">

                {/* tabs */}
                <div className="nt-tabs" role="tablist">
                    {TABS.map((tab) => (
                        <button key={tab.value} type="button" role="tab"
                            aria-selected={filter === tab.value}
                            className={filter === tab.value ? "active" : ""}
                            onClick={() => setFilter(tab.value)}>
                            <i /> {tab.label} · {counts[tab.value]}
                        </button>
                    ))}
                </div>

                {error && (
                    <div className="nt-alert nt-alert-error" role="alert">
                        <span>{error}</span>
                        <button type="button" onClick={() => setError("")}>Dismiss</button>
                    </div>
                )}

                {success && (
                    <div className="nt-alert nt-alert-success" role="status">
                        <span>{success}</span>
                        <button type="button" onClick={() => setSuccess("")}>Dismiss</button>
                    </div>
                )}

                <div className="nt-layout">

                    {/* ---------- left: history ---------- */}
                    <section className="nt-card nt-history" ref={listRef}>
                        <div className="nt-card-head">
                            <div>
                                <h2>Notification history</h2>
                                <p>
                                    {loading
                                        ? "Loading notifications..."
                                        : `${filteredNotifications.length} record${filteredNotifications.length === 1 ? "" : "s"} found`}
                                </p>
                            </div>

                            <div className="nt-head-actions">
                                <button type="button" className="nt-ghost-btn"
                                    onClick={loadNotifications} disabled={loading}>
                                    {loading ? "Refreshing..." : "↻ Refresh"}
                                </button>
                                <button type="button" className="nt-ghost-btn"
                                    onClick={handleMarkAllRead}
                                    disabled={unreadCount === 0 || markingAll}>
                                    {markingAll ? "Updating..." : "✓ Mark all as read"}
                                </button>
                            </div>
                        </div>

                        <div className="nt-search">
                            <span aria-hidden="true">⌕</span>
                            <input type="search" placeholder="Search notifications..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                aria-label="Search notifications" />
                            {typeFilter && (
                                <button type="button" className="nt-type-chip"
                                    onClick={() => setTypeFilter("")}>
                                    {getTypeLabel(typeFilter)} ×
                                </button>
                            )}
                        </div>

                        <div className="nt-list">
                            {loading ? (
                                <div className="nt-empty">
                                    <span className="nt-spinner" />
                                    <p>Loading your notifications...</p>
                                </div>
                            ) : filteredNotifications.length === 0 ? (
                                <div className="nt-empty">
                                    <span className="nt-empty-icon">🔔</span>
                                    <strong>
                                        {hasFilters ? "No matching notifications" : "No notifications yet"}
                                    </strong>
                                    <p>
                                        {hasFilters
                                            ? "Try another search or filter."
                                            : "New platform activity will appear here."}
                                    </p>
                                    {hasFilters && (
                                        <button type="button" className="nt-ghost-btn" onClick={clearFilters}>
                                            Clear filters
                                        </button>
                                    )}
                                </div>
                            ) : (
                                filteredNotifications.map((notification) => (
                                    <article key={notification.id}
                                        className={`nt-item ${notification.is_read ? "read" : "unread"}`}>
                                        <div className="nt-item-icon">
                                            {getTypeIcon(notification.notification_type)}
                                        </div>

                                        <div className="nt-item-body">
                                            <div className="nt-item-title">
                                                <h3>{notification.title}</h3>
                                                {!notification.is_read && <span className="nt-new">NEW</span>}
                                            </div>

                                            <p>{notification.message}</p>

                                            <div className="nt-item-meta">
                                                <span className="nt-type">
                                                    {getTypeLabel(notification.notification_type)}
                                                </span>
                                                {notification.actor_name && (
                                                    <span>From: {notification.actor_name}</span>
                                                )}
                                                <time>{formatDate(notification.created_at)}</time>
                                            </div>
                                        </div>

                                        <div className="nt-item-actions">
                                            {!notification.is_read && (
                                                <button type="button" className="nt-read-btn"
                                                    disabled={busyId === notification.id}
                                                    onClick={() => handleMarkRead(notification)}>
                                                    Mark read →
                                                </button>
                                            )}
                                            <button type="button" className="nt-delete-btn"
                                                disabled={busyId === notification.id}
                                                onClick={() => handleDelete(notification)}
                                                aria-label={`Delete ${notification.title}`}
                                                title="Delete notification">
                                                Delete
                                            </button>
                                        </div>
                                    </article>
                                ))
                            )}
                        </div>

                        <p className="nt-foot">
                            Showing {filteredNotifications.length} of {notifications.length} notifications · Latest first
                        </p>
                    </section>

                    {/* ---------- right column ---------- */}
                    <aside className="nt-side">

                        {/* by type */}
                        <section className="nt-rules">
                            <h2>Notification types</h2>

                            {typeCounts.length === 0 ? (
                                <p className="nt-rules-empty">No notifications to group yet.</p>
                            ) : (
                                typeCounts.map(([type, count]) => (
                                    <button key={type} type="button"
                                        className={`nt-rule ${typeFilter === type ? "on" : ""}`}
                                        onClick={() => setTypeFilter(typeFilter === type ? "" : type)}>
                                        <span className="nt-rule-check">{typeFilter === type ? "✓" : getTypeIcon(type)}</span>
                                        <span className="nt-rule-text">{getTypeLabel(type)}</span>
                                        <span className="nt-rule-count">{count}</span>
                                    </button>
                                ))
                            )}

                            {typeFilter && (
                                <button type="button" className="nt-outline-btn"
                                    onClick={() => setTypeFilter("")}>
                                    Clear type filter
                                </button>
                            )}
                        </section>

                        {/* administrator alerts — dark advisory style */}
                        <section className="nt-alerts">
                            <div className="nt-alerts-head">
                                <h2>Administrator alerts</h2>
                                <span className="nt-badge">{unreadCount}</span>
                            </div>

                            {unreadList.length === 0 ? (
                                <p className="nt-alerts-empty">You're all caught up. No unread alerts.</p>
                            ) : (
                                unreadList.slice(0, 3).map((notification) => (
                                    <div className="nt-alert-item" key={notification.id}>
                                        <div className="nt-alert-top">
                                            <strong>{notification.title}</strong>
                                            <button type="button"
                                                disabled={busyId === notification.id}
                                                onClick={() => handleMarkRead(notification)}>
                                                Mark read →
                                            </button>
                                        </div>
                                        <p>{notification.message}</p>
                                        <small>{formatDate(notification.created_at)} · Unread</small>
                                    </div>
                                ))
                            )}
                        </section>

                        {/* audit note */}
                        <aside className="nt-audit">
                            <strong>● Audit trail active</strong>
                            <p>Changes you make here are saved to CivicSolve.</p>
                        </aside>
                    </aside>
                </div>
            </div>
        </main>
    );
}