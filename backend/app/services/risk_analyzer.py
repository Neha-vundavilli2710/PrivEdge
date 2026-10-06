"""Risk analysis: how harmful could an incorrect automated answer be?
Also decides whether human judgment is required."""
import re
from dataclasses import dataclass

DOMAINS = {
    "medical": ["patient", "medication", "medicine", "diagnos", "dosage", "surgery", "procedure", "symptom", "treatment", "prescri", "drug", "disease", "clinical"],
    "legal": ["legal", "contract", "lawsuit", "sue ", "court", "liabilit", "attorney", "lawyer", "clause", "sign this", "agreement", "litigation", "compliance"],
    "financial": ["invest", "loan", "mortgage", "stock", "salary", "audit", "tax", "bankrupt", "portfolio", "bank", "financial"],
    "hr": ["fire ", "terminate", "employee", "promotion", "performance review", "layoff", "disciplin", "hiring"],
    "safety": ["weapon", "explosive", "self-harm", "suicide", "emergency", "toxic", "hazard"],
}
DOMAIN_BASE = {"medical": 0.35, "legal": 0.35, "financial": 0.25, "hr": 0.25, "safety": 0.45, "general": 0.05}

DECISION_RX = re.compile(r"(?i)\b(should (?:i|we|this|the|he|she|they)|is it safe|safe to sign|can i safely|do i need to|must i|recommend (?:whether|if)|approve|decide|decision|undergo|authori[sz]e|is (?:this|it) (?:legal|illegal|ethical|safe)|what dose|how much .* take)\b")
HIGH_STAKES_RX = re.compile(r"(?i)(high[- ]stakes|professional (?:judg(?:e)?ment|decision)|life[- ]or[- ]death|critical decision|ethical dilemma|legal advice|medical advice)")


@dataclass
class RiskResult:
    risk_score: float
    human_required_score: float
    domain: str


def detect_domain(text: str) -> str:
    low = text.lower() + " "
    best, best_hits = "general", 0
    for dom, words in DOMAINS.items():
        hits = sum(1 for w in words if w in low)
        if hits > best_hits:
            best, best_hits = dom, hits
    return best


def analyze_risk(text: str) -> RiskResult:
    domain = detect_domain(text)
    risk = DOMAIN_BASE[domain]
    decision = bool(DECISION_RX.search(text))
    stakes = bool(HIGH_STAKES_RX.search(text))
    human = 0.0

    if decision and domain != "general":
        risk += 0.55
        human = 0.85
    elif decision:
        risk += 0.15
        human = 0.2
    if stakes:
        risk += 0.60
        human = max(human, 0.90)
    if domain in ("medical", "legal") and not decision and not stakes:
        human = max(human, 0.2)
    return RiskResult(round(min(risk, 1.0), 3), round(human, 3), domain)
