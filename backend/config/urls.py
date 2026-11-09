from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path, include
from django.views.static import serve

from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
    SpectacularRedocView,
)
from accounts.views import AdminLoginView


urlpatterns = [
    path(
        "admin/",
        admin.site.urls
    ),

    path(
        "api/auth/",
        include("accounts.urls")
    ),

    path(
        "api/admin/login/",
        AdminLoginView.as_view(),
        name="admin-direct-login"
    ),

    # OpenAPI Schema
    path(
        "api/schema/",
        SpectacularAPIView.as_view(),
        name="schema"
    ),

    # Swagger UI
    path(
        "api/docs/",
        SpectacularSwaggerView.as_view(
            url_name="schema"
        ),
        name="swagger-ui"
    ),

    # ReDoc
    path(
        "api/redoc/",
        SpectacularRedocView.as_view(
            url_name="schema"
        ),
        name="redoc"
    ),

    path(
        "api/problems/",
         include("problems.urls")
    ),

    path(
        "api/admin/users/",
        include("adminpanel.urls")
    ),

    path(
        "api/admin/organizations/",
        include("adminpanel.organization_urls")
    ),

    path(
        "api/admin/problems/",
        include("adminpanel.problem_urls")
    ),

    path(
        "api/admin/assignments/",
        include("adminpanel.assignment_urls"),
    ),

    
    path(
        "api/admin/categories/",
        include("adminpanel.category_urls"),
    ),

    path(
        "api/admin/solutions/",
        include("adminpanel.solution_urls"),
    ),

    path(
        "api/admin/complaints/",
        include("adminpanel.complaint_urls"),
    ),

    path(
        "api/admin/analytics/",
        include("adminpanel.analytics_urls"),
    ),

    path(
        "api/admin/profile/",
        include("adminpanel.profile_urls")
    ),

    path(
        "api/notifications/",
        include("adminpanel.notification_urls"),
    ),

    
    path(
    "api/user/dashboard/",
    include("userpanel.urls"),
    ),

    path(
    "api/organization/",
    include("organizations.urls"),
    ),
]



if settings.DEBUG:
    urlpatterns += static(
        settings.MEDIA_URL,
        document_root=settings.MEDIA_ROOT
    )
else:
    for media_directory in (
        "problem_attachments",
        "profile_images",
        "organization_profiles",
        "admin_profiles",
    ):
        urlpatterns.append(
            path(
                f"media/{media_directory}/<path:path>",
                serve,
                {"document_root": settings.MEDIA_ROOT / media_directory},
            )
        )