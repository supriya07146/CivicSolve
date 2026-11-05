
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
    getNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
} from "../../services/notificationApi";

import "./NotificationBell.css";

function formatNotificationTime(value) {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "";

    return new Intl.DateTimeFormat("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(date);
}

function getNotificationIcon(type) {
    const icons = {
        problem: "📍",
        assignment: "📋",
        solution: "💡",
        complaint: "⚠️",
        organization: "🏢",
        user: "👤",
        status: "🔄",
        system: "🔔",
    };

    return icons[type] || "🔔";
}

export default function NotificationBell({ triggerClassName = "", renderTrigger } = {}) {
    const navigate = useNavigate();
    const panelRef = useRef(null);

    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState(null);
    const [markingAll, setMarkingAll] = useState(false);
    const [error, setError] = useState("");

    const loadNotifications = useCallback(async (showLoader = false) => {
        if (showLoader) setLoading(true);

        try {
            const response = await getNotifications();

            setNotifications(
                Array.isArray(response.data) ? response.data : []
            );
            setUnreadCount(Number(response.unread_count) || 0);
            setError("");
        } catch (err) {
            setError(err.message || "Unable to load notifications.");
        } finally {
            if (showLoader) setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadNotifications(true);

        // Refresh periodically so new notifications appear without reloading.
        const intervalId = window.setInterval(() => {
            loadNotifications(false);
        }, 30000);

        return () => window.clearInterval(intervalId);
    }, [loadNotifications]);

    useEffect(() => {
        function handleOutsideClick(event) {
            if (
                panelRef.current &&
                !panelRef.current.contains(event.target)
            ) {
                setIsOpen(false);
            }
        }

        function handleEscape(event) {
            if (event.key === "Escape") setIsOpen(false);
        }

        document.addEventListener("mousedown", handleOutsideClick);
        document.addEventListener("keydown", handleEscape);

        return () => {
            document.removeEventListener("mousedown", handleOutsideClick);
            document.removeEventListener("keydown", handleEscape);
        };
    }, []);

    async function handleMarkRead(notification) {
        if (notification.is_read || busyId !== null) return;

        setBusyId(notification.id);
        setError("");

        try {
            await markNotificationRead(notification.id);

            setNotifications((current) =>
                current.map((item) =>
                    item.id === notification.id
                        ? { ...item, is_read: true }
                        : item
                )
            );

            setUnreadCount((count) => Math.max(0, count - 1));
        } catch (err) {
            setError(err.message || "Unable to mark as read.");
        } finally {
            setBusyId(null);
        }
    }

    async function handleMarkAllRead() {
        if (unreadCount === 0 || markingAll) return;

        setMarkingAll(true);
        setError("");

        try {
            await markAllNotificationsRead();

            setNotifications((current) =>
                current.map((item) => ({ ...item, is_read: true }))
            );

            setUnreadCount(0);
        } catch (err) {
            setError(err.message || "Unable to update notifications.");
        } finally {
            setMarkingAll(false);
        }
    }

    async function handleDelete(event, notification) {
        event.stopPropagation();

        if (busyId !== null) return;

        setBusyId(notification.id);
        setError("");

        try {
            await deleteNotification(notification.id);

            setNotifications((current) =>
                current.filter((item) => item.id !== notification.id)
            );

            if (!notification.is_read) {
                setUnreadCount((count) => Math.max(0, count - 1));
            }
        } catch (err) {
            setError(err.message || "Unable to delete notification.");
        } finally {
            setBusyId(null);
        }
    }

    async function handleNotificationClick(notification) {
        await handleMarkRead(notification);

        setIsOpen(false);

        if (notification.target_url) {
            navigate(notification.target_url);
        }
    }

    const toggleOpen = () => {
        setIsOpen((current) => !current);
        if (!isOpen) loadNotifications(false);
    };

    return (
        <div className="cs-notification" ref={panelRef}>
            {typeof renderTrigger === "function" ? (
                renderTrigger({ isOpen, unreadCount, toggleOpen })
            ) : (
                <button
                    type="button"
                    className={`cs-notification-trigger ${triggerClassName} ${isOpen ? "is-open" : ""}`}
                    onClick={toggleOpen}
                    aria-label={`Notifications, ${unreadCount} unread`}
                    aria-expanded={isOpen}
                    aria-haspopup="dialog"
                >
                    <svg
                        viewBox="0 0 24 24"
                        width="22"
                        height="22"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                    >
                        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
                        <path d="M10 21h4" />
                    </svg>

                    {unreadCount > 0 && (
                        <span className="cs-notification-badge">
                            {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                    )}
                </button>
            )}

            {isOpen && (
                <section
                    className="cs-notification-dropdown"
                    role="dialog"
                    aria-label="Notifications"
                >
                    <header className="cs-notification-header">
                        <div>
                            <h3>Notifications</h3>
                            <p>
                                {unreadCount > 0
                                    ? `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`
                                    : "You're all caught up"}
                            </p>
                        </div>

                        <button
                            type="button"
                            className="cs-notification-refresh"
                            onClick={() => loadNotifications(true)}
                            title="Refresh notifications"
                            aria-label="Refresh notifications"
                        >
                            ↻
                        </button>
                    </header>

                    {unreadCount > 0 && (
                        <div className="cs-notification-toolbar">
                            <button
                                type="button"
                                onClick={handleMarkAllRead}
                                disabled={markingAll}
                            >
                                {markingAll ? "Updating..." : "Mark all as read"}
                            </button>
                        </div>
                    )}

                    {error && (
                        <div className="cs-notification-error" role="alert">
                            {error}
                            <button
                                type="button"
                                onClick={() => loadNotifications(true)}
                            >
                                Retry
                            </button>
                        </div>
                    )}

                    <div className="cs-notification-list">
                        {loading ? (
                            <div className="cs-notification-state">
                                <span className="cs-notification-spinner" />
                                Loading notifications...
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="cs-notification-state">
                                <span className="cs-notification-empty-icon">
                                    🔔
                                </span>
                                <strong>No notifications yet</strong>
                                <span>Updates will appear here.</span>
                            </div>
                        ) : (
                            notifications.map((notification) => (
                                <article
                                    key={notification.id}
                                    className={`cs-notification-item ${
                                        notification.is_read ? "is-read" : "is-unread"
                                    }`}
                                >
                                    <button
                                        type="button"
                                        className="cs-notification-content"
                                        onClick={() =>
                                            handleNotificationClick(notification)
                                        }
                                    >
                                        <span className="cs-notification-icon">
                                            {getNotificationIcon(
                                                notification.notification_type
                                            )}
                                        </span>

                                        <span className="cs-notification-copy">
                                            <strong>{notification.title}</strong>
                                            <span className="cs-notification-message">
                                                {notification.message}
                                            </span>
                                            <time>
                                                {formatNotificationTime(
                                                    notification.created_at
                                                )}
                                            </time>
                                        </span>

                                        {!notification.is_read && (
                                            <span
                                                className="cs-notification-unread-dot"
                                                aria-label="Unread"
                                            />
                                        )}
                                    </button>

                                    <button
                                        type="button"
                                        className="cs-notification-delete"
                                        onClick={(event) =>
                                            handleDelete(event, notification)
                                        }
                                        disabled={busyId === notification.id}
                                        aria-label="Delete notification"
                                        title="Delete notification"
                                    >
                                        ×
                                    </button>
                                </article>
                            ))
                        )}
                    </div>

                    <footer className="cs-notification-footer">
                        <span>Showing latest {notifications.length}</span>
                        <button
                            type="button"
                            onClick={() => loadNotifications(true)}
                        >
                            Refresh
                        </button>
                    </footer>
                </section>
            )}
        </div>
    );
}