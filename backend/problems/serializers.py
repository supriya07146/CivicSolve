from rest_framework import serializers

from .models import (
    Problem,
    ProblemAttachment,
    ProblemCategory,
    ProblemAssignment,
)

from .models import Solution, SolutionEvidence

from .models import DuplicateProblemSuggestion

from .models import ProblemResolutionReview


class ProblemCategorySerializer(serializers.ModelSerializer):

    class Meta:
        model = ProblemCategory
        fields = [
            "id",
            "name",
            "description",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
        ]



class ProblemAttachmentSerializer(serializers.ModelSerializer):
    file = serializers.SerializerMethodField()

    class Meta:
        model = ProblemAttachment
        fields = [
            "id",
            "file",
            "uploaded_at",
        ]
        read_only_fields = [
            "id",
            "uploaded_at",
        ]

    def get_file(self, obj):
        if not obj.file:
            return None

        request = self.context.get("request")
        file_url = obj.file.url

        if request:
            return request.build_absolute_uri(file_url)

        return file_url



class CoordinateField(serializers.DecimalField):
    """
    Safely rounds latitude/longitude coordinates to 6 decimal places (~0.1m precision)
    so browser GPS values with high floating-point precision never exceed 10 digits in total.
    """
    def __init__(self, **kwargs):
        kwargs.setdefault("max_digits", 10)
        kwargs.setdefault("decimal_places", 7)
        kwargs.setdefault("required", False)
        kwargs.setdefault("allow_null", True)
        super().__init__(**kwargs)

    def to_internal_value(self, data):
        if data is None or data == "":
            return None
        try:
            val = round(float(data), 6)
            return super().to_internal_value(f"{val:.6f}")
        except (ValueError, TypeError):
            return super().to_internal_value(data)


class ProblemSerializer(serializers.ModelSerializer):

    problem_code = serializers.UUIDField(read_only=True)

    reported_by = serializers.SerializerMethodField()

    latitude = CoordinateField()
    longitude = CoordinateField()

    category_details = ProblemCategorySerializer(
        source="category",
        read_only=True
    )

    attachments = ProblemAttachmentSerializer(
        many=True,
        read_only=True
    )

    class Meta:
        model = Problem

        fields = [
            "id",
            "problem_code",
            "title",
            "description",
            "category",
            "category_details",
            "reported_by",
            "location",
            "latitude",
            "longitude",
            "priority",
            "status",
            "resolution_notes",
            "resolved_at",
            "attachments",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "problem_code",
            "reported_by",
            "status",
            "resolution_notes",
            "resolved_at",
            "attachments",
            "created_at",
            "updated_at",
        ]

        assignment_details = serializers.SerializerMethodField()

    def get_assignment_details(self, obj):

        assignment = next(iter(obj.assignments.all()), None)

        if assignment is None:
          return None

        return {
        "organization_id": assignment.organization_id,
        "organization_name": (
            assignment.organization.organization_name
        ),
        "status": assignment.status,
        "assigned_at": assignment.assigned_at,
    }

    def get_reported_by(self, obj):

        return {
            "id": obj.reported_by.id,
            "full_name": obj.reported_by.full_name,
            "email": obj.reported_by.email,
        }

    def validate_title(self, value):

        value = value.strip()

        if len(value) < 5:
            raise serializers.ValidationError(
                "Problem title must contain at least 5 characters."
            )

        return value

    def validate_description(self, value):

        value = value.strip()

        if len(value) < 10:
            raise serializers.ValidationError(
                "Problem description must contain at least 10 characters."
            )

        return value

    def validate_location(self, value):

        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Location is required."
            )

        return value

    def validate_category(self, value):

        if not value.is_active:
            raise serializers.ValidationError(
                "This problem category is currently inactive."
            )

        return value

    def validate_latitude(self, value):

        if value is not None and (
            value < -90 or value > 90
        ):
            raise serializers.ValidationError(
                "Latitude must be between -90 and 90."
            )

        return value

    def validate_longitude(self, value):

        if value is not None and (
            value < -180 or value > 180
        ):
            raise serializers.ValidationError(
                "Longitude must be between -180 and 180."
            )

        return value


