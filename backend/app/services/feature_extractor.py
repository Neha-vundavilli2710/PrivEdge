"""Combines all analyzers into the structured feature set passed to the router."""
import re
from dataclasses import asdict, dataclass, field

from app.services.complexity_analyzer import analyze_complexity
from app.services.privacy_analyzer import analyze_privacy
from app.services.risk_analyzer import analyze_risk

URGENT_RX = re.compile(r"(?i)\b(quick(ly)?|fast|urgent(ly)?|asap|briefly|one[- ]line|in a sentence|tl;?dr|right now|immediately)\b")


@dataclass
class Features:
    privacy_score: float
    sensitivity_score: float
    complexity_score: float
    risk_score: float
    latency_score: float
    human_required_score: float
    human_required: bool
    query_length: int
    contains_pii: bool
    domain: str
    pii_types: list[str] = field(default_factory=list)
    categories: list[str] = field(default_factory=list)

    def to_dict(self):
        return asdict(self)


def latency_requirement(text: str) -> float:
    """How important a fast response is (0..1)."""
    score = 0.2
    if URGENT_RX.search(text):
        score = 0.85
    elif len(text.split()) <= 6:
        score = 0.45
    return score


def extract_features(text: str, human_threshold: float = 0.60) -> Features:
    p = analyze_privacy(text)
    r = analyze_risk(text)
    return Features(
        privacy_score=p.privacy_score,
        sensitivity_score=p.sensitivity_score,
        complexity_score=analyze_complexity(text),
        risk_score=r.risk_score,
        latency_score=latency_requirement(text),
        human_required_score=r.human_required_score,
        human_required=r.human_required_score >= human_threshold,
        query_length=len(text.split()),
        contains_pii=p.contains_pii,
        domain=r.domain,
        pii_types=p.pii_types,
        categories=p.categories,
    )
