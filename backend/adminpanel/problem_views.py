from django.db.models import Q, Count

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from problems.models import Problem

from .permissions import IsCivicAdmin
from .problem_serializers import (
    AdminProblemListSerializer,
    AdminProblemDetailSerializer,
)


class AdminProblemListView(APIView):
    permission_classes = [IsCivicAdmin]

    def get(self, request):
        status_filter = request.query_params.get(
            "status", ""
        ).strip().lower()

        priority_filter = request.query_params.get(
            "priority", ""
        ).strip().lower()

        category_filter = request.query_params.get(
            "category", ""
        ).strip()

        search = request.query_params.get(
            "search", ""
        ).strip()

        valid_statuses = {
            value for value, label
            in Problem.STATUS_CHOICES
        }

        valid_priorities = {
            value for value, label
            in Problem.PRIORITY_CHOICES
        }

        if status_filter and status_filter not in valid_statuses:
            return Response(
                {
                    "success": False,
                    "message": "Invalid problem status.",
                    "allowed_statuses": sorted(valid_statuses),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if priority_filter and priority_filter not in valid_priorities:
            return Response(
                {
                    "success": False,
                    "message": "Invalid problem priority.",
                    "allowed_priorities": sorted(valid_priorities),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        problems = (
            Problem.objects
            .select_related("category", "reported_by")
            .annotate(attachment_total=Count("attachments"))
        )

        if status_filter:
            problems = problems.filter(status=status_filter)

        if priority_filter:
            problems = problems.filter(priority=priority_filter)

        if category_filter:
            if category_filter.isdigit():
                problems = problems.filter(
                    category_id=int(category_filter)
                )
            else:
                problems = problems.filter(
                    category__name__iexact=category_filter
                )

        if search:
            problems = problems.filter(
                Q(title__icontains=search)
                | Q(description__icontains=search)
                | Q(location__icontains=search)
                | Q(problem_code__icontains=search)
                | Q(reported_by__full_name__icontains=search)
                | Q(reported_by__email__icontains=search)
                | Q(category__name__icontains=search)
            )

        problems = problems.order_by("-created_at")

        serializer = AdminProblemListSerializer(
            problems,
            many=True,
            context={"request": request},
        )

        all_problems = Problem.objects.all()

        summary = {
            "total": all_problems.count(),
            "open": all_problems.filter(status="open").count(),
            "under_review": all_problems.filter(
                status="under_review"
            ).count(),
            "assigned": all_problems.filter(
                status="assigned"
            ).count(),
            "in_progress": all_problems.filter(
                status="in_progress"
            ).count(),
            "resolved": all_problems.filter(
                status="resolved"
            ).count(),
            "rejected": all_problems.filter(
                status="rejected"
            ).count(),
            "closed": all_problems.filter(
                status="closed"
            ).count(),
        }

        return Response(
            {
                "success": True,
                "summary": summary,
                "count": len(serializer.data),
                "problems": serializer.data,
            },
            status=status.HTTP_200_OK,
        )


class AdminProblemDetailView(APIView):
    permission_classes = [IsCivicAdmin]

    def get(self, request, problem_id):
        try:
            problem = (
                Problem.objects
                .select_related(
                    "category",
                    "reported_by",
                )
                .prefetch_related(
                    "attachments",
                    "assignments__organization",
                    "assignments__assigned_by",
                )
                .get(id=problem_id)
            )
        except Problem.DoesNotExist:
            return Response(
                {
                    "success": False,
                    "message": "Problem not found.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = AdminProblemDetailSerializer(
            problem,
            context={"request": request},
        )

        return Response(
            {
                "success": True,
                "problem": serializer.data,
            },
            status=status.HTTP_200_OK,
        )