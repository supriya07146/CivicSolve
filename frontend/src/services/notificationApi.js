
const NOTIFICATION_API_URL = "http://127.0.0.1:8000/api/notifications";

async function notificationRequest(endpoint, options = {}) {
    const token = localStorage.getItem("access_token");

    const response = await fetch(`${NOTIFICATION_API_URL}${endpoint}`, {
        ...options,
        headers: {
            ...(options.body ? { "Content-Type": "application/json" } : {}),
            ...options.headers,
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
    });

    if (response.status === 204) {
        if (!response.ok) {
            throw new Error("The notification request failed.");
        }
        return null;
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(
            data.message ||
            data.detail ||
            "Unable to process the notification request."
        );
    }

    return data;
}

export async function getNotifications() {
    return notificationRequest("/?limit=50");
}

export async function getUnreadNotificationCount() {
    return notificationRequest("/unread-count/");
}

export async function markNotificationRead(notificationId) {
    return notificationRequest(`/${notificationId}/read/`, {
        method: "PATCH",
    });
}

export async function markAllNotificationsRead() {
    return notificationRequest("/read-all/", {
        method: "POST",
    });
}

export async function deleteNotification(notificationId) {
    return notificationRequest(`/${notificationId}/`, {
        method: "DELETE",
    });
}