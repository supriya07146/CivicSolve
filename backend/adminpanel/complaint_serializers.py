
from rest_framework import serializers

from accounts.models import User
from organizations.models import Organization
from problems.models import Complaint, Problem


class ComplaintSerializer(serializers.ModelSerializer):
    problem_title = serializers.CharField(
        source="problem.title", read_only=True, default=None
    )
    target_organization_name = serializers.CharField(
        source="target_organization.organization_name",
        read_only=True,
        default=None,
    )

    class Meta:
        model = Complaint
        fields = [
            "id",
            "complaint_code",
            "target_type",
            "problem",
            "problem_title",
            "target_organization",
            "target_organization_name",
            "title",
            "description",
            "status",
            "admin_investigation_notes",
            "resolution_notes",
            "reviewed_at",
            "resolved_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "complaint_code",
            "status",
            "admin_investigation_notes",
            "resolution_notes",
            "reviewed_at",
            "resolved_at",
            "created_at",
            "updated_at",
        ]


class ComplaintCreateSerializer(serializers.ModelSerializer):
    problem = serializers.PrimaryKeyRelatedField(
        queryset=Problem.objects.all(),
        required=False,
        allow_null=True,
    )
    target_organization = serializers.PrimaryKeyRelatedField(
        queryset=Organization.objects.all(),
        required=False,
        allow_null=True,
    )

    class Meta:
        model = Complaint
        fields = [
            "target_type",
            "problem",
            "target_organization",
            "title",
            "description",
        ]

    def validate(self, attrs):
        target_type = attrs.get("target_type")
        problem = attrs.get("problem")
        organization = attrs.get("target_organization")

        if target_type in ("problem", "problem_handling") and not problem:
            raise serializers.ValidationError({
                "problem": "Select the community problem."
            })

        if target_type == "organization" and not organization:
            raise serializers.ValidationError({
                "target_organization": "Select the organization."
            })

        if target_type != "organization" and organization:
            raise serializers.ValidationError({
                "target_organization":
                    "This field is only for organization complaints."
            })

        if target_type == "organization" and problem:
            raise serializers.ValidationError({
                "problem":
                    "Do not select a problem for an organization complaint."
            })

        return attrs