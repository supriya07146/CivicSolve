from unittest.mock import Mock, patch

from django.test import TestCase
from django.test import override_settings

from .gemini_client import GeminiAPIError, generate_gemini_text
from .ollama_client import get_ollama_headers


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
