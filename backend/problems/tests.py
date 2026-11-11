import json
from io import BytesIO
from tempfile import TemporaryDirectory
from unittest.mock import Mock, patch

from django.test import TestCase
from django.test import override_settings
from django.core.files.base import ContentFile
from rest_framework.test import APIRequestFactory, force_authenticate

from accounts.models import User
from .models import (
	DraftAttachment,
	ProblemAttachment,
	ProblemCategory,
	ProblemDraft,
	ProblemSupport,
	Problem,
)
from .gemini_client import GeminiAPIError, generate_gemini_text
from .ai_service import generate_problem_suggestions
from .duplicate_detection import _request_ai_comparison
from .ollama_client import get_ollama_headers
from .serializers import ProblemAttachmentSerializer
from .views import (
	BrowseProblemsView,
	ProblemDraftSubmitView,
	ProblemSupportView,
)
from adminpanel.analytics_ai import generate_admin_insights


class ProblemSupportTests(TestCase):
	def setUp(self):
		self.citizen = User.objects.create_user(
			email="citizen@example.com",
			password="TestPassword123!",
			full_name="Test Citizen",
			phone="1234567890",
			role="citizen",
			is_active=True,
			email_verified=True,
		)
		self.other_citizen = User.objects.create_user(
			email="other@example.com",
			password="TestPassword123!",
			full_name="Other Citizen",
			phone="1234567891",
			role="citizen",
			is_active=True,
			email_verified=True,
		)
		category = ProblemCategory.objects.create(name="Road maintenance")
		self.problem = Problem.objects.create(
			title="Broken road surface",
			description="A large pothole is blocking the road.",
			category=category,
			reported_by=self.citizen,
			location="Main Street",
		)
		self.factory = APIRequestFactory()

	def call_support(self, method, user):
		path = f"/api/problems/{self.problem.pk}/support/"
		request = getattr(self.factory, method)(
			path,
			{} if method != "delete" else None,
			format="json",
		)
		force_authenticate(request, user=user)
		return ProblemSupportView.as_view()(
			request,
			problem_id=self.problem.pk,
		)

	def browse(self, user):
		request = self.factory.get(
			"/api/problems/browse/",
			{"sort": "most_supported"},
		)
		force_authenticate(request, user=user)
		return BrowseProblemsView.as_view()(request)

	def test_support_is_saved_once_and_visible_to_all_citizens(self):
		response = self.call_support("put", self.citizen)
		self.assertEqual(response.status_code, 200)
		self.assertEqual(response.data["support_count"], 1)
		self.assertTrue(response.data["has_supported"])

		self.call_support("put", self.citizen)
		self.assertEqual(ProblemSupport.objects.count(), 1)

		citizen_problem = self.browse(self.citizen).data["problems"][0]
		other_problem = self.browse(self.other_citizen).data["problems"][0]
		self.assertEqual(citizen_problem["support_count"], 1)
		self.assertTrue(citizen_problem["has_supported"])
		self.assertEqual(other_problem["support_count"], 1)
		self.assertFalse(other_problem["has_supported"])

	def test_citizen_can_remove_their_support(self):
		self.call_support("put", self.citizen)

		response = self.call_support("delete", self.citizen)

		self.assertEqual(response.status_code, 200)
		self.assertEqual(response.data["support_count"], 0)
		self.assertFalse(response.data["has_supported"])
		self.assertEqual(ProblemSupport.objects.count(), 0)


class OllamaHeadersTests(TestCase):
	@override_settings(OLLAMA_API_KEY="test-key")
	def test_adds_bearer_auth_when_api_key_is_configured(self):
		self.assertEqual(
			get_ollama_headers(),
			{
				"Content-Type": "application/json",
				"Authorization": "Bearer test-key",
			},
		)

	@override_settings(OLLAMA_API_KEY="")
	def test_omits_auth_when_api_key_is_not_configured(self):
		self.assertEqual(
			get_ollama_headers(),
			{"Content-Type": "application/json"},
		)


class GeminiClientTests(TestCase):
	@override_settings(
		GEMINI_API_KEY="test-key",
		GEMINI_MODEL="gemini-test-model",
	)
	@patch("problems.gemini_client.requests.post")
	def test_sends_server_key_and_returns_generated_text(self, post):
		response = Mock()
		response.status_code = 200
		response.json.return_value = {
			"candidates": [{
				"content": {"parts": [{"text": "Hello from Gemini."}]},
			}],
		}
		post.return_value = response

		result = generate_gemini_text("Be helpful.", "Hello")

		self.assertEqual(result, "Hello from Gemini.")
		self.assertEqual(
			post.call_args.kwargs["headers"]["x-goog-api-key"],
			"test-key",
		)
		self.assertTrue(
			post.call_args.args[0].endswith(
				"/models/gemini-test-model:generateContent"
			)
		)

	@override_settings(GEMINI_API_KEY="")
	def test_requires_api_key(self):
		with self.assertRaises(GeminiAPIError):
			generate_gemini_text("Be helpful.", "Hello")


class ProblemSuggestionTests(TestCase):
	@patch("problems.ai_service.generate_gemini_text")
	def test_suggestions_use_gemini_json_response(self, generate_text):
		generate_text.return_value = json.dumps({
			"title": "Broken streetlight",
			"description": "A streetlight is not working.",
			"category": "Lighting",
			"priority": "medium",
			"reason": "A single broken light is a routine issue.",
			"missing_details": [],
			"clarification_questions": [],
		})

		result = generate_problem_suggestions(
			"A streetlight is not working.",
			["Lighting"],
		)

		self.assertEqual(result["category"], "Lighting")
		self.assertEqual(
			generate_text.call_args.kwargs["response_mime_type"],
			"application/json",
		)


