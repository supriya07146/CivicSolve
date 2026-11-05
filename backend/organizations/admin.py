from django.contrib import admin

from .models import Organization


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):

    list_display = (
        "organization_name",
        "email",
        "organization_type",
        "email_verified",
        "status",
        "is_active",
        "created_at",
    )

    list_filter = (
        "status",
        "organization_type",
        "email_verified",
        "is_active",
    )

    search_fields = (
        "organization_name",
        "email",
        "city",
        "state",
    )

    readonly_fields = (
        "created_at",
        "updated_at",
        "verified_at",
    )