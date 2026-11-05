
from django.urls import path

from .solution_views import (
    AdminSolutionListCreateView,
    AdminSolutionDetailView,
    AdminSolutionReviewView,
)

urlpatterns = [
    path(
        "",
        AdminSolutionListCreateView.as_view(),
        name="admin-solution-list-create",
    ),
    path(
        "<int:solution_id>/",
        AdminSolutionDetailView.as_view(),
        name="admin-solution-detail",
    ),
    path(
        "<int:solution_id>/review/",
        AdminSolutionReviewView.as_view(),
        name="admin-solution-review",
    ),
]