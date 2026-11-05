
from django.urls import path

from .analytics_views import (
    AdminAnalyticsDashboardView,
    AdminOverdueProblemsView,
    AdminEscalatedProblemsView,
    AdminProblemEscalationView,
    AdminAIInsightsView,
)


urlpatterns = [
    path(
        "",
        AdminAnalyticsDashboardView.as_view(),
        name="admin-analytics-dashboard",
    ),
    path(
        "overdue/",
        AdminOverdueProblemsView.as_view(),
        name="admin-analytics-overdue",
    ),
    path(
        "escalated/",
        AdminEscalatedProblemsView.as_view(),
        name="admin-analytics-escalated",
    ),
    path(
        "problems/<uuid:problem_code>/escalation/",
        AdminProblemEscalationView.as_view(),
        name="admin-problem-escalation",
    ),
    path(
    "ai-insights/",
    AdminAIInsightsView.as_view(),
    name="admin-ai-insights",
    ),
]