
from django.urls import path

from .assignment_views import (
    AdminAssignmentListCreateView,
    AdminAssignmentDetailView,
)

urlpatterns = [
    path(
        "",
        AdminAssignmentListCreateView.as_view(),
        name="admin-assignment-list-create",
    ),
    path(
        "<int:assignment_id>/",
        AdminAssignmentDetailView.as_view(),
        name="admin-assignment-detail",
    ),
]