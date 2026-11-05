
from rest_framework import serializers

from problems.models import ProblemAssignment
from .notification_service import create_notification, notify_admins


class AdminAssignmentSerializer(serializers.ModelSerializer):
    problem_title = serializers.CharField(
        source="problem.title", read_only=True
    )
    problem_code = serializers.UUIDField(
        source="problem.problem_code", read_only=True
    )
    problem_status = serializers.CharField(
        source="problem.status", read_only=True
    )
    problem_location = serializers.CharField(
        source="problem.location", read_only=True
    )
    organization_name = serializers.CharField(
        source="organization.organization_name", read_only=True
    )
    organization_email = serializers.EmailField(
        source="organization.email", read_only=True
    )
    assigned_by_name = serializers.CharField(
        source="assigned_by.full_name", read_only=True
    )
    status_display = serializers.CharField(
        source="get_status_display", read_only=True
    )

    class Meta:
        model = ProblemAssignment
        fields = [
            "id",
            "problem",
            "problem_title",
            "problem_code",
            "problem_status",
            "problem_location",
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
        read_only_fields = [
            "id",
            "assigned_by",
            "status",
            "assigned_at",
            "accepted_at",
            "completed_at",
        ]


class AdminAssignmentCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProblemAssignment
        fields = ["problem", "organization", "notes"]

    def validate(self, attrs):
        problem = attrs["problem"]
        organization = attrs["organization"]

        if problem.status in ["resolved", "rejected", "closed"]:
            raise serializers.ValidationError(
                {"problem": "This problem cannot be assigned in its current status."}
            )

        if hasattr(organization, "status") and organization.status != "approved":
            raise serializers.ValidationError(
                {"organization": "Only approved organizations can receive assignments."}
            )

        existing_assignment = ProblemAssignment.objects.filter(
            problem=problem,
            organization=organization,
        ).exclude(status="cancelled").exists()

        if existing_assignment:
            raise serializers.ValidationError(
                {"organization": "This organization already has an active assignment for this problem."}
            )

        return attrs

    def create(self, validated_data):
        request = self.context["request"]

        assignment = ProblemAssignment.objects.create(
            assigned_by=request.user,
            **validated_data,
        )

        problem = assignment.problem

        if problem.status in ["open", "under_review"]:
            problem.status = "assigned"
            problem.save(update_fields=["status", "updated_at"])

        # Notify the assigned organization
        try:
            create_notification(
                recipient=assignment.organization,
                title="New problem assigned",
                message=f'Problem "{problem.title}" ({problem.problem_code}) has been assigned to your organization.',
                notification_type="assignment",
                actor=request.user,
                target_url="/organizer/dashboard",
            )
        except Exception:
            pass

        # Notify the citizen who reported the problem
        if problem.reported_by:
            try:
                create_notification(
                    recipient=problem.reported_by,
                    title="Problem assigned to team",
                    message=f'Your reported problem "{problem.title}" has been assigned to {assignment.organization.organization_name}.',
                    notification_type="assignment",
                    actor=request.user,
                    target_url="/citizen/problems",
                )
            except Exception:
                pass

        return assignment