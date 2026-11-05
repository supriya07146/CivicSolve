from rest_framework import serializers
from .models import AdminProfile


class AdminProfileSerializer(serializers.ModelSerializer):

    full_name = serializers.CharField(
        source="user.full_name",
        required=False,
        max_length=100
    )

    email = serializers.EmailField(
        source="user.email",
        read_only=True
    )

    phone = serializers.CharField(
        source="user.phone",
        required=False,
        max_length=15
    )

    location = serializers.CharField(
        source="user.location",
        required=False,
        allow_blank=True,
        max_length=255
    )

    class Meta:
        model = AdminProfile
        fields = [
            "id",
            "full_name",
            "email",
            "phone",
            "location",
            "profile_image",
            "designation",
            "department",
            "bio",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "email",
            "updated_at",
        ]

    def update(self, instance, validated_data):

        user_data = validated_data.pop("user", {})

        user = instance.user

        for field in ["full_name", "phone", "location"]:
            if field in user_data:
                setattr(user, field, user_data[field])

        if user_data:
            user.save()

        for field, value in validated_data.items():
            setattr(instance, field, value)

        instance.save()

        return instance