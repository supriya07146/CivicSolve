from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework import status
from .serializers import AISmartProblemReportingSerializer
from .ai_service import (
    generate_problem_suggestions,
    AIServiceError,
)
from django.db.models import Q
from django.utils import timezone
from .serializers import BrowseProblemSerializer

from accounts.views import IsCivicAdmin
from organizations.models import Organization


from adminpanel.notification_service import (
    create_notification,
    notify_admins,
)

from .serializers import (
    ProblemSerializer,
    ProblemCreateSerializer,
    ProblemCategorySerializer,
    ProblemAttachmentSerializer,
    ProblemAttachmentCreateSerializer,
    ProblemAssignmentSerializer,
    AdminProblemSerializer,
    DuplicateProblemSuggestionSerializer,
    DuplicateProblemReviewSerializer,
)

from drf_spectacular.utils import (
    extend_schema,
    OpenApiResponse,
)

from .models import (
    Problem,
    ProblemCategory,
    ProblemAttachment,
    DuplicateProblemSuggestion,
)

from .serializers import (
    ProblemSerializer,
    ProblemCreateSerializer,
    ProblemCategorySerializer,
    ProblemAttachmentSerializer,
    ProblemAttachmentCreateSerializer,
)


from django.db import transaction
from rest_framework.parsers import JSONParser

from .models import ProblemDraft, DraftAttachment
from .serializers import (
    ProblemDraftSerializer,
    DraftAttachmentSerializer,
)

from django.core.paginator import Paginator, EmptyPage
from .models import (
    ProblemAssignment,
    Solution,
    SolutionEvidence,
)

from .serializers import (
    OrganizationSolutionCreateSerializer,
    SolutionEvidenceSerializer,
)

from organizations.permissions import IsApprovedOrganization


from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Problem, Solution, ProblemResolutionReview
from .serializers import (
    CitizenResolutionSolutionSerializer,
    CitizenResolutionReviewSerializer,
    CitizenResolutionReviewSubmitSerializer,
)


from .serializers import CivicAssistantRequestSerializer
from .civic_assistant import answer_civic_question, CivicAssistantError

import logging

from .duplicate_detection import (
    detect_duplicate_problems,
    DuplicateDetectionError,
)

logger = logging.getLogger(__name__)

# ============================================================
# CITIZEN PERMISSION
# ============================================================

class IsCitizen(IsAuthenticated):

    def has_permission(self, request, view):

        if not super().has_permission(request, view):
            return False

        user = request.user

        # Allow admin/staff accounts to access and test citizen endpoints
        if getattr(user, "is_staff", False) or getattr(user, "role", None) == "admin":
            return getattr(user, "is_active", False)

        return (
            getattr(user, "role", None) == "citizen"
            and getattr(user, "is_active", False)
            and getattr(user, "email_verified", False)
        )


# ============================================================
# LIST PROBLEM CATEGORIES
# ============================================================

@extend_schema(
    tags=["Problems"],
    summary="Get problem categories",
    description=(
        "Returns all active problem categories "
        "available for citizens."
    ),
    responses={
        200: ProblemCategorySerializer(many=True),
    },
)
class ProblemCategoryListView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):

        categories = ProblemCategory.objects.filter(
            is_active=True
        ).order_by("name")

        serializer = ProblemCategorySerializer(
            categories,
            many=True
        )

        return Response(
            {
                "success": True,
                "count": categories.count(),
                "categories": serializer.data,
            },
            status=status.HTTP_200_OK
        )


# ============================================================
# CREATE PROBLEM
# ============================================================

# ============================================================
# CREATE PROBLEM
# ============================================================

@extend_schema(
    tags=["Problems"],
    summary="Report a community problem",
    description=(
        "Allows an authenticated and verified citizen "
        "to report a new community problem."
    ),
    request=ProblemCreateSerializer,
    responses={
        201: ProblemSerializer,
        400: OpenApiResponse(description="Validation error."),
        401: OpenApiResponse(description="Authentication required."),
        403: OpenApiResponse(description="Citizen access required."),
    },
)
class ProblemCreateView(APIView):
    permission_classes = [IsCitizen]

    def post(self, request):
        serializer = ProblemCreateSerializer(
            data=request.data
        )

        serializer.is_valid(raise_exception=True)

        problem = serializer.save(
            reported_by=request.user
        )

        # AI duplicate detection
        try:
            detect_duplicate_problems(problem)
        except DuplicateDetectionError:
            logger.exception(
                "Duplicate detection failed for problem %s",
                problem.id,
            )
        except Exception:
            logger.exception(
                "Unexpected duplicate detection error for problem %s",
                problem.id,
            )

        # Citizen notification
        try:
            create_notification(
                recipient=request.user,
                title="Problem submitted",
                message=(
                    f'Your problem "{problem.title}" was submitted successfully '
                    "and is awaiting review."
                ),
                notification_type="problem",
                target_url="/user/my-problems",
            )
        except Exception:
            pass

        # Admin notification
        try:
            reporter_name = (
                getattr(request.user, "full_name", "")
                or request.user.email
            )

            notify_admins(
                title="New community problem",
                message=(
                    f'"{problem.title}" was reported by '
                    f"{reporter_name}."
                ),
                notification_type="problem",
                actor=request.user,
                target_url="/admin/problems",
            )
        except Exception:
            pass

        response_serializer = ProblemSerializer(problem)

        return Response(
            {
                "success": True,
                "message": "Community problem reported successfully.",
                "problem": response_serializer.data,
            },
            status=status.HTTP_201_CREATED,
        )


# ============================================================
# MY REPORTED PROBLEMS
# ============================================================

@extend_schema(
    tags=["Problems"],
    summary="Get my reported problems",
    description=(
        "Returns the authenticated citizen's problems with "
        "summary counts, search, filters, sorting and pagination."
    ),
    responses={
        200: OpenApiResponse(
            description=(
                "Citizen problem records, summary statistics "
                "and pagination information."
            )
        ),
        400: OpenApiResponse(
            description="Invalid filter or pagination parameter."
        ),
        401: OpenApiResponse(
            description="Authentication required."
        ),
        403: OpenApiResponse(
            description="Verified citizen access required."
        ),
    },
)

