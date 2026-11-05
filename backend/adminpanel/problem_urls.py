from django.urls import path

from .problem_views import (
    AdminProblemListView,
    AdminProblemDetailView,
)

urlpatterns = [
    path(
        "",
        AdminProblemListView.as_view(),
        name="admin-problem-list",
    ),
    path(
        "<int:problem_id>/",
        AdminProblemDetailView.as_view(),
        name="admin-problem-detail",
    ),
]