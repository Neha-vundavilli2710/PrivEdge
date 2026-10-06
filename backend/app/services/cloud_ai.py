"""Cloud Gen-AI via Google Gemini REST API. Only ever receives MASKED text."""
import httpx

from app.core.config import get_settings
from app.services.llm_errors import LLMUnavailable

SYSTEM_PROMPT = ("You are the PrivEdge AI Assistant, a helpful, accurate and concise assistant. "
                 "If reference context is provided, prefer it for PrivEdge-specific questions and say so if it does not contain the answer. "
                 "Never invent personal data. Placeholders like [EMAIL] mean the value was masked for privacy.")


def gemini_configured() -> bool:
    return bool(get_settings().gemini_api_key)


def generate(prompt: str, history: list[dict] | None = None, context: str = "", temperature: float = 0.7) -> str:
    s = get_settings()
    if not s.gemini_api_key:
        raise LLMUnavailable("Cloud AI is not configured (GEMINI_API_KEY missing).")
    contents = []
    for m in history or []:
        contents.append({"role": "user" if m["role"] == "user" else "model", "parts": [{"text": m["content"]}]})
    user_text = f"Reference context:\n{context}\n\nQuestion: {prompt}" if context else prompt
    contents.append({"role": "user", "parts": [{"text": user_text}]})
    body = {
        "systemInstruction": {"parts": [{"text": SYSTEM_PROMPT}]},
        "contents": contents,
        "generationConfig": {"temperature": temperature, "maxOutputTokens": 1024},
    }
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{s.gemini_model}:generateContent"
    try:
        r = httpx.post(url, json=body, headers={"x-goog-api-key": s.gemini_api_key}, timeout=60)
        r.raise_for_status()
        data = r.json()
        parts = data["candidates"][0]["content"]["parts"]
        return "".join(p.get("text", "") for p in parts).strip()
    except httpx.HTTPStatusError as e:
        raise LLMUnavailable(f"Cloud AI returned an error ({e.response.status_code}).") from e
    except (httpx.HTTPError, KeyError, IndexError, ValueError) as e:
        raise LLMUnavailable("Cloud AI is currently unavailable.") from e


def ping() -> tuple[bool, str]:
    """Cheap reachability check for System Monitoring (does not spend tokens)."""
    s = get_settings()
    if not s.gemini_api_key:
        return False, "GEMINI_API_KEY not set"
    try:
        r = httpx.get(f"https://generativelanguage.googleapis.com/v1beta/models/{s.gemini_model}",
                      headers={"x-goog-api-key": s.gemini_api_key}, timeout=8)
        return r.status_code == 200, f"HTTP {r.status_code}"
    except httpx.HTTPError as e:
        return False, type(e).__name__
