# adminpanel/analytics_ai.py

import json
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from problems.civic_assistant import (
    OLLAMA_BASE_URL,
    OLLAMA_MODEL,
)


class AdminInsightsAIError(Exception):
    """Raised when AI-powered admin insights cannot be generated."""


def generate_admin_insights(analytics_data):
    """
    Generate an administrative summary using aggregated CivicSolve
    analytics only. No citizen names or personal records are sent.
    """

    system_prompt = """
You are CivicSolve AI Analytics Assistant for administrators.

Your task is to interpret the supplied CivicSolve analytics.

STRICT RULES:
- Use only the statistics provided in the analytics data.
- Never invent numbers, locations, categories, trends, or events.
- Do not claim that a problem will be resolved by a particular date.
- Distinguish reported problems from unresolved problems.
- Identify recurring locations using the supplied report counts.
- Discuss resolution-time trends only when the supplied data supports them.
- Recommend administrative attention based on unresolved reports,
  overdue reports, high-priority reports, and escalations.
- Do not assume that a location needs attention merely because it has
  many reports; consider the unresolved and priority counts too.
- If data is insufficient, clearly state that.
- Do not invent causes for recurring problems.
- Keep recommendations practical and concise.
- Use clear headings and bullet points.
- Do not output JSON. Return a readable administrator-facing report.
"""

    payload = {
        "model": OLLAMA_MODEL,
        "stream": False,
        "messages": [
            {
                "role": "system",
                "content": system_prompt,
            },
            {
                "role": "user",
                "content": (
                    "Analyze these verified CivicSolve analytics:\n\n"
                    + json.dumps(
                        analytics_data,
                        ensure_ascii=False,
                        default=str,
                    )
                ),
            },
        ],
        "options": {
            "temperature": 0.1,
        },
    }

    request = Request(
        f"{OLLAMA_BASE_URL}/api/chat",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urlopen(request, timeout=45) as response:
            result = json.loads(
                response.read().decode("utf-8")
            )

        answer = (
            result.get("message", {}).get("content", "")
            if isinstance(result, dict)
            else ""
        )

        answer = answer.strip()

        if not answer:
            raise AdminInsightsAIError(
                "The AI returned an empty response."
            )

        return answer

    except HTTPError as exc:
        print(
            f"[CivicSolve Admin Insights] Ollama HTTP error "
            f"{exc.code}: "
            f"{exc.read().decode('utf-8', errors='replace')}",
            flush=True,
        )

        raise AdminInsightsAIError(
            "The AI service returned an error."
        ) from exc

    except (
        URLError,
        TimeoutError,
        OSError,
        json.JSONDecodeError,
    ) as exc:
        print(
            f"[CivicSolve Admin Insights] "
            f"AI connection error: {type(exc).__name__}: {exc}",
            flush=True,
        )

        raise AdminInsightsAIError(
            "Could not connect to the AI service."
        ) from exc