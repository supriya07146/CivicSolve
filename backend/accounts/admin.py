from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import (
    User,
    OTPCode,
    PasswordResetToken
)


@admin.register(User)
class CustomUserAdmin(UserAdmin):

    model = User

    list_display = (
        "email",
        "full_name",
        "role",
        "email_verified",
        "is_active",
        "created_at",
    )

    ordering = (
        "-created_at",
    )

    search_fields = (
        "email",
        "full_name",
    )

    fieldsets = (
        (
            None,
            {
                "fields": (
                    "email",
                    "password",
                )
            }
        ),
        (
            "Personal Information",
            {
                "fields": (
                    "full_name",
                    "phone",
                    "location",
                )
            }
        ),
        (
            "Permissions",
            {
                "fields": (
                    "role",
                    "email_verified",
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                )
            }
        ),
    )


@admin.register(OTPCode)
class OTPCodeAdmin(admin.ModelAdmin):

    list_display = (
        "id",
        "purpose",
        "user",
        "organization",
        "expires_at",
        "attempts",
        "is_used",
        "created_at",
    )

    readonly_fields = (
        "created_at",
    )


@admin.register(PasswordResetToken)
class PasswordResetTokenAdmin(admin.ModelAdmin):

    list_display = (
        "id",
        "user",
        "organization",
        "expires_at",
        "is_used",
        "created_at",
    )

    readonly_fields = (
        "created_at",
    )