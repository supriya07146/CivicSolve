
from rest_framework import serializers

from problems.models import Solution, Problem, ProblemAssignment


class AdminSolutionSerializer(serializers.ModelSerializer):
    problem_title = serializers.CharField(
        source="problem.title",
        read_only=True,
    )
    organization_name = serializers.CharField(
        source="organization.organization_name",
        read_only=True,
        default=None,
    )

    class Meta:
        model = Solution
        fields = [
            "id",
            "problem",
            "problem_title",
            "assignment",
            "submitted_by",
            "organization",
            "organization_name",
            "title",
            "description",
            "proposed_action",
            "status",
            "admin_review_notes",
            "reviewed_by",
            "reviewed_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "submitted_by",
            "status",
            "admin_review_notes",
            "reviewed_by",
            "reviewed_at",
            "created_at",
            "updated_at",
        ]


class AdminSolutionCreateSerializer(serializers.ModelSerializer):
    problem = serializers.PrimaryKeyRelatedField(
        queryset=Problem.objects.all()
    )
    assignment = serializers.PrimaryKeyRelatedField(
        queryset=ProblemAssignment.objects.all(),
        required=False,
        allow_null=True,
    )

    class Meta:
        model = Solution
        fields = [
            "problem",
            "assignment",
            "title",
            "description",
            "proposed_action",
        ]

    def validate(self, attrs):
        problem = attrs["problem"]
        assignment = attrs.get("assignment")

        if assignment and assignment.problem_id != problem.id:
            raise serializers.ValidationError({
                "assignment": (
                    "The selected assignment does not belong "
                    "to the selected problem."
                )
            })

        return attrs