class OtherGeminiFeatureTests(TestCase):
	@patch("problems.duplicate_detection.generate_gemini_text")
	def test_duplicate_detection_uses_gemini_json_mode(self, generate_text):
		generate_text.return_value = '{"matches": []}'
		problem = Mock(
			title="Broken streetlight",
			description="A streetlight is not working.",
			location="Main Street",
		)
		problem.category.name = "Lighting"

		result = _request_ai_comparison(problem, [])

		self.assertEqual(result, {"matches": []})
		self.assertEqual(
			generate_text.call_args.kwargs["response_mime_type"],
			"application/json",
		)

	@patch("adminpanel.analytics_ai.generate_gemini_text")
	def test_admin_insights_use_gemini(self, generate_text):
		generate_text.return_value = "Insights summary"

		result = generate_admin_insights({"report_count": 3})

		self.assertEqual(result, "Insights summary")
		self.assertEqual(
			generate_text.call_args.kwargs["temperature"],
			0.1,
		)


class CivicAssistantContextTests(TestCase):
	@patch("problems.civic_assistant.Complaint.objects.filter")
	@patch("problems.civic_assistant.Problem.objects.filter")
	@patch("problems.civic_assistant.ProblemCategory.objects.filter")
	def test_context_excludes_free_text_report_details(
		self,
		category_filter,
		problem_filter,
		complaint_filter,
	):
		from .civic_assistant import _get_relevant_context

		problem = Mock()
		problem.problem_code = "problem-reference"
		problem.category.name = "Roads"
		problem.status = "open"
		problem.created_at.isoformat.return_value = "2026-01-01T00:00:00+00:00"
		problem.resolved_at = None
		problem.assignments.all.return_value = []
		problem.title = "Private report title"
		problem.location = "Private report location"
		problem.resolution_notes = "Private resolution notes"

		complaint = Mock()
		complaint.complaint_code = "complaint-reference"
		complaint.status = "open"
		complaint.target_type = "organization"
		complaint.problem = None
		complaint.target_organization = None
		complaint.title = "Private complaint title"

		category_filter.return_value.order_by.return_value.values_list.return_value = []
		problem_filter.return_value.select_related.return_value.prefetch_related.return_value.order_by.return_value = [problem]
		complaint_filter.return_value.select_related.return_value.order_by.return_value = [complaint]

		context = _get_relevant_context("show my reports", user=Mock())

		problem_context = context["citizen_problem_records"][0]
		complaint_context = context["citizen_complaint_records"][0]
		self.assertNotIn("title", problem_context)
		self.assertNotIn("location", problem_context)
		self.assertNotIn("resolution_notes", problem_context)
		self.assertNotIn("title", complaint_context)


class ProblemAttachmentSerializerTests(TestCase):
	@override_settings(ALLOWED_HOSTS=["backend.example.com"])
	def test_builds_absolute_backend_url_for_attachment(self):
		request = APIRequestFactory().get(
			"/api/problems/my/",
			HTTP_HOST="backend.example.com",
			secure=True,
		)
		serializer = ProblemAttachmentSerializer(
			context={"request": request},
		)
		attachment = Mock()
		attachment.file.url = "/media/problem_attachments/photo.jpg"

		self.assertEqual(
			serializer.get_file(attachment),
			"https://backend.example.com/media/problem_attachments/photo.jpg",
		)


class ProblemDraftSubmitTests(TestCase):
	def test_submission_reuses_draft_evidence_without_copying_it(self):
		with TemporaryDirectory() as media_root:
			with override_settings(MEDIA_ROOT=media_root):
				citizen = User.objects.create_user(
					email="citizen@example.com",
					password="test-password",
					full_name="Test Citizen",
					phone="1234567890",
					role="citizen",
					is_active=True,
					email_verified=True,
				)
				category = ProblemCategory.objects.create(
					name="Road maintenance",
				)
				draft = ProblemDraft.objects.create(
					reported_by=citizen,
					title="Broken road surface",
					description="A large pothole is blocking the road.",
					category=category,
					location="Main Street",
				)
				attachment = DraftAttachment.objects.create(
					draft=draft,
					file=ContentFile(
						b"test image bytes",
						name="evidence.jpg",
					),
				)
				source_name = attachment.file.name

				request = APIRequestFactory().post(
					f"/api/problems/drafts/{draft.pk}/submit/",
					{},
					format="json",
				)
				force_authenticate(request, user=citizen)

				with patch.object(
					attachment.file.storage,
					"open",
					side_effect=AssertionError(
						"Submission should not read or copy evidence."
					),
				):
					with patch("problems.views.detect_duplicate_problems"):
						with patch("problems.views.create_notification"):
							with patch("problems.views.notify_admins"):
								with self.captureOnCommitCallbacks(execute=True):
									response = ProblemDraftSubmitView.as_view()(
										request,
										draft_id=draft.pk,
									)

				self.assertEqual(response.status_code, 201)
				self.assertEqual(
					len(response.data["problem"]["attachments"]),
					1,
				)
				self.assertEqual(
					ProblemDraft.objects.filter(pk=draft.pk).count(),
					0,
				)
				published_attachment = ProblemAttachment.objects.get(
					problem_id=response.data["problem"]["id"],
				)
				self.assertEqual(published_attachment.file.name, source_name)
				self.assertTrue(
					published_attachment.file.storage.exists(
						published_attachment.file.name,
					)
				)
				from config.urls import serve_published_draft_attachment

				file_response = serve_published_draft_attachment(
					APIRequestFactory().get(
						f"/media/{source_name}",
					),
					path=source_name.removeprefix("problem_drafts/"),
				)
				self.assertEqual(file_response.status_code, 200)
				file_response.close()