class ProblemCreateSerializer(ProblemSerializer):

    class Meta(ProblemSerializer.Meta):

        read_only_fields = [
            "id",
            "problem_code",
            "reported_by",
            "status",
            "resolution_notes",
            "resolved_at",
            "attachments",
            "created_at",
            "updated_at",
        ]
    
    def validate(self, attrs):
        latitude = attrs.get('latitude')
        longitude = attrs.get('longitude')
        if (latitude is None) != (longitude is None):
            raise serializers.ValidationError({
                'latitude': 'Latitude and longitude must be provided together.',
                'longitude': 'Latitude and longitude must be provided together.'
            })
        return attrs


class BrowseProblemSerializer(serializers.ModelSerializer):
    support_count = serializers.IntegerField(read_only=True)
    has_supported = serializers.BooleanField(read_only=True)
    category_details = ProblemCategorySerializer(
        source="category",
        read_only=True,
    )

    attachments = ProblemAttachmentSerializer(
        many=True,
        read_only=True,
    )

    class Meta:
        model = Problem
        fields = [
            "id",
            "problem_code",
            "title",
            "description",
            "category",
            "category_details",
            "location",
            "latitude",
            "longitude",
            "priority",
            "status",
            "resolution_notes",
            "resolved_at",
            "attachments",
            "support_count",
            "has_supported",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields



class ProblemAttachmentCreateSerializer(
    serializers.ModelSerializer
):

    class Meta:
        model = ProblemAttachment

        fields = [
            "id",
            "problem",
            "file",
            "uploaded_at",
        ]

        read_only_fields = [
            "id",
            "uploaded_at",
        ]


class ProblemAssignmentSerializer(serializers.ModelSerializer):

    organization_details = serializers.SerializerMethodField()
    assigned_by_details = serializers.SerializerMethodField()

    class Meta:
        model = ProblemAssignment

        fields = [
            "id",
            "problem",
            "organization",
            "organization_details",
            "assigned_by",
            "assigned_by_details",
            "status",
            "assigned_at",
            "accepted_at",
            "completed_at",
            "notes",
        ]

        read_only_fields = [
            "id",
            "assigned_by",
            "assigned_at",
            "accepted_at",
            "completed_at",
        ]

    def get_organization_details(self, obj):

        return {
            "id": obj.organization.id,
            "organization_name": obj.organization.organization_name,
            "email": obj.organization.email,
            "status": obj.organization.status,
        }

    def get_assigned_by_details(self, obj):

        return {
            "id": obj.assigned_by.id,
            "full_name": obj.assigned_by.full_name,
            "email": obj.assigned_by.email,
        }


class AdminProblemSerializer(serializers.ModelSerializer):

    category_details = ProblemCategorySerializer(
        source="category",
        read_only=True
    )

    reported_by = serializers.SerializerMethodField()

    attachments = ProblemAttachmentSerializer(
        many=True,
        read_only=True
    )

    assignments = ProblemAssignmentSerializer(
        many=True,
        read_only=True
    )

    class Meta:
        model = Problem

        fields = [
            "id",
            "problem_code",
            "title",
            "description",
            "category",
            "category_details",
            "reported_by",
            "location",
            "latitude",
            "longitude",
            "priority",
            "status",
            "resolution_notes",
            "resolved_at",
            "attachments",
            "assignments",
            "created_at",
            "updated_at",
        ]

    def get_reported_by(self, obj):

        return {
            "id": obj.reported_by.id,
            "full_name": obj.reported_by.full_name,
            "email": obj.reported_by.email,
            "phone": obj.reported_by.phone,
        }


class DuplicateProblemSuggestionSerializer(serializers.ModelSerializer):
    new_problem = AdminProblemSerializer(read_only=True)
    similar_problem = AdminProblemSerializer(read_only=True)

    reviewed_by_email = serializers.EmailField(
        source="reviewed_by.email",
        read_only=True,
        allow_null=True,
    )

    class Meta:
        model = DuplicateProblemSuggestion
        fields = [
            "id",
            "new_problem",
            "similar_problem",
            "similarity_score",
            "ai_reason",
            "review_status",
            "reviewed_by",
            "reviewed_by_email",
            "reviewed_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class DuplicateProblemReviewSerializer(serializers.Serializer):
    review_status = serializers.ChoiceField(
        choices=["accepted", "rejected"]
    )


from .models import ProblemDraft, DraftAttachment


class DraftAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = DraftAttachment
        fields = ["id", "file", "uploaded_at"]
        read_only_fields = ["id", "uploaded_at"]


class ProblemDraftSerializer(serializers.ModelSerializer):
    attachments = DraftAttachmentSerializer(many=True, read_only=True)
    latitude = CoordinateField()
    longitude = CoordinateField()

    class Meta:
        model = ProblemDraft
        fields = [
            "id",
            "title",
            "description",
            "category",
            "location",
            "latitude",
            "longitude",
            "priority",
            "attachments",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "attachments",
            "created_at",
            "updated_at",
        ]

    def validate_title(self, value):
        value = value.strip()
        if value and len(value) < 5:
            raise serializers.ValidationError(
                "Problem title must contain at least 5 characters."
            )
        return value

    def validate_description(self, value):
        value = value.strip()
        if value and len(value) < 10:
            raise serializers.ValidationError(
                "Problem description must contain at least 10 characters."
            )
        return value

    def validate_location(self, value):
        return value.strip()

    def validate_category(self, value):
        if value is not None and not value.is_active:
            raise serializers.ValidationError(
                "This problem category is currently inactive."
            )
        return value

    def validate(self, attrs):
        latitude = attrs.get(
            "latitude",
            getattr(self.instance, "latitude", None),
        )
        longitude = attrs.get(
            "longitude",
            getattr(self.instance, "longitude", None),
        )

        if (latitude is None) != (longitude is None):
            raise serializers.ValidationError({
                "latitude": (
                    "Latitude and longitude must be supplied together."
                )
            })

        return attrs

from rest_framework import serializers
from .models import ProblemDiscussion
from accounts.models import User
from organizations.models import Organization


class ProblemDiscussionSerializer(serializers.ModelSerializer):
    author_type = serializers.SerializerMethodField()
    author_name = serializers.SerializerMethodField()

    class Meta:
        model = ProblemDiscussion
        fields = [
            "id",
            "problem",
            "parent",
            "message",
            "author_type",
            "author_name",
            "is_hidden",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "problem",
            "author_type",
            "author_name",
            "is_hidden",
            "created_at",
            "updated_at",
        ]

    def get_author_type(self, obj):
        if obj.author_organization_id:
            return "organization"

        if obj.author_user and obj.author_user.role == "admin":
            return "admin"

        return "citizen"

    def get_author_name(self, obj):
        if obj.author_organization_id:
            return obj.author_organization.organization_name

        if obj.author_user:
            return (
                getattr(obj.author_user, "full_name", None)
                or obj.author_user.email
            )

        return "Unknown author"

    def validate_message(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "A discussion message cannot be empty."
            )

        if len(value) > 10000:
            raise serializers.ValidationError(
                "A discussion message cannot exceed 10,000 characters."
            )

        return value

    def validate_parent(self, parent):
        problem = self.context.get("problem")

        if parent:
            if problem and parent.problem_id != problem.id:
                raise serializers.ValidationError(
                    "The reply must belong to the same problem."
                )

            if parent.is_hidden:
                raise serializers.ValidationError(
                    "You cannot reply to a hidden message."
                )

        return parent


class OrganizationSolutionCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Solution
        fields = [
            "id",
            "title",
            "description",
            "proposed_action",
        ]
        read_only_fields = ["id"]

    def validate_title(self, value):
        value = value.strip()
        if len(value) < 5:
            raise serializers.ValidationError(
                "Solution title must contain at least 5 characters."
            )
        return value

    def validate_description(self, value):
        value = value.strip()
        if len(value) < 10:
            raise serializers.ValidationError(
                "Solution description must contain at least 10 characters."
            )
        return value

    def validate_proposed_action(self, value):
        return value.strip()

    def create(self, validated_data):
        # These values must come from the authenticated API view,
        # not from user-supplied request fields.
        problem = self.context["problem"]
        assignment = self.context["assignment"]
        organization = self.context["organization"]
        submitted_by = self.context["submitted_by"]

        return Solution.objects.create(
            problem=problem,
            assignment=assignment,
            organization=organization,
            submitted_by=submitted_by,
            status="pending",
            **validated_data,
        )


class SolutionEvidenceSerializer(serializers.ModelSerializer):
    file = serializers.SerializerMethodField()

    class Meta:
        model = SolutionEvidence
        fields = [
            "id",
            "solution",
            "evidence_type",
            "file",
            "caption",
            "uploaded_by",
            "uploaded_at",
        ]
        read_only_fields = fields

    def get_file(self, obj):
        if not obj.file:
            return None

        request = self.context.get("request")
        url = obj.file.url

        return request.build_absolute_uri(url) if request else url

from rest_framework import serializers


class OrganizationSolutionSubmitRequestSerializer(serializers.Serializer):
    assignment_id = serializers.IntegerField(min_value=1)
    title = serializers.CharField(max_length=200)
    description = serializers.CharField()
    proposed_action = serializers.CharField(
        required=False,
        allow_blank=True,
        default="",
    )

class CitizenResolutionReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProblemResolutionReview
        fields = [
            "id",
            "solution",
            "decision",
            "feedback",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "solution",
            "created_at",
            "updated_at",
        ]

    def validate_decision(self, value):
        if value not in {"confirmed", "unresolved"}:
            raise serializers.ValidationError(
                "Choose confirmed or unresolved."
            )
        return value

    def validate_feedback(self, value):
        value = value.strip()

        if len(value) > 5000:
            raise serializers.ValidationError(
                "Feedback cannot exceed 5,000 characters."
            )

        return value



class CitizenResolutionSolutionSerializer(serializers.ModelSerializer):
    evidence = SolutionEvidenceSerializer(
        many=True,
        read_only=True,
    )
    citizen_review = serializers.SerializerMethodField()
    organization_name = serializers.SerializerMethodField()

    class Meta:
        model = Solution
        fields = [
            "id",
            "problem",
            "title",
            "description",
            "proposed_action",
            "status",
            "organization_name",
            "evidence",
            "citizen_review",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_organization_name(self, obj):
        if obj.organization:
            return obj.organization.organization_name

        return (
            obj.assignment.organization.organization_name
            if obj.assignment and obj.assignment.organization
            else "Responsible organization"
        )

    def get_citizen_review(self, obj):
        request = self.context.get("request")

        if request is None or not request.user.is_authenticated:
            return None

        review = obj.citizen_reviews.filter(
            citizen=request.user
        ).first()

        if review is None:
            return None

        return CitizenResolutionReviewSerializer(review).data


class CitizenResolutionReviewSubmitSerializer(serializers.Serializer):
    solution_id = serializers.IntegerField(min_value=1)

    decision = serializers.ChoiceField(
        choices=["confirmed", "unresolved"]
    )

    feedback = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=5000,
        trim_whitespace=True,
    )


class AISmartProblemReportingSerializer(serializers.Serializer):
    description = serializers.CharField(
        min_length=10,
        max_length=5000,
        trim_whitespace=True,
        help_text="Describe the community problem in your own words."
    )

    def validate_description(self, value):
        value = value.strip()

        if len(value) < 10:
            raise serializers.ValidationError(
                "Please provide a little more detail about the problem."
            )

        return value

class CivicAssistantRequestSerializer(serializers.Serializer):
    message = serializers.CharField(
        min_length=2,
        max_length=1000,
        trim_whitespace=True,
        help_text="Ask a question about CivicSolve.",
    )

    def validate_message(self, value):
        value = value.strip()
        if len(value) < 2:
            raise serializers.ValidationError(
                "Please enter a question with at least 2 characters."
            )
        return value
