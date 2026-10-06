"""Score -> level helpers shared by API responses and the router."""
from app.core.config import get_settings


def level(score: float, high: float, med_ratio: float = 0.55) -> str:
    if score >= high:
        return "High"
    if score >= high * med_ratio:
        return "Medium"
    return "Low"


def levels(f) -> dict:
    s = get_settings()
    return {
        "privacy": level(f.privacy_score, s.privacy_threshold),
        "sensitivity": level(f.sensitivity_score, s.sensitivity_threshold),
        "complexity": level(f.complexity_score, s.complexity_threshold),
        "risk": level(f.risk_score, s.risk_threshold),
        "latency": level(f.latency_score, s.latency_threshold),
    }


def risk_label(score: float) -> str:
    """Reviewer-facing label (adds Critical)."""
    if score >= 0.95:
        return "Critical"
    return level(score, get_settings().risk_threshold)
