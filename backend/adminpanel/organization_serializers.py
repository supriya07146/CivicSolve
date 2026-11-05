from django.contrib.auth.hashers import make_password
from django.utils import timezone
from rest_framework import serializers

from organizations.models import Organization



class AdminOrganizationListSerializer(serializers.ModelSerializer):

    organization_type_display = serializers.CharField(
        source="get_organization_type_display",
        read_only=True
    )

    status_display = serializers.CharField(
        source="get_status_display",
        read_only=True
    )

    document_url = serializers.SerializerMethodField()

    class Meta:
        model = Organization

        fields = [
            "id",
            "organization_name",
            "organization_type",
            "organization_type_display",

            "email",
            "phone",

            "city",
            "state",
            "service_area",
            "categories",

            "verification_document",
            "document_url",

            "email_verified",

            "status",
            "status_display",
            "is_active",

            "created_at",
            "verified_at",
        ]

    def get_document_url(self, obj):

        if not obj.verification_document:
            return None

        request = self.context.get("request")

        if request:
            return request.build_absolute_uri(
                obj.verification_document.url
            )

        return obj.verification_document.url


class AdminOrganizationDetailSerializer(
    serializers.ModelSerializer
):

    organization_type_display = serializers.CharField(
        source="get_organization_type_display",
        read_only=True
    )

    status_display = serializers.CharField(
        source="get_status_display",
        read_only=True
    )

    document_url = serializers.SerializerMethodField()

    class Meta:
        model = Organization

        fields = [
            "id",

            "organization_name",
            "organization_type",
            "organization_type_display",

            "email",
            "phone",

            "address",
            "latitude",
            "longitude",

            "city",
            "state",
            "service_area",

            "categories",
            "description",

            "verification_document",
            "document_url",

            "email_verified",

            "status",
            "status_display",
            "is_active",

            "created_at",
            "updated_at",
            "verified_at",
        ]

    def get_document_url(self, obj):

        if not obj.verification_document:
            return None

        request = self.context.get("request")

        if request:
            return request.build_absolute_uri(
                obj.verification_document.url
            )

        return obj.verification_document.url


class AdminOrganizationCreateSerializer(serializers.ModelSerializer):
    """
    Used when an admin adds an organization directly.
    The organization is created as approved, active and email-verified,
    because the admin is vouching for it.
    """

    password = serializers.CharField(
        write_only=True,
        required=False,
        allow_blank=True,
        min_length=8,
        style={"input_type": "password"},
    )

    class Meta:
        model = Organization

        fields = [
            "organization_name",
            "organization_type",

            "email",
            "phone",

            "address",
            "latitude",
            "longitude",

            "city",
            "state",
            "service_area",

            "categories",
            "description",

            "verification_document",

            "password",
        ]

        extra_kwargs = {
            "verification_document": {"required": False},
        }

    def validate_organization_name(self, value):

        value = value.strip()

        if Organization.objects.filter(
            organization_name__iexact=value
        ).exists():
            raise serializers.ValidationError(
                "An organization with this name already exists."
            )

        return value

    def validate_email(self, value):

        value = value.strip().lower()

        if Organization.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError(
                "An organization with this email already exists."
            )

        return value

    def create(self, validated_data):

        password = validated_data.pop("password", None)

        organization = Organization(**validated_data)

        organization.status = "approved"
        organization.is_active = True
        organization.email_verified = True
        organization.verified_at = timezone.now()

        if password:
            if hasattr(organization, "set_password"):
                organization.set_password(password)
            elif hasattr(organization, "password"):
                organization.password = make_password(password)

        organization.save()

        return organization