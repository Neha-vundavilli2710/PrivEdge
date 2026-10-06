"""The PrivEdge request lifecycle: analyze -> route -> Edge/Cloud/Human -> validate -> log."""
import time

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.models import Conversation, HumanReview, Message, RoutingLog, User
from app.security.encryption import decrypt, encrypt
from app.security.masking import mask_text
from app.services import cloud_ai, edge_ai, notifications, rag_service, settings_store
from app.services.feature_extractor import Features, extract_features
from app.services.llm_errors import LLMUnavailable
from app.services.policy import levels, risk_label
from app.services.response_validator import validate_response
from app.services.router import Decision, decide

HISTORY_TURNS = 6
HUMAN_NOTICE = "Human review is required. Your request has been sent for review."
AUTO_ROUTE_OFF_REASON = "Automatic routing is disabled by the administrator (Settings > Routing > Auto-Routing), so every request is sent for human review regardless of its analysis."


def decision_card(f: Features, d: Decision) -> dict:
    lv = levels(f)
    return {**{k.lower(): v for k, v in lv.items()}, "humanReview": d.route == "human", "reason": d.reason}


def scores_of(f: Features) -> dict:
    return {
        "privacy_score": f.privacy_score, "sensitivity_score": f.sensitivity_score, "complexity_score": f.complexity_score,
        "risk_score": f.risk_score, "latency_score": f.latency_score, "human_required_score": f.human_required_score,
        "human_required": f.human_required, "contains_pii": f.contains_pii, "domain": f.domain,
        "pii_types": f.pii_types, "categories": f.categories,
    }


def apply_toggles(d: Decision, cfg: dict) -> Decision | None:
    """Respect admin route toggles. Never falls back from a private path to Cloud."""
    r = cfg["routing"]
    enabled = {"edge": r["edgeEnabled"], "cloud": r["cloudEnabled"], "human": r["humanEnabled"]}
    if enabled[d.route]:
        return d
    if d.route == "human":
        return None
    if d.route == "edge":
        if d.trigger == "privacy":
            return Decision("human", "Edge AI is disabled by the administrator; the private request is sent to Human Review instead of the cloud.", "human", d.router_used) if enabled["human"] else None
        return Decision("cloud", "Edge AI is disabled by the administrator, so Cloud AI is used.", "default", d.router_used) if enabled["cloud"] else None
    if enabled["edge"]:
        return Decision("edge", "Cloud AI is disabled by the administrator, so Edge AI is used.", "default", d.router_used)
    return None


