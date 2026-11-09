
import json
import logging
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from django.conf import settings

from .ollama_client import get_ollama_headers

logger = logging.getLogger(__name__)


class AIServiceError(Exception):
    """Raised when local AI suggestions cannot be generated."""


def generate_problem_suggestions(description, category_names):
    """
    Generate AI-powered problem reporting suggestions using local Ollama.
    This function does not create or update database records.
    """

    if not description or not description.strip():
        raise ValueError("Problem description is required.")

    if not category_names:
        raise AIServiceError("No problem categories are available.")

    base_url = getattr(
        settings,
        "OLLAMA_BASE_URL",
        "http://localhost:11434"
    ).rstrip("/")

    model = getattr(
        settings,
        "OLLAMA_MODEL",
        "qwen2.5:1.5b"
    )

    schema = {
        "type": "object",
        "properties": {
            "title": {"type": "string"},
            "description": {"type": "string"},
            "category": {
                "type": "string",
                "enum": category_names + [""]
            },
            "priority": {
                "type": "string",
                "enum": ["low", "medium", "high", "urgent"]
            },
            "reason": {"type": "string"},
            "missing_details": {
                "type": "array",
                "items": {"type": "string"}
            },
            "clarification_questions": {
                "type": "array",
                "items": {"type": "string"}
            }
        },
        "required": [
            "title",
            "description",
            "category",
            "priority",
            "reason",
            "missing_details",
            "clarification_questions"
        ],
        "additionalProperties": False
    }

    system_prompt = f"""
You are CivicSolve's AI assistant for community problem reporting.

Understand the citizen's description and generate useful,
editable suggestions for a community problem report.

Available categories:
{json.dumps(category_names)}

Rules:
1. Create a short, clear title.
2. Rewrite the description in simple, professional language.
3. Preserve the original meaning.
4. Never invent facts, locations, dates or evidence.
5. Select only from the available categories.
6. If no category matches, return an empty category.
7. Select priority based on actual impact and urgency.
8. Do not classify ordinary problems as urgent.
9. Explain the reason for your category and priority.
10. Identify useful missing information.
11. Ask relevant clarification questions when needed.
12. Return only valid structured JSON matching the schema.
"""

    payload = {
        "model": model,
        "stream": False,
        "format": schema,
        "messages": [
            {
                "role": "system",
                "content": system_prompt
            },
            {
                "role": "user",
                "content": description.strip()
            }
        ],
        "options": {
            "temperature": 0.2
        }
    }

    request = Request(
        url=f"{base_url}/api/chat",
        data=json.dumps(payload).encode("utf-8"),
        headers=get_ollama_headers(),
        method="POST"
    )

    try:
        with urlopen(request, timeout=120) as response:
            response_data = json.loads(
                response.read().decode("utf-8")
            )

        content = response_data.get(
            "message", {}
        ).get("content", "")

        if not content:
            raise AIServiceError(
                "The local AI returned an empty response."
            )

        result = json.loads(content)

        required_fields = [
            "title",
            "description",
            "category",
            "priority",
            "reason",
            "missing_details",
            "clarification_questions"
        ]

        if not all(field in result for field in required_fields):
            raise AIServiceError(
                "The local AI returned an incomplete response."
            )

        if result["category"] not in category_names and result["category"] != "":
            result["category"] = ""

        if result["priority"] not in [
            "low", "medium", "high", "urgent"
        ]:
            result["priority"] = "medium"

        for field in [
            "title",
            "description",
            "reason"
        ]:
            if not isinstance(result[field], str):
                raise AIServiceError(
                    "The local AI returned an invalid response."
                )

        for field in [
            "missing_details",
            "clarification_questions"
        ]:
            if not isinstance(result[field], list):
                raise AIServiceError(
                    "The local AI returned an invalid response."
                )

        return result

    except HTTPError as exc:
        logger.exception("Ollama HTTP request failed.")
        raise AIServiceError(
            "Unable to communicate with the local AI model."
        ) from exc

    except URLError as exc:
        logger.exception("Ollama connection failed.")
        raise AIServiceError(
            "Local AI is unavailable. Please make sure Ollama is running."
        ) from exc

    except (json.JSONDecodeError, TimeoutError) as exc:
        logger.exception("Ollama returned an invalid response or timed out.")
        raise AIServiceError(
            "The local AI could not generate a valid response."
        ) from exc

    except AIServiceError:
        raise

    except Exception as exc:
        logger.exception("Unexpected local AI service error.")
        raise AIServiceError(
            "Something went wrong while generating suggestions."
        ) from exc
