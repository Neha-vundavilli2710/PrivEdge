"""Response Validator: final safety/quality checkpoint for every path."""
import re
from dataclasses import dataclass, field

from app.security.masking import mask_text
from app.services.patterns import PATTERNS

BLOCKLIST = re.compile(r"(?i)\b(kill yourself|how to make a bomb|build a weapon)\b")
MAX_LEN = 8000


@dataclass
class Validation:
    ok: bool
    text: str
    issues: list[str] = field(default_factory=list)


def validate_response(response: str, query: str, route: str, human_approved: bool = True) -> Validation:
    issues: list[str] = []
    text = (response or "").strip()
    if not text:
        return Validation(False, "", ["empty_response"])
    if route == "human" and not human_approved:
        return Validation(False, "", ["human_approval_required"])
    if BLOCKLIST.search(text):
        return Validation(False, "I can't provide that response.", ["inappropriate_output"])
    if len(text) > MAX_LEN:
        text, issues = text[:MAX_LEN] + "…", issues + ["truncated"]
    # Leakage: identifiers in the answer that were NOT in the user's own input
    leaked = [label for label, rx in PATTERNS.items() if label != "NAME" and any(m.group(0) not in query for m in rx.finditer(text))]
    if leaked:
        text = mask_text(text)
        issues.append("masked_sensitive_in_output:" + ",".join(leaked))
    if len(text) < 2:
        return Validation(False, text, ["too_short"])
    return Validation(True, text, issues)
