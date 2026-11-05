from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import AuthenticationFailed


class CivicJWTAuthentication(JWTAuthentication):

    def get_user(self, validated_token):

        actor_type = validated_token.get("actor_type")
        actor_id = validated_token.get("actor_id")

        if not actor_type or not actor_id:
            raise AuthenticationFailed(
                "Invalid CivicSolve token."
            )

        # =====================================================
        # CITIZEN
        # =====================================================

        if actor_type == "citizen":

            from .models import User

            try:
                user = User.objects.get(
                    id=actor_id,
                    role="citizen"
                )
            except User.DoesNotExist:
                raise AuthenticationFailed(
                    "Citizen account not found."
                )

            if not user.is_active:
                raise AuthenticationFailed(
                    "Citizen account is inactive."
                )

            if not user.email_verified:
                raise AuthenticationFailed(
                    "Email is not verified."
                )

            return user

        # =====================================================
        # ORGANIZATION
        # =====================================================

        if actor_type == "organization":

            from organizations.models import Organization

            try:
                organization = Organization.objects.get(
                    id=actor_id
                )
            except Organization.DoesNotExist:
                raise AuthenticationFailed(
                    "Organization not found."
                )

            if not organization.is_active:
                raise AuthenticationFailed(
                    "Organization account is not active."
                )

            if organization.status != "approved":
                raise AuthenticationFailed(
                    "Organization has not been approved."
                )

            if not organization.email_verified:
                raise AuthenticationFailed(
                    "Organization email is not verified."
                )

            return organization

        # =====================================================
        # ADMIN
        # =====================================================

        if actor_type == "admin":

            from .models import User

            try:
                admin = User.objects.get(
                    id=actor_id,
                    role="admin"
                )
            except User.DoesNotExist:
                raise AuthenticationFailed(
                    "Admin account not found."
                )

            if not admin.is_active:
                raise AuthenticationFailed(
                    "Admin account is inactive."
                )

            if not admin.is_staff:
                raise AuthenticationFailed(
                    "Admin access denied."
                )

            return admin

        raise AuthenticationFailed(
            "Invalid account type."
        )