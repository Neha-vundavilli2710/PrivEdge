"""Intelligent Router - the core decision layer of PrivEdge.

Documented priority policy (highest first):
  1. human_required OR high risk        -> HUMAN
  2. high privacy OR high sensitivity   -> EDGE   (raw data must stay local)
  3. high latency need + low complexity -> EDGE   (fast local answer)
  4. otherwise (incl. high complexity)  -> CLOUD
Thresholds are project-defined and configurable (see Settings).
"""
from dataclasses import dataclass
from pathlib import Path

from app.core.config import get_settings
from app.services.feature_extractor import Features

ROUTES = ["cloud", "edge", "human"]


@dataclass
class Decision:
    route: str          # edge | cloud | human
    reason: str
    trigger: str        # human | privacy | latency | complexity | default
    router_used: str    # rule | ml


def rule_route(f: Features) -> Decision:
    s = get_settings()
    if f.human_required or f.risk_score >= s.risk_threshold:
        return Decision("human", "High-risk request that needs professional/human judgment, so it is sent to a reviewer instead of being answered automatically.", "human", "rule")
    if f.privacy_score >= s.privacy_threshold or f.sensitivity_score >= s.sensitivity_threshold:
        return Decision("edge", "High privacy and data sensitivity detected, so the raw query is processed locally by Edge AI and is not sent to the cloud.", "privacy", "rule")
    if f.latency_score >= s.latency_threshold and f.complexity_score < s.complexity_threshold:
        return Decision("edge", "A fast response was requested and the query is simple, so local Edge AI is used to minimize latency.", "latency", "rule")
    if f.complexity_score >= s.complexity_threshold:
        return Decision("cloud", "The query is complex and contains no sensitive data, so the more capable Cloud Gen-AI is used.", "complexity", "rule")
    return Decision("cloud", "Low privacy risk and low risk overall, so Cloud Gen-AI is appropriate.", "default", "rule")


DOMAINS = ["general", "medical", "legal", "financial", "hr", "safety"]


def feature_vector(f: Features) -> list[float]:
    return [
        f.privacy_score, f.sensitivity_score, f.complexity_score, f.risk_score, f.latency_score,
        float(f.human_required), float(f.query_length), float(f.contains_pii),
        *[1.0 if f.domain == d else 0.0 for d in DOMAINS],
    ]


_model = None
_model_loaded = False


def _load_model():
    global _model, _model_loaded
    if _model_loaded:
        return _model
    _model_loaded = True
    path = Path(get_settings().ml_model_path)
    if path.exists():
        try:
            import joblib
            _model = joblib.load(path)
        except Exception:
            _model = None
    return _model


def ml_route(f: Features) -> Decision | None:
    model = _load_model()
    if model is None:
        return None
    s = get_settings()
    pred = str(model.predict([feature_vector(f)])[0]).lower()
    reason = f"The trained ML routing classifier ({type(model).__name__}) selected {pred.upper()} from the query's privacy, risk, complexity and latency features."
    # Safety floor: a learned model must never send clearly private / high-risk queries to a weaker path.
    if pred == "cloud" and (f.privacy_score >= s.privacy_threshold or f.sensitivity_score >= s.sensitivity_threshold):
        pred, reason = "edge", "Safety guardrail: the ML router suggested Cloud, but privacy/sensitivity is high, so Edge AI is used."
    if pred != "human" and (f.human_required or f.risk_score >= s.risk_threshold):
        pred, reason = "human", "Safety guardrail: high-risk / human-judgment request is always sent to Human Review."
    trigger = {"human": "human", "edge": "privacy" if f.privacy_score >= s.privacy_threshold else "latency", "cloud": "default"}[pred]
    return Decision(pred, reason, trigger, "ml")


def decide(f: Features, mode: str | None = None) -> Decision:
    mode = (mode or get_settings().router_mode).lower()
    if mode == "ml":
        d = ml_route(f)
        if d:
            return d
    return rule_route(f)
