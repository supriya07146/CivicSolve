from rest_framework import serializers

from problems.models import (
    Problem,
    ProblemAttachment,
    ProblemAssignment,
)


class AdminProblemAttachmentSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = ProblemAttachment
        fields = [
            "id",
            "file",
            "file_url",
            "uploaded_at",
        ]

    def get_file_url(self, obj):
        if not obj.file:
            return None

        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(obj.file.url)

        return obj.file.url


class AdminProblemAssignmentSerializer(serializers.ModelSerializer):
    organization_name = serializers.CharField(
        source="organization.organization_name",
        read_only=True,
    )
    organization_email = serializers.EmailField(
        source="organization.email",
        read_only=True,
    )
    assigned_by_name = serializers.CharField(
        source="assigned_by.full_name",
        read_only=True,
    )
    status_display = serializers.CharField(
        source="get_status_display",
        read_only=True,
    )

    class Meta:
        model = ProblemAssignment
        fields = [
            "id",
            "organization",
            "organization_name",
            "organization_email",
            "assigned_by",
            "assigned_by_name",
            "status",
            "status_display",
            "assigned_at",
            "accepted_at",
            "completed_at",
            "notes",
        ]


class AdminProblemListSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(
        source="category.name",
        read_only=True,
    )
    citizen_name = serializers.CharField(
        source="reported_by.full_name",
        read_only=True,
    )
    citizen_email = serializers.EmailField(
        source="reported_by.email",
        read_only=True,
    )
    priority_display = serializers.CharField(
        source="get_priority_display",
        read_only=True,
    )
    status_display = serializers.CharField(
        source="get_status_display",
        read_only=True,
    )
    attachment_count = serializers.IntegerField(
        source="attachments.count",
        read_only=True,
    )

    class Meta:
        model = Problem
        fields = [
            "id",
            "problem_code",
            "title",
            "description",
            "category",
            "category_name",
            "reported_by",
            "citizen_name",
            "citizen_email",
            "location",
            "latitude",
            "longitude",
            "priority",
            "priority_display",
            "status",
            "status_display",
            "attachment_count",
            "created_at",
            "updated_at",
            "resolved_at",
        ]


class AdminProblemDetailSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(
        source="category.name",
        read_only=True,
    )
    category_description = serializers.CharField(
        source="category.description",
        read_only=True,
    )
    citizen_name = serializers.CharField(
        source="reported_by.full_name",
        read_only=True,
    )
    citizen_email = serializers.EmailField(
        source="reported_by.email",
        read_only=True,
    )
    citizen_phone = serializers.CharField(
        source="reported_by.phone",
        read_only=True,
    )
    priority_display = serializers.CharField(
        source="get_priority_display",
        read_only=True,
    )
    status_display = serializers.CharField(
        source="get_status_display",
        read_only=True,
    )
    attachments = AdminProblemAttachmentSerializer(
        many=True,
        read_only=True,
    )
    assignments = AdminProblemAssignmentSerializer(
        many=True,
        read_only=True,
    )

    class Meta:
        model = Problem
        fields = [
            "id",
            "problem_code",
            "title",
            "description",
            "category",
            "category_name",
            "category_description",
            "reported_by",
            "citizen_name",
            "citizen_email",
            "citizen_phone",
            "location",
            "latitude",
            "longitude",
            "priority",
            "priority_display",
            "status",
            "status_display",
            "resolution_notes",
            "resolved_at",
            "attachments",
            "assignments",
            "created_at",
            "updated_at",
        ]