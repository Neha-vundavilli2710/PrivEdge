"""Privacy & sensitivity analysis: NER (optional spaCy) + Regex + Keywords + context."""
import re
from dataclasses import dataclass, field

from app.services.patterns import KEYWORDS, PATTERNS

try:  # Optional: spaCy NER. The analyzer works without it.
    import spacy
    _nlp = spacy.load("en_core_web_sm", disable=["lemmatizer"])
except Exception:  # not installed / model missing
    _nlp = None

CONTEXT_RX = re.compile(r"(?i)\b(analy[sz]e|review|summari[sz]e|check|evaluate|audit)\b[^.?!]{0,40}\b(this|the attached|my|our|following)\b[^.?!]{0,20}\b(document|report|file|data|spreadsheet|contract|records?|text)\b")
FIRST_PERSON_RX = re.compile(r"(?i)\b(my|our|mine|i am|i'm)\b")


@dataclass
class PrivacyResult:
    privacy_score: float
    sensitivity_score: float
    contains_pii: bool
    pii_types: list[str] = field(default_factory=list)
    categories: list[str] = field(default_factory=list)
    entities: list[dict] = field(default_factory=list)


def analyze_privacy(text: str) -> PrivacyResult:
    low = text.lower()

    # 1) Regex: structured identifiers
    pii_types = [label for label, rx in PATTERNS.items() if rx.search(text)]

    # 2) NER (optional)
    entities = []
    if _nlp is not None:
        for ent in _nlp(text[:2000]).ents:
            if ent.label_ in {"PERSON", "GPE", "ORG", "LOC"}:
                entities.append({"text": ent.text, "label": ent.label_})

    # 3) Keyword categories
    cat_scores: dict[str, float] = {}
    for cat, spec in KEYWORDS.items():
        hits = sum(1 for w in spec["words"] if re.search(rf"\b{re.escape(w)}\b", low))
        if hits:
            cat_scores[cat] = min(1.0, spec["weight"] + 0.10 * (hits - 1))

    sens = 0.0
    if pii_types:
        sens = min(1.0, 0.75 + 0.05 * (len(pii_types) - 1))
    if cat_scores:
        top = max(cat_scores.values())
        sens = max(sens, min(1.0, top + 0.15 * (len(cat_scores) - 1)))
        # 4) Context: "analyze this <document>" implies pasted/attached content
        if CONTEXT_RX.search(text):
            sens = min(1.0, sens + 0.10)

    privacy = sens
    if pii_types:
        privacy = min(1.0, privacy + 0.10)
    if sens > 0 and FIRST_PERSON_RX.search(text):
        privacy = min(1.0, privacy + 0.05)
    privacy = max(privacy, 0.02)  # public info still has a tiny floor

    return PrivacyResult(
        privacy_score=round(privacy, 3),
        sensitivity_score=round(sens, 3),
        contains_pii=bool(pii_types),
        pii_types=pii_types,
        categories=sorted(cat_scores),
        entities=entities,
    )
