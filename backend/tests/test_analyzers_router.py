from app.security.masking import mask_text
from app.services.feature_extractor import extract_features
from app.services.response_validator import validate_response
from app.services.router import rule_route


def route(q):
    return rule_route(extract_features(q)).route


def test_three_demo_queries():
    assert route("Explain inheritance in Java.") == "cloud"
    assert route("Analyze this confidential employee salary report.") == "edge"
    assert route("Make a high-stakes professional decision for this case.") == "human"


def test_priority_human_beats_privacy():
    f = extract_features("Should this patient undergo this medical procedure?")
    assert f.human_required and rule_route(f).route == "human"


def test_regex_pii_detection():
    f = extract_features("My email is test@example.com and phone 9876543210")
    assert f.contains_pii and {"EMAIL", "PHONE"} <= set(f.pii_types) and f.privacy_score >= 0.7


def test_public_query_low_scores():
    f = extract_features("What is Python?")
    assert f.privacy_score < 0.1 and f.risk_score < 0.1 and not f.human_required


def test_high_complexity_goes_cloud():
    f = extract_features("Design a distributed fault-tolerant architecture for a large-scale application.")
    assert f.complexity_score >= 0.55 and rule_route(f).route == "cloud"


def test_masking():
    assert mask_text("mail me at neha@example.com") == "mail me at [EMAIL]"


def test_validator_masks_leaked_pii_and_rejects_empty():
    assert not validate_response("", "q", "cloud").ok
    v = validate_response("Contact bob@secret.com", "hello", "cloud")
    assert v.ok and "[EMAIL]" in v.text and v.issues
    assert not validate_response("draft", "q", "human", human_approved=False).ok
