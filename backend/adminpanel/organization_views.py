from django.db.models import Q
from django.utils import timezone

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from organizations.models import Organization

from .permissions import IsCivicAdmin
from .notification_service import create_notification

from .organization_serializers import (
    AdminOrganizationListSerializer,
    AdminOrganizationDetailSerializer,
    AdminOrganizationCreateSerializer,
)


def _first_error_message(errors):
    """Turn DRF's error dict into one readable sentence for the frontend."""

    for field, messages in errors.items():

        if isinstance(messages, (list, tuple)) and messages:
            message = str(messages[0])
        else:
            message = str(messages)

        if field == "non_field_errors":
            return message

        label = field.replace("_", " ").capitalize()
        return f"{label}: {message}"

    return "Invalid data."


def _not_found():
    return Response(
        {
            "success": False,
            "message": "Organization not found."
        },
        status=status.HTTP_404_NOT_FOUND
    )


# ============================================================
# ORGANIZATION LIST  (GET)  +  ADD ORGANIZATION  (POST)
# ============================================================


class AdminOrganizationListView(APIView):

    permission_classes = [IsCivicAdmin]

    # Needed so the Add Organization form can upload a document
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):

        status_filter = (
            request.query_params
            .get("status", "")
            .strip()
            .lower()
        )

        search = (
            request.query_params
            .get("search", "")
            .strip()
        )

        organizations = Organization.objects.all()

        # ---------------- STATUS FILTER ----------------

        allowed_statuses = {
            "pending_verification",
            "approved",
            "suspended",
            "rejected",
        }

        if status_filter == "pending":
            status_filter = "pending_verification"

        if status_filter in allowed_statuses:
            organizations = organizations.filter(status=status_filter)

        # ---------------- SEARCH ----------------

        if search:
            organizations = organizations.filter(
                Q(organization_name__icontains=search)
                | Q(email__icontains=search)
                | Q(phone__icontains=search)
                | Q(city__icontains=search)
                | Q(state__icontains=search)
                | Q(service_area__icontains=search)
            )

        organizations = organizations.order_by("-created_at")

        serializer = AdminOrganizationListSerializer(
            organizations,
            many=True,
            context={"request": request}
        )

        # ---------------- SUMMARY ----------------

        summary = {
            "total": Organization.objects.count(),

            "pending": Organization.objects.filter(
                status="pending_verification"
            ).count(),

            "approved": Organization.objects.filter(
                status="approved"
            ).count(),

            "suspended": Organization.objects.filter(
                status="suspended"
            ).count(),

            "rejected": Organization.objects.filter(
                status="rejected"
            ).count(),
        }

        return Response(
            {
                "success": True,
                "summary": summary,
                "count": organizations.count(),
                "organizations": serializer.data,
            },
            status=status.HTTP_200_OK
        )

    def post(self, request):

        serializer = AdminOrganizationCreateSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(
                {
                    "success": False,
                    "message": _first_error_message(serializer.errors),
                    "errors": serializer.errors,
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        organization = serializer.save()

        try:
            create_notification(
                recipient=organization,
                title="Organization added",
                message="Your organization has been added and approved by the administrator.",
                notification_type="organization",
                actor=request.user,
                target_url="/organization/dashboard",
            )
        except Exception:
            pass

        detail = AdminOrganizationDetailSerializer(
            organization,
            context={"request": request}
        )

        return Response(
            {
                "success": True,
                "message": "Organization added successfully.",
                "organization": detail.data,
            },
            status=status.HTTP_201_CREATED
        )


# ============================================================
# ORGANIZATION DETAILS
# ============================================================


class AdminOrganizationDetailView(APIView):

    permission_classes = [IsCivicAdmin]

    def get(self, request, organization_id):

        try:
            organization = Organization.objects.get(id=organization_id)
        except Organization.DoesNotExist:
            return _not_found()

        serializer = AdminOrganizationDetailSerializer(
            organization,
            context={"request": request}
        )

        return Response(
            {
                "success": True,
                "organization": serializer.data,
            },
            status=status.HTTP_200_OK
        )


# ============================================================
# APPROVE ORGANIZATION
# ============================================================


class AdminApproveOrganizationView(APIView):

    permission_classes = [IsCivicAdmin]

    def patch(self, request, organization_id):

        try:
            organization = Organization.objects.get(id=organization_id)
        except Organization.DoesNotExist:
            return _not_found()

        if organization.status == "approved":
            return Response(
                {
                    "success": False,
                    "message": "Organization is already approved."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        organization.status = "approved"
        organization.is_active = True
        organization.verified_at = timezone.now()

        organization.save(
            update_fields=[
                "status",
                "is_active",
                "verified_at",
                "updated_at",
            ]
        )

        try:
            create_notification(
                recipient=organization,
                title="Organization approved",
                message="Your organization registration has been approved. You can now access full platform features.",
                notification_type="organization",
                actor=request.user,
                target_url="/organization/dashboard",
            )
        except Exception:
            pass

        return Response(
            {
                "success": True,
                "message": "Organization approved successfully.",
                "organization": {
                    "id": organization.id,
                    "organization_name": organization.organization_name,
                    "status": organization.status,
                    "is_active": organization.is_active,
                    "verified_at": organization.verified_at,
                }
            },
            status=status.HTTP_200_OK
        )


# ============================================================
# REJECT ORGANIZATION
# ============================================================


class AdminRejectOrganizationView(APIView):

    permission_classes = [IsCivicAdmin]

    def patch(self, request, organization_id):

        try:
            organization = Organization.objects.get(id=organization_id)
        except Organization.DoesNotExist:
            return _not_found()

        if organization.status == "rejected":
            return Response(
                {
                    "success": False,
                    "message": "Organization is already rejected."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        organization.status = "rejected"
        organization.is_active = False

        organization.save(
            update_fields=[
                "status",
                "is_active",
                "updated_at",
            ]
        )

        try:
            create_notification(
                recipient=organization,
                title="Organization application status",
                message="Your organization registration application was reviewed and rejected.",
                notification_type="organization",
                actor=request.user,
                target_url="/organization/dashboard",
            )
        except Exception:
            pass

        return Response(
            {
                "success": True,
                "message": "Organization rejected successfully.",
                "organization": {
                    "id": organization.id,
                    "organization_name": organization.organization_name,
                    "status": organization.status,
                    "is_active": organization.is_active,
                }
            },
            status=status.HTTP_200_OK
        )


# ============================================================
# SUSPEND ORGANIZATION
# ============================================================


class AdminSuspendOrganizationView(APIView):

    permission_classes = [IsCivicAdmin]

    def patch(self, request, organization_id):

        try:
            organization = Organization.objects.get(id=organization_id)
        except Organization.DoesNotExist:
            return _not_found()

        if organization.status == "suspended":
            return Response(
                {
                    "success": False,
                    "message": "Organization is already suspended."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        organization.status = "suspended"
        organization.is_active = False

        organization.save(
            update_fields=[
                "status",
                "is_active",
                "updated_at",
            ]
        )

        return Response(
            {
                "success": True,
                "message": "Organization suspended successfully.",
                "organization": {
                    "id": organization.id,
                    "organization_name": organization.organization_name,
                    "status": organization.status,
                    "is_active": organization.is_active,
                }
            },
            status=status.HTTP_200_OK
        )