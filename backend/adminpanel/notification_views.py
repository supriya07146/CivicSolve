
from django.shortcuts import get_object_or_404

from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from organizations.models import Organization
from .models import Notification
from .notification_serializers import NotificationSerializer


def get_recipient_filter(request):
    """
    Return the correct notification-recipient field for the logged-in account.
    Organization must be the actual request.user object for organization tokens.
    """
    if isinstance(request.user, Organization):
        return {"recipient_organization": request.user}

    return {"recipient": request.user}


class NotificationListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        recipient_filter = get_recipient_filter(request)

        notifications = Notification.objects.filter(**recipient_filter)

        unread_count = notifications.filter(is_read=False).count()

        unread_only = request.query_params.get("unread", "").lower()
        if unread_only == "true":
            notifications = notifications.filter(is_read=False)

        try:
            limit = int(request.query_params.get("limit", 50))
        except (ValueError, TypeError):
            limit = 50

        limit = max(1, min(limit, 100))
        total_count = notifications.count()
        notifications = notifications[:limit]

        return Response({
            "success": True,
            "message": "Notifications retrieved successfully.",
            "unread_count": unread_count,
            "total_count": total_count,
            "data": NotificationSerializer(
                notifications, many=True
            ).data,
        })


class UnreadNotificationCountView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        recipient_filter = get_recipient_filter(request)

        count = Notification.objects.filter(
            **recipient_filter,
            is_read=False,
        ).count()

        return Response({
            "success": True,
            "unread_count": count,
        })


class MarkNotificationReadView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, notification_id):
        recipient_filter = get_recipient_filter(request)

        notification = get_object_or_404(
            Notification,
            id=notification_id,
            **recipient_filter,
        )

        notification.is_read = True
        notification.save(update_fields=["is_read"])

        return Response({
            "success": True,
            "message": "Notification marked as read.",
            "data": NotificationSerializer(notification).data,
        })


class MarkAllNotificationsReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        recipient_filter = get_recipient_filter(request)

        updated_count = Notification.objects.filter(
            **recipient_filter,
            is_read=False,
        ).update(is_read=True)

        return Response({
            "success": True,
            "message": "All notifications marked as read.",
            "updated_count": updated_count,
        })


class DeleteNotificationView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, notification_id):
        recipient_filter = get_recipient_filter(request)

        notification = get_object_or_404(
            Notification,
            id=notification_id,
            **recipient_filter,
        )

        notification.delete()

        return Response(status=status.HTTP_204_NO_CONTENT)