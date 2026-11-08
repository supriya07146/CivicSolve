import logging

from django.contrib.auth.hashers import check_password
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from django.shortcuts import get_object_or_404

from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from rest_framework_simplejwt.tokens import AccessToken, RefreshToken
from rest_framework_simplejwt.exceptions import TokenError

from .models import (
    User,
    CitizenProfile,
    OTPCode,
    PasswordResetToken,
)

from drf_spectacular.utils import (
    extend_schema,
    extend_schema_view,
    OpenApiResponse,
    OpenApiParameter,
)

from adminpanel.notification_service import (
    create_notification,
    notify_admins,
)

from .serializers import (
    CitizenRegisterSerializer,
    OrganizationRegisterSerializer,
    LoginSerializer,
    ForgotPasswordSerializer,
    VerifyResetOTPSerializer,
    ResetPasswordSerializer,
    AdminLoginSerializer,
    AdminCitizenListSerializer,
    AdminCitizenDetailSerializer,
    AdminCitizenProblemSerializer,
    CitizenProfileSerializer,
    CitizenChangePasswordSerializer,
)

from drf_spectacular.utils import (
    extend_schema,
    extend_schema_view,
    OpenApiResponse,
    OpenApiParameter,
)



from .utils import (
    generate_otp,
    generate_reset_token,
    hash_token,
    create_otp_hash,
    otp_expiry,
    reset_token_expiry,
    send_registration_otp,
    send_password_reset_otp,
    send_welcome_email,
    send_organization_approval_email,
    MAX_OTP_ATTEMPTS
)

from organizations.models import Organization

logger = logging.getLogger(__name__)


def try_send(send_func, *args):
    """Run an email function. Returns True if sent, False if it failed."""
    try:
        send_func(*args)
        return True
    except Exception:
        logger.exception("Email sending failed")
        return False


class IsCivicAdmin(IsAuthenticated):

    def has_permission(self, request, view):

        if not super().has_permission(request, view):
            return False

        user = request.user

        return (
            getattr(user, "role", None) == "admin"
            and getattr(user, "is_staff", False)
            and getattr(user, "is_active", False)
        )
    

def create_tokens(actor, actor_type):

    refresh = RefreshToken()

    refresh["actor_type"] = actor_type
    refresh["actor_id"] = actor.id

    access = refresh.access_token

    access["actor_type"] = actor_type
    access["actor_id"] = actor.id

    return {
        "refresh": str(refresh),
        "access": str(access)
    }


def invalidate_old_registration_otps(
    user=None,
    organization=None
):

    queryset = OTPCode.objects.filter(
        purpose="registration",
        is_used=False
    )

    if user:
        queryset = queryset.filter(
            user=user
        )

    if organization:
        queryset = queryset.filter(
            organization=organization
        )

    queryset.update(
        is_used=True
    )

@extend_schema(
    tags=["Citizen"],
    summary="Register a citizen",
    description=(
        "Creates a new citizen account and sends an OTP "
        "to the registered email address for verification."
    ),
    request=CitizenRegisterSerializer,
    responses={
        201: OpenApiResponse(
            description="Citizen registered successfully. OTP sent to email."
        ),
        400: OpenApiResponse(
            description="Validation error."
        ),
    },
)

class CitizenRegisterView(APIView):

    permission_classes = [AllowAny]

    def post(self, request):

        serializer = CitizenRegisterSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        data = serializer.validated_data

        latitude = data.get("latitude")
        longitude = data.get("longitude")

        if latitude is not None:
          latitude = round(float(latitude), 7)

        if longitude is not None:
           longitude = round(float(longitude), 7)
        
        with transaction.atomic():

            user = User.objects.create_user(
                email=data["email"],
                password=data["password"],
                full_name=data["full_name"],
                phone=data["phone"],
                location=data.get("location",""),
                latitude=latitude,
                longitude=longitude,
                role="citizen",
                email_verified=False,
                is_active=False
            )

            CitizenProfile.objects.get_or_create(
                user=user
            )

            otp = generate_otp()

            OTPCode.objects.create(
                user=user,
                purpose="registration",
                otp_hash=create_otp_hash(otp),
                expires_at=otp_expiry()
            )

            create_notification(
              recipient=user,
              title="Registration successful",
              message="Welcome to CivicSolve! Please verify your email to activate your account.",
              notification_type="user",
              target_url="/verify-otp",
            )

            notify_admins(
                title="New citizen registration",
                message=f"A new citizen has registered: {user.full_name}.",
                notification_type="user",
               target_url="/admin/users",
            )

        # Email is sent after the transaction so a mail failure
        # never rolls back the registration.
        email_sent = try_send(
            send_registration_otp,
            user.email,
            user.full_name,
            otp,
            "Citizen"
        )

        return Response(
            {
                "success": True,
                "message": (
                    "Registration successful. "
                    "A verification OTP has been sent to your email."
                    if email_sent else
                    "Registration successful, but we could not send "
                    "the OTP email. Please use Resend OTP."
                ),
                "email": user.email,
                "account_type": "citizen",
                "email_sent": email_sent,
            },
            status=status.HTTP_201_CREATED
        )

