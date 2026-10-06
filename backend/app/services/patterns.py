"""Regex patterns for structured sensitive data. Order matters for masking
(most specific first)."""
import re

PATTERNS: dict[str, re.Pattern] = {
    "CARD": re.compile(r"\b(?:\d[ -]?){13,16}\b"),
    "AADHAAR": re.compile(r"\b\d{4}\s\d{4}\s\d{4}\b"),
    "SSN": re.compile(r"\b\d{3}-\d{2}-\d{4}\b"),
    "ACCOUNT_NO": re.compile(r"(?i)\b(?:account|acct|a/c)\s*(?:no\.?|number|#)?\s*(?:is|:)?\s*\d{6,18}\b"),
    "EMPLOYEE_ID": re.compile(r"(?i)\bemp(?:loyee)?\s*(?:id|no\.?|number)\s*(?:is|:)?\s*[A-Z0-9-]{3,}\b"),
    "EMAIL": re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b"),
    "PHONE": re.compile(r"(?<![\d])(?:\+\d{1,3}[\s-]?)?(?:\(?\d{3}\)?[\s-]\d{3}[\s-]\d{4}|[6-9]\d{9}|\d{10})(?![\d])"),
    "NAME": re.compile(r"(?i:my name is)\s+[A-Z][a-z]+(?:\s[A-Z][a-z]+)?"),
}

KEYWORDS: dict[str, dict] = {
    "financial": {"weight": 0.50, "words": ["salary", "salaries", "bank", "account", "transaction", "income", "payroll", "tax return", "credit card", "loan", "financial", "budget report", "invoice", "compensation"]},
    "medical": {"weight": 0.55, "words": ["patient", "diagnosis", "medication", "treatment", "prescription", "medical record", "health record", "symptom", "therapy", "lab result"]},
    "confidential": {"weight": 0.75, "words": ["confidential", "internal only", "private", "proprietary", "trade secret", "company report", "internal report", "classified", "nda", "restricted"]},
    "personal": {"weight": 0.35, "words": ["my address", "my phone", "home address", "date of birth", "my email", "my name", "my password"]},
    "identification": {"weight": 0.75, "words": ["passport", "aadhaar", "social security", "driver's license", "driving licence", "employee id", "national id", "pan card"]},
}
