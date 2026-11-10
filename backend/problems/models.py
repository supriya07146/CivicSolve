
import uuid

from django.db import models
from django.core.exceptions import ValidationError


class ProblemCategory(models.Model):
    name = models.CharField(
        max_length=100,
        unique=True
    )

    description = models.TextField(
        blank=True,
        default=""
    )

    is_active = models.BooleanField(
        default=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    class Meta:
        db_table = "problem_categories"
        ordering = ["name"]
        verbose_name = "Problem Category"
        verbose_name_plural = "Problem Categories"

    def __str__(self):
        return self.name


class Problem(models.Model):

    PRIORITY_CHOICES = [
        ("low", "Low"),
        ("medium", "Medium"),
        ("high", "High"),
        ("urgent", "Urgent"),
    ]

    STATUS_CHOICES = [
        ("open", "Open"),
        ("under_review", "Under Review"),
        ("assigned", "Assigned"),
        ("in_progress", "In Progress"),
        ("resolved", "Resolved"),
        ("rejected", "Rejected"),
        ("closed", "Closed"),
    ]

    # Public reference number
    problem_code = models.UUIDField(
        default=uuid.uuid4,
        unique=True,
        editable=False,
        db_index=True
    )

    title = models.CharField(
        max_length=200
    )

    description = models.TextField()

    category = models.ForeignKey(
        ProblemCategory,
        on_delete=models.PROTECT,
        related_name="problems"
    )

    reported_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.CASCADE,
        related_name="reported_problems"
    )

    location = models.CharField(
        max_length=255
    )

    latitude = models.DecimalField(
        max_digits=10,
        decimal_places=7,
        null=True,
        blank=True
    )

    longitude = models.DecimalField(
        max_digits=10,
        decimal_places=7,
        null=True,
        blank=True
    )

    priority = models.CharField(
        max_length=20,
        choices=PRIORITY_CHOICES,
        default="medium"
    )

    status = models.CharField(
        max_length=30,
        choices=STATUS_CHOICES,
        default="open"
    )

    resolution_notes = models.TextField(
        blank=True,
        default=""
    )

    resolved_at = models.DateTimeField(
        null=True,
        blank=True
    )

    # Manual escalation tracking for Analytics
    is_escalated = models.BooleanField(
        default=False,
        db_index=True
    )

    escalated_at = models.DateTimeField(
        null=True,
        blank=True
    )

    escalated_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="escalated_problems"
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    class Meta:
        db_table = "problems"
        ordering = ["-created_at"]

        indexes = [
            models.Index(
                fields=["status"]
            ),
            models.Index(
                fields=["category"]
            ),
            models.Index(
                fields=["reported_by"]
            ),
            models.Index(
                fields=["priority"]
            ),
            models.Index(
                fields=["created_at"]
            ),
        ]

    def __str__(self):
        return f"{self.problem_code} - {self.title}"


