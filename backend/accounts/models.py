from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.contrib.auth.base_user import BaseUserManager


class UserManager(BaseUserManager):

    def create_user(self, email, password=None, **extra_fields):

        if not email:
            raise ValueError("Email is required")

        email = self.normalize_email(email)

        user = self.model(
            email=email,
            **extra_fields
        )

        user.set_password(password)
        user.save(using=self._db)

        return user

    def create_superuser(self, email, password=None, **extra_fields):

        extra_fields.setdefault("role", "admin")
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)
        extra_fields.setdefault("email_verified", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True")

        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True")

        return self.create_user(
            email,
            password,
            **extra_fields
        )


class User(AbstractBaseUser, PermissionsMixin):

    ROLE_CHOICES = (
        ("citizen", "Citizen"),
        ("admin", "Admin"),
    )

    full_name = models.CharField(
        max_length=100
    )

    email = models.EmailField(
        unique=True,
        db_index=True
    )

    phone = models.CharField(
        max_length=15
    )

    location = models.CharField(
        max_length=255,
        blank=True,
        default=""
    )

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

    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default="citizen"
    )

    email_verified = models.BooleanField(
        default=False
    )

    is_active = models.BooleanField(
        default=False
    )

    is_staff = models.BooleanField(
        default=False
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    objects = UserManager()

    USERNAME_FIELD = "email"

    REQUIRED_FIELDS = [
        "full_name"
    ]

    class Meta:
        db_table = "accounts_user"
        ordering = ["-created_at"]

    def __str__(self):
        return self.email


class CitizenProfile(models.Model):
    LANGUAGE_CHOICES = [
        ("en", "English"),
        ("te", "Telugu"),
        ("hi", "Hindi"),
    ]

    user = models.OneToOneField(
        "accounts.User",
        on_delete=models.CASCADE,
        related_name="citizen_profile",
    )

    # Profile photo
    profile_image = models.ImageField(
        upload_to="profile_images/",
        null=True,
        blank=True,
    )

    # Profile preferences
    language_preference = models.CharField(
        max_length=5,
        choices=LANGUAGE_CHOICES,
        default="en",
    )

    show_name_publicly = models.BooleanField(default=True)
    show_location_publicly = models.BooleanField(default=True)

    # Notification preferences
    issue_progress_notifications = models.BooleanField(default=True)
    discussion_reply_notifications = models.BooleanField(default=True)
    weekly_digest_notifications = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "accounts_citizen_profile"

    def __str__(self):
        return f"Profile - {self.user.email}"


class OTPCode(models.Model):

    PURPOSE_CHOICES = [
        ("registration", "Registration"),
        ("password_reset", "Password Reset"),
    ]

    user = models.ForeignKey(
        "accounts.User",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="otp_codes"
    )

    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="otp_codes"
    )

    purpose = models.CharField(
        max_length=30,
        choices=PURPOSE_CHOICES
    )

    otp_hash = models.CharField(
        max_length=255
    )

    expires_at = models.DateTimeField()

    attempts = models.PositiveIntegerField(
        default=0
    )

    is_used = models.BooleanField(
        default=False
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    class Meta:
        db_table = "otp_codes"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.purpose} - {self.created_at}"


class PasswordResetToken(models.Model):

    user = models.ForeignKey(
        "accounts.User",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="password_reset_tokens"
    )

    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="password_reset_tokens"
    )

    token_hash = models.CharField(
        max_length=255
    )

    expires_at = models.DateTimeField()

    is_used = models.BooleanField(
        default=False
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    class Meta:
        db_table = "password_reset_tokens"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Password reset - {self.created_at}"