@extend_schema(
    tags=["Problems"],
    summary="Report a community problem",
    description=(
        "Allows an authenticated and verified citizen "
        "to report a new community problem."
    ),
    request=ProblemCreateSerializer,
    responses={
        201: ProblemSerializer,
        400: OpenApiResponse(
            description="Validation error."
        ),
        401: OpenApiResponse(
            description="Authentication required."
        ),
        403: OpenApiResponse(
            description="Citizen access required."
        ),
    },
)

@extend_schema(
    tags=["Problems"],
    summary="Get my reported problems",
    description=(
        "Returns the authenticated citizen's problems with "
        "summary counts, search, filters, sorting and pagination."
    ),
    responses={
        200: OpenApiResponse(
            description=(
                "Citizen problem records, summary statistics "
                "and pagination information."
            )
        ),
        400: OpenApiResponse(
            description="Invalid filter or pagination parameter."
        ),
        401: OpenApiResponse(
            description="Authentication required."
        ),
        403: OpenApiResponse(
            description="Verified citizen access required."
        ),
    },
)
class MyProblemsView(APIView):

    permission_classes = [IsCitizen]

    OPEN_STATUSES = [
        "open",
        "under_review",
        "assigned",
        "in_progress",
    ]

    CLOSED_STATUSES = [
        "resolved",
        "closed",
    ]

    ALLOWED_SORTS = [
        "newest",
        "oldest",
        "title",
    ]

    def get(self, request):

        # ----------------------------------------------------
        # 1. Get only the authenticated citizen's reports
        # ----------------------------------------------------
        base_queryset = (
            Problem.objects
            .filter(reported_by=request.user)
            .select_related(
                "category",
                "reported_by",
            )
            .prefetch_related(
                "attachments",
                "assignments__organization",
            )
            .order_by("-created_at")
        )

        # Summary counts are independent of table filters.
        summary = {
            "total": base_queryset.count(),
            "open": base_queryset.filter(
                status__in=self.OPEN_STATUSES
            ).count(),
            "closed": base_queryset.filter(
                status__in=self.CLOSED_STATUSES
            ).count(),
            "resolved": base_queryset.filter(
                status="resolved"
            ).count(),
            "rejected": base_queryset.filter(
                status="rejected"
            ).count(),
        }

        # ----------------------------------------------------
        # 2. Search
        # ----------------------------------------------------
        search = request.query_params.get(
            "search", ""
        ).strip()

        problems = base_queryset

        if search:
            search_filter = (
                Q(title__icontains=search)
                | Q(description__icontains=search)
                | Q(location__icontains=search)
                | Q(category__name__icontains=search)
            )

            # Allow partial searches by UUID reference.
            from django.db.models import CharField
            from django.db.models.functions import Cast

            problems = problems.annotate(
                problem_code_text=Cast(
                    "problem_code",
                    output_field=CharField(),
                )
            ).filter(
                search_filter
                | Q(problem_code_text__icontains=search)
            )

        # ----------------------------------------------------
        # 3. Status filter
        # ----------------------------------------------------
        status_filter = request.query_params.get(
            "status", ""
        ).strip().lower()

        valid_statuses = dict(
            Problem.STATUS_CHOICES
        )

        if status_filter and status_filter not in valid_statuses:
            return Response(
                {
                    "success": False,
                    "message": "Invalid status filter.",
                    "allowed_statuses": list(valid_statuses.keys()),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if status_filter:
            problems = problems.filter(
                status=status_filter
            )

        # ----------------------------------------------------
        # 4. Priority filter
        # ----------------------------------------------------
        priority_filter = request.query_params.get(
            "priority", ""
        ).strip().lower()

        valid_priorities = dict(
            Problem.PRIORITY_CHOICES
        )

        if (
            priority_filter
            and priority_filter not in valid_priorities
        ):
            return Response(
                {
                    "success": False,
                    "message": "Invalid priority filter.",
                    "allowed_priorities": list(
                        valid_priorities.keys()
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if priority_filter:
            problems = problems.filter(
                priority=priority_filter
            )

        # ----------------------------------------------------
        # 5. Sorting
        # ----------------------------------------------------
        sort_by = request.query_params.get(
            "sort", "newest"
        ).strip().lower()

        if sort_by not in self.ALLOWED_SORTS:
            return Response(
                {
                    "success": False,
                    "message": "Invalid sorting option.",
                    "allowed_sorts": self.ALLOWED_SORTS,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        sort_fields = {
            "newest": "-created_at",
            "oldest": "created_at",
            "title": "title",
        }

        problems = problems.order_by(
            sort_fields[sort_by],
            "-id",
        )

        # ----------------------------------------------------
        # 6. Pagination
        # ----------------------------------------------------
        try:
            page_number = int(
                request.query_params.get("page", "1")
            )
            page_size = int(
                request.query_params.get("page_size", "4")
            )

            if page_number < 1:
                raise ValueError

            if page_size < 1:
                raise ValueError

        except (TypeError, ValueError):
            return Response(
                {
                    "success": False,
                    "message": (
                        "Page and page_size must be positive integers."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Prevent unnecessarily large dashboard responses.
        page_size = min(page_size, 50)

        paginator = Paginator(
            problems,
            page_size,
        )

        try:
            page_obj = paginator.page(page_number)
        except EmptyPage:
            return Response(
                {
                    "success": False,
                    "message": "Requested page does not exist.",
                    "total_pages": paginator.num_pages,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = ProblemSerializer(
            page_obj.object_list,
            many=True,
            context={"request": request},
        )

        # ----------------------------------------------------
        # 7. Response
        # ----------------------------------------------------
        return Response(
            {
                "success": True,
                "summary": summary,
                "count": paginator.count,
                "problems": serializer.data,
                "pagination": {
                    "current_page": page_obj.number,
                    "page_size": page_size,
                    "total_pages": paginator.num_pages,
                    "total_records": paginator.count,
                    "has_next": page_obj.has_next(),
                    "has_previous": page_obj.has_previous(),
                },
                "filters": {
                    "search": search,
                    "status": status_filter,
                    "priority": priority_filter,
                    "sort": sort_by,
                },
            },
            status=status.HTTP_200_OK,
        )



# ============================================================
# BROWSE COMMUNITY PROBLEMS
# ============================================================

@extend_schema(
    tags=["Problems"],
    summary="Browse community problems",
    description=(
        "Allows verified citizens to discover community problems "
        "with search, category/status/priority filters, sorting, "
        "and pagination. Reporter contact information is not exposed."
    ),
    responses={
        200: OpenApiResponse(
            description="Filtered community problems and pagination."
        ),
        400: OpenApiResponse(
            description="Invalid filter or pagination parameter."
        ),
        401: OpenApiResponse(
            description="Authentication required."
        ),
        403: OpenApiResponse(
            description="Verified citizen access required."
        ),
    },
)
class BrowseProblemsView(APIView):
    permission_classes = [IsCitizen]

    ALLOWED_SORTS = {
        "newest": "-created_at",
        "oldest": "created_at",
        "title": "title",
    }

    def get(self, request):
        problems = (
            Problem.objects
            .select_related("category")
            .prefetch_related("attachments")
            .exclude(status="rejected")
        )

        # Search by title, description, location, category, or code.
        search = request.query_params.get("search", "").strip()

        if search:
            problems = problems.filter(
                Q(title__icontains=search)
                | Q(description__icontains=search)
                | Q(location__icontains=search)
                | Q(category__name__icontains=search)
                | Q(problem_code__icontains=search)
            )

        # Category filter: expects the category's numeric ID.
        category_id = request.query_params.get("category", "").strip()

        if category_id:
            try:
                category_id = int(category_id)
                if category_id < 1:
                    raise ValueError
            except (TypeError, ValueError):
                return Response(
                    {
                        "success": False,
                        "message": "Category must be a positive integer ID.",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            problems = problems.filter(category_id=category_id)

        # Status filter.
        status_filter = request.query_params.get("status", "").strip().lower()
        valid_statuses = dict(Problem.STATUS_CHOICES)

        if status_filter:
            if status_filter not in valid_statuses:
                return Response(
                    {
                        "success": False,
                        "message": "Invalid status filter.",
                        "allowed_statuses": list(valid_statuses.keys()),
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if status_filter == "rejected":
                return Response(
                    {
                        "success": False,
                        "message": "Rejected reports are not available in community browsing.",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            problems = problems.filter(status=status_filter)

        # Priority filter.
        priority_filter = request.query_params.get(
            "priority", ""
        ).strip().lower()

        valid_priorities = dict(Problem.PRIORITY_CHOICES)

        if priority_filter:
            if priority_filter not in valid_priorities:
                return Response(
                    {
                        "success": False,
                        "message": "Invalid priority filter.",
                        "allowed_priorities": list(valid_priorities.keys()),
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            problems = problems.filter(priority=priority_filter)

        # Sorting.
        sort_by = request.query_params.get("sort", "newest").strip().lower()

        if sort_by not in self.ALLOWED_SORTS:
            return Response(
                {
                    "success": False,
                    "message": "Invalid sorting option.",
                    "allowed_sorts": list(self.ALLOWED_SORTS.keys()),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        problems = problems.order_by(self.ALLOWED_SORTS[sort_by], "-id")

        # Pagination.
        try:
            page_number = int(request.query_params.get("page", "1"))
            page_size = int(request.query_params.get("page_size", "4"))

            if page_number < 1 or page_size < 1:
                raise ValueError
        except (TypeError, ValueError):
            return Response(
                {
                    "success": False,
                    "message": "Page and page_size must be positive integers.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        page_size = min(page_size, 50)
        paginator = Paginator(problems, page_size)

        try:
            page_obj = paginator.page(page_number)
        except EmptyPage:
            return Response(
                {
                    "success": False,
                    "message": "Requested page does not exist.",
                    "total_pages": paginator.num_pages,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = BrowseProblemSerializer(
            page_obj.object_list,
            many=True,
            context={"request": request},
        )

        return Response(
            {
                "success": True,
                "count": paginator.count,
                "problems": serializer.data,
                "pagination": {
                    "current_page": page_obj.number,
                    "page_size": page_size,
                    "total_pages": paginator.num_pages,
                    "total_records": paginator.count,
                    "has_next": page_obj.has_next(),
                    "has_previous": page_obj.has_previous(),
                },
                "filters": {
                    "search": search,
                    "category": category_id or "",
                    "status": status_filter,
                    "priority": priority_filter,
                    "sort": sort_by,
                },
            },
            status=status.HTTP_200_OK,
        )



# ============================================================
# PROBLEM DETAIL
# ============================================================


@extend_schema(
    tags=["Problems"],
    summary="Get problem details",
    description=(
        "Returns complete details, evidence, location, "
        "and assignment information for a problem "
        "reported by the authenticated citizen."
    ),
    responses={
        200: ProblemSerializer,
        403: OpenApiResponse(
            description="Access denied."
        ),
        404: OpenApiResponse(
            description="Problem not found."
        ),
    },
)
class ProblemDetailView(APIView):
    permission_classes = [IsCitizen]

    def get(self, request, problem_id):
        problem = get_object_or_404(
            Problem.objects
            .select_related(
                "category",
                "reported_by",
            )
            .prefetch_related(
                "attachments",
                "assignments__organization",
            ),
            id=problem_id,
            reported_by=request.user,
        )

        serializer = ProblemSerializer(
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


# ============================================================
# UPLOAD PROBLEM ATTACHMENT
# ============================================================

@extend_schema(
    tags=["Problems"],
    summary="Upload problem attachment",
    description=(
        "Uploads an image or document related to "
        "a citizen's reported problem."
    ),
    request=ProblemAttachmentCreateSerializer,
    responses={
        201: ProblemAttachmentSerializer,
        400: OpenApiResponse(
            description="Invalid attachment."
        ),
        403: OpenApiResponse(
            description="You cannot modify this problem."
        ),
        404: OpenApiResponse(
            description="Problem not found."
        ),
    },
)
class ProblemAttachmentUploadView(APIView):

    permission_classes = [IsCitizen]

    parser_classes = [
        MultiPartParser,
        FormParser,
    ]

    def post(self, request, problem_id):

        problem = get_object_or_404(
            Problem,
            id=problem_id
        )

        if problem.reported_by_id != request.user.id:

            return Response(
                {
                    "success": False,
                    "message": (
                        "You are not allowed to "
                        "modify this problem."
                    )
                },
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = ProblemAttachmentCreateSerializer(
            data={
                "problem": problem.id,
                "file": request.FILES.get("file"),
            }
        )

        serializer.is_valid(
            raise_exception=True
        )

        attachment = serializer.save()

        return Response(
            {
                "success": True,
                "message": (
                    "Problem attachment uploaded successfully."
                ),
                "attachment": (
                    ProblemAttachmentSerializer(
                        attachment
                    ).data
                ),
            },
            status=status.HTTP_201_CREATED
        )


# ============================================================
# DELETE PROBLEM ATTACHMENT
# ============================================================

@extend_schema(
    tags=["Problems"],
    summary="Delete problem attachment",
    description=(
        "Deletes an attachment belonging to "
        "the authenticated citizen's problem."
    ),
    responses={
        200: OpenApiResponse(
            description="Attachment deleted successfully."
        ),
        403: OpenApiResponse(
            description="Permission denied."
        ),
        404: OpenApiResponse(
            description="Attachment not found."
        ),
    },
)
class ProblemAttachmentDeleteView(APIView):

    permission_classes = [IsCitizen]

    def delete(self, request, attachment_id):

        attachment = get_object_or_404(
            ProblemAttachment.objects.select_related(
                "problem"
            ),
            id=attachment_id
        )

        if attachment.problem.reported_by_id != request.user.id:

            return Response(
                {
                    "success": False,
                    "message": (
                        "You are not allowed to "
                        "delete this attachment."
                    )
                },
                status=status.HTTP_403_FORBIDDEN
            )

        attachment.file.delete(
            save=False
        )

        attachment.delete()

        return Response(
            {
                "success": True,
                "message": (
                    "Attachment deleted successfully."
                )
            },
            status=status.HTTP_200_OK
        )

@extend_schema(
    tags=["Admin - Problems"],
    summary="List all community problems",
    description="Returns all community problems for CivicSolve administrators.",
    responses={
        200: AdminProblemSerializer(many=True),
        401: OpenApiResponse(
            description="Authentication required."
        ),
        403: OpenApiResponse(
            description="Admin access required."
        ),
    },
)
class AdminProblemListView(APIView):

    permission_classes = [IsCivicAdmin]

    def get(self, request):

        problems = (
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
            .order_by("-created_at")
        )

        status_filter = request.query_params.get("status")

        priority_filter = request.query_params.get("priority")

        category_filter = request.query_params.get("category")

        search = request.query_params.get("search")

        if status_filter:
            problems = problems.filter(
                status=status_filter
            )

        if priority_filter:
            problems = problems.filter(
                priority=priority_filter
            )

        if category_filter:
            problems = problems.filter(
                category_id=category_filter
            )

        if search:

            problems = problems.filter(
                Q(title__icontains=search)
                |
                Q(description__icontains=search)
                |
                Q(location__icontains=search)
                |
                Q(problem_code__icontains=search)
            )

        serializer = AdminProblemSerializer(
            problems,
            many=True
        )

        return Response(
            {
                "success": True,
                "count": problems.count(),
                "problems": serializer.data,
            },
            status=status.HTTP_200_OK,
        )


@extend_schema(
    tags=["Admin - Problems"],
    summary="Get problem details",
    description="Returns complete details of a community problem for administrators.",
    responses={
        200: AdminProblemSerializer,
        404: OpenApiResponse(
            description="Problem not found."
        ),
    },
)
class AdminProblemDetailView(APIView):

    permission_classes = [IsCivicAdmin]

    def get(self, request, problem_id):

        problem = get_object_or_404(
            Problem.objects
            .select_related(
                "category",
                "reported_by",
            )
            .prefetch_related(
                "attachments",
                "assignments__organization",
                "assignments__assigned_by",
            ),
            id=problem_id,
        )

        serializer = AdminProblemSerializer(problem)

        return Response(
            {
                "success": True,
                "problem": serializer.data,
            },
            status=status.HTTP_200_OK,
        )


@extend_schema(
    tags=["Admin - Problems"],
    summary="Update problem status",
    description="Allows an administrator to update the workflow status of a community problem.",
    responses={
        200: AdminProblemSerializer,
        400: OpenApiResponse(
            description="Invalid status."
        ),
        404: OpenApiResponse(
            description="Problem not found."
        ),
    },
)
class AdminProblemStatusView(APIView):

    permission_classes = [IsCivicAdmin]

    def patch(self, request, problem_id):

        problem = get_object_or_404(
            Problem,
            id=problem_id
        )

        new_status = request.data.get("status")

        valid_statuses = dict(
            Problem.STATUS_CHOICES
        ).keys()

        if new_status not in valid_statuses:

            return Response(
                {
                    "success": False,
                    "message": "Invalid problem status.",
                    "allowed_statuses": list(
                        valid_statuses
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        old_status = problem.status
        problem.status = new_status

        if new_status == "resolved":

            problem.resolved_at = timezone.now()

        else:

            problem.resolved_at = None

        resolution_notes = request.data.get(
            "resolution_notes"
        )

        if resolution_notes is not None:

            problem.resolution_notes = (
                str(resolution_notes).strip()
            )

        problem.save()

        if old_status != new_status:
         create_notification(
        recipient=problem.reported_by,
        title=(
            "Problem resolved"
            if new_status == "resolved"
            else "Problem status changed"
        ),
        message=(
            f'Your problem "{problem.title}" status changed '
            f"from {old_status.replace('_', ' ')} "
            f"to {new_status.replace('_', ' ')}."
        ),
        notification_type="status",
        actor=request.user,
        target_url="/citizen/problems",
        )

        serializer = AdminProblemSerializer(
            problem
        )

        return Response(
            {
                "success": True,
                "message": "Problem status updated successfully.",
                "problem": serializer.data,
            },
            status=status.HTTP_200_OK,
        )


# ============================================================
# ADMIN: DUPLICATE PROBLEM SUGGESTIONS
# ============================================================

class AdminDuplicateProblemSuggestionListView(APIView):
    permission_classes = [IsCivicAdmin]

    def get(self, request):
        suggestions = (
            DuplicateProblemSuggestion.objects
            .select_related(
                "new_problem",
                "new_problem__category",
                "new_problem__reported_by",
                "similar_problem",
                "similar_problem__category",
                "similar_problem__reported_by",
                "reviewed_by",
            )
            .order_by("-created_at")
        )

        review_status = request.query_params.get(
            "status", ""
        ).strip().lower()

        valid_statuses = [
            "pending",
            "accepted",
            "rejected",
        ]

        if review_status:
            if review_status not in valid_statuses:
                return Response(
                    {
                        "success": False,
                        "message": "Invalid review status.",
                        "allowed_statuses": valid_statuses,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            suggestions = suggestions.filter(
                review_status=review_status
            )

        serializer = DuplicateProblemSuggestionSerializer(
            suggestions,
            many=True,
        )

        return Response(
            {
                "success": True,
                "count": suggestions.count(),
                "suggestions": serializer.data,
            },
            status=status.HTTP_200_OK,
        )


class AdminDuplicateProblemSuggestionReviewView(APIView):
    permission_classes = [IsCivicAdmin]

    def patch(self, request, suggestion_id):
        suggestion = get_object_or_404(
            DuplicateProblemSuggestion.objects.select_related(
                "new_problem",
                "similar_problem",
                "reviewed_by",
            ),
            pk=suggestion_id,
        )

        input_serializer = DuplicateProblemReviewSerializer(
            data=request.data,
        )

        input_serializer.is_valid(raise_exception=True)

        new_review_status = (
            input_serializer.validated_data["review_status"]
        )

        suggestion.review_status = new_review_status
        suggestion.reviewed_by = request.user
        suggestion.reviewed_at = timezone.now()

        suggestion.save(
            update_fields=[
                "review_status",
                "reviewed_by",
                "reviewed_at",
                "updated_at",
            ]
        )

        return Response(
            {
                "success": True,
                "message": (
                    "Suggestion marked as similar. "
                    "The original problem records remain separate."
                    if new_review_status == "accepted"
                    else
                    "Suggestion marked as not a duplicate. "
                    "Both original problem records remain unchanged."
                ),
                "suggestion": DuplicateProblemSuggestionSerializer(
                    suggestion
                ).data,
            },
            status=status.HTTP_200_OK,
        )


# ============================================================
# CITIZEN PROBLEM DRAFTS
# ============================================================

class ProblemDraftListCreateView(APIView):
    permission_classes = [IsCitizen]

    @extend_schema(
        tags=["Problems - Drafts"],
        summary="List my drafts",
        responses={200: ProblemDraftSerializer(many=True)},
    )
    def get(self, request):
        drafts = (
            ProblemDraft.objects
            .filter(reported_by=request.user)
            .select_related("category")
            .prefetch_related("attachments")
        )

        serializer = ProblemDraftSerializer(drafts, many=True)

        return Response({
            "success": True,
            "count": drafts.count(),
            "drafts": serializer.data,
        }, status=status.HTTP_200_OK)

    @extend_schema(
        tags=["Problems - Drafts"],
        summary="Save a new problem draft",
        request=ProblemDraftSerializer,
        responses={201: ProblemDraftSerializer},
    )
    def post(self, request):
        serializer = ProblemDraftSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        draft = serializer.save(reported_by=request.user)

        return Response({
            "success": True,
            "message": "Draft saved successfully.",
            "draft": ProblemDraftSerializer(draft).data,
        }, status=status.HTTP_201_CREATED)


class ProblemDraftDetailView(APIView):
    permission_classes = [IsCitizen]

    def get_draft(self, request, draft_id):
        return get_object_or_404(
            ProblemDraft.objects
            .select_related("category")
            .prefetch_related("attachments"),
            pk=draft_id,
            reported_by=request.user,
        )

    @extend_schema(
        tags=["Problems - Drafts"],
        summary="Retrieve a saved draft",
        responses={200: ProblemDraftSerializer},
    )
    def get(self, request, draft_id):
        draft = self.get_draft(request, draft_id)

        return Response({
            "success": True,
            "draft": ProblemDraftSerializer(draft).data,
        })

    @extend_schema(
        tags=["Problems - Drafts"],
        summary="Update a saved draft",
        request=ProblemDraftSerializer,
        responses={200: ProblemDraftSerializer},
    )
    def patch(self, request, draft_id):
        draft = self.get_draft(request, draft_id)

        serializer = ProblemDraftSerializer(
            draft,
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        draft = serializer.save()

        return Response({
            "success": True,
            "message": "Draft updated successfully.",
            "draft": ProblemDraftSerializer(draft).data,
        })

    @extend_schema(
        tags=["Problems - Drafts"],
        summary="Delete a saved draft",
        responses={204: OpenApiResponse(
            description="Draft deleted successfully."
        )},
    )
    def delete(self, request, draft_id):
        draft = self.get_draft(request, draft_id)

        # Delete stored evidence files before deleting their records.
        for attachment in draft.attachments.all():
            attachment.file.delete(save=False)

        draft.delete()

        return Response(status=status.HTTP_204_NO_CONTENT)


class DraftAttachmentUploadView(APIView):
    permission_classes = [IsCitizen]
    parser_classes = [MultiPartParser, FormParser]

    MAX_IMAGE_SIZE = 10 * 1024 * 1024
    MAX_VIDEO_SIZE = 50 * 1024 * 1024
    MAX_ATTACHMENTS = 5

    ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
    ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".webm", ".mov"}

    @extend_schema(
        tags=["Problems - Drafts"],
        summary="Upload evidence to a draft",
        request=DraftAttachmentSerializer,
        responses={201: DraftAttachmentSerializer},
    )
    def post(self, request, draft_id):
        draft = get_object_or_404(
            ProblemDraft,
            pk=draft_id,
            reported_by=request.user,
        )

        uploaded_file = request.FILES.get("file")

        if not uploaded_file:
            return Response({
                "success": False,
                "message": "Select a file to upload.",
            }, status=status.HTTP_400_BAD_REQUEST)

        from pathlib import Path

        extension = Path(uploaded_file.name).suffix.lower()

        if extension in self.ALLOWED_IMAGE_EXTENSIONS:
            max_size = self.MAX_IMAGE_SIZE
        elif extension in self.ALLOWED_VIDEO_EXTENSIONS:
            max_size = self.MAX_VIDEO_SIZE
        else:
            return Response({
                "success": False,
                "message": (
                    "Only JPG, JPEG, PNG, WEBP, MP4, WEBM "
                    "and MOV files are allowed."
                ),
            }, status=status.HTTP_400_BAD_REQUEST)

        if uploaded_file.size > max_size:
            return Response({
                "success": False,
                "message": (
                    "Image files must be 10 MB or smaller; "
                    "video files must be 50 MB or smaller."
                ),
            }, status=status.HTTP_400_BAD_REQUEST)

        if draft.attachments.count() >= self.MAX_ATTACHMENTS:
            return Response({
                "success": False,
                "message": "A draft can contain at most 5 attachments.",
            }, status=status.HTTP_400_BAD_REQUEST)

        attachment = DraftAttachment.objects.create(
            draft=draft,
            file=uploaded_file,
        )

        draft.save(update_fields=["updated_at"])

        return Response({
            "success": True,
            "message": "Draft evidence uploaded successfully.",
            "attachment": DraftAttachmentSerializer(attachment).data,
        }, status=status.HTTP_201_CREATED)



class ProblemDraftSubmitView(APIView):
    permission_classes = [IsCitizen]

    @extend_schema(
        tags=["Problems - Drafts"],
        summary="Submit a saved draft as an official problem",
        responses={201: ProblemSerializer},
    )
    def post(self, request, draft_id):
        draft = get_object_or_404(
            ProblemDraft.objects
            .select_related("category")
            .prefetch_related("attachments"),
            pk=draft_id,
            reported_by=request.user,
        )

        report_data = {
            "title": draft.title,
            "description": draft.description,
            "category": draft.category_id,
            "location": draft.location,
            "latitude": draft.latitude,
            "longitude": draft.longitude,
            "priority": draft.priority,
        }

        serializer = ProblemCreateSerializer(data=report_data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            problem = serializer.save(
                reported_by=request.user
            )

            # Reuse existing stored files.
            for draft_attachment in draft.attachments.all():
                ProblemAttachment.objects.create(
                    problem=problem,
                    file=draft_attachment.file.name,
                )

            # Delete draft records only.
            draft.attachments.all().delete()
            draft.delete()

        # Run AI detection AFTER the transaction commits.
        try:
            detect_duplicate_problems(problem)
        except DuplicateDetectionError:
            logger.exception(
                "Duplicate detection failed for submitted draft problem %s",
                problem.id,
            )
        except Exception:
            logger.exception(
                "Unexpected duplicate detection error for submitted draft problem %s",
                problem.id,
            )

        try:
            create_notification(
                recipient=request.user,
                title="Problem submitted",
                message=(
                    f'Your problem "{problem.title}" was submitted '
                    "successfully and is awaiting review."
                ),
                notification_type="problem",
                target_url="/user/my-problems",
            )
        except Exception:
            pass

        try:
            reporter_name = (
                getattr(request.user, "full_name", "")
                or request.user.email
            )

            notify_admins(
                title="New community problem",
                message=(
                    f'"{problem.title}" was reported by '
                    f"{reporter_name}."
                ),
                notification_type="problem",
                actor=request.user,
                target_url="/admin/problems",
            )
        except Exception:
            pass

        return Response(
            {
                "success": True,
                "message": (
                    "Draft submitted successfully as a community problem."
                ),
                "problem": ProblemSerializer(problem).data,
            },
            status=status.HTTP_201_CREATED,
        )


from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User
from organizations.models import Organization
from .models import Problem, ProblemDiscussion
from .serializers import ProblemDiscussionSerializer


def is_civic_admin(user):
    return (
        isinstance(user, User)
        and user.role == "admin"
        and user.is_staff
        and user.is_active
    )


def get_discussion_author_fields(user):
    """
    Return the correct author field for the authenticated CivicSolve actor.
    """
    if isinstance(user, Organization):
        return {"author_organization": user}

    if isinstance(user, User) and user.role in ("citizen", "admin"):
        return {"author_user": user}

    return None



from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from django.shortcuts import get_object_or_404

from .models import Problem, ProblemDiscussion
from .serializers import ProblemDiscussionSerializer


class ProblemDiscussionListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        operation_id="problems_discussions_list",
        responses={200: ProblemDiscussionSerializer(many=True)},
    )
    def get(self, request, problem_id):
        problem = get_object_or_404(Problem, pk=problem_id)

        discussions = ProblemDiscussion.objects.filter(
            problem=problem,
            is_hidden=False,
        ).select_related(
            "author_user",
            "author_organization",
            "parent",
        ).order_by("created_at", "id")

        serializer = ProblemDiscussionSerializer(
            discussions,
            many=True,
            context={"problem": problem},
        )

        return Response({
            "problem_id": problem.id,
            "count": discussions.count(),
            "results": serializer.data,
        })

    @extend_schema(
        operation_id="problems_discussions_create",
        request=ProblemDiscussionSerializer,
        responses={201: ProblemDiscussionSerializer},
    )
    def post(self, request, problem_id):
        problem = get_object_or_404(Problem, pk=problem_id)

        from accounts.models import User
        from organizations.models import Organization

        user = request.user

        if isinstance(user, Organization):
            author_fields = {"author_organization": user}
        elif isinstance(user, User) and user.role in ("citizen", "admin"):
            author_fields = {"author_user": user}
        else:
            return Response(
                {"detail": "Your account type cannot post discussions."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = ProblemDiscussionSerializer(
            data=request.data,
            context={"problem": problem},
        )
        serializer.is_valid(raise_exception=True)

        discussion = serializer.save(
            problem=problem,
            **author_fields,
        )

        return Response(
            ProblemDiscussionSerializer(
                discussion,
                context={"problem": problem},
            ).data,
            status=status.HTTP_201_CREATED,
        )


class ProblemDiscussionModerationView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, problem_id, discussion_id):
        if not is_civic_admin(request.user):
            return Response(
                {"detail": "Admin permission is required."},
                status=status.HTTP_403_FORBIDDEN,
            )

        discussion = get_object_or_404(
            ProblemDiscussion,
            pk=discussion_id,
            problem_id=problem_id,
        )

        is_hidden = request.data.get("is_hidden")

        if not isinstance(is_hidden, bool):
            return Response(
                {"is_hidden": "Provide true or false."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        discussion.is_hidden = is_hidden
        discussion.save(update_fields=["is_hidden", "updated_at"])

        return Response({
            "detail": (
                "Discussion hidden."
                if is_hidden
                else "Discussion restored."
            ),
            "discussion_id": discussion.id,
            "is_hidden": discussion.is_hidden,
        })


# ============================================================
# ORGANIZATION: SUBMIT A SOLUTION FOR AN ASSIGNED PROBLEM
# ============================================================

@extend_schema(
    tags=["Organization - Solutions"],
    summary="Submit a solution for an assigned problem",
    request=OrganizationSolutionCreateSerializer,
    responses={
        201: OrganizationSolutionCreateSerializer,
        400: OpenApiResponse(description="Invalid submission."),
        403: OpenApiResponse(description="Organization access denied."),
        404: OpenApiResponse(description="Assignment not found."),
    },
)
class OrganizationSolutionCreateView(APIView):
    permission_classes = [IsApprovedOrganization]

    def post(self, request, assignment_id):
        assignment = get_object_or_404(
            ProblemAssignment.objects.select_related(
                "problem",
                "organization",
            ),
            pk=assignment_id,
            organization=request.user,
        )

        if assignment.status in ("cancelled", "completed"):
            return Response(
                {
                    "success": False,
                    "message": (
                        "This assignment cannot accept a new solution."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Prevent duplicate active or already approved submissions.
        existing = Solution.objects.filter(
            assignment=assignment,
            status__in=["pending", "approved"],
        ).exists()

        if existing:
            return Response(
                {
                    "success": False,
                    "message": (
                        "An active or approved solution already exists "
                        "for this assignment."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = OrganizationSolutionCreateSerializer(
            data=request.data,
        )
        serializer.is_valid(raise_exception=True)

        solution = serializer.save(
            problem=assignment.problem,
            assignment=assignment,
            submitted_by=None,
            organization=request.user,
            status="pending",
        )

        return Response(
            {
                "success": True,
                "message": (
                    "Solution submitted successfully and is awaiting "
                    "administrator review."
                ),
                "solution": {
                    "id": solution.id,
                    "problem_id": solution.problem_id,
                    "assignment_id": solution.assignment_id,
                    "organization_id": solution.organization_id,
                    "title": solution.title,
                    "description": solution.description,
                    "proposed_action": solution.proposed_action,
                    "status": solution.status,
                    "created_at": solution.created_at,
                },
            },
            status=status.HTTP_201_CREATED,
        )


# ============================================================
# ORGANIZATION: UPLOAD SOLUTION EVIDENCE
# ============================================================

class OrganizationSolutionEvidenceUploadView(APIView):
    permission_classes = [IsApprovedOrganization]
    parser_classes = [MultiPartParser, FormParser]

    MAX_FILE_SIZE = 10 * 1024 * 1024
    MAX_IMAGES_PER_TYPE = 5

    @extend_schema(
        tags=["Organization - Solutions"],
        summary="Upload before-and-after solution evidence",
        description=(
            "Upload an image using multipart/form-data. "
            "Fields: evidence_type (before or after), file, caption."
        ),
        responses={
            201: SolutionEvidenceSerializer,
            400: OpenApiResponse(description="Invalid image or evidence type."),
            403: OpenApiResponse(description="Organization access denied."),
            404: OpenApiResponse(description="Solution not found."),
        },
    )
    def post(self, request, solution_id):
        solution = get_object_or_404(
            Solution.objects.select_related("organization"),
            pk=solution_id,
            organization=request.user,
        )

        if solution.status not in ("pending", "changes_requested"):
            return Response(
                {
                    "success": False,
                    "message": (
                        "Evidence can only be uploaded while the solution "
                        "is pending review or changes have been requested."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        evidence_type = request.data.get("evidence_type")
        uploaded_file = request.FILES.get("file")
        caption = str(request.data.get("caption", "")).strip()

        if evidence_type not in ("before", "after"):
            return Response(
                {
                    "success": False,
                    "message": (
                        "evidence_type must be 'before' or 'after'."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not uploaded_file:
            return Response(
                {
                    "success": False,
                    "message": "An evidence image is required.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if uploaded_file.size > self.MAX_FILE_SIZE:
            return Response(
                {
                    "success": False,
                    "message": "Evidence images must not exceed 10 MB.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        evidence_count = SolutionEvidence.objects.filter(
            solution=solution,
            evidence_type=evidence_type,
        ).count()

        if evidence_count >= self.MAX_IMAGES_PER_TYPE:
            return Response(
                {
                    "success": False,
                    "message": (
                        "A maximum of 5 images is allowed for each "
                        "evidence type."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        evidence = SolutionEvidence.objects.create(
            solution=solution,
            evidence_type=evidence_type,
            file=uploaded_file,
            caption=caption,
            uploaded_by=request.user,
        )

        return Response(
            {
                "success": True,
                "message": "Solution evidence uploaded successfully.",
                "evidence": SolutionEvidenceSerializer(
                    evidence,
                    context={"request": request},
                ).data,
            },
            status=status.HTTP_201_CREATED,
        )


class CitizenResolutionReviewView(APIView):
    permission_classes = [IsAuthenticated]

    def get_citizen_problem(self, request, problem_id):
        if (
            getattr(request.user, "role", None) != "citizen"
            or not request.user.is_active
            or not request.user.email_verified
        ):
            return None

        return get_object_or_404(
            Problem.objects.filter(reported_by=request.user),
            id=problem_id,
        )

    def get(self, request, problem_id):
        problem = self.get_citizen_problem(request, problem_id)

        if problem is None:
            return Response(
                {"detail": "Citizen access is required."},
                status=status.HTTP_403_FORBIDDEN,
            )

        solutions = (
            Solution.objects.filter(
                problem=problem,
                status="approved",
            )
            .select_related("organization", "assignment__organization")
            .prefetch_related("evidence", "citizen_reviews")
            .order_by("-created_at")
        )

        return Response({
            "problem_id": problem.id,
            "problem_title": problem.title,
            "problem_status": problem.status,
            "can_review": problem.status == "resolved",
            "solutions": CitizenResolutionSolutionSerializer(
                solutions,
                many=True,
                context={"request": request},
            ).data,
        })

    def post(self, request, problem_id):
        problem = self.get_citizen_problem(request, problem_id)

        if problem is None:
            return Response(
                {"detail": "Citizen access is required."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if problem.status != "resolved":
            return Response(
                {
                    "detail": (
                        "You can review a resolution only after "
                        "the problem has been marked resolved."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        input_serializer = CitizenResolutionReviewSubmitSerializer(
            data=request.data
        )
        input_serializer.is_valid(raise_exception=True)
        data = input_serializer.validated_data

        solution = get_object_or_404(
            Solution.objects.filter(
                problem=problem,
                status="approved",
            ),
            id=data["solution_id"],
        )

        review, created = ProblemResolutionReview.objects.update_or_create(
            solution=solution,
            citizen=request.user,
            defaults={
                "decision": data["decision"],
                "feedback": data.get("feedback", ""),
            },
        )

        return Response(
            {
                "message": (
                    "Resolution review submitted successfully."
                    if created
                    else "Resolution review updated successfully."
                ),
                "review": CitizenResolutionReviewSerializer(
                    review
                ).data,
            },
            status=(
                status.HTTP_201_CREATED
                if created
                else status.HTTP_200_OK
            ),
        )


@extend_schema(
    request=AISmartProblemReportingSerializer,
    responses={
        200: OpenApiResponse(
            description="AI suggestions generated successfully."
        ),
        400: OpenApiResponse(
            description="Invalid problem description."
        ),
        503: OpenApiResponse(
            description="AI service temporarily unavailable."
        ),
    },
)
class AISmartProblemReportingView(APIView):
    """
    Generates AI-powered suggestions for a citizen's problem report.
    Does not create or submit a problem.
    """

    permission_classes = [IsCitizen]

    def post(self, request):

        serializer = AISmartProblemReportingSerializer(
            data=request.data
        )

        if not serializer.is_valid():
            return Response(
                {
                    "success": False,
                    "message": "Please provide a valid problem description.",
                    "errors": serializer.errors,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        description = serializer.validated_data["description"]

        # Use only active CivicSolve categories.
        categories = list(
            ProblemCategory.objects.filter(
                is_active=True
            ).values_list("name", flat=True)
        )

        if not categories:
            return Response(
                {
                    "success": False,
                    "message": "No active problem categories are available.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            suggestions = generate_problem_suggestions(
                description=description,
                category_names=categories,
            )

            return Response(
                {
                    "success": True,
                    "message": "AI suggestions generated successfully.",
                    "suggestions": suggestions,
                },
                status=status.HTTP_200_OK,
            )

        except ValueError as exc:
            return Response(
                {
                    "success": False,
                    "message": str(exc),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        except AIServiceError:
            return Response(
                {
                    "success": False,
                    "message": (
                        "AI suggestions are temporarily unavailable. "
                        "Please try again later."
                    ),
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )


class CivicSolveAssistantView(APIView):
    """
    Answers citizen questions using CivicSolve rules and database context.
    This endpoint does not create or update any CivicSolve records.
    """

    permission_classes = [IsCitizen]

    @extend_schema(
        tags=["CivicSolve AI Assistant"],
        summary="Ask the CivicSolve AI Assistant",
        request=CivicAssistantRequestSerializer,
        responses={
            200: OpenApiResponse(
                description="Assistant answer returned successfully."
            ),
            400: OpenApiResponse(
                description="Invalid question."
            ),
            503: OpenApiResponse(
                description="Local AI service unavailable."
            ),
        },
    )
    def post(self, request):
        serializer = CivicAssistantRequestSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(
                {
                    "success": False,
                    "message": "Please enter a valid question.",
                    "errors": serializer.errors,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            answer = answer_civic_question(
                question=serializer.validated_data["message"],
                user=request.user,
            )

            return Response(
                {
                    "success": True,
                    "answer": answer,
                },
                status=status.HTTP_200_OK,
            )

        except ValueError as exc:
            return Response(
                {
                    "success": False,
                    "message": str(exc),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        except CivicAssistantError as exc:
            return Response(
                {
                    "success": False,
                    "message": str(exc),
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )