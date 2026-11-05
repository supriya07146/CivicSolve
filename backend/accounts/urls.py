from django.urls import path

from .views import (
    CitizenRegisterView,
    CitizenVerifyOTPView,
    CitizenResendOTPView,

    OrganizationRegisterView,
    OrganizationVerifyOTPView,
    OrganizationResendOTPView,

    LoginView,
    ForgotPasswordView,
    VerifyResetOTPView,
    ResetPasswordView,

    AdminLoginView,
    AdminCitizenListView,
    PendingOrganizationsView,
    ApproveOrganizationView,
    RejectOrganizationView,
    SuspendOrganizationView,

    CitizenProfileView,
    CitizenProfileImageDeleteView,
    CitizenChangePasswordView,
)


urlpatterns = [

    # =========================================================
    # CITIZEN AUTHENTICATION
    # =========================================================

    path(
        "citizen/register/",
        CitizenRegisterView.as_view(),
        name="citizen-register"
    ),

    path(
        "citizen/verify-otp/",
        CitizenVerifyOTPView.as_view(),
        name="citizen-verify-otp"
    ),

    path(
        "citizen/resend-otp/",
        CitizenResendOTPView.as_view(),
        name="citizen-resend-otp"
    ),


    # =========================================================
    # ORGANIZATION AUTHENTICATION
    # =========================================================

    path(
        "organization/register/",
        OrganizationRegisterView.as_view(),
        name="organization-register"
    ),

    path(
        "organization/verify-otp/",
        OrganizationVerifyOTPView.as_view(),
        name="organization-verify-otp"
    ),

    path(
        "organization/resend-otp/",
        OrganizationResendOTPView.as_view(),
        name="organization-resend-otp"
    ),


    # =========================================================
    # COMMON LOGIN
    # =========================================================

    path(
        "login/",
        LoginView.as_view(),
        name="login"
    ),


    # =========================================================
    # PASSWORD RESET
    # =========================================================

    path(
        "forgot-password/",
        ForgotPasswordView.as_view(),
        name="forgot-password"
    ),

    path(
        "verify-reset-otp/",
        VerifyResetOTPView.as_view(),
        name="verify-reset-otp"
    ),

    path(
        "reset-password/",
        ResetPasswordView.as_view(),
        name="reset-password"
    ),


    # =========================================================
    # ADMIN AUTHENTICATION
    # =========================================================

    path(
        "admin/login/",
        AdminLoginView.as_view(),
        name="admin-login"
    ),

    # =========================================================
# CITIZEN PROFILE
# =========================================================

path(
    "profile/",
    CitizenProfileView.as_view(),
    name="citizen-profile",
),

path(
    "profile/image/",
    CitizenProfileImageDeleteView.as_view(),
    name="citizen-profile-image-delete",
),

path(
    "profile/change-password/",
    CitizenChangePasswordView.as_view(),
    name="citizen-change-password",
),
]