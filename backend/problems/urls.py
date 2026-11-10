from django.urls import path

from .views import (
    AISmartProblemReportingView,
    ProblemCategoryListView,
    ProblemCreateView,
    MyProblemsView,
    ProblemDetailView,
    ProblemAttachmentUploadView,
    ProblemAttachmentDeleteView,
    AdminProblemListView,
    AdminProblemDetailView,
    AdminProblemStatusView,
    
    ProblemDraftListCreateView,
    ProblemDraftDetailView,
    DraftAttachmentUploadView,
    ProblemDraftSubmitView,
    BrowseProblemsView,
    ProblemSupportView,
    ProblemDiscussionListCreateView,
    ProblemDiscussionModerationView,

    OrganizationSolutionCreateView,
    OrganizationSolutionEvidenceUploadView,
    CivicSolveAssistantView,

    AdminDuplicateProblemSuggestionListView,
    AdminDuplicateProblemSuggestionReviewView,

)

from .views import CitizenResolutionReviewView

urlpatterns = [

    # Citizen
    path(
        "categories/",
        ProblemCategoryListView.as_view(),
        name="problem-categories",
    ),

    path(
    "ai-suggestions/",
    AISmartProblemReportingView.as_view(),
    name="ai-problem-suggestions",
    ),

    path(
        "create/",
        ProblemCreateView.as_view(),
        name="problem-create",
    ),

    path(
    "<int:problem_id>/resolution-review/",
    CitizenResolutionReviewView.as_view(),
    name="citizen-resolution-review",
    ),

    path(
        "my/",
        MyProblemsView.as_view(),
        name="my-problems",
    ),

    path(
        "<int:problem_id>/",
        ProblemDetailView.as_view(),
        name="problem-detail",
    ),

    path(
        "<int:problem_id>/attachments/",
        ProblemAttachmentUploadView.as_view(),
        name="problem-attachment-upload",
    ),

    path(
        "attachments/<int:attachment_id>/",
        ProblemAttachmentDeleteView.as_view(),
        name="problem-attachment-delete",
    ),

    # Admin
    path(
        "admin/",
        AdminProblemListView.as_view(),
        name="admin-problem-list",
    ),

    
    # Citizen problem drafts
    path(
        "drafts/",
        ProblemDraftListCreateView.as_view(),
        name="problem-draft-list-create",
    ),

    path(
        "drafts/<int:draft_id>/",
        ProblemDraftDetailView.as_view(),
        name="problem-draft-detail",
    ),

    path(
        "drafts/<int:draft_id>/attachments/",
        DraftAttachmentUploadView.as_view(),
        name="problem-draft-attachment-upload",
    ),

    path(
        "drafts/<int:draft_id>/submit/",
        ProblemDraftSubmitView.as_view(),
        name="problem-draft-submit",
    ),


    path(
        "admin/<int:problem_id>/",
        AdminProblemDetailView.as_view(),
        name="admin-problem-detail",
    ),

    path(
        "admin/<int:problem_id>/status/",
        AdminProblemStatusView.as_view(),
        name="admin-problem-status",
    ),

    path(
    "browse/",
    BrowseProblemsView.as_view(),
    name="browse-community-problems",
    ),

    path(
    "<int:problem_id>/support/",
    ProblemSupportView.as_view(),
    name="problem-support",
    ),

    path(
    "<int:problem_id>/discussions/",
    ProblemDiscussionListCreateView.as_view(),
    name="problem-discussions",
    ),

    path(
    "<int:problem_id>/discussions/<int:discussion_id>/moderate/",
    ProblemDiscussionModerationView.as_view(),
    name="moderate-problem-discussion",
    ),

    # Organization solution submission
    path(
    "organization/assignments/<int:assignment_id>/solutions/",
    OrganizationSolutionCreateView.as_view(),
    name="organization-solution-create",
    ),

# Organization solution evidence
path(
    "organization/solutions/<int:solution_id>/evidence/",
    OrganizationSolutionEvidenceUploadView.as_view(),
    name="organization-solution-evidence-upload",
),

path(
    "assistant/",
    CivicSolveAssistantView.as_view(),
    name="civic-solve-assistant",
),

path(
    "admin/duplicate-suggestions/",
    AdminDuplicateProblemSuggestionListView.as_view(),
    name="admin-duplicate-problem-suggestions",
),

path(
    "admin/duplicate-suggestions/<int:suggestion_id>/review/",
    AdminDuplicateProblemSuggestionReviewView.as_view(),
    name="admin-review-duplicate-problem-suggestion",
),

]