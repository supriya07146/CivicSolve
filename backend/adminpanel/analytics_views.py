
from datetime import timedelta

from django.conf import settings
from django.db.models import (
    Avg,
    Count,
    DurationField,
    ExpressionWrapper,
    F,
    Q,
)

from .analytics_ai import (
    generate_admin_insights,
    AdminInsightsAIError,
)

from django.db.models.functions import TruncMonth
from django.utils import timezone

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from problems.models import Problem, ProblemAssignment
from .permissions import IsCivicAdmin
from .analytics_serializers import ProblemEscalationSerializer


RESOLVED_STATUSES = {"resolved"}
INACTIVE_STATUSES = {"resolved", "rejected", "closed"}


def get_priority_deadlines():
    """Return configured deadlines, with safe defaults."""
    defaults = {
        "low": 168,
        "medium": 72,
        "high": 24,
        "urgent": 4,
    }

    configured = getattr(
        settings,
        "CIVICSOLVE_PRIORITY_DEADLINES_HOURS",
        defaults,
    )

    deadlines = defaults.copy()

    if isinstance(configured, dict):
        for priority in defaults:
            value = configured.get(priority, defaults[priority])

            # Accept only positive numeric deadline values.
            if (
                isinstance(value, (int, float))
                and not isinstance(value, bool)
                and value > 0
            ):
                deadlines[priority] = value

    return deadlines


def get_overdue_problems():
    """Return active problems whose priority deadline has passed."""
    now = timezone.now()
    deadlines = get_priority_deadlines()

    active_problems = Problem.objects.exclude(
        status__in=INACTIVE_STATUSES
    ).select_related("category", "reported_by")

    overdue = []

    for problem in active_problems.iterator():
        hours = deadlines.get(problem.priority, 72)
        deadline = problem.created_at + timedelta(hours=hours)

        if deadline < now:
            overdue.append({
                "id": problem.id,
                "problem_code": str(problem.problem_code),
                "title": problem.title,
                "category": problem.category.name,
                "location": problem.location,
                "priority": problem.priority,
                "status": problem.status,
                "created_at": problem.created_at,
                "deadline": deadline,
                "overdue_hours": round(
                    (now - deadline).total_seconds() / 3600,
                    2,
                ),
                "is_escalated": problem.is_escalated,
            })

    return overdue


class AdminAnalyticsDashboardView(APIView):
    permission_classes = [IsCivicAdmin]

    def get(self, request):
        problems = Problem.objects.all()
        total = problems.count()

        resolved = problems.filter(
            status="resolved"
        ).count()

        resolution_rate = (
            round((resolved / total) * 100, 2)
            if total else 0
        )

        resolved_with_dates = problems.filter(
            status="resolved",
            resolved_at__isnull=False,
        ).annotate(
            resolution_duration=ExpressionWrapper(
                F("resolved_at") - F("created_at"),
                output_field=DurationField(),
            )
        )

        average_duration = resolved_with_dates.aggregate(
            average=Avg("resolution_duration")
        )["average"]

        average_resolution_hours = (
            round(average_duration.total_seconds() / 3600, 2)
            if average_duration is not None else None
        )

        by_category = list(
            problems.values(
                "category_id",
                "category__name",
            ).annotate(
                count=Count("id")
            ).order_by("-count", "category__name")
        )

        by_month = list(
            problems.annotate(
                month=TruncMonth("created_at")
            ).values(
                "month"
            ).annotate(
                count=Count("id")
            ).order_by("month")
        )

        by_location = list(
            problems.values(
                "location"
            ).annotate(
                count=Count("id")
            ).order_by("-count", "location")[:100]
        )

        by_status = list(
            problems.values(
                "status"
            ).annotate(
                count=Count("id")
            ).order_by("status")
        )

        assignments = ProblemAssignment.objects.all()

        organization_performance = list(
            assignments.values(
                "organization_id",
                "organization__organization_name",
            ).annotate(
                total_assigned=Count("id"),
                completed=Count(
                    "id",
                    filter=Q(status="completed"),
                ),
                accepted=Count(
                    "id",
                    filter=Q(status="accepted"),
                ),
                in_progress=Count(
                    "id",
                    filter=Q(status="in_progress"),
                ),
            ).order_by("-total_assigned")
        )


        for organization in organization_performance:
            assigned_total = organization["total_assigned"]
            completed_count = organization["completed"]

            organization["completion_rate"] = (
                round(
                    completed_count / assigned_total * 100,
                    2,
                )
                if assigned_total else 0
            )

        overdue = get_overdue_problems()

        return Response(
            {
                "success": True,
                "summary": {
                    "total_problems": total,
                    "resolved_problems": resolved,
                    "unresolved_problems": total - resolved,
                    "resolution_rate": resolution_rate,
                    "average_resolution_hours": (
                        average_resolution_hours
                    ),
                    "total_assignments": assignments.count(),
                    "overdue_problems": len(overdue),
                    "escalated_problems": problems.filter(
                        is_escalated=True
                    ).count(),
                },
                "problems_by_category": by_category,
                "problems_by_month": by_month,
                "problems_by_location": by_location,
                "problems_by_status": by_status,
                "organization_performance": (
                    organization_performance
                ),
                "priority_deadlines_hours": get_priority_deadlines(),
            },
            status=status.HTTP_200_OK,
        )