class ProblemSupport(models.Model):
    problem = models.ForeignKey(
        Problem,
        on_delete=models.CASCADE,
        related_name="supports",
    )
    user = models.ForeignKey(
        "accounts.User",
        on_delete=models.CASCADE,
        related_name="problem_supports",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "problem_supports"
        constraints = [
            models.UniqueConstraint(
                fields=["problem", "user"],
                name="unique_problem_support_per_user",
            ),
        ]
        indexes = [
            models.Index(
                fields=["problem", "created_at"],
                name="problem_support_date_idx",
            ),
        ]

    def __str__(self):
        return f"Support for {self.problem.problem_code} by {self.user_id}"


class ProblemAttachment(models.Model):

    problem = models.ForeignKey(
        Problem,
        on_delete=models.CASCADE,
        related_name="attachments"
    )

    file = models.FileField(
        upload_to="problem_attachments/"
    )

    uploaded_at = models.DateTimeField(
        auto_now_add=True
    )

    class Meta:
        db_table = "problem_attachments"
        ordering = ["-uploaded_at"]

    def __str__(self):
        return f"Attachment for {self.problem.problem_code}"


class DuplicateProblemSuggestion(models.Model):
    """
    Stores AI-detected possible duplicates for administrator review.

    Both original problem records remain independent.
    Reviewing a suggestion never merges or deletes problems.
    """

    REVIEW_STATUS_CHOICES = [
        ("pending", "Pending Review"),
        ("accepted", "Accepted as Similar"),
        ("rejected", "Not a Duplicate"),
    ]

    # The newly submitted problem.
    new_problem = models.ForeignKey(
        "problems.Problem",
        on_delete=models.CASCADE,
        related_name="duplicate_suggestions_received",
    )

    # An existing problem that may describe the same issue.
    similar_problem = models.ForeignKey(
        "problems.Problem",
        on_delete=models.CASCADE,
        related_name="duplicate_suggestions_matched",
    )

    similarity_score = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        help_text="AI-estimated similarity score from 0 to 100.",
    )

    ai_reason = models.TextField(
        blank=True,
        default="",
        help_text="Explanation of why these reports may be similar.",
    )

    review_status = models.CharField(
        max_length=20,
        choices=REVIEW_STATUS_CHOICES,
        default="pending",
        db_index=True,
    )

    reviewed_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_duplicate_suggestions",
    )

    reviewed_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        db_table = "duplicate_problem_suggestions"
        ordering = ["-created_at"]

        constraints = [
            models.UniqueConstraint(
                fields=["new_problem", "similar_problem"],
                name="unique_duplicate_problem_pair",
            ),
            models.CheckConstraint(
                condition=~models.Q(
                    new_problem=models.F("similar_problem")
                ),
                name="duplicate_problems_must_be_different",
            ),
            models.CheckConstraint(
                condition=(
                    models.Q(similarity_score__gte=0)
                    & models.Q(similarity_score__lte=100)
                ),
                name="duplicate_similarity_score_valid",
            ),
        ]

        indexes = [
            models.Index(
                fields=["review_status", "created_at"],
                name="duplicate_review_date_idx",
            ),
            models.Index(
                fields=["new_problem"],
                name="duplicate_new_problem_idx",
            ),
            models.Index(
                fields=["similar_problem"],
                name="duplicate_match_problem_idx",
            ),
        ]

    def __str__(self):
        return (
            f"Possible duplicate: Problem #{self.new_problem_id} "
            f"and Problem #{self.similar_problem_id}"
        )


class ProblemAssignment(models.Model):

    STATUS_CHOICES = [
        ("assigned", "Assigned"),
        ("accepted", "Accepted"),
        ("in_progress", "In Progress"),
        ("completed", "Completed"),
        ("cancelled", "Cancelled"),
    ]

    problem = models.ForeignKey(
        Problem,
        on_delete=models.CASCADE,
        related_name="assignments"
    )

    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.PROTECT,
        related_name="problem_assignments"
    )

    assigned_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.PROTECT,
        related_name="created_problem_assignments"
    )

    status = models.CharField(
        max_length=30,
        choices=STATUS_CHOICES,
        default="assigned"
    )

    assigned_at = models.DateTimeField(
        auto_now_add=True
    )

    accepted_at = models.DateTimeField(
        null=True,
        blank=True
    )

    completed_at = models.DateTimeField(
        null=True,
        blank=True
    )

    notes = models.TextField(
        blank=True,
        default=""
    )

    class Meta:
        db_table = "problem_assignments"
        ordering = ["-assigned_at"]

        indexes = [
            models.Index(
                fields=["problem"]
            ),
            models.Index(
                fields=["organization"]
            ),
            models.Index(
                fields=["status"]
            ),
            models.Index(
                fields=["assigned_at"]
            ),
        ]

    def __str__(self):
        return (
            f"{self.problem.problem_code} → "
            f"{self.organization.organization_name}"
        )


