
from django.contrib.auth import get_user_model

from organizations.models import Organization
from .models import Notification

User = get_user_model()


def create_notification(
    recipient,
    title,
    message,
    notification_type="system",
    actor=None,
    target_url="",
):
    """
    Create a notification for a citizen/admin User or an Organization.
    """

    notification_data = {
        "title": title,
        "message": message,
        "notification_type": notification_type,
        "target_url": target_url,
        "actor": actor if isinstance(actor, User) else None,
    }

    if isinstance(recipient, Organization):
        notification_data["recipient_organization"] = recipient
    else:
        notification_data["recipient"] = recipient

    return Notification.objects.create(**notification_data)


def notify_admins(
    title,
    message,
    notification_type="system",
    actor=None,
    target_url="",
):
    """
    Notify all active administrators.
    """

    admins = User.objects.filter(role="admin", is_active=True)

    if actor is not None and isinstance(actor, User):
        if getattr(actor, "role", None) == "admin":
            admins = admins.exclude(pk=actor.pk)

    return Notification.objects.bulk_create([
        Notification(
            recipient=admin,
            actor=actor if isinstance(actor, User) else None,
            title=title,
            message=message,
            notification_type=notification_type,
            target_url=target_url,
        )
        for admin in admins
    ])