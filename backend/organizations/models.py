from django.db import models
from django.contrib.auth.hashers import make_password, check_password
from django.core.validators import FileExtensionValidator
from django.core.validators import FileExtensionValidator

class Organization(models.Model):

    ORGANIZATION_TYPES = [
        ("government", "Government / Local Authority"),
        ("ngo", "NGO / Non-Profit"),
        ("private", "Private Organization"),
        ("community", "Community Organization"),
        ("educational", "Educational Institution"),
        ("other", "Other"),
    ]

    STATUS_CHOICES = [
        ("pending_verification", "Pending Verification"),
        ("approved", "Approved"),
        ("rejected", "Rejected"),
        ("suspended", "Suspended"),
    ]

    organization_name = models.CharField(
        max_length=150
    )

    profile_image = models.ImageField(
    upload_to="organization_profiles/",
    blank=True,
    null=True,
    )

    organization_type = models.CharField(
        max_length=30,
        choices=ORGANIZATION_TYPES
    )

    email = models.EmailField(
        unique=True,
        db_index=True
    )

    phone = models.CharField(
        max_length=15
    )

    address = models.TextField()

    latitude = models.DecimalField(
    max_digits=10,
    decimal_places=7,
    null=True,
    blank=True
    )

    longitude = models.DecimalField(
    max_digits=10,
    decimal_places=7,
    null=True,
    blank=True
    )

    city = models.CharField(
        max_length=100
    )

    state = models.CharField(
        max_length=100
    )

    service_area = models.CharField(
        max_length=255
    )

    categories = models.JSONField(
        default=list
    )

    description = models.TextField()

    verification_document = models.FileField(
        upload_to="organization_documents/",
        validators=[
            FileExtensionValidator(
                allowed_extensions=[
                    "pdf",
                    "jpg",
                    "jpeg",
                    "png"
                ]
            )
        ],
        null=True,
        blank=True
    )

    password = models.CharField(
        max_length=255
    )

    email_verified = models.BooleanField(
        default=False
    )

    status = models.CharField(
        max_length=30,
        choices=STATUS_CHOICES,
        default="pending_verification"
    )

    is_active = models.BooleanField(
        default=False
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    verified_at = models.DateTimeField(
        null=True,
        blank=True
    )

    class Meta:
        db_table = "organizations"
        ordering = ["-created_at"]

    def set_password(self, raw_password):
        self.password = make_password(raw_password)

    def check_password(self, raw_password):
        return check_password(
            raw_password,
            self.password
        )

    @property
    def is_authenticated(self):
        return True

    def __str__(self):
        return self.organization_name