class Solution(models.Model):

    STATUS_CHOICES = [
        ("pending", "Pending Review"),
        ("approved", "Approved"),
        ("changes_requested", "Changes Requested"),
        ("rejected", "Rejected"),
    ]

    problem = models.ForeignKey(
        Problem,
        on_delete=models.CASCADE,
        related_name="solutions"
    )

    assignment = models.ForeignKey(
        ProblemAssignment,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="solutions"
    )

    submitted_by = models.ForeignKey(
    "accounts.User",
    on_delete=models.PROTECT,
    null=True,
    blank=True,
    related_name="submitted_solutions"
)

    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="submitted_solutions"
    )

    title = models.CharField(
        max_length=200
    )

    description = models.TextField()

    proposed_action = models.TextField(
        blank=True,
        default=""
    )

    status = models.CharField(
        max_length=30,
        choices=STATUS_CHOICES,
        default="pending",
        db_index=True
    )

    admin_review_notes = models.TextField(
        blank=True,
        default=""
    )

    reviewed_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_solutions"
    )

    reviewed_at = models.DateTimeField(
        null=True,
        blank=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    class Meta:
        db_table = "problem_solutions"
        ordering = ["-created_at"]

        indexes = [
            models.Index(
                fields=["problem", "status"]
            ),
            models.Index(
                fields=["organization", "status"]
            ),
            models.Index(
                fields=["created_at"]
            ),
        ]

    def __str__(self):
        return f"{self.title} - {self.status}"


class Complaint(models.Model):

    TARGET_CHOICES = [
        ("problem", "Community Problem"),
        ("organization", "Organization"),
        ("problem_handling", "Handling of a Problem"),
    ]

    STATUS_CHOICES = [
        ("submitted", "Submitted"),
        ("under_review", "Under Review"),
        ("investigating", "Investigating"),
        ("resolved", "Resolved"),
        ("rejected", "Rejected"),
    ]

    complaint_code = models.UUIDField(
        default=uuid.uuid4,
        unique=True,
        editable=False,
        db_index=True
    )

    # Exactly one of these identifies the complainant.
    submitted_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="submitted_complaints"
    )

    submitted_by_organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="submitted_complaints"
    )

    target_type = models.CharField(
        max_length=30,
        choices=TARGET_CHOICES,
        db_index=True
    )

    # Used when the complaint concerns a problem or its handling.
    problem = models.ForeignKey(
        "problems.Problem",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="complaints"
    )

    # Used when the complaint concerns an organization.
    target_organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="received_complaints"
    )

    title = models.CharField(
        max_length=200
    )

    description = models.TextField()

    status = models.CharField(
        max_length=30,
        choices=STATUS_CHOICES,
        default="submitted",
        db_index=True
    )

    admin_investigation_notes = models.TextField(
        blank=True,
        default=""
    )

    resolution_notes = models.TextField(
        blank=True,
        default=""
    )

    reviewed_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_complaints"
    )

    reviewed_at = models.DateTimeField(
        null=True,
        blank=True
    )

    resolved_at = models.DateTimeField(
        null=True,
        blank=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    class Meta:
        db_table = "complaints"
        ordering = ["-created_at"]

        indexes = [
            models.Index(
                fields=["status", "created_at"]
            ),
            models.Index(
                fields=["submitted_by", "status"]
            ),
            models.Index(
                fields=["submitted_by_organization", "status"]
            ),
        ]

    def clean(self):
        super().clean()

        if bool(self.submitted_by_id) == bool(
            self.submitted_by_organization_id
        ):
            raise ValidationError(
                "A complaint must have exactly one complainant: "
                "a citizen or an organization."
            )

        if self.target_type in ("problem", "problem_handling"):
            if not self.problem_id:
                raise ValidationError({
                    "problem": (
                        "A problem must be selected for this "
                        "complaint type."
                    )
                })

        if self.target_type == "organization":
            if not self.target_organization_id:
                raise ValidationError({
                    "target_organization": (
                        "Select the organization being complained about."
                    )
                })

    def __str__(self):
        return f"{self.complaint_code} - {self.title}"



class ProblemDraft(models.Model):
    """
    Stores an unfinished citizen report separately from official problems.
    """

    reported_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.CASCADE,
        related_name="problem_drafts",
    )

    title = models.CharField(
        max_length=200,
        blank=True,
        default="",
    )

    description = models.TextField(
        blank=True,
        default="",
    )

    category = models.ForeignKey(
        ProblemCategory,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="problem_drafts",
    )

    location = models.CharField(
        max_length=255,
        blank=True,
        default="",
    )

    latitude = models.DecimalField(
        max_digits=10,
        decimal_places=7,
        null=True,
        blank=True,
    )

    longitude = models.DecimalField(
        max_digits=10,
        decimal_places=7,
        null=True,
        blank=True,
    )

    priority = models.CharField(
        max_length=20,
        choices=Problem.PRIORITY_CHOICES,
        default="medium",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "problem_drafts"
        ordering = ["-updated_at"]
        indexes = [
            models.Index(fields=["reported_by", "updated_at"]),
        ]

    def __str__(self):
        return f"Draft {self.pk} - {self.reported_by_id}"


class DraftAttachment(models.Model):
    """Evidence uploaded to an unfinished report."""

    draft = models.ForeignKey(
        ProblemDraft,
        on_delete=models.CASCADE,
        related_name="attachments",
    )

    file = models.FileField(
        upload_to="problem_drafts/",
    )

    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "problem_draft_attachments"
        ordering = ["-uploaded_at"]

    def __str__(self):
        return f"Attachment for draft {self.draft_id}"


class ProblemDiscussion(models.Model):
    """
    A discussion message attached to an existing community problem.
    Supports citizen, organization, and admin authors, with replies.
    """

    problem = models.ForeignKey(
        "problems.Problem",
        on_delete=models.CASCADE,
        related_name="discussions",
    )

    # A citizen or admin is represented by accounts.User.
    author_user = models.ForeignKey(
        "accounts.User",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="problem_discussions",
    )

    # Organization accounts are stored separately in CivicSolve.
    author_organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="problem_discussions",
    )

    # Null means this is a top-level message.
    parent = models.ForeignKey(
        "self",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="replies",
    )

    message = models.TextField()

    # Supports future admin moderation without destroying the message.
    is_hidden = models.BooleanField(default=False, db_index=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "problem_discussions"
        ordering = ["created_at", "id"]

        indexes = [
            models.Index(
                fields=["problem", "created_at"],
                name="disc_problem_created_idx",
            ),
            models.Index(
                fields=["author_user", "created_at"],
                name="disc_user_created_idx",
            ),
            models.Index(
                fields=["author_organization", "created_at"],
                name="disc_org_created_idx",
            ),
        ]

    def clean(self):
        from django.core.exceptions import ValidationError

        super().clean()

        # Every message must have exactly one author.
        if bool(self.author_user_id) == bool(
            self.author_organization_id
        ):
            raise ValidationError(
                "A discussion message must have exactly one author."
            )

        # A reply must belong to the same problem as its parent.
        if self.parent_id and self.problem_id:
            if self.parent.problem_id != self.problem_id:
                raise ValidationError({
                    "parent": (
                        "A reply must belong to the same problem "
                        "as its parent message."
                    )
                })

        # Prevent replying to a hidden message.
        if self.parent_id and self.parent.is_hidden:
            raise ValidationError({
                "parent": "You cannot reply to a hidden message."
            })

    def __str__(self):
        return (
            f"Discussion #{self.pk} "
            f"for problem #{self.problem_id}"
        )


class SolutionEvidence(models.Model):
    EVIDENCE_TYPES = [
        ("before", "Before Resolution"),
        ("after", "After Resolution"),
    ]

    solution = models.ForeignKey(
        Solution,
        on_delete=models.CASCADE,
        related_name="evidence",
    )

    evidence_type = models.CharField(
        max_length=10,
        choices=EVIDENCE_TYPES,
    )

    file = models.ImageField(
        upload_to="solution_evidence/",
    )

    caption = models.CharField(
        max_length=500,
        blank=True,
        default="",
    )

    uploaded_by = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.PROTECT,
        related_name="uploaded_solution_evidence",
    )

    uploaded_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        db_table = "solution_evidence"
        ordering = ["uploaded_at", "id"]
        indexes = [
            models.Index(
                fields=["solution", "evidence_type"],
            ),
        ]

    def __str__(self):
        return (
            f"{self.get_evidence_type_display()} "
            f"evidence for solution #{self.solution_id}"
        )


