from django.db import models
from django.conf import settings


class AdminProfile(models.Model):

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="admin_profile"
    )

    profile_image = models.ImageField(
        upload_to="admin_profiles/",
        blank=True,
        null=True
    )

    designation = models.CharField(
        max_length=100,
        blank=True,
        default="Administrator"
    )

    department = models.CharField(
        max_length=100,
        blank=True,
        default=""
    )

    bio = models.TextField(
        blank=True,
        default=""
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    class Meta:
        db_table = "admin_profiles"

    def __str__(self):
        return f"Profile - {self.user.email}"


from django.conf import settings
from django.db import models


class Notification(models.Model):
    NOTIFICATION_TYPES = [
        ("problem", "Problem"),
        ("assignment", "Assignment"),
        ("solution", "Solution"),
        ("complaint", "Complaint"),
        ("organization", "Organization"),
        ("user", "User"),
        ("status", "Status Update"),
        ("system", "System"),
    ]

    # Citizen or admin recipient
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="civicsolve_notifications",
        null=True,
        blank=True,
    )

    # Separate recipient field for organization accounts
    recipient_organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="civicsolve_notifications",
        null=True,
        blank=True,
    )

    # The actor is an accounts.User, such as an admin or citizen.
    # Leave this null when the action is performed by an organization.
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="civicsolve_notifications_sent",
    )

    title = models.CharField(max_length=200)
    message = models.TextField()

    notification_type = models.CharField(
        max_length=30,
        choices=NOTIFICATION_TYPES,
        default="system",
    )

    target_url = models.CharField(max_length=500, blank=True, default="")
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "adminpanel_notifications"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["recipient", "is_read"]),
            models.Index(fields=["recipient", "-created_at"]),
            models.Index(fields=["recipient_organization", "is_read"]),
            models.Index(fields=["recipient_organization", "-created_at"]),
        ]

    def __str__(self):
        if self.recipient_id:
            recipient_label = self.recipient.email
        elif self.recipient_organization_id:
            recipient_label = self.recipient_organization.organization_name
        else:
            recipient_label = "No recipient"

        return f"{self.title} - {recipient_label}"