from django.db.models import Count, Q
from django.shortcuts import get_object_or_404

from rest_framework import status
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User
from problems.models import Problem

from .permissions import IsCivicAdmin
from .serializers import (
    AdminCitizenListSerializer,
    AdminCitizenDetailSerializer,
    AdminCitizenStatusSerializer,
    AdminCitizenProblemSerializer,
)
from drf_spectacular.utils import extend_schema, OpenApiParameter

class AdminCitizenPagination(PageNumberPagination):

    page_size = 10
    page_size_query_param = "page_size"
    max_page_size = 50

@extend_schema(
    tags=["Admin - User Management"],
    summary="List and search citizens",
    description=(
        "Retrieve registered citizens with search and filtering. "
        "Only CivicSolve administrators can access this endpoint."
    ),
    parameters=[
        OpenApiParameter(
            name="search",
            description="Search by name, email, phone, or location.",
            required=False,
            type=str,
        ),
        OpenApiParameter(
            name="status",
            description="Filter by account status: active or inactive.",
            required=False,
            type=str,
        ),
        OpenApiParameter(
            name="email_verified",
            description="Filter by email verification: true or false.",
            required=False,
            type=bool,
        ),
        OpenApiParameter(
            name="location",
            description="Filter citizens by location.",
            required=False,
            type=str,
        ),
        OpenApiParameter(
            name="problem_status",
            description="Filter citizens based on their reported problem status.",
            required=False,
            type=str,
        ),
        OpenApiParameter(
            name="page",
            description="Page number.",
            required=False,
            type=int,
        ),
        OpenApiParameter(
            name="page_size",
            description="Number of records per page.",
            required=False,
            type=int,
        ),
    ],
)

class AdminCitizenListView(APIView):

    permission_classes = [IsCivicAdmin]

    def get(self, request):

        citizens = User.objects.filter(
            role="citizen"
        )

        # -----------------------------
        # Search
        # -----------------------------

        search = request.query_params.get(
            "search",
            ""
        ).strip()

        if search:

            citizens = citizens.filter(
                Q(full_name__icontains=search)
                | Q(email__icontains=search)
                | Q(phone__icontains=search)
                | Q(location__icontains=search)
            )

        # -----------------------------
        # Account status filter
        # -----------------------------

        account_status = request.query_params.get(
            "status",
            ""
        ).strip().lower()

        if account_status == "active":

            citizens = citizens.filter(
                is_active=True
            )

        elif account_status == "inactive":

            citizens = citizens.filter(
                is_active=False
            )

        # -----------------------------
        # Email verification filter
        # -----------------------------

        email_verified = request.query_params.get(
            "email_verified",
            ""
        ).strip().lower()

        if email_verified == "true":

            citizens = citizens.filter(
                email_verified=True
            )

        elif email_verified == "false":

            citizens = citizens.filter(
                email_verified=False
            )

        # -----------------------------
        # Location filter
        # -----------------------------

        location = request.query_params.get(
            "location",
            ""
        ).strip()

        if location:

            citizens = citizens.filter(
                location__icontains=location
            )

        # -----------------------------
        # Problem status filter
        # -----------------------------

        problem_status = request.query_params.get(
            "problem_status",
            ""
        ).strip().lower()

        if problem_status:

            citizens = citizens.filter(
                reported_problems__status=problem_status
            )

        # -----------------------------
        # Problem count
        # -----------------------------

        citizens = citizens.annotate(
            problem_count=Count(
                "reported_problems",
                distinct=True
            )
        )

        # -----------------------------
        # Ordering
        # -----------------------------

        citizens = citizens.order_by(
            "-created_at"
        )

        # -----------------------------
        # Pagination
        # -----------------------------

        paginator = AdminCitizenPagination()

        page = paginator.paginate_queryset(
            citizens,
            request
        )

        serializer = AdminCitizenListSerializer(
            page,
            many=True
        )

        return paginator.get_paginated_response(
            serializer.data
        )

