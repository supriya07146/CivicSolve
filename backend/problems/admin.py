from django.contrib import admin

from .models import (
    Problem,
    ProblemAttachment,
    ProblemCategory,
    ProblemAssignment,
)


@admin.register(ProblemCategory)
class ProblemCategoryAdmin(admin.ModelAdmin):

    list_display = (
        "name",
        "is_active",
        "created_at",
    )

    list_filter = (
        "is_active",
    )

    search_fields = (
        "name",
        "description",
    )


@admin.register(Problem)
class ProblemAdmin(admin.ModelAdmin):

    list_display = (
        "problem_code",
        "title",
        "category",
        "reported_by",
        "priority",
        "status",
        "created_at",
    )

    list_filter = (
        "status",
        "priority",
        "category",
    )

    search_fields = (
        "title",
        "description",
        "location",
        "reported_by__email",
    )

    readonly_fields = (
        "problem_code",
        "created_at",
        "updated_at",
        "resolved_at",
    )


@admin.register(ProblemAttachment)
class ProblemAttachmentAdmin(admin.ModelAdmin):

    list_display = (
        "problem",
        "file",
        "uploaded_at",
    )

    search_fields = (
        "problem__title",
        "problem__location",
    )

    readonly_fields = (
        "uploaded_at",
    )

@admin.register(ProblemAssignment)
class ProblemAssignmentAdmin(admin.ModelAdmin):

    list_display = (
        "problem",
        "organization",
        "assigned_by",
        "status",
        "assigned_at",
    )

    list_filter = (
        "status",
        "assigned_at",
    )

    search_fields = (
        "problem__title",
        "problem__problem_code",
        "organization__organization_name",
    )

    readonly_fields = (
        "assigned_at",
        "accepted_at",
        "completed_at",
    )