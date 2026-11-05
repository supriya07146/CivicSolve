
from rest_framework import serializers
from problems.models import ProblemCategory


class AdminCategorySerializer(serializers.ModelSerializer):
    problem_count = serializers.IntegerField(
        read_only=True,
        default=0
    )

    class Meta:
        model = ProblemCategory
        fields = [
            "id",
            "name",
            "description",
            "is_active",
            "problem_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "problem_count",
            "created_at",
            "updated_at",
        ]

    def validate_name(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Category name is required."
            )

        queryset = ProblemCategory.objects.filter(
            name__iexact=value
        )

        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)

        if queryset.exists():
            raise serializers.ValidationError(
                "A category with this name already exists."
            )

        return value

    def validate_description(self, value):
        return value.strip()