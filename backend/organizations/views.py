import re
from datetime import date

from django.db.models import Count, Q, F
from django.utils import timezone
from rest_framework import serializers,status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import OrganizationProfileSerializer
from organizations.models import Organization
from problems.models import ProblemAssignment, Solution, Problem
from rest_framework.parsers import (
    MultiPartParser,
    FormParser,
    JSONParser,
)
from rest_framework.exceptions import ValidationError

from drf_spectacular.utils import (
    extend_schema,
    OpenApiParameter,
    OpenApiTypes,
)

from django.db import transaction
from rest_framework import serializers
from drf_spectacular.utils import extend_schema, OpenApiResponse

from problems.models import ProblemAssignment, Problem
from organizations.models import Organization

from django.shortcuts import get_object_or_404
from rest_framework.exceptions import NotFound

from drf_spectacular.utils import extend_schema
from problems.serializers import OrganizationSolutionSubmitRequestSerializer

from problems.models import (
    ProblemAttachment,
    ProblemDiscussion,
    SolutionEvidence,
)
from .serializers import (
    OrganizationProfileSerializer,
    ActiveProblemSerializer,
    ResolvedProblemSerializer,
    OrganizationProgressAssignmentSerializer,
    ProblemProgressUpdateSerializer,
)
from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.exceptions import ValidationError
from drf_spectacular.utils import extend_schema
from problems.models import ProblemProgressUpdate
from problems.models import (
    ProblemAssignment,
    Solution,
    SolutionEvidence,
)
from problems.serializers import (
    OrganizationSolutionCreateSerializer,
    SolutionEvidenceSerializer,
)
from problems.models import (
    Problem,
    ProblemAssignment,
    Solution,
)

from adminpanel.models import Notification
from adminpanel.notification_service import create_notification
from django.utils import timezone

