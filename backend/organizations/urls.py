
from django.urls import path

from .views import (
    OrganizationDashboardView,
    OrganizationAvailableProblemsView,
    OrganizationProblemDetailsView,
    OrganizationAcceptAssignmentView,
    OrganizationRejectAssignmentView,
    OrganizationSolutionsView,
    OrganizationSolutionDetailsView,
    OrganizationSolutionEvidenceUploadView,
    OrganizationNotificationsView,
    OrganizationUnreadNotificationCountView,
    OrganizationMarkNotificationReadView,
    OrganizationMarkAllNotificationsReadView,
    OrganizationProfileView,
    OrganizationProfileImageView,
    OrganizationActiveProblemsView,
    OrganizationResolvedProblemsView,
    OrganizationProgressListView,
    OrganizationProgressUpdateCreateView,
    OrganizationProgressHistoryView,
)

urlpatterns = [
    path("dashboard/", OrganizationDashboardView.as_view(), name="organization-dashboard"),
    path("available-problems/", OrganizationAvailableProblemsView.as_view(), name="organization-available-problems"),
    path("problems/<int:problem_id>/details/", OrganizationProblemDetailsView.as_view(), name="organization-problem-details"),
    path("assignments/<int:assignment_id>/accept/", OrganizationAcceptAssignmentView.as_view(), name="organization-accept-assignment"),
    path("assignments/<int:assignment_id>/reject/", OrganizationRejectAssignmentView.as_view(), name="organization-reject-assignment"),

    path("solutions/", OrganizationSolutionsView.as_view(), name="organization-solutions"),
    path("solutions/<int:solution_id>/", OrganizationSolutionDetailsView.as_view(), name="organization-solution-details"),
    path("solutions/<int:solution_id>/evidence/", OrganizationSolutionEvidenceUploadView.as_view(), name="organization-solution-evidence"),
    path(
    "notifications/",
    OrganizationNotificationsView.as_view(),
    name="organization-notifications",
),
path(
    "notifications/unread-count/",
    OrganizationUnreadNotificationCountView.as_view(),
    name="organization-unread-notification-count",
),
path(
    "notifications/<int:notification_id>/read/",
    OrganizationMarkNotificationReadView.as_view(),
    name="organization-mark-notification-read",
),
path(
    "notifications/read-all/",
    OrganizationMarkAllNotificationsReadView.as_view(),
    name="organization-mark-all-notifications-read",
),

path(
    "profile/",
    OrganizationProfileView.as_view(),
    name="organization-profile",
),

path(
    "profile/image/",
    OrganizationProfileImageView.as_view(),
    name="organization-profile-image",
),

path(
    "active-problems/",
    OrganizationActiveProblemsView.as_view(),
    name="organization-active-problems",
),

path(
    "resolved-problems/",
    OrganizationResolvedProblemsView.as_view(),
    name="organization-resolved-problems",
),

path(
    "progress/",
    OrganizationProgressListView.as_view(),
    name="organization-progress",
),
path(
    "progress/assignments/<int:assignment_id>/updates/",
    OrganizationProgressUpdateCreateView.as_view(),
    name="organization-progress-update-create",
),
path(
    "progress/assignments/<int:assignment_id>/history/",
    OrganizationProgressHistoryView.as_view(),
    name="organization-progress-history",
),

]
