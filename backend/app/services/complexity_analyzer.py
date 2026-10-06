"""Complexity analysis: length, clauses, technical terms, task type."""
import re

HIGH_VERBS = ["design", "architect", "optimi", "derive", "prove", "implement", "migrate", "refactor", "build a", "develop a", "evaluate trade"]
MED_VERBS = ["explain", "compare", "analy", "summari", "difference", "why", "how does", "how do", "describe", "review"]
TECH = ["distributed", "fault-tolerant", "fault tolerant", "architecture", "scalab", "large-scale", "concurrency", "microservice", "kubernetes",
        "algorithm", "database", "encryption", "consensus", "latency", "throughput", "pipeline", "neural", "transformer", "cryptograph", "protocol",
        "trade-off", "tradeoff", "high availability", "sharding", "replication", "machine learning", "deployment"]
CLAUSE_RX = re.compile(r"(?i)\b(and|but|which|while|whereas|because|although|then|also)\b|[;,]")


def analyze_complexity(text: str) -> float:
    low = text.lower()
    words = len(text.split())
    length = min(1.0, words / 80) * 0.30
    verb = 0.25 if any(v in low for v in HIGH_VERBS) else (0.12 if any(v in low for v in MED_VERBS) else 0.0)
    tech = min(0.30, 0.08 * sum(1 for t in TECH if t in low))
    structure = min(0.15, 0.03 * len(CLAUSE_RX.findall(text)))
    if "```" in text or re.search(r"\b(def|class|function|select .* from)\b", low):
        structure = min(0.15, structure + 0.05)
    return round(min(1.0, length + verb + tech + structure), 3)