@extend_schema(
    tags=["Admin - User Management"],
    summary="View citizen profile",
    description=(
        "Retrieve complete citizen profile information "
        "and reported problem statistics."
    ),
)
class AdminCitizenDetailView(APIView):

    permission_classes = [IsCivicAdmin]

    def get(self, request, user_id):

        citizen = get_object_or_404(
            User.objects.filter(
                role="citizen"
            ).annotate(
                total_problems=Count(
                    "reported_problems",
                    distinct=True
                ),

                open_problems=Count(
                    "reported_problems",
                    filter=Q(
                        reported_problems__status="open"
                    ),
                    distinct=True
                ),

                under_review_problems=Count(
                    "reported_problems",
                    filter=Q(
                        reported_problems__status="under_review"
                    ),
                    distinct=True
                ),

                assigned_problems=Count(
                    "reported_problems",
                    filter=Q(
                        reported_problems__status="assigned"
                    ),
                    distinct=True
                ),

                in_progress_problems=Count(
                    "reported_problems",
                    filter=Q(
                        reported_problems__status="in_progress"
                    ),
                    distinct=True
                ),

                resolved_problems=Count(
                    "reported_problems",
                    filter=Q(
                        reported_problems__status="resolved"
                    ),
                    distinct=True
                ),

                rejected_problems=Count(
                    "reported_problems",
                    filter=Q(
                        reported_problems__status="rejected"
                    ),
                    distinct=True
                ),

                closed_problems=Count(
                    "reported_problems",
                    filter=Q(
                        reported_problems__status="closed"
                    ),
                    distinct=True
                ),
            ),
            id=user_id
        )

        serializer = AdminCitizenDetailSerializer(
            citizen
        )

        return Response(
            {
                "success": True,
                "message": "Citizen profile retrieved successfully.",
                "data": serializer.data,
            },
            status=status.HTTP_200_OK
        )

@extend_schema(
    tags=["Admin - User Management"],
    summary="Activate or deactivate citizen",
    description=(
        "Activate or deactivate a citizen account. "
        "Deactivation does not delete the citizen or their reported problems."
    ),
    request=AdminCitizenStatusSerializer,
)

class AdminCitizenStatusView(APIView):

    permission_classes = [IsCivicAdmin]

    def patch(self, request, user_id):

        citizen = get_object_or_404(
            User,
            id=user_id,
            role="citizen"
        )

        serializer = AdminCitizenStatusSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        new_status = serializer.validated_data[
            "is_active"
        ]

        reason = serializer.validated_data.get(
            "reason",
            ""
        )

        # -----------------------------
        # Prevent unnecessary update
        # -----------------------------

        if citizen.is_active == new_status:

            current_status = (
                "active"
                if citizen.is_active
                else "inactive"
            )

            return Response(
                {
                    "success": False,
                    "message": (
                        f"Citizen account is already "
                        f"{current_status}."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        citizen.is_active = new_status

        citizen.save(
            update_fields=[
                "is_active",
                "updated_at"
            ]
        )

        action = (
            "activated"
            if new_status
            else "deactivated"
        )

        return Response(
            {
                "success": True,
                "message": (
                    f"Citizen account has been "
                    f"{action} successfully."
                ),
                "data": {
                    "citizen_id": citizen.id,
                    "full_name": citizen.full_name,
                    "email": citizen.email,
                    "is_active": citizen.is_active,
                    "reason": reason,
                },
            },
            status=status.HTTP_200_OK
        )

@extend_schema(
    tags=["Admin - User Management"],
    summary="View citizen reported problems",
    description=(
        "Retrieve all problems reported by a specific citizen "
        "with optional status and priority filtering."
    ),
    parameters=[
        OpenApiParameter(
            name="status",
            description="Filter by problem status.",
            required=False,
            type=str,
        ),
        OpenApiParameter(
            name="priority",
            description="Filter by problem priority.",
            required=False,
            type=str,
        ),
        OpenApiParameter(
            name="page",
            description="Page number.",
            required=False,
            type=int,
        ),
        OpenApiParameter(
            name="page_size",
            description="Number of records per page.",
            required=False,
            type=int,
        ),
    ],
)

class AdminCitizenProblemListView(APIView):

    permission_classes = [IsCivicAdmin]

    def get(self, request, user_id):

        citizen = get_object_or_404(
            User,
            id=user_id,
            role="citizen"
        )

        problems = Problem.objects.filter(
            reported_by=citizen
        ).select_related(
            "category"
        ).order_by(
            "-created_at"
        )

        # -----------------------------
        # Problem status filter
        # -----------------------------

        problem_status = request.query_params.get(
            "status",
            ""
        ).strip().lower()

        if problem_status:

            problems = problems.filter(
                status=problem_status
            )

        # -----------------------------
        # Priority filter
        # -----------------------------

        priority = request.query_params.get(
            "priority",
            ""
        ).strip().lower()

        if priority:

            problems = problems.filter(
                priority=priority
            )

        # -----------------------------
        # Pagination
        # -----------------------------

        paginator = AdminCitizenPagination()

        page = paginator.paginate_queryset(
            problems,
            request
        )

        serializer = AdminCitizenProblemSerializer(
            page,
            many=True
        )

        return paginator.get_paginated_response(
            serializer.data
        )