
from django.urls import path

from .profile_views import (
    AdminProfileView,
    AdminChangePasswordView,
)

urlpatterns = [
    path(
        "",
        AdminProfileView.as_view(),
        name="admin-profile",
    ),
    path(
        "change-password/",
        AdminChangePasswordView.as_view(),
        name="admin-change-password",
    ),
]