from rest_framework import serializers

# Re-export organization serializers for backward compatibility
from .organization_serializers import (
    AdminOrganizationListSerializer,
    AdminOrganizationDetailSerializer,
    AdminOrganizationCreateSerializer,
)


class ChangeAdminPasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(
        required=True,
        write_only=True,
        style={"input_type": "password"},
    )
    new_password = serializers.CharField(
        required=True,
        write_only=True,
        min_length=8,
        style={"input_type": "password"},
    )
    confirm_password = serializers.CharField(
        required=True,
        write_only=True,
        style={"input_type": "password"},
    )

    def validate(self, attrs):
        if attrs.get("new_password") != attrs.get("confirm_password"):
            raise serializers.ValidationError(
                {"confirm_password": "The new passwords do not match."}
            )
        if attrs.get("current_password") == attrs.get("new_password"):
            raise serializers.ValidationError(
                {"new_password": "Your new password must differ from your current password."}
            )
        return attrs