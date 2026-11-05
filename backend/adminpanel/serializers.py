from rest_framework import serializers

from accounts.models import User
from problems.models import Problem


class AdminCitizenListSerializer(serializers.ModelSerializer):

    problem_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = User

        fields = [
            "id",
            "full_name",
            "email",
            "phone",
            "location",
            "email_verified",
            "is_active",
            "created_at",
            "problem_count",
        ]


class AdminCitizenDetailSerializer(serializers.ModelSerializer):

    total_problems = serializers.IntegerField(read_only=True)
    open_problems = serializers.IntegerField(read_only=True)
    under_review_problems = serializers.IntegerField(read_only=True)
    assigned_problems = serializers.IntegerField(read_only=True)
    in_progress_problems = serializers.IntegerField(read_only=True)
    resolved_problems = serializers.IntegerField(read_only=True)
    rejected_problems = serializers.IntegerField(read_only=True)
    closed_problems = serializers.IntegerField(read_only=True)

    class Meta:
        model = User

        fields = [
            "id",
            "full_name",
            "email",
            "phone",
            "location",
            "latitude",
            "longitude",
            "role",
            "email_verified",
            "is_active",
            "created_at",
            "updated_at",

            "total_problems",
            "open_problems",
            "under_review_problems",
            "assigned_problems",
            "in_progress_problems",
            "resolved_problems",
            "rejected_problems",
            "closed_problems",
        ]


class AdminCitizenStatusSerializer(serializers.Serializer):

    is_active = serializers.BooleanField()

    reason = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=500
    )

    def validate_reason(self, value):

        return value.strip()


class AdminCitizenProblemSerializer(serializers.ModelSerializer):

    category_name = serializers.CharField(
        source="category.name",
        read_only=True
    )

    class Meta:
        model = Problem

        fields = [
            "id",
            "problem_code",
            "title",
            "description",
            "category_name",
            "location",
            "latitude",
            "longitude",
            "priority",
            "status",
            "resolution_notes",
            "resolved_at",
            "created_at",
            "updated_at",
        ]