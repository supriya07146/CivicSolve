
from rest_framework.permissions import BasePermission


class IsApprovedOrganization(BasePermission):
    """
    Allow only authenticated, approved, active organizations
    with verified email addresses.
    """

    message = (
        "An approved and active organization account "
        "with a verified email is required."
    )

    def has_permission(self, request, view):
        organization = request.user

        return (
            getattr(organization, "organization_name", None)
            is not None
            and getattr(organization, "is_authenticated", False)
            and getattr(organization, "is_active", False)
            and getattr(organization, "email_verified", False)
            and getattr(organization, "status", None) == "approved"
        )
