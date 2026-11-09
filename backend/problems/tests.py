import json
from unittest.mock import Mock, patch

from django.test import TestCase
from django.test import override_settings
from rest_framework.test import APIRequestFactory

from .gemini_client import GeminiAPIError, generate_gemini_text
from .ai_service import generate_problem_suggestions
from .ollama_client import get_ollama_headers
from .serializers import ProblemAttachmentSerializer


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
