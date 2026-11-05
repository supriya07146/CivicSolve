
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404

from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from drf_spectacular.utils import (
    extend_schema,
    OpenApiParameter,
    OpenApiResponse,
)

from problems.models import Problem
from .permissions import IsVerifiedCitizen
from .serializers import CitizenDashboardProblemSerializer


# ============================================================
# CITIZEN DASHBOARD SUMMARY
# ============================================================

@extend_schema(
    tags=["Citizen Dashboard"],
    summary="Get citizen dashboard summary",
    description=(
        "Returns report counts and status statistics "
        "for the authenticated, verified citizen."
    ),
    responses={
        200: OpenApiResponse(
            description="Dashboard summary retrieved successfully."
        ),
        401: OpenApiResponse(
            description="Authentication required."
        ),
        403: OpenApiResponse(
            description="Verified citizen access required."
        ),
    },
)
class CitizenDashboardSummaryView(APIView):

    permission_classes = [
        IsAuthenticated,
        IsVerifiedCitizen,
    ]

    def get(self, request):
        problems = Problem.objects.filter(
            reported_by=request.user
        )

        stats = problems.aggregate(
            total_reports=Count("id"),
            open_reports=Count(
                "id",
                filter=Q(status="open"),
            ),
            under_review_reports=Count(
                "id",
                filter=Q(status="under_review"),
            ),
            assigned_reports=Count(
                "id",
                filter=Q(status="assigned"),
            ),
            in_progress_reports=Count(
                "id",
                filter=Q(status="in_progress"),
            ),
            resolved_reports=Count(
                "id",
                filter=Q(status="resolved"),
            ),
            rejected_reports=Count(
                "id",
                filter=Q(status="rejected"),
            ),
            closed_reports=Count(
                "id",
                filter=Q(status="closed"),
            ),
        )

        stats["pending_reports"] = (
            stats["open_reports"]
            + stats["under_review_reports"]
        )

        stats["awaiting_confirmation"] = None

        return Response(
            {
                "success": True,
                "message": (
                    "Citizen dashboard summary retrieved successfully."
                ),
                "data": stats,
                "features": {
                    "resolution_confirmation_available": False,
                    "progress_percentages_are_estimates": True,
                },
            },
            status=status.HTTP_200_OK,
        )


# ============================================================
# CITIZEN RECENT PROBLEMS
# ============================================================

@extend_schema(
    tags=["Citizen Dashboard"],
    summary="Get recent citizen reports",
    description=(
        "Returns the authenticated citizen's most recent "
        "reported problems, including assignment details."
    ),
    parameters=[
        OpenApiParameter(
            name="limit",
            type=int,
            location=OpenApiParameter.QUERY,
            required=False,
            description="Number of reports to return (1–20).",
        ),
    ],
    responses={
        200: CitizenDashboardProblemSerializer(many=True),
        401: OpenApiResponse(
            description="Authentication required."
        ),
        403: OpenApiResponse(
            description="Verified citizen access required."
        ),
    },
)
class CitizenRecentProblemsView(APIView):

    permission_classes = [
        IsAuthenticated,
        IsVerifiedCitizen,
    ]

    def get(self, request):
        try:
            limit = int(request.query_params.get("limit", 5))
        except (TypeError, ValueError):
            return Response(
                {
                    "success": False,
                    "message": "The limit must be an integer.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if limit < 1 or limit > 20:
            return Response(
                {
                    "success": False,
                    "message": "The limit must be between 1 and 20.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        queryset = (
            Problem.objects
            .filter(reported_by=request.user)
            .select_related("category")
            .prefetch_related(
                "assignments__organization",
            )
            .order_by("-created_at")
        )

        total_count = queryset.count()
        recent_problems = queryset[:limit]

        serializer = CitizenDashboardProblemSerializer(
            recent_problems,
            many=True,
        )

        return Response(
            {
                "success": True,
                "message": "Recent reports retrieved successfully.",
                "count": total_count,
                "returned_count": len(serializer.data),
                "data": serializer.data,
            },
            status=status.HTTP_200_OK,
        )
