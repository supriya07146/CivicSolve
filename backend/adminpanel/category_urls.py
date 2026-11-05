
from django.urls import path

from .category_views import (
    AdminCategoryListCreateView,
    AdminCategoryDetailView,
    AdminCategoryStatusView,
)

urlpatterns = [
    path(
        "",
        AdminCategoryListCreateView.as_view(),
        name="admin-category-list-create",
    ),
    path(
        "<int:category_id>/",
        AdminCategoryDetailView.as_view(),
        name="admin-category-detail",
    ),
    path(
        "<int:category_id>/status/",
        AdminCategoryStatusView.as_view(),
        name="admin-category-status",
    ),
]