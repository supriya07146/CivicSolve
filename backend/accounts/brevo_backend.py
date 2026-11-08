import requests
from email.utils import parseaddr

from django.conf import settings
from django.core.mail.backends.base import BaseEmailBackend


class BrevoEmailBackend(BaseEmailBackend):
    """Send Django emails through Brevo's HTTPS API (works on Render free tier)."""

    api_url = "https://api.brevo.com/v3/smtp/email"

    def send_messages(self, email_messages):
        if not email_messages:
            return 0

        api_key = getattr(settings, "BREVO_API_KEY", "")
        if not api_key:
            if self.fail_silently:
                return 0
            raise RuntimeError("BREVO_API_KEY is not set.")

        sent = 0
        for message in email_messages:
            name, address = parseaddr(message.from_email or settings.DEFAULT_FROM_EMAIL)

            payload = {
                "sender": {"name": name or "CivicSolve", "email": address},
                "to": [{"email": r} for r in message.to],
                "subject": message.subject,
                "textContent": message.body,
            }

            for content, mimetype in getattr(message, "alternatives", []):
                if mimetype == "text/html":
                    payload["htmlContent"] = content

            try:
                response = requests.post(
                    self.api_url,
                    json=payload,
                    headers={"api-key": api_key, "accept": "application/json"},
                    timeout=15,
                )
                if response.status_code >= 400:
                    raise RuntimeError(
                        f"Brevo email failed: {response.status_code} - {response.text}"
                    )
                sent += 1
            except Exception:
                if not self.fail_silently:
                    raise

        return sent