def _trim_to_context_window(history: list[dict], max_tokens: int) -> list[dict]:
    """Admin-configured ai.contextWindow actually limits how much prior conversation is
    sent to the LLM. Tokens are approximated as len(text) // 4 (no tokenizer dependency);
    good enough to make the setting have a real, testable effect, not exact token accounting.
    Keeps the most RECENT turns and trims from the oldest."""
    kept, total = [], 0
    for turn in reversed(history):
        cost = max(1, len(turn["content"]) // 4)
        if kept and total + cost > max_tokens:
            break
        kept.append(turn)
        total += cost
    return list(reversed(kept))


def _context_window_tokens(cfg: dict) -> int:
    try:
        return max(256, int(cfg["ai"]["contextWindow"]))
    except (TypeError, ValueError):
        return 4096


def _history(conv: Conversation | None, route: str, max_tokens: int) -> list[dict]:
    """Cloud never receives earlier private (edge/human) turns."""
    if conv is None:
        return []
    out: list[dict] = []
    for m in conv.messages:
        if m.status not in ("COMPLETED", "REVIEWED") or not m.response:
            continue
        if route == "cloud" and m.route != "cloud":
            continue
        q, a = decrypt(m.message), decrypt(m.response)
        if route == "cloud":
            q, a = mask_text(q), mask_text(a)
        out += [{"role": "user", "content": q}, {"role": "assistant", "content": a}]
    return _trim_to_context_window(out[-HISTORY_TURNS * 2:], max_tokens)


def get_owned_conversation(db: Session, user: User, conversation_id: int) -> Conversation:
    conv = db.get(Conversation, conversation_id)
    if not conv or conv.user_id != user.user_id:
        raise HTTPException(404, "Conversation not found")
    return conv


def _notify_system_alert(db: Session, cfg: dict, route: str, detail: str) -> None:
    if cfg["notifs"]["systemAlerts"]:
        notifications.notify_roles(db, "system_alert", "System alert", f"{route.title()} AI reported: {detail}")


def _notify_new_pending_review(db: Session, cfg: dict, f: Features) -> None:
    if cfg["notifs"]["highRisk"] and risk_label(f.risk_score) in ("High", "Critical"):
        notifications.notify_roles(db, "high_risk", "High-risk review assigned", f"A new {f.domain} query scored {risk_label(f.risk_score)} risk and is awaiting human review.")
    if cfg["notifs"]["reviewBacklog"]:
        pending = db.query(HumanReview).filter(HumanReview.status == "PENDING").count()
        if pending >= get_settings().review_backlog_threshold:
            notifications.notify_roles(db, "review_backlog", "Review backlog is growing", f"{pending} requests are currently waiting for human review.")


def process_chat(db: Session, user: User, text: str, conversation_id: int | None, caption: str | None = None, attachment_name: str | None = None) -> dict:
    """`text` is the full content analyzed and sent to the LLM (for an attachment, this
    includes the extracted document text). `caption` is what the user actually typed /
    what the chat bubble displays; it defaults to `text` for ordinary messages."""
    cfg = settings_store.get_all(db)
    temp = settings_store.temperature(cfg)
    ctx_tokens = _context_window_tokens(cfg)
    conv = get_owned_conversation(db, user, conversation_id) if conversation_id else None

    # 1) analyze + 2) route
    f = extract_features(text, get_settings().human_threshold)
    d = decide(f)
    if not cfg["routing"]["autoRoute"] and d.route != "human":
        d = Decision("human", AUTO_ROUTE_OFF_REASON, "human", d.router_used)
    adjusted = apply_toggles(d, cfg)
    blocked = adjusted is None
    if not blocked:
        d = adjusted

    status, response, issues, rag_used, t0 = "COMPLETED", "", [], [], time.perf_counter()
    ai_draft = ""

    if blocked:
        status = "ERROR"
        response = f"This request was routed to {d.route.title()} processing, which is currently disabled by the administrator, so it cannot be answered automatically."
    elif d.route == "human":
        status, response = "PENDING_REVIEW", HUMAN_NOTICE
        try:  # draft is produced LOCALLY so private data never reaches the cloud
            ai_draft = edge_ai.generate(f"Prepare supporting information for a human reviewer about this request. Do not make the final decision.\n\n{text}", _history(conv, "edge", ctx_tokens), temp)
        except LLMUnavailable:
            ai_draft = ""
    else:
        try:
            if d.route == "edge":
                try:
                    response = edge_ai.generate(text, _history(conv, "edge", ctx_tokens), temp)
                except LLMUnavailable:
                    if d.trigger == "latency" and cfg["routing"]["cloudEnabled"]:  # non-private trigger only
                        d = Decision("cloud", "Edge AI was unavailable; the non-sensitive query was answered by Cloud AI.", "default", d.router_used)
                        response = ""
                    else:
                        raise
            if d.route == "cloud":
                masked = mask_text(text)
                context = ""
                if cfg["ai"]["ragEnabled"]:
                    rag_used = rag_service.retrieve(db, masked)
                    context = rag_service.build_context(rag_used)
                response = cloud_ai.generate(masked, _history(conv, "cloud", ctx_tokens), context, temp)
        except LLMUnavailable as e:
            status, response = "ERROR", f"{e} Your data was not sent anywhere else."
            _notify_system_alert(db, cfg, d.route, str(e))

    elapsed = round(time.perf_counter() - t0, 3)

    if status == "COMPLETED":
        v = validate_response(response, text, d.route)
        issues = v.issues
        if v.ok:
            response = v.text
        else:
            status, response = "ERROR", "The generated answer failed a safety/quality check, so it was not returned. Please rephrase and try again."

    # 3) persist
    if conv is None:
        title_source = caption if caption else text
        conv = Conversation(user_id=user.user_id, title=(mask_text(title_source)[:60] or "New conversation"))
        db.add(conv)
        db.flush()
    msg = Message(conversation_id=conv.conversation_id, message=encrypt(text), caption=encrypt(caption if caption is not None else text),
                  attachment_name=attachment_name, response=encrypt(response), route=d.route, status=status)
    db.add(msg)
    db.flush()
    db.add(RoutingLog(
        message_id=msg.message_id, user_id=user.user_id, privacy_score=f.privacy_score, sensitivity_score=f.sensitivity_score,
        complexity_score=f.complexity_score, risk_score=f.risk_score, latency_score=f.latency_score, human_required=f.human_required,
        domain=f.domain, selected_route=d.route, router_used=d.router_used, reason=d.reason,
        processing_time=None if d.route == "human" else elapsed))
    if status == "PENDING_REVIEW":
        db.add(HumanReview(message_id=msg.message_id, status="PENDING", ai_draft=encrypt(ai_draft)))
    conv.updated_at = msg.timestamp
    db.commit()

    if status == "PENDING_REVIEW":
        _notify_new_pending_review(db, cfg, f)

    return {
        "conversation_id": conv.conversation_id, "message_id": msg.message_id, "response": response,
        "attachment_name": attachment_name,
        "route": d.route, "reason": d.reason, "status": status.lower(), "error": status == "ERROR",
        "human_review": d.route == "human" and status == "PENDING_REVIEW",
        "decision": decision_card(f, d), "scores": scores_of(f), "router_used": d.router_used,
        "processing_time": None if d.route == "human" else elapsed, "validator_issues": issues,
        "sources": [{"title": h["title"], "score": h["score"]} for h in rag_used],
    }


def analyze_only(text: str) -> dict:
    f = extract_features(text, get_settings().human_threshold)
    d = decide(f)
    return {"route": d.route, "reason": d.reason, "router_used": d.router_used, "scores": scores_of(f), "decision": decision_card(f, d)}