class AdminOverdueProblemsView(APIView):
    permission_classes = [IsCivicAdmin]

    def get(self, request):
        overdue = get_overdue_problems()

        return Response(
            {
                "success": True,
                "count": len(overdue),
                "deadline_rule": (
                    "Problem creation time plus configured "
                    "priority deadline; resolved, rejected, "
                    "and closed problems are excluded."
                ),
                "priority_deadlines_hours": get_priority_deadlines(),
                "problems": overdue,
            },
            status=status.HTTP_200_OK,
        )


class AdminEscalatedProblemsView(APIView):
    permission_classes = [IsCivicAdmin]

    def get(self, request):
        problems = Problem.objects.filter(
            is_escalated=True
        ).select_related(
            "category",
            "escalated_by",
        ).order_by("-escalated_at")

        results = []

        for problem in problems:
            results.append({
                "id": problem.id,
                "problem_code": str(problem.problem_code),
                "title": problem.title,
                "category": problem.category.name,
                "location": problem.location,
                "priority": problem.priority,
                "status": problem.status,
                "is_escalated": problem.is_escalated,
                "escalated_at": problem.escalated_at,
                "escalated_by": (
                    str(problem.escalated_by)
                    if problem.escalated_by else None
                ),
            })

        return Response(
            {
                "success": True,
                "count": len(results),
                "problems": results,
            },
            status=status.HTTP_200_OK,
        )