class ProblemResolutionReview(models.Model):
    DECISION_CHOICES = [
        ("confirmed", "Resolution Confirmed"),
        ("unresolved", "Still Unresolved"),
    ]

    solution = models.ForeignKey(
        Solution,
        on_delete=models.CASCADE,
        related_name="citizen_reviews",
    )

    citizen = models.ForeignKey(
        "accounts.User",
        on_delete=models.PROTECT,
        related_name="resolution_reviews",
    )

    decision = models.CharField(
        max_length=20,
        choices=DECISION_CHOICES,
    )

    feedback = models.TextField(
        blank=True,
        default="",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "problem_resolution_reviews"
        ordering = ["-updated_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["solution", "citizen"],
                name="unique_citizen_solution_review",
            ),
        ]

    def __str__(self):
        return (
            f"Citizen {self.citizen_id} - "
            f"Solution {self.solution_id}: {self.decision}"
        )


class Notification(models.Model):
    TYPE_CHOICES = [
        ("assignment", "New Assignment"),
        ("solution", "Solution Update"),
        ("problem", "Problem Update"),
        ("complaint", "Complaint Update"),
        ("system", "System Notification"),
    ]

    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="notifications",
    )

    problem = models.ForeignKey(
        "problems.Problem",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="notifications",
    )

    assignment = models.ForeignKey(
        "problems.ProblemAssignment",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="notifications",
    )

    notification_type = models.CharField(
        max_length=30,
        choices=TYPE_CHOICES,
        default="system",
    )

    title = models.CharField(max_length=200)
    message = models.TextField()

    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "notifications"
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=["organization", "is_read"],
                name="notif_org_read_idx",
            ),
            models.Index(
                fields=["organization", "created_at"],
                name="notif_org_created_idx",
            ),
        ]

    def __str__(self):
        return f"{self.title} - Organization {self.organization_id}"


class ProblemProgressUpdate(models.Model):
    """
    Records each organization's progress update and optional photo proof.
    Every submission creates a history record.
    """

    assignment = models.ForeignKey(
        ProblemAssignment,
        on_delete=models.CASCADE,
        related_name="progress_updates",
    )

    progress_percentage = models.PositiveSmallIntegerField(
        default=0,
    )

    update_notes = models.TextField()

    evidence = models.ImageField(
        upload_to="problem_progress_evidence/",
        null=True,
        blank=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        db_table = "problem_progress_updates"
        ordering = ["-created_at", "-id"]
        indexes = [
            models.Index(
                fields=["assignment", "-created_at"],
                name="progress_assignment_date_idx",
            ),
        ]

    def clean(self):
        from django.core.exceptions import ValidationError

        super().clean()

        if not 0 <= self.progress_percentage <= 100:
            raise ValidationError({
                "progress_percentage": (
                    "Progress must be between 0 and 100."
                )
            })

    def __str__(self):
        return (
            f"Assignment {self.assignment_id}: "
            f"{self.progress_percentage}%"
        )
