
from django.urls import path

from .notification_views import (
    NotificationListView,
    UnreadNotificationCountView,
    MarkNotificationReadView,
    MarkAllNotificationsReadView,
    DeleteNotificationView,
)

urlpatterns = [
    path("", NotificationListView.as_view(), name="notification-list"),
    path(
        "unread-count/",
        UnreadNotificationCountView.as_view(),
        name="notification-unread-count",
    ),
    path(
        "read-all/",
        MarkAllNotificationsReadView.as_view(),
        name="notification-read-all",
    ),
    path(
        "<int:notification_id>/read/",
        MarkNotificationReadView.as_view(),
        name="notification-read",
    ),
    path(
        "<int:notification_id>/",
        DeleteNotificationView.as_view(),
        name="notification-delete",
    ),
]