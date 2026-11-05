
from django.urls import path

from .views import (
    CitizenDashboardSummaryView,
    CitizenRecentProblemsView,
)

app_name = "userpanel"

urlpatterns = [
    path(
        "summary/",
        CitizenDashboardSummaryView.as_view(),
        name="citizen-dashboard-summary",
    ),
    path(
        "recent-problems/",
        CitizenRecentProblemsView.as_view(),
        name="citizen-dashboard-recent-problems",
    ),
]
