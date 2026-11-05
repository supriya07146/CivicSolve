
from rest_framework.permissions import BasePermission


class IsVerifiedCitizen(BasePermission):
    """
    Allow dashboard access only to authenticated,
    active, email-verified citizen accounts.
    """

    message = "Verified citizen access is required."

    def has_permission(self, request, view):
        user = request.user

        if getattr(user, "is_staff", False) or getattr(user, "role", None) == "admin":
            return getattr(user, "is_active", False)

        return bool(
            user
            and user.is_authenticated
            and getattr(user, "role", None) == "citizen"
            and getattr(user, "is_active", False)
            and getattr(user, "email_verified", False)
        )
