
from rest_framework import serializers

from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    actor_name = serializers.SerializerMethodField()
    recipient_email = serializers.SerializerMethodField()
    recipient_organization_name = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            "id",
            "title",
            "message",
            "notification_type",
            "target_url",
            "actor",
            "actor_name",
            "recipient_email",
            "recipient_organization_name",
            "is_read",
            "created_at",
        ]
        read_only_fields = fields

    def get_actor_name(self, obj):
        if obj.actor_id:
            return (
                getattr(obj.actor, "full_name", "")
                or obj.actor.email
            )
        return "System"

    def get_recipient_email(self, obj):
        if obj.recipient_id:
            return obj.recipient.email
        return None

    def get_recipient_organization_name(self, obj):
        if obj.recipient_organization_id:
            return obj.recipient_organization.organization_name
        return None