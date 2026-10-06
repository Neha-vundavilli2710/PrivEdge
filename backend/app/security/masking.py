"""Data masking: replace detected sensitive spans with placeholders.
Masking is NOT a substitute for Edge routing (per PDF); it is used for
reviewer views and any text that must leave the local environment."""
from app.services.patterns import PATTERNS


def mask_text(text: str) -> str:
    out = text
    for label, rx in PATTERNS.items():
        out = rx.sub(f"[{label}]", out)
    return out
