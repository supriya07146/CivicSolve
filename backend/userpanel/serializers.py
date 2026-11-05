
from rest_framework import serializers

from problems.models import Problem


class CitizenDashboardProblemSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(
        source="category.name",
        read_only=True,
    )

    ownership = serializers.SerializerMethodField()
    progress = serializers.SerializerMethodField()

    class Meta:
        model = Problem

        fields = [
            "id",
            "problem_code",
            "title",
            "category_name",
            "location",
            "priority",
            "status",
            "ownership",
            "progress",
            "created_at",
            "updated_at",
            "resolved_at",
        ]

        read_only_fields = fields

    def get_ownership(self, obj):
        assignments = list(obj.assignments.all())

        if not assignments:
            return {
                "organization_name": None,
                "assignment_status": None,
            }

        # Assignments are ordered newest first by the model.
        assignment = assignments[0]

        return {
            "organization_name": (
                assignment.organization.organization_name
            ),
            "assignment_status": assignment.status,
        }

    def get_progress(self, obj):
        """
        This percentage is a display estimate derived from
        existing statuses. It is not a stored completion value.
        """

        if obj.status in ("resolved", "closed"):
            return 100

        if obj.status == "in_progress":
            return 65

        if obj.status == "assigned":
            return 25

        if obj.status == "under_review":
            return 10

        return 0