class AdminProblemEscalationView(APIView):
    permission_classes = [IsCivicAdmin]

    def patch(self, request, problem_code):
        try:
            problem = Problem.objects.get(
                problem_code=problem_code
            )
        except (
            Problem.DoesNotExist,
            ValueError,
        ):
            return Response(
                {
                    "success": False,
                    "message": "Problem not found.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = ProblemEscalationSerializer(
            data=request.data
        )

        if not serializer.is_valid():
            return Response(
                {
                    "success": False,
                    "message": "Provide a valid is_escalated boolean.",
                    "errors": serializer.errors,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        should_escalate = serializer.validated_data[
            "is_escalated"
        ]

        problem.is_escalated = should_escalate

        if should_escalate:
            problem.escalated_at = timezone.now()
            problem.escalated_by = request.user
        else:
            problem.escalated_at = None
            problem.escalated_by = None

        problem.save(
            update_fields=[
                "is_escalated",
                "escalated_at",
                "escalated_by",
                "updated_at",
            ]
        )

        return Response(
            {
                "success": True,
                "message": (
                    "Problem escalated successfully."
                    if should_escalate
                    else "Problem escalation removed successfully."
                ),
                "problem_code": str(problem.problem_code),
                "is_escalated": problem.is_escalated,
                "escalated_at": problem.escalated_at,
            },
            status=status.HTTP_200_OK,
        )

# ==========================================================
# ADMIN - AI POWERED ANALYTICS INSIGHTS
# ==========================================================

class AdminAIInsightsView(APIView):
    """
    Generates AI-powered administrative insights using
    aggregated statistics from actual CivicSolve records.
    """

    permission_classes = [IsCivicAdmin]

    def get(self, request):

        now = timezone.now()
        deadlines = get_priority_deadlines()

        # --------------------------------------------------
        # 1. BASIC PROBLEM STATISTICS
        # --------------------------------------------------

        problems = Problem.objects.all()

        total_problems = problems.count()

        unresolved_problems = problems.exclude(
            status__in=INACTIVE_STATUSES
        ).count()

        resolved_problems = problems.filter(
            status="resolved"
        ).count()

        overdue_problems = get_overdue_problems()

        # --------------------------------------------------
        # 2. FREQUENTLY REPORTED CATEGORIES
        # --------------------------------------------------

        category_data = list(
            problems.values(
                "category__name"
            ).annotate(
                total_reports=Count("id"),
                unresolved_reports=Count(
                    "id",
                    filter=~Q(status__in=INACTIVE_STATUSES),
                ),
                high_priority_reports=Count(
                    "id",
                    filter=Q(priority__in=["high", "urgent"]),
                ),
            ).order_by(
                "-total_reports",
                "category__name",
            )[:10]
        )

        # --------------------------------------------------
        # 3. REPEATED AND UNRESOLVED LOCATIONS
        # --------------------------------------------------

        location_data = list(
            problems.exclude(
                location=""
            ).values(
                "location"
            ).annotate(
                total_reports=Count("id"),

                unresolved_reports=Count(
                    "id",
                    filter=~Q(status__in=INACTIVE_STATUSES),
                ),

                high_priority_reports=Count(
                    "id",
                    filter=Q(priority__in=["high", "urgent"]),
                ),

                escalated_reports=Count(
                    "id",
                    filter=Q(is_escalated=True),
                ),

            ).order_by(
                "-total_reports",
                "-unresolved_reports",
            )
        )

        repeated_locations = [
            location
            for location in location_data
            if location["total_reports"] >= 2
        ][:10]

        # --------------------------------------------------
        # 4. OVERDUE COUNTS BY LOCATION
        # --------------------------------------------------

        overdue_by_location = {}

        for problem in overdue_problems:
            location = problem["location"]

            overdue_by_location[location] = (
                overdue_by_location.get(location, 0) + 1
            )

        # --------------------------------------------------
        # 5. AREAS REQUIRING ADMINISTRATIVE ATTENTION
        # --------------------------------------------------

        attention_areas = []

        for location in location_data:

            location_name = location["location"]

            overdue_count = overdue_by_location.get(
                location_name,
                0,
            )

            unresolved_count = location["unresolved_reports"]
            priority_count = location["high_priority_reports"]
            escalated_count = location["escalated_reports"]

            # Include areas with unresolved issues and at least
            # one additional indicator of attention.
            needs_attention = (
                unresolved_count >= 2
                or priority_count > 0
                or escalated_count > 0
                or overdue_count > 0
            )

            if needs_attention:
                attention_areas.append({
                    "location": location_name,
                    "total_reports": location["total_reports"],
                    "unresolved_reports": unresolved_count,
                    "high_priority_reports": priority_count,
                    "escalated_reports": escalated_count,
                    "overdue_reports": overdue_count,
                })

        attention_areas.sort(
            key=lambda item: (
                item["overdue_reports"],
                item["high_priority_reports"],
                item["unresolved_reports"],
                item["escalated_reports"],
            ),
            reverse=True,
        )

        attention_areas = attention_areas[:10]

        # --------------------------------------------------
        # 6. RESOLUTION TIME TRENDS - LAST 12 MONTHS
        # --------------------------------------------------

        twelve_months_ago = now - timedelta(days=365)

        monthly_resolution_data = (
            Problem.objects.filter(
                status="resolved",
                resolved_at__isnull=False,
                resolved_at__gte=twelve_months_ago,
            )
            .annotate(
                month=TruncMonth("resolved_at"),
                resolution_duration=ExpressionWrapper(
                    F("resolved_at") - F("created_at"),
                    output_field=DurationField(),
                ),
            )
            .values("month")
            .annotate(
                resolved_count=Count("id"),
                average_resolution_duration=Avg(
                    "resolution_duration"
                ),
            )
            .order_by("month")
        )

        resolution_trends = []

        for item in monthly_resolution_data:

            duration = item["average_resolution_duration"]

            average_hours = (
                round(duration.total_seconds() / 3600, 2)
                if duration is not None
                else None
            )

            resolution_trends.append({
                "month": item["month"].strftime("%b %Y"),
                "resolved_count": item["resolved_count"],
                "average_resolution_hours": average_hours,
            })

        # --------------------------------------------------
        # 7. BUILD VERIFIED ANALYTICS DATA
        # --------------------------------------------------

        analytics_data = {
            "generated_at": now.isoformat(),

            "overview": {
                "total_problems": total_problems,
                "resolved_problems": resolved_problems,
                "unresolved_problems": unresolved_problems,
                "overdue_problems": len(overdue_problems),
                "escalated_problems": problems.filter(
                    is_escalated=True
                ).count(),
            },

            "frequently_reported_categories": category_data,

            "repeated_locations": repeated_locations,

            "areas_requiring_attention": attention_areas,

            "monthly_resolution_trends": resolution_trends,

            "priority_deadlines_hours": deadlines,
        }

        # --------------------------------------------------
        # 8. FACTUAL FALLBACK IF OLLAMA IS UNAVAILABLE
        # --------------------------------------------------

        fallback_parts = [
            (
                f"CivicSolve currently has {total_problems} reported "
                f"problems, including {resolved_problems} resolved "
                f"and {unresolved_problems} unresolved problems."
            )
        ]

        if category_data:
            top_category = category_data[0]

            fallback_parts.append(
                f"The most frequently reported category is "
                f"{top_category['category__name']} with "
                f"{top_category['total_reports']} reports."
            )

        if attention_areas:
            top_area = attention_areas[0]

            fallback_parts.append(
                f"{top_area['location']} currently has "
                f"{top_area['unresolved_reports']} unresolved reports "
                f"and {top_area['overdue_reports']} overdue reports. "
                f"Consider reviewing this area's pending work."
            )

        if not attention_areas:
            fallback_parts.append(
                "No locations currently meet the configured "
                "attention indicators."
            )

        if resolution_trends:
            latest_trend = resolution_trends[-1]

            if latest_trend["average_resolution_hours"] is not None:
                fallback_parts.append(
                    f"In {latest_trend['month']}, "
                    f"{latest_trend['resolved_count']} problems were "
                    f"resolved, with an average resolution time of "
                    f"{latest_trend['average_resolution_hours']} hours."
                )
        else:
            fallback_parts.append(
                "There is not enough resolved-problem history "
                "from the last 12 months to calculate monthly "
                "resolution trends."
            )

        fallback_summary = "\n\n".join(fallback_parts)

        # --------------------------------------------------
        # 9. GENERATE AI INSIGHTS
        # --------------------------------------------------

        try:
            ai_summary = generate_admin_insights(
                analytics_data
            )

            ai_available = True

        except AdminInsightsAIError:
            ai_summary = fallback_summary
            ai_available = False

        # --------------------------------------------------
        # 10. API RESPONSE
        # --------------------------------------------------

        return Response(
            {
                "success": True,
                "ai_available": ai_available,
                "generated_at": now,
                "summary": ai_summary,
                "data": analytics_data,
            },
            status=status.HTTP_200_OK,
        )