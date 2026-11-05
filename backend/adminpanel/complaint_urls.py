
from django.urls import path

from .complaint_views import (
    ComplaintListCreateView,
    ComplaintDetailView,
    AdminComplaintListView,
    AdminComplaintDetailView,
    AdminComplaintReviewView,
)

urlpatterns = [
    path("", ComplaintListCreateView.as_view(), name="complaint-list-create"),
    path(
        "<uuid:complaint_code>/",
        ComplaintDetailView.as_view(),
        name="complaint-detail",
    ),
    path("admin/", AdminComplaintListView.as_view(), name="admin-complaint-list"),
    path(
        "admin/<uuid:complaint_code>/",
        AdminComplaintDetailView.as_view(),
        name="admin-complaint-detail",
    ),
    path(
        "admin/<uuid:complaint_code>/review/",
        AdminComplaintReviewView.as_view(),
        name="admin-complaint-review",
    ),
]