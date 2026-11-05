from django.urls import path

from .views import (
    AdminCitizenListView,
    AdminCitizenDetailView,
    AdminCitizenStatusView,
    AdminCitizenProblemListView,
)


urlpatterns = [

    # -----------------------------
    # Admin - User Management
    # -----------------------------

    path(
        "",
        AdminCitizenListView.as_view(),
        name="admin-citizen-list"
    ),

    path(
        "<int:user_id>/",
        AdminCitizenDetailView.as_view(),
        name="admin-citizen-detail"
    ),

    path(
        "<int:user_id>/status/",
        AdminCitizenStatusView.as_view(),
        name="admin-citizen-status"
    ),

    path(
        "<int:user_id>/problems/",
        AdminCitizenProblemListView.as_view(),
        name="admin-citizen-problems"
    ),
]