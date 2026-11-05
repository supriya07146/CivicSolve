
from django.db.models import Count, Q
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from problems.models import ProblemCategory
from .permissions import IsCivicAdmin
from .category_serializers import AdminCategorySerializer


class AdminCategoryListCreateView(APIView):
    permission_classes = [IsCivicAdmin]

    def get(self, request):
        search = request.query_params.get(
            "search", ""
        ).strip()

        active_filter = request.query_params.get(
            "is_active", ""
        ).strip().lower()

        categories = ProblemCategory.objects.annotate(
            problem_count=Count("problems", distinct=True)
        )

        if search:
            categories = categories.filter(
                Q(name__icontains=search)
                | Q(description__icontains=search)
            )

        if active_filter:
            if active_filter not in ["true", "false"]:
                return Response(
                    {
                        "success": False,
                        "message": (
                            "is_active must be true or false."
                        ),
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            categories = categories.filter(
                is_active=(active_filter == "true")
            )

        categories = categories.order_by("name")

        serializer = AdminCategorySerializer(
            categories, many=True
        )

        summary = {
            "total": ProblemCategory.objects.count(),
            "active": ProblemCategory.objects.filter(
                is_active=True
            ).count(),
            "inactive": ProblemCategory.objects.filter(
                is_active=False
            ).count(),
        }

        return Response(
            {
                "success": True,
                "summary": summary,
                "count": len(serializer.data),
                "categories": serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    def post(self, request):
        serializer = AdminCategorySerializer(
            data=request.data
        )

        if not serializer.is_valid():
            return Response(
                {
                    "success": False,
                    "message": "Please correct the category details.",
                    "errors": serializer.errors,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        category = serializer.save()

        return Response(
            {
                "success": True,
                "message": "Category created successfully.",
                "category": AdminCategorySerializer(
                    category,
                    context={"request": request},
                ).data,
            },
            status=status.HTTP_201_CREATED,
        )


class AdminCategoryDetailView(APIView):
    permission_classes = [IsCivicAdmin]

    def get_object(self, category_id):
        try:
            return ProblemCategory.objects.annotate(
                problem_count=Count("problems", distinct=True)
            ).get(id=category_id)
        except ProblemCategory.DoesNotExist:
            return None

    def get(self, request, category_id):
        category = self.get_object(category_id)

        if category is None:
            return Response(
                {
                    "success": False,
                    "message": "Category not found.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = AdminCategorySerializer(category)

        return Response(
            {
                "success": True,
                "category": serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    def patch(self, request, category_id):
        category = self.get_object(category_id)

        if category is None:
            return Response(
                {
                    "success": False,
                    "message": "Category not found.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = AdminCategorySerializer(
            category,
            data=request.data,
            partial=True,
        )

        if not serializer.is_valid():
            return Response(
                {
                    "success": False,
                    "message": "Please correct the category details.",
                    "errors": serializer.errors,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer.save()

        return Response(
            {
                "success": True,
                "message": "Category updated successfully.",
                "category": AdminCategorySerializer(
                    category
                ).data,
            },
            status=status.HTTP_200_OK,
        )


class AdminCategoryStatusView(APIView):
    permission_classes = [IsCivicAdmin]

    def patch(self, request, category_id):
        try:
            category = ProblemCategory.objects.get(
                id=category_id
            )
        except ProblemCategory.DoesNotExist:
            return Response(
                {
                    "success": False,
                    "message": "Category not found.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        if "is_active" not in request.data:
            return Response(
                {
                    "success": False,
                    "message": "is_active is required.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        value = request.data["is_active"]

        if not isinstance(value, bool):
            return Response(
                {
                    "success": False,
                    "message": "is_active must be a boolean.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        category.is_active = value
        category.save(update_fields=["is_active", "updated_at"])

        return Response(
            {
                "success": True,
                "message": (
                    "Category activated successfully."
                    if value
                    else "Category deactivated successfully."
                ),
                "category": AdminCategorySerializer(
                    ProblemCategory.objects.annotate(
                        problem_count=Count(
                            "problems", distinct=True
                        )
                    ).get(id=category.id)
                ).data,
            },
            status=status.HTTP_200_OK,
        )