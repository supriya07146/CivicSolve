
from django.db.models import Q

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from problems.models import ProblemAssignment

from .permissions import IsCivicAdmin
from .assignment_serializers import (
    AdminAssignmentSerializer,
    AdminAssignmentCreateSerializer,
)


class AdminAssignmentListCreateView(APIView):
    permission_classes = [IsCivicAdmin]

    def get(self, request):
        status_filter = request.query_params.get("status", "").strip().lower()
        search = request.query_params.get("search", "").strip()

        valid_statuses = {
            value for value, label in ProblemAssignment.STATUS_CHOICES
        }

        if status_filter and status_filter not in valid_statuses:
            return Response(
                {
                    "success": False,
                    "message": "Invalid assignment status.",
                    "allowed_statuses": sorted(valid_statuses),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        assignments = ProblemAssignment.objects.select_related(
            "problem",
            "organization",
            "assigned_by",
        ).all()

        if status_filter:
            assignments = assignments.filter(status=status_filter)

        if search:
            assignments = assignments.filter(
                Q(problem__title__icontains=search)
                | Q(problem__location__icontains=search)
                | Q(organization__organization_name__icontains=search)
                | Q(organization__email__icontains=search)
                | Q(problem__problem_code__icontains=search)
            )

        assignments = assignments.order_by("-assigned_at")

        serializer = AdminAssignmentSerializer(
            assignments,
            many=True,
            context={"request": request},
        )

        summary = {
            "total": ProblemAssignment.objects.count(),
            "assigned": ProblemAssignment.objects.filter(status="assigned").count(),
            "accepted": ProblemAssignment.objects.filter(status="accepted").count(),
            "in_progress": ProblemAssignment.objects.filter(status="in_progress").count(),
            "completed": ProblemAssignment.objects.filter(status="completed").count(),
            "cancelled": ProblemAssignment.objects.filter(status="cancelled").count(),
        }

        return Response(
            {
                "success": True,
                "summary": summary,
                "count": len(serializer.data),
                "assignments": serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    def post(self, request):
        serializer = AdminAssignmentCreateSerializer(
            data=request.data,
            context={"request": request},
        )

        if not serializer.is_valid():
            return Response(
                {
                    "success": False,
                    "message": "Please correct the assignment details.",
                    "errors": serializer.errors,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        assignment = serializer.save()

        response_serializer = AdminAssignmentSerializer(
            assignment,
            context={"request": request},
        )

        return Response(
            {
                "success": True,
                "message": "Problem assigned successfully.",
                "assignment": response_serializer.data,
            },
            status=status.HTTP_201_CREATED,
        )


class AdminAssignmentDetailView(APIView):
    permission_classes = [IsCivicAdmin]

    def get(self, request, assignment_id):
        try:
            assignment = ProblemAssignment.objects.select_related(
                "problem",
                "organization",
                "assigned_by",
            ).get(id=assignment_id)
        except ProblemAssignment.DoesNotExist:
            return Response(
                {
                    "success": False,
                    "message": "Assignment not found.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = AdminAssignmentSerializer(
            assignment,
            context={"request": request},
        )

        return Response(
            {
                "success": True,
                "assignment": serializer.data,
            },
            status=status.HTTP_200_OK,
        )