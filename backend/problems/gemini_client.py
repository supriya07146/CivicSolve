import logging

import requests
from django.conf import settings


logger = logging.getLogger(__name__)


class GeminiAPIError(Exception):
    """Raised when Gemini cannot generate a response."""


def generate_gemini_text(
    system_instruction,
    prompt,
    temperature=0.1,
    response_mime_type=None,
):
    api_key = getattr(settings, "GEMINI_API_KEY", "")
    model = getattr(settings, "GEMINI_MODEL", "gemini-3.5-flash-lite")

    if not api_key:
        logger.error("Gemini API key is missing; configure GEMINI_API_KEY.")
        raise GeminiAPIError("The Gemini API key is not configured.")

    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"{model}:generateContent"
    )
    generation_config = {"temperature": temperature}
    if response_mime_type:
        generation_config["responseMimeType"] = response_mime_type

    payload = {
        "systemInstruction": {
            "parts": [{"text": system_instruction}],
        },
        "contents": [{
            "role": "user",
            "parts": [{"text": prompt}],
        }],
        "generationConfig": generation_config,
    }

    try:
        response = requests.post(
            url,
            json=payload,
            headers={
                "Content-Type": "application/json",
                "x-goog-api-key": api_key,
            },
            timeout=45,
        )
        if response.status_code >= 400:
            logger.error(
                "Gemini API returned HTTP %s for model %s: %s",
                response.status_code,
                model,
                response.text[:1000],
            )
        response.raise_for_status()
        data = response.json()
        answer = "".join(
            part.get("text", "")
            for candidate in data.get("candidates", [])[:1]
            for part in candidate.get("content", {}).get("parts", [])
        ).strip()

        if not answer:
            raise GeminiAPIError("Gemini returned an empty response.")

        return answer

    except requests.RequestException as exc:
        logger.exception("Gemini API request failed.")
        raise GeminiAPIError(
            "Could not connect to the Gemini AI service."
        ) from exc
    except (ValueError, TypeError, AttributeError) as exc:
        logger.exception("Gemini returned an invalid response.")
        raise GeminiAPIError(
            "Gemini returned an invalid response."
        ) from exc