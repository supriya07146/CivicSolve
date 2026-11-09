from django.conf import settings


def get_ollama_headers():
    headers = {"Content-Type": "application/json"}
    api_key = getattr(settings, "OLLAMA_API_KEY", "").strip()

    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    return headers