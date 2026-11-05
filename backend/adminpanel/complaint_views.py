
from django.utils import timezone

from rest_framework import status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.generics import ListCreateAPIView, RetrieveAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User
from organizations.models import Organization
from problems.models import Complaint
from adminpanel.complaint_serializers import (
    ComplaintCreateSerializer,
    ComplaintSerializer,
)
from adminpanel.permissions import IsCivicAdmin
from adminpanel.notification_service import create_notification, notify_admins


class ComplaintListCreateView(ListCreateAPIView):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user

        if isinstance(user, Organization):
            return Complaint.objects.filter(
                submitted_by_organization=user
            ).select_related("problem", "target_organization")

        return Complaint.objects.filter(
            submitted_by=user
        ).select_related("problem", "target_organization")

    def get_serializer_class(self):
        if self.request.method == "POST":
            return ComplaintCreateSerializer
        return ComplaintSerializer

    def perform_create(self, serializer):
        user = self.request.user

        if isinstance(user, Organization):
            if user.status != "approved" or not user.is_active:
                raise PermissionDenied(
                    "Only approved, active organizations can submit complaints."
                )

            serializer.save(submitted_by_organization=user)
            return

        if not isinstance(user, User):
            raise PermissionDenied("Unsupported complainant account.")

        if getattr(user, "role", None) == "admin":
            raise PermissionDenied(
                "Use the administrator panel to manage complaints."
            )

        complaint = serializer.save(submitted_by=user)
        try:
            create_notification(
                recipient=user,
                title="Complaint submitted",
                message=f'Your complaint "{complaint.title}" ({complaint.complaint_code}) has been received.',
                notification_type="complaint",
                actor=user,
                target_url="/citizen/complaints",
            )
            notify_admins(
                title="New complaint filed",
                message=f'A new complaint "{complaint.title}" ({complaint.complaint_code}) was filed by {getattr(user, "full_name", user.email)}.',
                notification_type="complaint",
                actor=user,
                target_url="/admin/complaints",
            )
        except Exception:
            pass


class ComplaintDetailView(RetrieveAPIView):
    serializer_class = ComplaintSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = "complaint_code"

    def get_queryset(self):
        user = self.request.user

        if isinstance(user, Organization):
            return Complaint.objects.filter(
                submitted_by_organization=user
            )

        return Complaint.objects.filter(
            submitted_by=user
        )


class AdminComplaintListView(ListCreateAPIView):
    permission_classes = [IsCivicAdmin]
    serializer_class = ComplaintSerializer
    http_method_names = ["get", "head", "options"]

    def get_queryset(self):
        queryset = Complaint.objects.select_related(
            "submitted_by",
            "submitted_by_organization",
            "problem",
            "target_organization",
            "reviewed_by",
        ).all()

        complaint_status = self.request.query_params.get("status")
        target_type = self.request.query_params.get("target_type")
        search = self.request.query_params.get("search")

        if complaint_status:
            queryset = queryset.filter(status=complaint_status)

        if target_type:
            queryset = queryset.filter(target_type=target_type)

        if search:
            from django.db.models import Q

            queryset = queryset.filter(
                Q(title__icontains=search)
                | Q(description__icontains=search)
                | Q(complaint_code__icontains=search)
            )

        return queryset


class AdminComplaintDetailView(RetrieveAPIView):
    permission_classes = [IsCivicAdmin]
    serializer_class = ComplaintSerializer
    queryset = Complaint.objects.select_related(
        "submitted_by",
        "submitted_by_organization",
        "problem",
        "target_organization",
        "reviewed_by",
    ).all()
    lookup_field = "complaint_code"


class AdminComplaintReviewView(APIView):
    permission_classes = [IsCivicAdmin]

    def patch(self, request, complaint_code):
        try:
            complaint = Complaint.objects.get(
                complaint_code=complaint_code
            )
        except Complaint.DoesNotExist:
            return Response(
                {"message": "Complaint not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        new_status = request.data.get("status")
        allowed_statuses = {
            "under_review",
            "investigating",
            "resolved",
            "rejected",
        }

        if new_status not in allowed_statuses:
            raise ValidationError({
                "status": (
                    "Choose under_review, investigating, resolved, "
                    "or rejected."
                )
            })

        investigation_notes = request.data.get(
            "admin_investigation_notes",
            complaint.admin_investigation_notes,
        )
        resolution_notes = request.data.get(
            "resolution_notes",
            complaint.resolution_notes,
        )

        if not isinstance(investigation_notes, str) or not isinstance(
            resolution_notes, str
        ):
            raise ValidationError(
                "Investigation and resolution notes must be text."
            )

        if len(investigation_notes) > 10000 or len(resolution_notes) > 10000:
            raise ValidationError("Notes cannot exceed 10,000 characters.")

        if new_status == "resolved" and not resolution_notes.strip():
            raise ValidationError({
                "resolution_notes":
                    "Provide resolution notes before resolving a complaint."
            })

        complaint.status = new_status
        complaint.admin_investigation_notes = investigation_notes
        complaint.resolution_notes = resolution_notes
        complaint.reviewed_by = request.user
        complaint.reviewed_at = timezone.now()

        if new_status == "resolved":
            complaint.resolved_at = timezone.now()
        else:
            complaint.resolved_at = None

        complaint.save()

        try:
            recipient = complaint.submitted_by or complaint.submitted_by_organization
            if recipient:
                create_notification(
                    recipient=recipient,
                    title=f"Complaint update: {new_status.replace('_', ' ').capitalize()}",
                    message=f'Your complaint "{complaint.title}" ({complaint.complaint_code}) has been marked as {new_status.replace("_", " ")}.',
                    notification_type="complaint",
                    actor=request.user,
                    target_url="/citizen/complaints" if complaint.submitted_by else "/organizer/dashboard",
                )
        except Exception:
            pass

        return Response({
            "message": "Complaint updated successfully.",
            "complaint": ComplaintSerializer(complaint).data,
        })