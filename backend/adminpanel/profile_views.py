from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import (
    MultiPartParser,
    FormParser,
    JSONParser,
)

from .models import AdminProfile
from .permissions import IsCivicAdmin
from .profile_serializers import AdminProfileSerializer
from django.contrib.auth.hashers import check_password
from .password_serializers import ChangeAdminPasswordSerializer

class AdminProfileView(APIView):

    permission_classes = [IsCivicAdmin]

    parser_classes = [
        MultiPartParser,
        FormParser,
        JSONParser,
    ]

    def get_profile(self, user):
        profile, created = AdminProfile.objects.get_or_create(
            user=user
        )
        return profile

    def get(self, request):

        profile = self.get_profile(request.user)

        serializer = AdminProfileSerializer(
            profile,
            context={"request": request}
        )

        return Response(
            {
                "success": True,
                "message": "Admin profile retrieved successfully.",
                "data": serializer.data,
            },
            status=status.HTTP_200_OK
        )

    def patch(self, request):

        profile = self.get_profile(request.user)

        serializer = AdminProfileSerializer(
            profile,
            data=request.data,
            partial=True,
            context={"request": request}
        )

        if serializer.is_valid():
            serializer.save()

            return Response(
                {
                    "success": True,
                    "message": "Admin profile updated successfully.",
                    "data": serializer.data,
                },
                status=status.HTTP_200_OK
            )

        return Response(
            {
                "success": False,
                "message": "Please correct the validation errors.",
                "errors": serializer.errors,
            },
            status=status.HTTP_400_BAD_REQUEST
        )


class AdminChangePasswordView(APIView):

    permission_classes = [IsCivicAdmin]

    def post(self, request):

        serializer = ChangeAdminPasswordSerializer(
            data=request.data,
            context={"request": request}
        )

        if not serializer.is_valid():
            return Response(
                {
                    "success": False,
                    "message": "Please correct the password details.",
                    "errors": serializer.errors,
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        user = request.user
        current_password = serializer.validated_data["current_password"]
        new_password = serializer.validated_data["new_password"]

        if not check_password(current_password, user.password):
            return Response(
                {
                    "success": False,
                    "message": "Your current password is incorrect.",
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        user.set_password(new_password)
        user.save(update_fields=["password"])

        return Response(
            {
                "success": True,
                "message": "Your password has been changed successfully. Please log in again.",
            },
            status=status.HTTP_200_OK
        )