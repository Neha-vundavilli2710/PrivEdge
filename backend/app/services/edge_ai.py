"""Edge AI: local LLM through Ollama. Raw (unmasked) sensitive text stays on this machine."""
import httpx

from app.core.config import get_settings
from app.services.llm_errors import LLMUnavailable

SYSTEM_PROMPT = ("You are the PrivEdge AI Assistant running locally on the user's own machine. "
                 "Answer helpfully and concisely. The user's data is private; do not repeat sensitive identifiers unnecessarily.")


def generate(prompt: str, history: list[dict] | None = None, temperature: float = 0.7, system: str | None = None) -> str:
    s = get_settings()
    messages = [{"role": "system", "content": system or SYSTEM_PROMPT}]
    messages += [{"role": m["role"], "content": m["content"]} for m in history or []]
    messages.append({"role": "user", "content": prompt})
    try:
        r = httpx.post(f"{s.ollama_base_url}/api/chat",
                       json={"model": s.ollama_model, "messages": messages, "stream": False, "options": {"temperature": temperature}},
                       timeout=180)
        if r.status_code == 404:
            raise LLMUnavailable(f"Local model '{s.ollama_model}' is not installed. Run: ollama pull {s.ollama_model}")
        r.raise_for_status()
        return r.json()["message"]["content"].strip()
    except LLMUnavailable:
        raise
    except httpx.ConnectError as e:
        raise LLMUnavailable("Edge AI (Ollama) is not running on this machine.") from e
    except (httpx.HTTPError, KeyError, ValueError) as e:
        raise LLMUnavailable("Edge AI (Ollama) is currently unavailable.") from e


def ping() -> tuple[bool, str]:
    s = get_settings()
    try:
        r = httpx.get(f"{s.ollama_base_url}/api/tags", timeout=4)
        names = [m.get("name", "") for m in r.json().get("models", [])]
        ok = any(n == s.ollama_model or n.startswith(s.ollama_model.split(":")[0]) for n in names)
        return ok, "model ready" if ok else f"running, but '{s.ollama_model}' not pulled"
    except (httpx.HTTPError, ValueError):
        return False, "Ollama not reachable"