class OrganizationDashboardView(APIView):
    """
    Dashboard summary for the authenticated organization.
    Uses existing database models; creates no new tables.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        organization = request.user

        # Organization tokens authenticate as Organization instances.
        if not isinstance(organization, Organization):
            return Response(
                {"detail": "Organization access only."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if (
            not organization.is_active
            or organization.status != "approved"
            or not organization.email_verified
        ):
            return Response(
                {"detail": "Your organization is not approved and active."},
                status=status.HTTP_403_FORBIDDEN,
            )

        today = timezone.localdate()
        month_start = today.replace(day=1)

        assignments = ProblemAssignment.objects.filter(
            organization=organization
        ).select_related("problem", "problem__category")

        active = assignments.filter(
            status__in=["accepted", "in_progress"]
        )

        pending_acceptance = assignments.filter(status="assigned")

        completed = assignments.filter(status="completed")

        assigned_this_month = assignments.filter(
            assigned_at__date__gte=month_start,
            assigned_at__date__lte=today,
        ).count()

        resolved_this_month = completed.filter(
            completed_at__date__gte=month_start,
            completed_at__date__lte=today,
        ).count()

        total_assignments = assignments.count()
        completed_count = completed.count()

        completion_rate = round(
            completed_count * 100 / total_assignments
        ) if total_assignments else 0

        pending_verification = Solution.objects.filter(
            organization=organization,
            status="pending",
        ).count()

        # Upcoming work: the model currently has no deadline field,
        # so display outstanding assignments ordered by assignment date.
        next_assignments = assignments.exclude(
            status__in=["completed", "cancelled"]
        ).order_by("assigned_at")[:5]

        priorities = assignments.filter(
            status__in=["assigned", "accepted", "in_progress"],
            problem__priority__in=["urgent", "high"],
        ).order_by(
            "-problem__priority", "assigned_at"
        )[:5]

        def serialize_assignment(assignment):
            problem = assignment.problem
            return {
                "assignment_id": assignment.id,
                "problem_id": problem.id,
                "problem_code": str(problem.problem_code),
                "title": problem.title,
                "category": problem.category.name,
                "location": problem.location,
                "priority": problem.priority,
                "problem_status": problem.status,
                "assignment_status": assignment.status,
                "assigned_at": assignment.assigned_at.isoformat(),
                "accepted_at": (
                    assignment.accepted_at.isoformat()
                    if assignment.accepted_at else None
                ),
                "completed_at": (
                    assignment.completed_at.isoformat()
                    if assignment.completed_at else None
                ),
                "notes": assignment.notes,
            }

        # Six-month trend, based on actual assignment records.
        performance = []
        for offset in range(5, -1, -1):
            month_index = today.year * 12 + today.month - 1 - offset
            year, month_zero = divmod(month_index, 12)
            month = month_zero + 1
            start = date(year, month, 1)

            if month == 12:
                end = date(year + 1, 1, 1)
            else:
                end = date(year, month + 1, 1)

            performance.append({
                "month": start.strftime("%b"),
                "reported": assignments.filter(
                    assigned_at__date__gte=start,
                    assigned_at__date__lt=end,
                ).count(),
                "resolved": completed.filter(
                    completed_at__date__gte=start,
                    completed_at__date__lt=end,
                ).count(),
            })

        return Response({
            "organization": {
                "id": organization.id,
                "name": organization.organization_name,
                "type": organization.organization_type,
                "city": organization.city,
                "service_area": organization.service_area,
            },
            "stats": {
                "assigned_this_month": assigned_this_month,
                "active_work": active.count(),
                "pending_acceptance": pending_acceptance.count(),
                "resolved_this_month": resolved_this_month,
                "completion_rate": completion_rate,
                "pending_verification": pending_verification,
                "total_assignments": total_assignments,
            },
            "next_assignments": [
                serialize_assignment(item)
                for item in next_assignments
            ],
            "priorities": [
                serialize_assignment(item)
                for item in priorities
            ],
            "performance": performance,
        })

class AvailableProblemSerializer(serializers.ModelSerializer):
    category = serializers.CharField(source="category.name", read_only=True)
    problem_code = serializers.CharField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    is_escalated = serializers.BooleanField(read_only=True)

    class Meta:
        model = Problem
        fields = [
            "id",
            "problem_code",
            "title",
            "description",
            "category",
            "location",
            "latitude",
            "longitude",
            "priority",
            "status",
            "is_escalated",
            "created_at",
        ]


class OrganizationAvailableProblemsView(APIView):
    """
    Read-only list of eligible community problems for an approved
    organization. Results must match its registered expertise and
    service area.

    Supports search, category, priority and pagination.
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="List available problems for an organization",
        description=(
            "Returns open or under-review problems matching the "
            "authenticated organization's registered categories and "
            "service area. Already assigned problems are excluded. "
            "Browsing does not create an assignment."
        ),
        parameters=[
            OpenApiParameter(
                name="search",
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description="Search problem title, description or location.",
            ),
            OpenApiParameter(
                name="category",
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description="Filter by problem category name.",
            ),
            OpenApiParameter(
                name="priority",
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                enum=["low", "medium", "high", "urgent"],
            ),
            OpenApiParameter(
                name="page",
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
            ),
            OpenApiParameter(
                name="page_size",
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
                description="Results per page, maximum 50.",
            ),
        ],
        responses={200: AvailableProblemSerializer(many=True)},
        tags=["Organization - Available Problems"],
    )
    def get(self, request):
        organization = request.user

        # CivicJWTAuthentication returns Organization for organization tokens.
        if not isinstance(organization, Organization):
            return Response(
                {"detail": "Organization access only."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if (
            not organization.is_active
            or organization.status != "approved"
            or not organization.email_verified
        ):
            return Response(
                {"detail": "Your organization is not approved and active."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Categories are stored as a JSON list on Organization.
        registered_categories = organization.categories or []

        if not isinstance(registered_categories, list):
            registered_categories = []

        category_filter = Q()
        valid_category = False

        for item in registered_categories:
            # Support either category names or category IDs.
            if isinstance(item, dict):
                item = item.get("name", item.get("id", ""))

            if isinstance(item, str) and item.strip():
                value = item.strip()
                category_filter |= Q(category__name__iexact=value)
                valid_category = True

                if value.isdigit():
                    category_filter |= Q(category_id=int(value))

            elif isinstance(item, int) and not isinstance(item, bool):
                category_filter |= Q(category_id=item)
                valid_category = True

        # Do not expose every problem when the organization has no
        # registered expertise.
        if not valid_category:
            queryset = Problem.objects.none()
        else:
            queryset = Problem.objects.filter(
                category_filter,
                status__in=["open", "under_review"],
                category__is_active=True,
            )

            # Exclude problems with a live or completed assignment.
            # Cancelled assignments do not permanently block a problem.
            queryset = queryset.exclude(
                assignments__status__in=[
                    "assigned",
                    "accepted",
                    "in_progress",
                    "completed",
                ]
            )

            # Match location against registered service-area terms.
            area_text = " ".join(
                part for part in [
                    organization.service_area or "",
                    organization.city or "",
                ]
                if part
            )

            area_terms = [
                term.strip()
                for term in re.split(
                    r"[,;/|]|\band\b",
                    area_text,
                    flags=re.IGNORECASE,
                )
                if len(term.strip()) >= 3
            ]

            if area_terms:
                area_filter = Q()
                for term in area_terms:
                    area_filter |= Q(location__icontains=term)

                queryset = queryset.filter(area_filter)
            else:
                queryset = Problem.objects.none()

        search = request.query_params.get("search", "").strip()
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search)
                | Q(description__icontains=search)
                | Q(location__icontains=search)
                | Q(problem_code__icontains=search)
            )

        category = request.query_params.get("category", "").strip()
        if category:
            queryset = queryset.filter(
                category__name__iexact=category
            )

        priority = request.query_params.get("priority", "").strip().lower()
        if priority:
            valid_priorities = {
                value for value, _ in Problem.PRIORITY_CHOICES
            }
            if priority not in valid_priorities:
                return Response(
                    {
                        "detail": "Invalid priority.",
                        "allowed_values": sorted(valid_priorities),
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            queryset = queryset.filter(priority=priority)

        # Avoid duplicate results caused by assignment joins.
        queryset = queryset.select_related(
            "category"
        ).distinct().order_by(
            "-priority", "-created_at"
        )

        total = queryset.count()

        try:
            page = max(1, int(request.query_params.get("page", 1)))
            page_size = min(
                50,
                max(1, int(request.query_params.get("page_size", 3))),
            )
        except (TypeError, ValueError):
            return Response(
                {"detail": "page and page_size must be integers."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        start = (page - 1) * page_size
        problems = queryset[start:start + page_size]

        return Response({
            "organization": {
                "id": organization.id,
                "name": organization.organization_name,
                "city": organization.city,
                "service_area": organization.service_area,
                "categories": registered_categories,
            },
            "count": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size,
            "results": AvailableProblemSerializer(
                problems,
                many=True,
                context={"request": request},
            ).data,
        })


class OrganizationActiveProblemsView(APIView):
    """
    List active assignments belonging only to the
    authenticated organization.

    Supports search, priority, category, assignment status,
    and pagination.
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Organization - Active Problems"],
        summary="List active assigned problems",
        description=(
            "Returns assigned, accepted, and in-progress "
            "assignments for the authenticated organization. "
            "Completed and cancelled assignments are excluded."
        ),
        parameters=[
            OpenApiParameter(
                name="search",
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description="Search title, description, or location.",
            ),
            OpenApiParameter(
                name="category",
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
            ),
            OpenApiParameter(
                name="priority",
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                enum=["low", "medium", "high", "urgent"],
            ),
            OpenApiParameter(
                name="status",
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                enum=["assigned", "accepted", "in_progress"],
                description="Filter by assignment status.",
            ),
            OpenApiParameter(
                name="page",
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
            ),
            OpenApiParameter(
                name="page_size",
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
            ),
        ],
        responses={200: ActiveProblemSerializer(many=True)},
    )
    def get(self, request):
        organization = get_active_organization(request)

        if organization is None:
            return Response(
                {
                    "detail":
                    "Approved organization access required."
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        queryset = ProblemAssignment.objects.filter(
            organization=organization,
            status__in=[
                "assigned",
                "accepted",
                "in_progress",
            ],
        ).exclude(
            problem__status__in=[
                "resolved",
                "rejected",
                "closed",
            ],
        ).select_related(
            "problem",
            "problem__category",
            "problem__reported_by",
            "organization",
        )

        # Search
        search = request.query_params.get(
            "search", ""
        ).strip()

        if search:
            queryset = queryset.filter(
                Q(problem__title__icontains=search)
                | Q(problem__description__icontains=search)
                | Q(problem__location__icontains=search)
            )

        # Category
        category = request.query_params.get(
            "category", ""
        ).strip()

        if category:
            queryset = queryset.filter(
                problem__category__name__iexact=category
            )

        # Priority
        priority = request.query_params.get(
            "priority", ""
        ).strip().lower()

        valid_priorities = {
            value for value, _ in Problem.PRIORITY_CHOICES
        }

        if priority:
            if priority not in valid_priorities:
                return Response(
                    {
                        "detail": "Invalid priority.",
                        "allowed_values": sorted(
                            valid_priorities
                        ),
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            queryset = queryset.filter(
                problem__priority=priority
            )

        # Assignment status
        assignment_status = request.query_params.get(
            "status", ""
        ).strip().lower()

        valid_statuses = {
            "assigned", "accepted", "in_progress"
        }

        if assignment_status:
            if assignment_status not in valid_statuses:
                return Response(
                    {
                        "detail": "Invalid assignment status.",
                        "allowed_values": sorted(
                            valid_statuses
                        ),
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            queryset = queryset.filter(
                status=assignment_status
            )

        queryset = queryset.order_by(
            "-problem__is_escalated",
            "-problem__created_at",
            "-assigned_at",
        )

        total = queryset.count()

        try:
            page = max(
                1,
                int(request.query_params.get("page", 1)),
            )
            page_size = min(
                50,
                max(
                    1,
                    int(
                        request.query_params.get(
                            "page_size", 6
                        )
                    ),
                ),
            )
        except (TypeError, ValueError):
            return Response(
                {
                    "detail":
                    "page and page_size must be integers."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        start = (page - 1) * page_size
        assignments = queryset[start:start + page_size]

        return Response({
            "count": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (
                total + page_size - 1
            ) // page_size,
            "results": ActiveProblemSerializer(
                assignments,
                many=True,
                context={"request": request},
            ).data,
        })

class OrganizationResolvedProblemsView(APIView):
    """
    Completion history for the authenticated organization.
    Includes the latest completed work and paginated history.
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Organization - Resolved Problems"],
        summary="List resolved problems and completion history",
        description=(
            "Returns completed assignments belonging to the authenticated "
            "organization, newest completion first. Supports search, "
            "category, priority, completion date filters, and pagination."
        ),
        parameters=[
            OpenApiParameter(
                name="search",
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description="Search problem title, code, description, or location.",
            ),
            OpenApiParameter(
                name="category",
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
            ),
            OpenApiParameter(
                name="priority",
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                enum=["low", "medium", "high", "urgent"],
            ),
            OpenApiParameter(
                name="date_from",
                type=OpenApiTypes.DATE,
                location=OpenApiParameter.QUERY,
                description="Filter completion date from YYYY-MM-DD.",
            ),
            OpenApiParameter(
                name="date_to",
                type=OpenApiTypes.DATE,
                location=OpenApiParameter.QUERY,
                description="Filter completion date through YYYY-MM-DD.",
            ),
            OpenApiParameter(
                name="page",
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
            ),
            OpenApiParameter(
                name="page_size",
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
            ),
        ],
        responses={200: ResolvedProblemSerializer(many=True)},
    )
    def get(self, request):
        organization = get_active_organization(request)

        if organization is None:
            return Response(
                {"detail": "Approved organization access required."},
                status=status.HTTP_403_FORBIDDEN,
            )

        queryset = ProblemAssignment.objects.filter(
            organization=organization,
            status="completed",
        ).select_related(
            "problem",
            "problem__category",
        )

        # Search
        search = request.query_params.get("search", "").strip()
        if search:
            queryset = queryset.filter(
                Q(problem__title__icontains=search)
                | Q(problem__description__icontains=search)
                | Q(problem__location__icontains=search)
                | Q(problem__problem_code__icontains=search)
            )

        # Category
        category = request.query_params.get("category", "").strip()
        if category:
            queryset = queryset.filter(
                problem__category__name__iexact=category
            )

        # Priority
        priority = request.query_params.get("priority", "").strip().lower()
        valid_priorities = {
            value for value, _ in Problem.PRIORITY_CHOICES
        }

        if priority:
            if priority not in valid_priorities:
                return Response(
                    {
                        "detail": "Invalid priority.",
                        "allowed_values": sorted(valid_priorities),
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            queryset = queryset.filter(problem__priority=priority)

        # Completion date filters
        date_from = request.query_params.get("date_from", "").strip()
        date_to = request.query_params.get("date_to", "").strip()

        try:
            if date_from:
                parsed_from = date.fromisoformat(date_from)
                queryset = queryset.filter(
                    completed_at__date__gte=parsed_from
                )

            if date_to:
                parsed_to = date.fromisoformat(date_to)
                queryset = queryset.filter(
                    completed_at__date__lte=parsed_to
                )

            if date_from and date_to and parsed_from > parsed_to:
                return Response(
                    {"detail": "date_from cannot be later than date_to."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        except ValueError:
            return Response(
                {
                    "detail": "Use valid dates in YYYY-MM-DD format.",
                    "fields": ["date_from", "date_to"],
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Null completion timestamps appear last.
        queryset = queryset.order_by(
            F("completed_at").desc(nulls_last=True),
            "-assigned_at",
        )

        total = queryset.count()

        try:
            page = max(1, int(request.query_params.get("page", 1)))
            page_size = min(
                50,
                max(1, int(request.query_params.get("page_size", 6))),
            )
        except (TypeError, ValueError):
            return Response(
                {"detail": "page and page_size must be integers."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Latest completed work matching the current filters.
        latest = queryset.first()

        start = (page - 1) * page_size
        assignments = queryset[start:start + page_size]

        serializer_context = {"request": request}

        return Response({
            "count": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size,
            "latest_completed": (
                ResolvedProblemSerializer(
                    latest,
                    context=serializer_context,
                ).data
                if latest else None
            ),
            "results": ResolvedProblemSerializer(
                assignments,
                many=True,
                context=serializer_context,
            ).data,
        })
    
class OrganizationProblemDetailsView(APIView):
    """
    Detailed view of a problem assigned to the authenticated
    organization. Read-only; creates no database tables.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, problem_id):
        organization = request.user

        if not isinstance(organization, Organization):
            return Response(
                {"detail": "Organization access only."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if (
            not organization.is_active
            or organization.status != "approved"
            or not organization.email_verified
        ):
            return Response(
                {"detail": "Your organization is not approved and active."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Require an assignment belonging to this organization.
        # Never expose an unrelated organization's assigned problem.
        assignment = (
            ProblemAssignment.objects
            .filter(
                problem_id=problem_id,
                organization=organization,
            )
            .select_related(
                "problem",
                "problem__category",
                "problem__reported_by",
                "assigned_by",
            )
            .order_by("-assigned_at")
            .first()
        )

        if assignment is None:
            raise NotFound(
                "This problem is not assigned to your organization."
            )

        problem = assignment.problem

        # All datetimes returned to React use ISO 8601.
        def iso(value):
            return value.isoformat() if value else None

        def file_url(file_field):
            if not file_field:
                return None

            try:
                url = file_field.url
                return request.build_absolute_uri(url)
            except (ValueError, AttributeError):
                return None

        def person_name(person):
            if not person:
                return "Unknown"

            return (
                getattr(person, "full_name", "")
                or getattr(person, "email", "")
                or "Unknown"
            )

        today = timezone.localdate()
        days_open = max(
            0, (today - problem.created_at.date()).days
        )

        # Original citizen report and uploaded attachments.
        attachments = ProblemAttachment.objects.filter(
            problem=problem
        ).order_by("uploaded_at", "id")

        report_data = {
            "reported_by": person_name(problem.reported_by),
            "description": problem.description,
            "created_at": iso(problem.created_at),
            "location": problem.location,
            "latitude": (
                float(problem.latitude)
                if problem.latitude is not None else None
            ),
            "longitude": (
                float(problem.longitude)
                if problem.longitude is not None else None
            ),
            "attachments": [
                {
                    "id": item.id,
                    "url": file_url(item.file),
                    "uploaded_at": iso(item.uploaded_at),
                }
                for item in attachments
            ],
        }

        # Assignment and work record.
        assignment_data = {
            "id": assignment.id,
            "status": assignment.status,
            "assigned_at": iso(assignment.assigned_at),
            "accepted_at": iso(assignment.accepted_at),
            "completed_at": iso(assignment.completed_at),
            "assigned_by": person_name(assignment.assigned_by),
            "notes": assignment.notes,
        }

        # Solutions belonging to this organization's work only.
        solutions = list(
            Solution.objects.filter(
                problem=problem,
                organization=organization,
            ).order_by("-created_at")
        )

        solution_data = []

        for solution in solutions:
            evidence = SolutionEvidence.objects.filter(
                solution=solution,
                uploaded_by=organization,
            ).order_by("uploaded_at", "id")

            solution_data.append({
                "id": solution.id,
                "title": solution.title,
                "description": solution.description,
                "proposed_action": solution.proposed_action,
                "status": solution.status,
                "created_at": iso(solution.created_at),
                "updated_at": iso(solution.updated_at),
                "reviewed_at": iso(solution.reviewed_at),
                "admin_review_notes": solution.admin_review_notes,
                "evidence": [
                    {
                        "id": item.id,
                        "type": item.evidence_type,
                        "caption": item.caption,
                        "url": file_url(item.file),
                        "uploaded_at": iso(item.uploaded_at),
                    }
                    for item in evidence
                ],
            })

        # Community discussion. Hidden messages are never returned.
        discussions = list(
            ProblemDiscussion.objects.filter(
                problem=problem,
                is_hidden=False,
            ).select_related(
                "author_user",
                "author_organization",
            ).order_by("created_at", "id")
        )

        discussion_data = []

        for message in discussions:
            if message.author_organization_id:
                author = message.author_organization.organization_name
                author_type = "organization"
            else:
                author = person_name(message.author_user)
                author_type = "user"

            discussion_data.append({
                "id": message.id,
                "parent_id": message.parent_id,
                "author": author,
                "author_type": author_type,
                "message": message.message,
                "created_at": iso(message.created_at),
            })

        # Build a truthful timeline from persisted events.
        timeline = [{
            "event": "reported",
            "label": "Problem Reported",
            "at": iso(problem.created_at),
        }, {
            "event": "assigned",
            "label": "Assigned to Organization",
            "at": iso(assignment.assigned_at),
        }]

        if assignment.accepted_at:
            timeline.append({
                "event": "accepted",
                "label": "Assignment Accepted",
                "at": iso(assignment.accepted_at),
            })

        if assignment.status == "in_progress":
            timeline.append({
                "event": "in_progress",
                "label": "Work In Progress",
                "at": iso(problem.updated_at),
            })

        for solution in reversed(solutions):
            timeline.append({
                "event": "solution_submitted",
                "label": "Solution Submitted",
                "at": iso(solution.created_at),
                "solution_id": solution.id,
                "solution_status": solution.status,
            })

            if solution.reviewed_at:
                timeline.append({
                    "event": "solution_reviewed",
                    "label": "Solution Reviewed",
                    "at": iso(solution.reviewed_at),
                    "solution_id": solution.id,
                    "solution_status": solution.status,
                })

        if assignment.completed_at:
            timeline.append({
                "event": "assignment_completed",
                "label": "Assignment Completed",
                "at": iso(assignment.completed_at),
            })

        if problem.resolved_at:
            timeline.append({
                "event": "resolved",
                "label": "Problem Resolved",
                "at": iso(problem.resolved_at),
            })

        timeline.sort(key=lambda item: item["at"] or "")

        # Follow-up guidance based on actual stored workflow states.
        if assignment.status == "assigned":
            follow_up = {
                "required": True,
                "message": "Accept the assigned problem to begin work.",
                "action": "accept_assignment",
            }
        elif assignment.status in ("accepted", "in_progress"):
            follow_up = {
                "required": True,
                "message": "Complete the work and submit solution evidence.",
                "action": "submit_solution",
            }
        elif any(s.status == "changes_requested" for s in solutions):
            follow_up = {
                "required": True,
                "message": "Review the requested changes and update your solution.",
                "action": "revise_solution",
            }
        elif any(s.status == "pending" for s in solutions):
            follow_up = {
                "required": False,
                "message": "Your submitted solution is awaiting review.",
                "action": "await_review",
            }
        elif assignment.status == "completed":
            follow_up = {
                "required": False,
                "message": "Your assigned work is marked completed.",
                "action": "view_record",
            }
        else:
            follow_up = {
                "required": False,
                "message": "Review the problem and its latest records.",
                "action": "view_record",
            }

        return Response({
            "problem": {
                "id": problem.id,
                "problem_code": str(problem.problem_code),
                "title": problem.title,
                "description": problem.description,
                "category": problem.category.name,
                "location": problem.location,
                "latitude": (
                    float(problem.latitude)
                    if problem.latitude is not None else None
                ),
                "longitude": (
                    float(problem.longitude)
                    if problem.longitude is not None else None
                ),
                "priority": problem.priority,
                "status": problem.status,
                "is_escalated": problem.is_escalated,
                "created_at": iso(problem.created_at),
                "updated_at": iso(problem.updated_at),
                "days_open": days_open,
                "resolved_at": iso(problem.resolved_at),
                "resolution_notes": problem.resolution_notes,
            },
            "report": report_data,
            "assignment": assignment_data,
            "metrics": {
                "days_open": days_open,
                "priority": problem.priority,
                "comments": len(discussion_data),
                "resolution_complete": (
                    100 if problem.status in ("resolved", "closed")
                    else 0
                ),
            },
            "solutions": solution_data,
            "timeline": timeline,
            "discussion": {
                "count": len(discussion_data),
                "messages": discussion_data[-20:],
            },
            "follow_up": follow_up,
        })


class AssignmentDecisionSerializer(serializers.Serializer):
    acknowledgement = serializers.BooleanField(
        required=False,
        default=False,
    )
    reason = serializers.CharField(
        required=False,
        allow_blank=False,
        max_length=2000,
        trim_whitespace=True,
    )

    def validate(self, attrs):
        # Acceptance requires explicit acknowledgement.
        if not attrs.get("reason") and not attrs.get("acknowledgement"):
            raise serializers.ValidationError(
                {"acknowledgement": "Please acknowledge responsibility."}
            )

        return attrs


def get_active_organization(request):
    organization = request.user

    if not isinstance(organization, Organization):
        return None

    if (
        not organization.is_active
        or organization.status != "approved"
        or not organization.email_verified
    ):
        return None

    return organization


class OrganizationAcceptAssignmentView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Organization - Assignment Decisions"],
        summary="Accept an assigned problem",
        request=AssignmentDecisionSerializer,
        responses={
            200: OpenApiResponse(
                description="Assignment accepted successfully."
            ),
            400: OpenApiResponse(description="Invalid decision or status."),
            403: OpenApiResponse(description="Organization access denied."),
            404: OpenApiResponse(description="Assignment not found."),
        },
    )
    def post(self, request, assignment_id):
        organization = get_active_organization(request)

        if organization is None:
            return Response(
                {"success": False, "message": "Approved organization access required."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = AssignmentDecisionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if not serializer.validated_data.get("acknowledgement"):
            return Response(
                {
                    "success": False,
                    "message": "Please acknowledge responsibility before accepting.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            assignment = (
                ProblemAssignment.objects
                .select_for_update()
                .filter(
                    id=assignment_id,
                    organization=organization,
                )
                .first()
            )

            if assignment is None:
                return Response(
                    {"success": False, "message": "Assignment not found for this organization."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            if assignment.status != "assigned":
                return Response(
                    {
                        "success": False,
                        "message": "Only pending assignments can be accepted.",
                        "assignment_status": assignment.status,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            assignment.status = "accepted"
            assignment.accepted_at = timezone.now()
            assignment.save(update_fields=["status", "accepted_at"])
            create_notification(
    recipient=organization,
    title="Assignment Accepted",
    message=(
        f"You accepted the assignment for "
        f"'{assignment.problem.title}'."
    ),
    notification_type="assignment",
    actor=None,
    target_url="/organization/active-problems",
)
            # Send notification to admins about the acceptance
            from adminpanel.notification_service import notify_admins
            notify_admins(
                title="Assignment Accepted",
                message=f"Organization {organization.organization_name} accepted assignment {assignment.id} for problem {assignment.problem_id}.",
                notification_type="assignment",
                actor=None,
                target_url="",
            )

        return Response(
            {
                "success": True,
                "message": "Responsibility accepted successfully.",
                "assignment": {
                    "id": assignment.id,
                    "problem_id": assignment.problem_id,
                    "status": assignment.status,
                    "accepted_at": assignment.accepted_at.isoformat(),
                },
            },
            status=status.HTTP_200_OK,
        )


class OrganizationRejectAssignmentView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Organization - Assignment Decisions"],
        summary="Reject an assigned problem with a reason",
        request=AssignmentDecisionSerializer,
        responses={
            200: OpenApiResponse(description="Assignment rejection recorded."),
            400: OpenApiResponse(description="Invalid reason or assignment status."),
            403: OpenApiResponse(description="Organization access denied."),
            404: OpenApiResponse(description="Assignment not found."),
        },
    )
    def post(self, request, assignment_id):
        organization = get_active_organization(request)

        if organization is None:
            return Response(
                {"success": False, "message": "Approved organization access required."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = AssignmentDecisionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        reason = serializer.validated_data.get("reason", "").strip()

        if len(reason) < 10:
            return Response(
                {
                    "success": False,
                    "message": "Please provide a rejection reason of at least 10 characters.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            assignment = (
                ProblemAssignment.objects
                .select_for_update()
                .select_related("problem")
                .filter(
                    id=assignment_id,
                    organization=organization,
                )
                .first()
            )

            if assignment is None:
                return Response(
                    {"success": False, "message": "Assignment not found for this organization."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            if assignment.status != "assigned":
                return Response(
                    {
                        "success": False,
                        "message": "Only pending assignments can be rejected.",
                        "assignment_status": assignment.status,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            assignment.status = "cancelled"

            existing_notes = (assignment.notes or "").strip()
            rejection_note = f"Organization rejection reason: {reason}"
            assignment.notes = (
                f"{existing_notes}\n{rejection_note}"
                if existing_notes
                else rejection_note
            )
            assignment.save(update_fields=["status", "notes"])

            
# Notify the organization about the rejection
            create_notification(
                recipient=organization,
                title="Assignment Rejected",
                message=(
                   f"You rejected the assignment for "
                   f"'{assignment.problem.title}'."
                ),
                notification_type="assignment",
                actor=None,
                target_url="/organization/available-problems",
            )

            # Make the problem eligible for admin review/reassignment
            # only if no other live or completed assignment exists.
            other_assignment_exists = (
                ProblemAssignment.objects
                .filter(problem=assignment.problem)
                .exclude(id=assignment.id)
                .filter(
                    status__in=[
                        "assigned",
                        "accepted",
                        "in_progress",
                        "completed",
                    ]
                )
                .exists()
            )

            if not other_assignment_exists:
                assignment.problem.status = "under_review"
                assignment.problem.save(update_fields=["status", "updated_at"])

        return Response(
            {
                "success": True,
                "message": "Assignment rejection recorded successfully.",
                "assignment": {
                    "id": assignment.id,
                    "problem_id": assignment.problem_id,
                    "status": assignment.status,
                    "reason": reason,
                },
            },
            status=status.HTTP_200_OK,
        )


class OrganizationSolutionsView(APIView):
    """
    List and submit solutions for the authenticated organization.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        organization = get_active_organization(request)

        if organization is None:
            return Response(
                {"detail": "Approved organization access required."},
                status=status.HTTP_403_FORBIDDEN,
            )

        solutions = (
            Solution.objects.filter(organization=organization)
            .select_related("problem", "assignment")
            .order_by("-created_at")
        )

        results = []
        for solution in solutions:
            results.append({
                "id": solution.id,
                "problem_id": solution.problem_id,
                "assignment_id": solution.assignment_id,
                "problem_title": solution.problem.title,
                "title": solution.title,
                "description": solution.description,
                "proposed_action": solution.proposed_action,
                "status": solution.status,
                "admin_review_notes": solution.admin_review_notes,
                "created_at": solution.created_at.isoformat(),
                "updated_at": solution.updated_at.isoformat(),
            })

        return Response({
            "count": len(results),
            "results": results,
        })

    @extend_schema(
        operation_id="organization_submit_solution",
        tags=["Organization - Solutions"],
        summary="Submit a solution",
        description=(
            "Submit a solution for an assignment belonging to the "
            "authenticated organization. The assignment must be accepted "
            "or in progress. The solution is sent for review."
        ),
        request=OrganizationSolutionSubmitRequestSerializer,
        responses={
            201: OpenApiResponse(
                description="Solution submitted successfully for review."
            ),
            400: OpenApiResponse(
                description="Invalid request or assignment status."
            ),
            403: OpenApiResponse(
                description="Approved organization access required."
            ),
            404: OpenApiResponse(
                description="Assignment not found for this organization."
            ),
            409: OpenApiResponse(
                description="A solution already exists for this assignment."
            ),
        },
    )
    @transaction.atomic
    def post(self, request):
        # FIX: Retrieve and validate the authenticated organization.
        organization = get_active_organization(request)

        if organization is None:
            return Response(
                {"detail": "Approved organization access required."},
                status=status.HTTP_403_FORBIDDEN,
            )

        assignment_id = request.data.get("assignment_id")

        if not assignment_id:
            return Response(
                {"assignment_id": "This field is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            assignment_id = int(assignment_id)
        except (TypeError, ValueError):
            return Response(
                {"assignment_id": "Enter a valid assignment ID."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Ensure the assignment belongs to this organization.
        assignment = (
            ProblemAssignment.objects.select_for_update()
            .select_related("problem", "organization")
            .filter(
                id=assignment_id,
                organization=organization,
            )
            .first()
        )

        if assignment is None:
            return Response(
                {
                    "detail": (
                        "Assignment not found for this organization."
                    )
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        if assignment.status not in ("accepted", "in_progress"):
            return Response(
                {
                    "detail": (
                        "Accept the assignment before submitting "
                        "a solution."
                    ),
                    "assignment_status": assignment.status,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        existing = Solution.objects.filter(
            assignment=assignment,
            organization=organization,
            status__in=["pending", "approved", "rejected"],
        ).first()

        if existing:
            return Response(
                {
                    "detail": (
                        "A solution already exists for this assignment. "
                        "Check its current status before submitting again."
                    ),
                    "solution_id": existing.id,
                    "solution_status": existing.status,
                },
                status=status.HTTP_409_CONFLICT,
            )

        serializer = OrganizationSolutionCreateSerializer(
            data=request.data,
            context={
                "request": request,
                "problem": assignment.problem,
                "assignment": assignment,
                "organization": organization,
                "submitted_by": None,
            },
        )

        serializer.is_valid(raise_exception=True)
        solution = serializer.save()

        # Update the assignment after successful solution creation.
        if assignment.status == "accepted":
            assignment.status = "in_progress"
            assignment.save(update_fields=["status"])

        if assignment.problem.status in ("assigned", "under_review"):
            assignment.problem.status = "in_progress"
            assignment.problem.save(
                update_fields=["status", "updated_at"]
            )

        return Response(
            {
                "message": "Solution submitted successfully for review.",
                "solution": {
                    "id": solution.id,
                    "problem_id": solution.problem_id,
                    "assignment_id": solution.assignment_id,
                    "title": solution.title,
                    "description": solution.description,
                    "proposed_action": solution.proposed_action,
                    "status": solution.status,
                    "created_at": solution.created_at.isoformat(),
                },
            },
            status=status.HTTP_201_CREATED,
        )

class OrganizationSolutionDetailsView(APIView):
    """
    Retrieve a solution only if it belongs to the authenticated organization.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, solution_id):
        organization = get_active_organization(request)

        if organization is None:
            return Response(
                {"detail": "Approved organization access required."},
                status=status.HTTP_403_FORBIDDEN,
            )

        solution = get_object_or_404(
            Solution.objects.select_related(
                "problem", "assignment"
            ).prefetch_related("evidence"),
            id=solution_id,
            organization=organization,
        )

        return Response({
            "id": solution.id,
            "problem_id": solution.problem_id,
            "assignment_id": solution.assignment_id,
            "problem_title": solution.problem.title,
            "title": solution.title,
            "description": solution.description,
            "proposed_action": solution.proposed_action,
            "status": solution.status,
            "admin_review_notes": solution.admin_review_notes,
            "reviewed_at": (
                solution.reviewed_at.isoformat()
                if solution.reviewed_at else None
            ),
            "created_at": solution.created_at.isoformat(),
            "updated_at": solution.updated_at.isoformat(),
            "evidence": SolutionEvidenceSerializer(
                solution.evidence.filter(uploaded_by=organization),
                many=True,
                context={"request": request},
            ).data,
        })


class OrganizationSolutionEvidenceUploadView(APIView):
    """
    Upload before/after image evidence for the organization's own solution.
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, solution_id):
        organization = get_active_organization(request)

        if organization is None:
            return Response(
                {"detail": "Approved organization access required."},
                status=status.HTTP_403_FORBIDDEN,
            )

        solution = get_object_or_404(
            Solution,
            id=solution_id,
            organization=organization,
        )

        if solution.status in ("approved", "rejected"):
            return Response(
                {"detail": "Evidence cannot be added to a finalized solution."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        evidence_type = request.data.get("evidence_type", "")
        if evidence_type not in ("before", "after"):
            return Response(
                {"evidence_type": "Choose before or after."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        image_file = request.FILES.get("file")
        if not image_file:
            return Response(
                {"file": "An evidence image is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Basic size limit: 5 MB.
        if image_file.size > 5 * 1024 * 1024:
            return Response(
                {"file": "Image size must not exceed 5 MB."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if image_file.content_type not in (
            "image/jpeg", "image/png", "image/webp"
        ):
            return Response(
                {"file": "Upload a JPEG, PNG, or WebP image."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        evidence = SolutionEvidence.objects.create(
            solution=solution,
            evidence_type=evidence_type,
            file=image_file,
            caption=str(request.data.get("caption", "")).strip()[:500],
            uploaded_by=organization,
        )

        return Response(
            {
                "message": "Evidence uploaded successfully.",
                "evidence": SolutionEvidenceSerializer(
                    evidence,
                    context={"request": request},
                ).data,
            },
            status=status.HTTP_201_CREATED,
        )



class OrganizationNotificationsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        organization = get_active_organization(request)
        if not organization:
            return Response(
                {"success": False, "message": "Active organization access required."},
                status=status.HTTP_403_FORBIDDEN,
            )

        notifications = Notification.objects.filter(
            recipient_organization=organization
        ).select_related("actor", "recipient_organization")

        unread_count = notifications.filter(is_read=False).count()

        if request.query_params.get("unread", "").lower() == "true":
            notifications = notifications.filter(is_read=False)

        try:
            limit = int(request.query_params.get("limit", 100))
        except (ValueError, TypeError):
            limit = 100

        limit = max(1, min(limit, 100))
        total_count = notifications.count()
        notifications = notifications[:limit]

        results = []
        for item in notifications:
            results.append({
                "id": item.id,
                "title": item.title,
                "message": item.message,
                "notification_type": item.notification_type,
                "target_url": item.target_url,
                "is_read": item.is_read,
                "created_at": item.created_at,
                "actor_name": (
                    getattr(item.actor, "full_name", "")
                    or getattr(item.actor, "email", "")
                    if item.actor_id else "System"
                ),
                # These fields belonged to the old problems.Notification model.
                # The shared model uses target_url instead.
                "problem_id": None,
                "assignment_id": None,
                "read_at": None,
            })

        return Response({
            "success": True,
            "message": "Notifications retrieved successfully.",
            "count": total_count,
            "total_count": total_count,
            "unread_count": unread_count,
            "results": results,
        })


class OrganizationUnreadNotificationCountView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        organization = get_active_organization(request)
        if not organization:
            return Response(
                {"success": False, "message": "Active organization access required."},
                status=status.HTTP_403_FORBIDDEN,
            )

        count = Notification.objects.filter(
            recipient_organization=organization,
            is_read=False,
        ).count()

        return Response({
            "success": True,
            "unread_count": count,
        })


class OrganizationMarkNotificationReadView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, notification_id):
        organization = get_active_organization(request)
        if not organization:
            return Response(
                {"success": False, "message": "Active organization access required."},
                status=status.HTTP_403_FORBIDDEN,
            )

        notification = get_object_or_404(
            Notification,
            id=notification_id,
            recipient_organization=organization,
        )

        if not notification.is_read:
            notification.is_read = True
            notification.save(update_fields=["is_read"])

        return Response({
            "success": True,
            "message": "Notification marked as read.",
            "data": {
                "id": notification.id,
                "is_read": notification.is_read,
            },
        })


class OrganizationMarkAllNotificationsReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        organization = get_active_organization(request)
        if not organization:
            return Response(
                {"success": False, "message": "Active organization access required."},
                status=status.HTTP_403_FORBIDDEN,
            )

        updated_count = Notification.objects.filter(
            recipient_organization=organization,
            is_read=False,
        ).update(is_read=True)

        return Response({
            "success": True,
            "message": "All notifications marked as read.",
            "updated_count": updated_count,
        })



class OrganizationProfileView(APIView):
    """
    Retrieve or update the authenticated organization's own profile.
    Does not allow changes to email, password, or approval status.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Organization - Profile"],
        summary="Retrieve organization profile",
        responses={200: OrganizationProfileSerializer},
    )
    def get(self, request):
        organization = request.user

        if not isinstance(organization, Organization):
            return Response(
                {"detail": "Organization access only."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = OrganizationProfileSerializer(
            organization,
            context={"request": request},
        )

        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        tags=["Organization - Profile"],
        summary="Update organization profile",
        request=OrganizationProfileSerializer,
        responses={200: OrganizationProfileSerializer},
    )
    def patch(self, request):
        organization = request.user

        if not isinstance(organization, Organization):
            return Response(
                {"detail": "Organization access only."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = OrganizationProfileSerializer(
            organization,
            data=request.data,
            partial=True,
            context={"request": request},
        )

        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(
            {
                "message": "Organization profile updated successfully.",
                "profile": serializer.data,
            },
            status=status.HTTP_200_OK,
        )

class OrganizationProfileImageView(APIView):
    """
    Upload, replace, or remove the authenticated organization's
    profile image.
    """

    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        organization = request.user

        if not isinstance(organization, Organization):
            return Response(
                {"detail": "Organization access only."},
                status=status.HTTP_403_FORBIDDEN,
            )

        image = request.FILES.get("profile_image")

        if not image:
            return Response(
                {"profile_image": "Please select an image to upload."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if image.size > 5 * 1024 * 1024:
            return Response(
                {"profile_image": "Image size must not exceed 5 MB."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ImageField/Pillow performs image validation.
        # Check the declared content type as an additional safeguard.
        if image.content_type not in (
            "image/jpeg",
            "image/png",
            "image/webp",
        ):
            return Response(
                {
                    "profile_image":
                        "Upload a JPG, PNG, or WebP image."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        old_image = organization.profile_image

        organization.profile_image = image
        organization.save(update_fields=["profile_image", "updated_at"])

        # Delete the previous file only after the new one is saved.
        if old_image and old_image.name != organization.profile_image.name:
            old_image.storage.delete(old_image.name)

        serializer = OrganizationProfileSerializer(
            organization,
            context={"request": request},
        )

        return Response(
            {
                "message": "Profile image uploaded successfully.",
                "profile_image_url": serializer.data["profile_image_url"],
                "profile": serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    def delete(self, request):
        organization = request.user

        if not isinstance(organization, Organization):
            return Response(
                {"detail": "Organization access only."},
                status=status.HTTP_403_FORBIDDEN,
            )

        old_image = organization.profile_image

        if not old_image:
            return Response(
                {"message": "There is no profile image to remove."},
                status=status.HTTP_200_OK,
            )

        old_image_name = old_image.name

        organization.profile_image = None
        organization.save(update_fields=["profile_image", "updated_at"])

        # Remove the stored file after clearing the database field.
        old_image.storage.delete(old_image_name)

        return Response(
            {
                "message": "Profile image removed successfully.",
                "profile_image_url": None,
            },
            status=status.HTTP_200_OK,
        )


class OrganizationProgressListView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Organization - Update Progress"],
        responses={200: OrganizationProgressAssignmentSerializer(many=True)},
    )
    def get(self, request):
        organization = get_active_organization(request)
        if not organization:
            return Response(
                {"detail": "Active, approved organization access required."},
                status=status.HTTP_403_FORBIDDEN,
            )

        assignments = (
            ProblemAssignment.objects
            .filter(
                organization=organization,
                status__in=["assigned", "accepted", "in_progress"],
            )
            .exclude(
                problem__status__in=["resolved", "rejected", "closed"]
            )
            .select_related("problem", "problem__category")
            .order_by("-assigned_at")
        )

        serializer = OrganizationProgressAssignmentSerializer(
            assignments, many=True, context={"request": request}
        )
        return Response(serializer.data)


class OrganizationProgressUpdateCreateView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    @extend_schema(
        tags=["Organization - Update Progress"],
        request=ProblemProgressUpdateSerializer,
        responses={201: ProblemProgressUpdateSerializer},
    )
    def post(self, request, assignment_id):
        organization = get_active_organization(request)
        if not organization:
            return Response(
                {"detail": "Active, approved organization access required."},
                status=status.HTTP_403_FORBIDDEN,
            )

        with transaction.atomic():
            try:
                assignment = (
                    ProblemAssignment.objects
                    .select_for_update()
                    .select_related("problem")
                    .get(
                        id=assignment_id,
                        organization=organization,
                    )
                )
            except ProblemAssignment.DoesNotExist:
                return Response(
                    {"detail": "Assignment not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            if assignment.status not in ["accepted", "in_progress"]:
                return Response(
                    {
                        "detail": (
                            "Only accepted or in-progress assignments "
                            "can receive progress updates."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            serializer = ProblemProgressUpdateSerializer(
                data=request.data,
                context={"request": request},
            )
            serializer.is_valid(raise_exception=True)

            update = serializer.save(assignment=assignment)

            if assignment.status == "accepted":
                assignment.status = "in_progress"
                assignment.save(update_fields=["status"])

            if assignment.problem.status in ["assigned", "under_review"]:
                assignment.problem.status = "in_progress"
                assignment.problem.save(update_fields=["status"])

        return Response(
            ProblemProgressUpdateSerializer(
                update, context={"request": request}
            ).data,
            status=status.HTTP_201_CREATED,
        )


class OrganizationProgressHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Organization - Update Progress"],
        responses={200: ProblemProgressUpdateSerializer(many=True)},
    )
    def get(self, request, assignment_id):
        organization = get_active_organization(request)
        if not organization:
            return Response(
                {"detail": "Active, approved organization access required."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if not ProblemAssignment.objects.filter(
            id=assignment_id,
            organization=organization,
        ).exists():
            return Response(
                {"detail": "Assignment not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        updates = ProblemProgressUpdate.objects.filter(
            assignment_id=assignment_id,
        ).order_by("-created_at", "-id")

        serializer = ProblemProgressUpdateSerializer(
            updates, many=True, context={"request": request}
        )
        return Response(serializer.data)
