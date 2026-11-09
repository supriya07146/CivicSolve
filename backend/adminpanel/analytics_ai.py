# adminpanel/analytics_ai.py

import json

from problems.gemini_client import GeminiAPIError, generate_gemini_text


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

    try:
        return generate_gemini_text(
            system_instruction=system_prompt,
            prompt=(
                "Analyze these verified CivicSolve analytics:\n\n"
                + json.dumps(
                    analytics_data,
                    ensure_ascii=False,
                    default=str,
                )
            ),
            temperature=0.1,
        )
    except GeminiAPIError as exc:
        raise AdminInsightsAIError(
            "The AI service is unavailable."
        ) from exc