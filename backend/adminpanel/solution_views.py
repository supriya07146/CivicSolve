
from django.db.models import Q
from django.utils import timezone

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from problems.models import Solution
from .permissions import IsCivicAdmin
from .notification_service import create_notification, notify_admins
from .solution_serializers import (
    AdminSolutionSerializer,
    AdminSolutionCreateSerializer,
)


class AdminSolutionListCreateView(APIView):
    permission_classes = [IsCivicAdmin]

    def get(self, request):
        status_filter = request.query_params.get(
            "status", ""
        ).strip().lower()

        search = request.query_params.get(
            "search", ""
        ).strip()

        valid_statuses = {
            value for value, label in Solution.STATUS_CHOICES
        }

        if status_filter and status_filter not in valid_statuses:
            return Response(
                {
                    "success": False,
                    "message": "Invalid solution status.",
                    "allowed_statuses": sorted(valid_statuses),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        solutions = Solution.objects.select_related(
            "problem",
            "assignment",
            "organization",
            "submitted_by",
            "reviewed_by",
        ).all()

        if status_filter:
            solutions = solutions.filter(status=status_filter)

        if search:
            solutions = solutions.filter(
                Q(title__icontains=search)
                | Q(description__icontains=search)
                | Q(proposed_action__icontains=search)
                | Q(problem__title__icontains=search)
                | Q(problem__location__icontains=search)
                | Q(organization__organization_name__icontains=search)
            )

        solutions = solutions.order_by("-created_at")

        serializer = AdminSolutionSerializer(
            solutions,
            many=True,
            context={"request": request},
        )

        summary = {
            "total": Solution.objects.count(),
            "pending": Solution.objects.filter(
                status="pending"
            ).count(),
            "approved": Solution.objects.filter(
                status="approved"
            ).count(),
            "changes_requested": Solution.objects.filter(
                status="changes_requested"
            ).count(),
            "rejected": Solution.objects.filter(
                status="rejected"
            ).count(),
        }

        return Response(
            {
                "success": True,
                "summary": summary,
                "count": len(serializer.data),
                "solutions": serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    def post(self, request):
        serializer = AdminSolutionCreateSerializer(
            data=request.data,
            context={"request": request},
        )

        if not serializer.is_valid():
            return Response(
                {
                    "success": False,
                    "message": "Please correct the solution details.",
                    "errors": serializer.errors,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        solution = serializer.save(
            submitted_by=request.user,
            organization=None,
        )

        response_serializer = AdminSolutionSerializer(
            solution,
            context={"request": request},
        )

        return Response(
            {
                "success": True,
                "message": "Solution created successfully.",
                "solution": response_serializer.data,
            },
            status=status.HTTP_201_CREATED,
        )


class AdminSolutionDetailView(APIView):
    permission_classes = [IsCivicAdmin]

    def get(self, request, solution_id):
        try:
            solution = Solution.objects.select_related(
                "problem",
                "assignment",
                "organization",
                "submitted_by",
                "reviewed_by",
            ).get(id=solution_id)
        except Solution.DoesNotExist:
            return Response(
                {
                    "success": False,
                    "message": "Solution not found.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = AdminSolutionSerializer(
            solution,
            context={"request": request},
        )

        return Response(
            {
                "success": True,
                "solution": serializer.data,
            },
            status=status.HTTP_200_OK,
        )


class AdminSolutionReviewView(APIView):
    permission_classes = [IsCivicAdmin]

    def patch(self, request, solution_id):
        try:
            solution = Solution.objects.get(id=solution_id)
        except Solution.DoesNotExist:
            return Response(
                {
                    "success": False,
                    "message": "Solution not found.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        new_status = request.data.get("status", "")
        review_notes = request.data.get(
            "admin_review_notes", ""
        )

        allowed_review_statuses = {
            "approved",
            "rejected",
            "changes_requested",
        }

        if new_status not in allowed_review_statuses:
            return Response(
                {
                    "success": False,
                    "message": "Invalid review status.",
                    "allowed_statuses": sorted(
                        allowed_review_statuses
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not isinstance(review_notes, str):
            return Response(
                {
                    "success": False,
                    "message": "Review notes must be text.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if len(review_notes) > 5000:
            return Response(
                {
                    "success": False,
                    "message": "Review notes cannot exceed 5000 characters.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        solution.status = new_status
        solution.admin_review_notes = review_notes
        solution.reviewed_by = request.user
        solution.reviewed_at = timezone.now()
        solution.save(
            update_fields=[
                "status",
                "admin_review_notes",
                "reviewed_by",
                "reviewed_at",
                "updated_at",
            ]
        )

        # Notify the submitting organization or citizen
        try:
            if solution.organization:
                create_notification(
                    recipient=solution.organization,
                    title=f"Solution review: {new_status.replace('_', ' ').capitalize()}",
                    message=f'Solution for problem "{solution.problem.title}" was {new_status.replace("_", " ")}.',
                    notification_type="solution",
                    actor=request.user,
                    target_url="/organizer/dashboard",
                )
            if solution.problem.reported_by:
                create_notification(
                    recipient=solution.problem.reported_by,
                    title="Update on problem solution",
                    message=f'A solution for your problem "{solution.problem.title}" has been reviewed ({new_status.replace("_", " ")}).',
                    notification_type="solution",
                    actor=request.user,
                    target_url="/citizen/problems",
                )
        except Exception:
            pass

        serializer = AdminSolutionSerializer(
            solution,
            context={"request": request},
        )

        return Response(
            {
                "success": True,
                "message": "Solution review updated successfully.",
                "solution": serializer.data,
            },
            status=status.HTTP_200_OK,
        )