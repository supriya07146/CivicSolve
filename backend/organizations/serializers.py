
from rest_framework import serializers
from organizations.models import Organization


class OrganizationProfileSerializer(serializers.ModelSerializer):
    """Expose editable profile fields and read-only verification details."""

    verification_document_url = serializers.SerializerMethodField()
    profile_image_url = serializers.SerializerMethodField()

    class Meta:
        model = Organization

        fields = [
            "id",
            "organization_name",
            "organization_type",
            "email",
            "phone",
            "address",
            "city",
            "state",
            "latitude",
            "longitude",
            "service_area",
            "categories",
            "description",
            "verification_document_url",
            "profile_image_url",
            "email_verified",
            "status",
            "is_active",
            "created_at",
            "updated_at",
            "verified_at",
        ]

        read_only_fields = [
            "id",
            "email",
            "verification_document_url",
            "profile_image_url",
            "email_verified",
            "status",
            "is_active",
            "created_at",
            "updated_at",
            "verified_at",
        ]

    def get_verification_document_url(self, obj):
        if not obj.verification_document:
            return None

        try:
            url = obj.verification_document.url
        except (ValueError, AttributeError):
            return None

        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(url)

        return url

    def get_profile_image_url(self, obj):
        if not obj.profile_image:
            return None

        try:
            url = obj.profile_image.url
        except (ValueError, AttributeError):
            return None

        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(url)

        return url

    def validate_organization_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError(
                "Organization name cannot be empty."
            )
        return value

    def validate_phone(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError(
                "Contact phone cannot be empty."
            )
        return value

    def validate_categories(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError(
                "Categories must be a list."
            )

        if not all(
            isinstance(item, (str, int)) and not isinstance(item, bool)
            for item in value
        ):
            raise serializers.ValidationError(
                "Each category must be a string or integer."
            )

        return value


from django.utils import timezone
from problems.models import ProblemAssignment


class ActiveProblemSerializer(serializers.ModelSerializer):
    assignment_id = serializers.IntegerField(
        source="id", read_only=True
    )
    problem_id = serializers.IntegerField(
        source="problem.id", read_only=True
    )
    problem_code = serializers.CharField(
        source="problem.problem_code", read_only=True
    )
    title = serializers.CharField(
        source="problem.title", read_only=True
    )
    description = serializers.CharField(
        source="problem.description", read_only=True
    )
    category = serializers.CharField(
        source="problem.category.name", read_only=True
    )
    location = serializers.CharField(
        source="problem.location", read_only=True
    )
    priority = serializers.CharField(
        source="problem.priority", read_only=True
    )
    problem_status = serializers.CharField(
        source="problem.status", read_only=True
    )
    assignment_status = serializers.CharField(
        source="status", read_only=True
    )
    is_escalated = serializers.BooleanField(
        source="problem.is_escalated", read_only=True
    )
    problem_created_at = serializers.DateTimeField(
        source="problem.created_at", read_only=True
    )
    days_open = serializers.SerializerMethodField()

    class Meta:
        model = ProblemAssignment
        fields = [
            "assignment_id",
            "problem_id",
            "problem_code",
            "title",
            "description",
            "category",
            "location",
            "priority",
            "problem_status",
            "assignment_status",
            "is_escalated",
            "assigned_at",
            "accepted_at",
            "notes",
            "problem_created_at",
            "days_open",
        ]

    def get_days_open(self, obj):
        return max(
            0,
            (
                timezone.localdate()
                - obj.problem.created_at.date()
            ).days,
        )

class ResolvedProblemSerializer(serializers.ModelSerializer):
    assignment_id = serializers.IntegerField(
        source="id",
        read_only=True,
    )
    problem_id = serializers.IntegerField(
        source="problem.id",
        read_only=True,
    )
    problem_code = serializers.CharField(
        source="problem.problem_code",
        read_only=True,
    )
    title = serializers.CharField(
        source="problem.title",
        read_only=True,
    )
    description = serializers.CharField(
        source="problem.description",
        read_only=True,
    )
    category = serializers.CharField(
        source="problem.category.name",
        read_only=True,
    )
    location = serializers.CharField(
        source="problem.location",
        read_only=True,
    )
    priority = serializers.CharField(
        source="problem.priority",
        read_only=True,
    )
    problem_status = serializers.CharField(
        source="problem.status",
        read_only=True,
    )
    resolution_notes = serializers.CharField(
        source="problem.resolution_notes",
        read_only=True,
    )
    resolved_at = serializers.DateTimeField(
        source="problem.resolved_at",
        read_only=True,
        allow_null=True,
    )
    completed_at = serializers.DateTimeField(read_only=True)

    class Meta:
        model = ProblemAssignment
        fields = [
            "assignment_id",
            "problem_id",
            "problem_code",
            "title",
            "description",
            "category",
            "location",
            "priority",
            "problem_status",
            "status",
            "assigned_at",
            "accepted_at",
            "completed_at",
            "resolved_at",
            "resolution_notes",
            "notes",
        ]


from problems.models import ProblemProgressUpdate


class ProblemProgressUpdateSerializer(serializers.ModelSerializer):
    evidence_url = serializers.SerializerMethodField()

    class Meta:
        model = ProblemProgressUpdate
        fields = [
            "id",
            "assignment",
            "progress_percentage",
            "update_notes",
            "evidence",
            "evidence_url",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "assignment",
            "evidence_url",
            "created_at",
        ]

    def get_evidence_url(self, obj):
        if not obj.evidence:
            return None

        try:
            url = obj.evidence.url
        except (ValueError, AttributeError):
            return None

        request = self.context.get("request")
        return request.build_absolute_uri(url) if request else url

    def validate_progress_percentage(self, value):
        if not 0 <= value <= 100:
            raise serializers.ValidationError(
                "Progress must be between 0 and 100."
            )
        return value

    def validate_update_notes(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError(
                "Please describe the work completed."
            )
        return value

    def validate_evidence(self, value):
        if value and value.size > 5 * 1024 * 1024:
            raise serializers.ValidationError(
                "Evidence image must be 5 MB or smaller."
            )
        return value


class OrganizationProgressAssignmentSerializer(
    serializers.ModelSerializer
):
    assignment_id = serializers.IntegerField(
        source="id", read_only=True
    )
    problem_id = serializers.IntegerField(
        source="problem.id", read_only=True
    )
    problem_code = serializers.CharField(
        source="problem.problem_code", read_only=True
    )
    title = serializers.CharField(
        source="problem.title", read_only=True
    )
    category = serializers.CharField(
        source="problem.category.name", read_only=True
    )
    location = serializers.CharField(
        source="problem.location", read_only=True
    )
    priority = serializers.CharField(
        source="problem.priority", read_only=True
    )
    latest_progress = serializers.SerializerMethodField()
    latest_update_at = serializers.SerializerMethodField()

    class Meta:
        model = ProblemAssignment
        fields = [
            "assignment_id",
            "problem_id",
            "problem_code",
            "title",
            "category",
            "location",
            "priority",
            "status",
            "assigned_at",
            "accepted_at",
            "latest_progress",
            "latest_update_at",
        ]

    def get_latest_progress(self, obj):
        update = obj.progress_updates.order_by(
            "-created_at", "-id"
        ).first()
        return update.progress_percentage if update else 0

    def get_latest_update_at(self, obj):
        update = obj.progress_updates.order_by(
            "-created_at", "-id"
        ).first()
        return update.created_at if update else None
