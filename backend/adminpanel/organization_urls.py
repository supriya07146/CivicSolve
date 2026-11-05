from django.urls import path

from .organization_views import (
    AdminOrganizationListView,
    AdminOrganizationDetailView,
    AdminApproveOrganizationView,
    AdminRejectOrganizationView,
    AdminSuspendOrganizationView,
)


urlpatterns = [

    # ========================================================
    # ORGANIZATION LIST
    # ========================================================

    path(
        "",
        AdminOrganizationListView.as_view(),
        name="admin-organization-list"
    ),

    # ========================================================
    # ORGANIZATION DETAILS
    # ========================================================

    path(
        "<int:organization_id>/",
        AdminOrganizationDetailView.as_view(),
        name="admin-organization-detail"
    ),

    # ========================================================
    # APPROVE
    # ========================================================

    path(
        "<int:organization_id>/approve/",
        AdminApproveOrganizationView.as_view(),
        name="admin-organization-approve"
    ),

    # ========================================================
    # REJECT
    # ========================================================

    path(
        "<int:organization_id>/reject/",
        AdminRejectOrganizationView.as_view(),
        name="admin-organization-reject"
    ),

    # ========================================================
    # SUSPEND
    # ========================================================

    path(
        "<int:organization_id>/suspend/",
        AdminSuspendOrganizationView.as_view(),
        name="admin-organization-suspend"
    ),
]