@extend_schema(
    tags=["Citizen"],
    summary="Verify citizen registration OTP",
    description=(
        "Verifies the OTP sent to the citizen's email address "
        "and activates the citizen account."
    ),
    responses={
        200: OpenApiResponse(
            description="OTP verified successfully."
        ),
        400: OpenApiResponse(
            description="Invalid, expired, or already-used OTP."
        ),
    },
)

class CitizenVerifyOTPView(APIView):

    permission_classes = [AllowAny]

    def post(self, request):

        email = request.data.get(
            "email",
            ""
        ).lower().strip()

        otp = request.data.get(
            "otp",
            ""
        ).strip()

        try:
            user = User.objects.get(
                email=email,
                role="citizen"
            )
        except User.DoesNotExist:

            return Response(
                {
                    "success": False,
                    "message":
                        "Invalid verification request."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        if user.email_verified:

            return Response(
                {
                    "success": True,
                    "message":
                        "Email is already verified."
                }
            )

        otp_record = OTPCode.objects.filter(
            user=user,
            purpose="registration",
            is_used=False
        ).order_by(
            "-created_at"
        ).first()

        if not otp_record:

            return Response(
                {
                    "success": False,
                    "message":
                        "No active OTP found. Please request a new OTP."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        if otp_record.expires_at < timezone.now():

            return Response(
                {
                    "success": False,
                    "message":
                        "OTP has expired. Please request a new OTP."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        if otp_record.attempts >= MAX_OTP_ATTEMPTS:

            return Response(
                {
                    "success": False,
                    "message":
                        "Maximum OTP attempts exceeded."
                },
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )

        if not check_password(
            otp,
            otp_record.otp_hash
        ):

            otp_record.attempts += 1
            otp_record.save(
                update_fields=["attempts"]
            )

            return Response(
                {
                    "success": False,
                    "message":
                        "Invalid OTP."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():

            otp_record.is_used = True
            otp_record.save(
                update_fields=["is_used"]
            )

            user.email_verified = True
            user.is_active = True
            user.save(
                update_fields=[
                    "email_verified",
                    "is_active"
                ]
            )

            create_notification(
    recipient=user,
    title="Email verified",
    message="Your email has been verified. Your CivicSolve account is ready.",
    notification_type="user",
    target_url="/login",
    )

        # Welcome email is sent after the transaction so a mail failure
        # never undoes a successful verification.
        try_send(
            send_welcome_email,
            user.email,
            user.full_name,
            "Citizen"
        )

        return Response(
            {
                "success": True,
                "message":
                    "Email verified successfully. "
                    "Your CivicSolve account is ready. "
                    "You can now login."
            }
        )

@extend_schema(
    tags=["Citizen"],
    summary="Resend citizen registration OTP",
    description=(
        "Invalidates previous registration OTPs and sends "
        "a new OTP to the citizen's email."
    ),
    responses={
        200: OpenApiResponse(
            description="New OTP sent successfully."
        ),
        400: OpenApiResponse(
            description="Unable to resend OTP."
        ),
    },
)

class CitizenResendOTPView(APIView):

    permission_classes = [AllowAny]

    def post(self, request):

        email = request.data.get(
            "email",
            ""
        ).lower().strip()

        try:
            user = User.objects.get(
                email=email,
                role="citizen"
            )
        except User.DoesNotExist:

            return Response(
                {
                    "success": False,
                    "message":
                        "Unable to process the request."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        if user.email_verified:

            return Response(
                {
                    "success": False,
                    "message":
                        "Email is already verified."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        invalidate_old_registration_otps(
            user=user
        )

        otp = generate_otp()

        OTPCode.objects.create(
            user=user,
            purpose="registration",
            otp_hash=create_otp_hash(otp),
            expires_at=otp_expiry()
        )

        if not try_send(
            send_registration_otp,
            user.email,
            user.full_name,
            otp,
            "Citizen"
        ):

            return Response(
                {
                    "success": False,
                    "message":
                        "Could not send the email. "
                        "Please try again in a minute."
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        return Response(
            {
                "success": True,
                "message":
                    "A new verification OTP has been sent."
            }
        )

@extend_schema(
    tags=["Organization"],
    summary="Register an organization",
    description=(
        "Registers a new organization. The organization starts in "
        "pending verification status and receives an OTP for email verification."
    ),
    request=OrganizationRegisterSerializer,
    responses={
        201: OpenApiResponse(
            description="Organization registered successfully."
        ),
        400: OpenApiResponse(
            description="Validation error."
        ),
    },
)

class OrganizationRegisterView(APIView):

    permission_classes = [AllowAny]

    def post(self, request):

        serializer = OrganizationRegisterSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        data = serializer.validated_data

        with transaction.atomic():

            organization = Organization(
                organization_name=data[
                    "organization_name"
                ],
                organization_type=data[
                    "organization_type"
                ],
                email=data["email"],
                phone=data["phone"],
                address=data["address"],
                latitude=data.get("latitude"),
                longitude=data.get("longitude"),
                city=data["city"],
                state=data["state"],
                service_area=data[
                    "service_area"
                ],
                categories=data[
                    "categories"
                ],
                description=data[
                    "description"
                ],
                verification_document=data.get(
                    "verification_document"
                ),
                email_verified=False,
                status="pending_verification",
                is_active=False
            )

            organization.set_password(
                data["password"]
            )

            organization.save()

            otp = generate_otp()

            OTPCode.objects.create(
                organization=organization,
                purpose="registration",
                otp_hash=create_otp_hash(otp),
                expires_at=otp_expiry()
            )

            notify_admins(
                title="New organization registration",
    message=(
        f"{organization.organization_name} has registered "
        "and is awaiting email verification and administrator approval."
    ),
    notification_type="organization",
    target_url="/admin/organizations",
     )

        # Email is sent after the transaction so a mail failure
        # never rolls back the registration.
        email_sent = try_send(
            send_registration_otp,
            organization.email,
            organization.organization_name,
            otp,
            "Organization"
        )

        return Response(
            {
                "success": True,
                "message": (
                    "Organization registration successful. "
                    "A verification OTP has been sent to your email."
                    if email_sent else
                    "Organization registration successful, but we could "
                    "not send the OTP email. Please use Resend OTP."
                ),
                "email": organization.email,
                "account_type": "organization",
                "status": organization.status,
                "email_sent": email_sent,
            },
            status=status.HTTP_201_CREATED
        )

@extend_schema(
    tags=["Organization"],
    summary="Verify organization registration OTP",
    description=(
        "Verifies the organization's email OTP. "
        "Successful verification does not automatically approve "
        "the organization; administrator approval is still required."
    ),
    responses={
        200: OpenApiResponse(
            description="Organization email verified successfully."
        ),
        400: OpenApiResponse(
            description="Invalid or expired OTP."
        ),
    },
)

class OrganizationVerifyOTPView(APIView):

    permission_classes = [AllowAny]

    def post(self, request):

        email = request.data.get(
            "email",
            ""
        ).lower().strip()

        otp = request.data.get(
            "otp",
            ""
        ).strip()

        try:
            organization = Organization.objects.get(
                email=email
            )
        except Organization.DoesNotExist:

            return Response(
                {
                    "success": False,
                    "message":
                        "Invalid verification request."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        otp_record = OTPCode.objects.filter(
            organization=organization,
            purpose="registration",
            is_used=False
        ).order_by(
            "-created_at"
        ).first()

        if not otp_record:

            return Response(
                {
                    "success": False,
                    "message":
                        "No active OTP found."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        if otp_record.expires_at < timezone.now():

            return Response(
                {
                    "success": False,
                    "message":
                        "OTP has expired."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        if otp_record.attempts >= MAX_OTP_ATTEMPTS:

            return Response(
                {
                    "success": False,
                    "message":
                        "Maximum OTP attempts exceeded."
                },
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )

        if not check_password(
            otp,
            otp_record.otp_hash
        ):

            otp_record.attempts += 1
            otp_record.save(
                update_fields=["attempts"]
            )

            return Response(
                {
                    "success": False,
                    "message":
                        "Invalid OTP."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():

            otp_record.is_used = True
            otp_record.save(
                update_fields=["is_used"]
            )

            organization.email_verified = True
            organization.save(
                update_fields=[
                    "email_verified"
                ]
            )

        return Response(
            {
                "success": True,
                "message":
                    "Email verified successfully. "
                    "Your organization is now waiting "
                    "for administrator approval.",
                "status":
                    organization.status
            }
        )

@extend_schema(
    tags=["Organization"],
    summary="Resend organization registration OTP",
    description=(
        "Invalidates previous registration OTPs and sends "
        "a new OTP to the organization's email."
    ),
    responses={
        200: OpenApiResponse(
            description="New OTP sent successfully."
        ),
        400: OpenApiResponse(
            description="Unable to resend OTP."
        ),
    },
)

class OrganizationResendOTPView(APIView):

    permission_classes = [AllowAny]

    def post(self, request):

        email = request.data.get(
            "email",
            ""
        ).lower().strip()

        try:
            organization = Organization.objects.get(
                email=email
            )
        except Organization.DoesNotExist:

            return Response(
                {
                    "success": False,
                    "message":
                        "Unable to process the request."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        if organization.email_verified:

            return Response(
                {
                    "success": False,
                    "message":
                        "Email is already verified."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        invalidate_old_registration_otps(
            organization=organization
        )

        otp = generate_otp()

        OTPCode.objects.create(
            organization=organization,
            purpose="registration",
            otp_hash=create_otp_hash(otp),
            expires_at=otp_expiry()
        )

        if not try_send(
            send_registration_otp,
            organization.email,
            organization.organization_name,
            otp,
            "Organization"
        ):

            return Response(
                {
                    "success": False,
                    "message":
                        "Could not send the email. "
                        "Please try again in a minute."
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        return Response(
            {
                "success": True,
                "message":
                    "A new verification OTP has been sent."
            }
        )

@extend_schema(
    tags=["Authentication"],
    summary="Login",
    description=(
        "Authenticates a citizen or organization using the selected panel "
        "and returns JWT access and refresh tokens."
    ),
    request=LoginSerializer,
    responses={
        200: OpenApiResponse(
            description="Login successful. JWT tokens returned."
        ),
        400: OpenApiResponse(
            description="Invalid login credentials or account status."
        ),
    },
)

class LoginView(APIView):

    permission_classes = [AllowAny]

    def post(self, request):

        serializer = LoginSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        panel = serializer.validated_data[
            "panel"
        ]

        email = serializer.validated_data[
            "email"
        ].lower().strip()

        password = serializer.validated_data[
            "password"
        ]

        if panel == "citizen":

            try:
                user = User.objects.get(
                    email=email,
                    role="citizen"
                )
            except User.DoesNotExist:

                return Response(
                    {
                        "success": False,
                        "message":
                            "Invalid email or password."
                    },
                    status=status.HTTP_401_UNAUTHORIZED
                )

            if not check_password(
                password,
                user.password
            ):

                return Response(
                    {
                        "success": False,
                        "message":
                            "Invalid email or password."
                    },
                    status=status.HTTP_401_UNAUTHORIZED
                )

            if not user.email_verified:

                return Response(
                    {
                        "success": False,
                        "message":
                            "Please verify your email before logging in.",
                        "code":
                            "EMAIL_NOT_VERIFIED"
                    },
                    status=status.HTTP_403_FORBIDDEN
                )

            if not user.is_active:

                return Response(
                    {
                        "success": False,
                        "message":
                            "Your account is inactive."
                    },
                    status=status.HTTP_403_FORBIDDEN
                )

            tokens = create_tokens(
                user,
                "citizen"
            )

            return Response({
                "success": True,
                "message":
                    "Login successful.",
                "account_type":
                    "citizen",
                "user": {
                    "id": user.id,
                    "full_name": user.full_name,
                    "email": user.email,
                    "phone": user.phone,
                    "location": user.location,
                    "role": user.role
                },
                "tokens": tokens
            })

        try:
            organization = Organization.objects.get(
                email=email
            )
        except Organization.DoesNotExist:

            return Response(
                {
                    "success": False,
                    "message":
                        "Invalid email or password."
                },
                status=status.HTTP_401_UNAUTHORIZED
            )

        if not organization.check_password(
            password
        ):

            return Response(
                {
                    "success": False,
                    "message":
                        "Invalid email or password."
                },
                status=status.HTTP_401_UNAUTHORIZED
            )

        if not organization.email_verified:

            return Response(
                {
                    "success": False,
                    "message":
                        "Please verify your organization email first.",
                    "code":
                        "EMAIL_NOT_VERIFIED"
                },
                status=status.HTTP_403_FORBIDDEN
            )

        if organization.status == "pending_verification":

            return Response(
                {
                    "success": False,
                    "message":
                        "Your organization is waiting for administrator approval.",
                    "code":
                        "PENDING_APPROVAL"
                },
                status=status.HTTP_403_FORBIDDEN
            )

        if organization.status == "rejected":

            return Response(
                {
                    "success": False,
                    "message":
                        "Your organization registration was rejected."
                },
                status=status.HTTP_403_FORBIDDEN
            )

        if organization.status == "suspended":

            return Response(
                {
                    "success": False,
                    "message":
                        "Your organization account is suspended."
                },
                status=status.HTTP_403_FORBIDDEN
            )

        if not organization.is_active:

            return Response(
                {
                    "success": False,
                    "message":
                        "Your organization account is inactive."
                },
                status=status.HTTP_403_FORBIDDEN
            )

        tokens = create_tokens(
            organization,
            "organization"
        )

        return Response({
            "success": True,
            "message":
                "Login successful.",
            "account_type":
                "organization",
            "organization": {
                "id":
                    organization.id,
                "organization_name":
                    organization.organization_name,
                "email":
                    organization.email,
                "organization_type":
                    organization.organization_type,
                "status":
                    organization.status
            },
            "tokens": tokens
        })

@extend_schema(
    tags=["Authentication"],
    summary="Request password reset OTP",
    description=(
        "Starts the password recovery process by sending an OTP "
        "to the provided email address."
    ),
    request=ForgotPasswordSerializer,
    responses={
        200: OpenApiResponse(
            description="Password reset request processed."
        ),
    },
)

class ForgotPasswordView(APIView):

    permission_classes = [AllowAny]

    def post(self, request):

        serializer = ForgotPasswordSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        email = serializer.validated_data[
            "email"
        ].lower().strip()

        user = User.objects.filter(
            email=email,
            role="citizen"
        ).first()

        organization = Organization.objects.filter(
            email=email
        ).first()

        # Generic response prevents account enumeration.
        generic_response = Response({
            "success": True,
            "message":
                "If an account exists with this email, "
                "a verification code has been sent."
        })

        if not user and not organization:
            return generic_response

        OTPCode.objects.filter(
            purpose="password_reset",
            is_used=False
        ).filter(
            Q(user=user) if user else Q(
                organization=organization
            )
        ).update(
            is_used=True
        )

        otp = generate_otp()

        OTPCode.objects.create(
            user=user,
            organization=organization,
            purpose="password_reset",
            otp_hash=create_otp_hash(otp),
            expires_at=otp_expiry()
        )

        # Failures are only logged, so the response stays generic
        # and does not reveal which emails exist.
        recipient = user or organization
        name = (
            user.full_name
            if user
            else organization.organization_name
        )

        try_send(
            send_password_reset_otp,
            recipient.email,
            name,
            otp
        )

        return generic_response

@extend_schema(
    tags=["Authentication"],
    summary="Verify password reset OTP",
    description=(
        "Verifies the password reset OTP and generates a temporary "
        "reset token for changing the password."
    ),
    request=VerifyResetOTPSerializer,
    responses={
        200: OpenApiResponse(
            description="OTP verified successfully and reset token generated."
        ),
        400: OpenApiResponse(
            description="Invalid or expired OTP."
        ),
    },
)

class VerifyResetOTPView(APIView):

    permission_classes = [AllowAny]

    def post(self, request):

        serializer = VerifyResetOTPSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        email = serializer.validated_data[
            "email"
        ].lower().strip()

        otp = serializer.validated_data[
            "otp"
        ]

        user = User.objects.filter(
            email=email,
            role="citizen"
        ).first()

        organization = Organization.objects.filter(
            email=email
        ).first()

        if not user and not organization:

            return Response(
                {
                    "success": False,
                    "message":
                        "Invalid or expired OTP."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        otp_query = OTPCode.objects.filter(
            purpose="password_reset",
            is_used=False
        )

        if user:
            otp_record = otp_query.filter(
                user=user
            ).order_by(
                "-created_at"
            ).first()
        else:
            otp_record = otp_query.filter(
                organization=organization
            ).order_by(
                "-created_at"
            ).first()

        if not otp_record:

            return Response(
                {
                    "success": False,
                    "message":
                        "Invalid or expired OTP."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        if otp_record.expires_at < timezone.now():

            return Response(
                {
                    "success": False,
                    "message":
                        "OTP has expired."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        if otp_record.attempts >= MAX_OTP_ATTEMPTS:

            return Response(
                {
                    "success": False,
                    "message":
                        "Maximum OTP attempts exceeded."
                },
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )

        if not check_password(
            otp,
            otp_record.otp_hash
        ):

            otp_record.attempts += 1

            otp_record.save(
                update_fields=["attempts"]
            )

            return Response(
                {
                    "success": False,
                    "message":
                        "Invalid OTP."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        reset_token = generate_reset_token()

        PasswordResetToken.objects.create(
            user=user,
            organization=organization,
            token_hash=hash_token(
                reset_token
            ),
            expires_at=reset_token_expiry()
        )

        otp_record.is_used = True
        otp_record.save(
            update_fields=["is_used"]
        )

        return Response({
            "success": True,
            "message":
                "OTP verified successfully. "
                "You can now create a new password.",
            "reset_token":
                reset_token
        })

@extend_schema(
    tags=["Authentication"],
    summary="Reset password",
    description=(
        "Changes the account password using a valid password reset token."
    ),
    request=ResetPasswordSerializer,
    responses={
        200: OpenApiResponse(
            description="Password reset successfully."
        ),
        400: OpenApiResponse(
            description="Invalid reset token or password validation error."
        ),
    },
)

class ResetPasswordView(APIView):

    permission_classes = [AllowAny]

    def post(self, request):

        serializer = ResetPasswordSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        reset_token = serializer.validated_data[
            "reset_token"
        ]

        new_password = serializer.validated_data[
            "password"
        ]

        token_hash = hash_token(
            reset_token
        )

        token_record = PasswordResetToken.objects.filter(
            token_hash=token_hash,
            is_used=False
        ).first()

        if not token_record:

            return Response(
                {
                    "success": False,
                    "message":
                        "Invalid or expired reset session."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        if token_record.expires_at < timezone.now():

            return Response(
                {
                    "success": False,
                    "message":
                        "Password reset session has expired. "
                        "Please start again."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():

            if token_record.user:

                user = token_record.user

                user.set_password(
                    new_password
                )

                user.save(
                    update_fields=[
                        "password"
                    ]
                )

            elif token_record.organization:

                organization = token_record.organization

                organization.set_password(
                    new_password
                )

                organization.save(
                    update_fields=[
                        "password"
                    ]
                )

            token_record.is_used = True

            token_record.save(
                update_fields=[
                    "is_used"
                ]
            )

        return Response({
            "success": True,
            "message":
                "Your password has been changed successfully. "
                "You can now login with your new password."
        })

# ============================================================
# ADMIN - USER MANAGEMENT
# ============================================================

@extend_schema(
    tags=["Admin - User Management"],
    summary="View citizens",
    description=(
        "Returns a paginated list of citizens. "
        "Administrators can search and filter citizens "
        "using supported query parameters."
    ),
    parameters=[
        OpenApiParameter(
            name="search",
            type=str,
            location=OpenApiParameter.QUERY,
            required=False,
            description=(
                "Search by citizen name, email, phone, "
                "or location."
            ),
        ),
        OpenApiParameter(
            name="status",
            type=str,
            location=OpenApiParameter.QUERY,
            required=False,
            enum=["active", "inactive"],
            description="Filter citizens by account status.",
        ),
        OpenApiParameter(
            name="location",
            type=str,
            location=OpenApiParameter.QUERY,
            required=False,
            description="Filter citizens by location.",
        ),
        OpenApiParameter(
            name="email_verified",
            type=bool,
            location=OpenApiParameter.QUERY,
            required=False,
            description="Filter by email verification status.",
        ),
        OpenApiParameter(
            name="page",
            type=int,
            location=OpenApiParameter.QUERY,
            required=False,
            description="Page number.",
        ),
        OpenApiParameter(
            name="page_size",
            type=int,
            location=OpenApiParameter.QUERY,
            required=False,
            description="Number of citizens per page.",
        ),
    ],
    responses={
        200: AdminCitizenListSerializer(many=True),
        401: OpenApiResponse(
            description="Authentication required."
        ),
        403: OpenApiResponse(
            description="Administrator permission required."
        ),
    },
)
class AdminCitizenListView(APIView):

    permission_classes = [IsCivicAdmin]

    def get(self, request):

        queryset = User.objects.filter(
            role="citizen"
        )

        # ----------------------------------------------------
        # SEARCH
        # ----------------------------------------------------

        search = request.query_params.get(
            "search",
            ""
        ).strip()

        if search:

            queryset = queryset.filter(
                Q(full_name__icontains=search)
                | Q(email__icontains=search)
                | Q(phone__icontains=search)
                | Q(location__icontains=search)
            )

        # ----------------------------------------------------
        # STATUS FILTER
        # ----------------------------------------------------

        status_filter = request.query_params.get(
            "status"
        )

        if status_filter == "active":

            queryset = queryset.filter(
                is_active=True
            )

        elif status_filter == "inactive":

            queryset = queryset.filter(
                is_active=False
            )

        # ----------------------------------------------------
        # LOCATION FILTER
        # ----------------------------------------------------

        location = request.query_params.get(
            "location"
        )

        if location:

            queryset = queryset.filter(
                location__icontains=location.strip()
            )

        # ----------------------------------------------------
        # EMAIL VERIFICATION FILTER
        # ----------------------------------------------------

        email_verified = request.query_params.get(
            "email_verified"
        )

        if email_verified == "true":

            queryset = queryset.filter(
                email_verified=True
            )

        elif email_verified == "false":

            queryset = queryset.filter(
                email_verified=False
            )

        # ----------------------------------------------------
        # ORDERING
        # ----------------------------------------------------

        queryset = queryset.order_by(
            "-created_at"
        )

        # ----------------------------------------------------
        # PAGINATION
        # ----------------------------------------------------

        try:

            page = int(
                request.query_params.get(
                    "page",
                    1
                )
            )

        except ValueError:

            page = 1

        try:

            page_size = int(
                request.query_params.get(
                    "page_size",
                    20
                )
            )

        except ValueError:

            page_size = 20

        page = max(
            page,
            1
        )

        page_size = min(
            max(page_size, 1),
            100
        )

        total_count = queryset.count()

        start = (
            page - 1
        ) * page_size

        end = start + page_size

        citizens = queryset[
            start:end
        ]

        serializer = AdminCitizenListSerializer(
            citizens,
            many=True
        )

        return Response(
            {
                "success": True,
                "count": total_count,
                "page": page,
                "page_size": page_size,
                "total_pages": (
                    (
                        total_count
                        + page_size
                        - 1
                    )
                    // page_size
                ),
                "citizens": serializer.data,
            },
            status=status.HTTP_200_OK
        )

# ============================================================
# ADMIN LOGIN
# ============================================================
class AdminLoginView(APIView):

    permission_classes = [AllowAny]

    @extend_schema(
        request=AdminLoginSerializer,
        responses={
            200: OpenApiResponse(
                description="Admin login successful."
            ),
            400: OpenApiResponse(
                description="Email and password are required."
            ),
            401: OpenApiResponse(
                description="Invalid admin credentials."
            ),
            403: OpenApiResponse(
                description="Admin access denied or account inactive."
            ),
        },
        summary="Admin login",
        description="Authenticates an administrator and returns JWT access and refresh tokens."
    )
    def post(self, request):

        email = request.data.get("email", "").lower().strip()
        password = request.data.get("password", "")

        if not email or not password:
            return Response(
                {
                    "success": False,
                    "message": "Email and password are required."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            admin = User.objects.get(
                email=email,
                role="admin"
            )
        except User.DoesNotExist:
            return Response(
                {
                    "success": False,
                    "message": "Invalid admin credentials."
                },
                status=status.HTTP_401_UNAUTHORIZED
            )

        if not check_password(
            password,
            admin.password
        ):
            return Response(
                {
                    "success": False,
                    "message": "Invalid admin credentials."
                },
                status=status.HTTP_401_UNAUTHORIZED
            )

        if not admin.is_active:
            return Response(
                {
                    "success": False,
                    "message": "Admin account is inactive."
                },
                status=status.HTTP_403_FORBIDDEN
            )

        if not admin.is_staff:
            return Response(
                {
                    "success": False,
                    "message": "Admin access denied."
                },
                status=status.HTTP_403_FORBIDDEN
            )

        tokens = create_tokens(
            admin,
            "admin"
        )

        return Response(
            {
                "success": True,
                "message": "Admin login successful.",
                "account_type": "admin",
                "admin": {
                    "id": admin.id,
                    "full_name": admin.full_name,
                    "email": admin.email,
                    "role": admin.role
                },
                "tokens": tokens
            },
            status=status.HTTP_200_OK
        )


# ============================================================
# GET PENDING ORGANIZATIONS
# ============================================================
@extend_schema(
    tags=["Admin"],
    summary="Get pending organizations",
    description=(
        "Returns organizations that have verified their email "
        "but are waiting for administrator approval."
    ),
    responses={
        200: OpenApiResponse(
            description="Pending organizations returned successfully."
        ),
        401: OpenApiResponse(
            description="Authentication credentials were not provided or invalid."
        ),
        403: OpenApiResponse(
            description="Administrator permission required."
        ),
    },
)

class PendingOrganizationsView(APIView):

    permission_classes = [IsCivicAdmin]

    def get(self, request):

        organizations = Organization.objects.filter(
            status="pending_verification",
            email_verified=True
        ).order_by("-created_at")

        data = []

        for organization in organizations:

            data.append(
                {
                    "id": organization.id,
                    "organization_name": organization.organization_name,
                    "organization_type": organization.organization_type,
                    "email": organization.email,
                    "phone": organization.phone,
                    "address": organization.address,
                    "city": organization.city,
                    "state": organization.state,
                    "service_area": organization.service_area,
                    "categories": organization.categories,
                    "description": organization.description,
                    "verification_document": (
                        organization.verification_document.url
                        if organization.verification_document
                        else None
                    ),
                    "email_verified": organization.email_verified,
                    "status": organization.status,
                    "is_active": organization.is_active,
                    "created_at": organization.created_at,
                }
            )

        return Response(
            {
                "success": True,
                "count": len(data),
                "organizations": data
            },
            status=status.HTTP_200_OK
        )


# ============================================================
# APPROVE ORGANIZATION
# ============================================================
@extend_schema(
    tags=["Admin"],
    summary="Approve organization",
    description=(
        "Approves a pending organization and changes its status "
        "to approved."
    ),
    parameters=[
        OpenApiParameter(
            name="organization_id",
            type=int,
            location=OpenApiParameter.PATH,
            required=True,
            description="ID of the organization to approve.",
        ),
    ],
    responses={
        200: OpenApiResponse(
            description="Organization approved successfully."
        ),
        401: OpenApiResponse(
            description="Authentication required."
        ),
        403: OpenApiResponse(
            description="Administrator permission required."
        ),
        404: OpenApiResponse(
            description="Organization not found."
        ),
    },
)

class ApproveOrganizationView(APIView):

    permission_classes = [IsCivicAdmin]

    def patch(self, request, organization_id):

        try:
            organization = Organization.objects.get(
                id=organization_id
            )
        except Organization.DoesNotExist:

            return Response(
                {
                    "success": False,
                    "message": "Organization not found."
                },
                status=status.HTTP_404_NOT_FOUND
            )

        if organization.status == "approved":

            return Response(
                {
                    "success": False,
                    "message": "Organization is already approved."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        if not organization.email_verified:

            return Response(
                {
                    "success": False,
                    "message": (
                        "Organization email must be verified "
                        "before approval."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():

            organization.status = "approved"
            organization.is_active = True
            organization.verified_at = timezone.now()

            organization.save(
                update_fields=[
                    "status",
                    "is_active",
                    "verified_at",
                    "updated_at"
                ]
            )

        # Approval email is sent after the transaction so a mail failure
        # never undoes the approval.
        try_send(
            send_organization_approval_email,
            organization.email,
            organization.organization_name
        )

        return Response(
            {
                "success": True,
                "message": (
                    "Organization approved successfully."
                ),
                "organization": {
                    "id": organization.id,
                    "organization_name": (
                        organization.organization_name
                    ),
                    "email": organization.email,
                    "status": organization.status,
                    "is_active": organization.is_active
                }
            },
            status=status.HTTP_200_OK
        )


# ============================================================
# REJECT ORGANIZATION
# ============================================================
@extend_schema(
    tags=["Admin"],
    summary="Reject organization",
    description=(
        "Rejects an organization application."
    ),
    parameters=[
        OpenApiParameter(
            name="organization_id",
            type=int,
            location=OpenApiParameter.PATH,
            required=True,
            description="ID of the organization to reject.",
        ),
    ],
    responses={
        200: OpenApiResponse(
            description="Organization rejected successfully."
        ),
        401: OpenApiResponse(
            description="Authentication required."
        ),
        403: OpenApiResponse(
            description="Administrator permission required."
        ),
        404: OpenApiResponse(
            description="Organization not found."
        ),
    },
)

class RejectOrganizationView(APIView):

    permission_classes = [IsCivicAdmin]

    def patch(self, request, organization_id):

        try:
            organization = Organization.objects.get(
                id=organization_id
            )
        except Organization.DoesNotExist:

            return Response(
                {
                    "success": False,
                    "message": "Organization not found."
                },
                status=status.HTTP_404_NOT_FOUND
            )

        if organization.status == "approved":

            return Response(
                {
                    "success": False,
                    "message": (
                        "An approved organization "
                        "cannot be rejected directly."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        organization.status = "rejected"
        organization.is_active = False

        organization.save(
            update_fields=[
                "status",
                "is_active",
                "updated_at"
            ]
        )

        return Response(
            {
                "success": True,
                "message": "Organization rejected successfully.",
                "organization": {
                    "id": organization.id,
                    "organization_name": (
                        organization.organization_name
                    ),
                    "status": organization.status,
                    "is_active": organization.is_active
                }
            },
            status=status.HTTP_200_OK
        )


# ============================================================
# SUSPEND ORGANIZATION
# ============================================================
@extend_schema(
    tags=["Admin"],
    summary="Suspend organization",
    description=(
        "Suspends an organization account."
    ),
    parameters=[
        OpenApiParameter(
            name="organization_id",
            type=int,
            location=OpenApiParameter.PATH,
            required=True,
            description="ID of the organization to suspend.",
        ),
    ],
    responses={
        200: OpenApiResponse(
            description="Organization suspended successfully."
        ),
        401: OpenApiResponse(
            description="Authentication required."
        ),
        403: OpenApiResponse(
            description="Administrator permission required."
        ),
        404: OpenApiResponse(
            description="Organization not found."
        ),
    },
)

class SuspendOrganizationView(APIView):

    permission_classes = [IsCivicAdmin]

    def patch(self, request, organization_id):

        try:
            organization = Organization.objects.get(
                id=organization_id
            )
        except Organization.DoesNotExist:

            return Response(
                {
                    "success": False,
                    "message": "Organization not found."
                },
                status=status.HTTP_404_NOT_FOUND
            )

        if organization.status != "approved":

            return Response(
                {
                    "success": False,
                    "message": (
                        "Only approved organizations "
                        "can be suspended."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        organization.status = "suspended"
        organization.is_active = False

        organization.save(
            update_fields=[
                "status",
                "is_active",
                "updated_at"
            ]
        )

        return Response(
            {
                "success": True,
                "message": "Organization suspended successfully.",
                "organization": {
                    "id": organization.id,
                    "organization_name": (
                        organization.organization_name
                    ),
                    "status": organization.status,
                    "is_active": organization.is_active
                }
            },
            status=status.HTTP_200_OK
        )

from rest_framework.parsers import (
    MultiPartParser,
    FormParser,
    JSONParser,
)


class IsActiveCitizen(IsAuthenticated):
    """Allow only active, email-verified citizen accounts."""

    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False

        user = request.user

        return (
            getattr(user, "role", None) == "citizen"
            and getattr(user, "is_active", False)
            and getattr(user, "email_verified", False)
        )


class CitizenProfileView(APIView):
    permission_classes = [IsActiveCitizen]
    parser_classes = [
        JSONParser,
        MultiPartParser,
        FormParser,
    ]

    @extend_schema(
        tags=["Citizen Profile"],
        summary="Retrieve citizen profile",
        responses={200: CitizenProfileSerializer},
    )
    def get(self, request):
        profile, _ = CitizenProfile.objects.get_or_create(
            user=request.user
        )

        serializer = CitizenProfileSerializer(
            profile,
            context={"request": request},
        )

        return Response(
            {
                "success": True,
                "profile": serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    @extend_schema(
        tags=["Citizen Profile"],
        summary="Update citizen profile",
        request=CitizenProfileSerializer,
        responses={200: CitizenProfileSerializer},
    )
    def patch(self, request):
        with transaction.atomic():
            profile, _ = CitizenProfile.objects.get_or_create(
                user=request.user
            )

            serializer = CitizenProfileSerializer(
                profile,
                data=request.data,
                partial=True,
                context={"request": request},
            )
            serializer.is_valid(raise_exception=True)
            serializer.save()

        return Response(
            {
                "success": True,
                "message": "Profile updated successfully.",
                "profile": serializer.data,
            },
            status=status.HTTP_200_OK,
        )


class CitizenProfileImageDeleteView(APIView):
    permission_classes = [IsActiveCitizen]

    @extend_schema(
        tags=["Citizen Profile"],
        summary="Remove citizen profile image",
        responses={
            200: OpenApiResponse(
                description="Profile image removed successfully."
            ),
        },
    )
    def delete(self, request):
        profile, _ = CitizenProfile.objects.get_or_create(
            user=request.user
        )

        if profile.profile_image:
            profile.profile_image.delete(save=False)
            profile.profile_image = None
            profile.save(update_fields=["profile_image", "updated_at"])

        return Response(
            {
                "success": True,
                "message": "Profile image removed successfully.",
            },
            status=status.HTTP_200_OK,
        )


class CitizenChangePasswordView(APIView):
    permission_classes = [IsActiveCitizen]

    @extend_schema(
        tags=["Citizen Profile"],
        summary="Change citizen password",
        request=CitizenChangePasswordSerializer,
        responses={
            200: OpenApiResponse(
                description="Password changed successfully."
            ),
            400: OpenApiResponse(
                description="Invalid current password or new password."
            ),
        },
    )
    def post(self, request):
        serializer = CitizenChangePasswordSerializer(
            data=request.data
        )
        serializer.is_valid(raise_exception=True)

        user = request.user
        data = serializer.validated_data

        if not check_password(
            data["current_password"],
            user.password,
        ):
            return Response(
                {
                    "success": False,
                    "message": "Current password is incorrect.",
                    "errors": {
                        "current_password": [
                            "Current password is incorrect."
                        ]
                    },
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(data["new_password"])
        user.save(update_fields=["password"])

        return Response(
            {
                "success": True,
                "message": "Password changed successfully.",
            },
            status=status.HTTP_200_OK,
        )