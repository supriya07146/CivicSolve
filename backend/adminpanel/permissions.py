from rest_framework.permissions import IsAuthenticated


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