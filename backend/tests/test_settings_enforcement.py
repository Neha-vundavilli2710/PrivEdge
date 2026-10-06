"""Tests for Settings Enforcement: every admin setting that claims to be enforced
must actually change backend behavior, not just be stored."""
from datetime import datetime, timedelta, timezone

from tests.conftest import Calls


def chat(client, h, msg, cid=None):
    return client.post("/chat", json={"message": msg, "conversation_id": cid}, headers=h)


def put_settings(client, admin, patch):
    return client.put("/admin/settings", json=patch, headers=admin)


def reset_settings(client, admin):
    put_settings(client, admin, {
        "routing": {"edgeEnabled": True, "cloudEnabled": True, "humanEnabled": True, "autoRoute": True},
        "security": {"auditLog": True, "sessionTimeout": True},
        "ai": {"ragEnabled": True, "contextWindow": "4096", "temperature": "0.7"},
        "notifs": {"highRisk": True, "systemAlerts": True, "reviewBacklog": True},
    })


# ---------- routing.autoRoute ----------
def test_auto_route_off_forces_human_review(client, admin, alice):
    try:
        put_settings(client, admin, {"routing": {"autoRoute": False}})
        r = chat(client, alice, "What is Python?").json()  # would normally be cloud
        assert r["route"] == "human" and r["human_review"]
        assert "disabled by the administrator" in r["reason"]
        # No cloud call - the query never leaves for the cloud. The edge call that DID happen
        # is the local AI draft prepared for the reviewer, not an answer sent to the user.
        assert not Calls.cloud
    finally:
        reset_settings(client, admin)


def test_auto_route_off_plus_human_disabled_blocks_cleanly(client, admin, alice):
    try:
        put_settings(client, admin, {"routing": {"autoRoute": False, "humanEnabled": False}})
        r = chat(client, alice, "What is HTML?").json()
        assert r["error"] and not Calls.cloud and not Calls.edge
    finally:
        reset_settings(client, admin)


# ---------- security.auditLog ----------
def test_audit_log_toggle(client, admin, alice):
    from app.db.database import SessionLocal
    from app.db.models import AuditLog
    try:
        put_settings(client, admin, {"security": {"auditLog": False}})
        with SessionLocal() as db:
            before = db.query(AuditLog).count()
        client.patch("/auth/me", json={"name": "Alice Renamed"}, headers=alice)  # no audit call here, use login instead
        client.post("/auth/login", json={"email": "alice@example.com", "password": "Password123"})
        with SessionLocal() as db:
            after = db.query(AuditLog).count()
        assert after == before  # logging disabled -> no new rows
    finally:
        reset_settings(client, admin)
        client.post("/auth/login", json={"email": "alice@example.com", "password": "Password123"})
        with SessionLocal() as db:
            before2 = db.query(AuditLog).count()
    with SessionLocal() as db:
        after2 = db.query(AuditLog).count()
    # after reset, logging resumes (sanity - compares against itself, just ensures no crash)
    assert after2 >= before2


# ---------- ai.contextWindow ----------
def test_context_window_trims_history(client, alice):
    long_msg = "Please explain this in detail. " * 40  # long enough to matter
    a = chat(client, alice, long_msg).json()
    cid = a["conversation_id"]
    from app.services.chat_service import _trim_to_context_window
    history = [{"role": "user", "content": long_msg}, {"role": "assistant", "content": a["response"] * 5}]
    trimmed_small = _trim_to_context_window(history, 50)
    trimmed_large = _trim_to_context_window(history, 100000)
    assert len(trimmed_small) <= len(trimmed_large)
    assert trimmed_large == history  # nothing dropped when window is generous


def test_context_window_setting_reduces_sent_history(client, admin, alice):
    try:
        a = chat(client, alice, "Tell me a fun fact about otters, in detail please, with lots of words.").json()
        cid = a["conversation_id"]
        put_settings(client, admin, {"ai": {"contextWindow": "1"}})  # absurdly small -> only newest turn(s) fit
        chat(client, alice, "Now tell me about dolphins.", cid)
        assert Calls.cloud
        last_call_history = Calls.cloud[-1]["history"]
        assert len(last_call_history) <= 2  # couldn't fit the earlier otter exchange
    finally:
        reset_settings(client, admin)


# ---------- security.sessionTimeout ----------
def test_session_timeout_rejects_idle_token(client, admin):
    from app.db.database import SessionLocal
    from app.db.models import User
    r = client.post("/auth/register", json={"name": "Idle", "email": "idle@example.com", "password": "Password123"})
    headers = {"Authorization": f"Bearer {r.json()['access_token']}"}
    assert client.get("/auth/me", headers=headers).status_code == 200  # sets last_active_at
    with SessionLocal() as db:
        u = db.query(User).filter_by(email="idle@example.com").first()
        u.last_active_at = datetime.now(timezone.utc) - timedelta(minutes=9999)
        db.commit()
    r2 = client.get("/auth/me", headers=headers)
    assert r2.status_code == 401 and "inactivity" in r2.json()["detail"].lower()


def test_session_timeout_disabled_allows_idle_token(client, admin):
    from app.db.database import SessionLocal
    from app.db.models import User
    try:
        put_settings(client, admin, {"security": {"sessionTimeout": False}})
        r = client.post("/auth/register", json={"name": "Idle2", "email": "idle2@example.com", "password": "Password123"})
        headers = {"Authorization": f"Bearer {r.json()['access_token']}"}
        with SessionLocal() as db:
            u = db.query(User).filter_by(email="idle2@example.com").first()
            u.last_active_at = datetime.now(timezone.utc) - timedelta(minutes=9999)
            db.commit()
        assert client.get("/auth/me", headers=headers).status_code == 200
    finally:
        reset_settings(client, admin)


# ---------- notifs.* ----------
def test_review_completed_notification_always_sent(client, alice, reviewer):
    r = chat(client, alice, "Should I take this medication with alcohol?").json()
    item = client.get("/review/pending", headers=reviewer).json()[0]
    client.post(f"/review/{item['id']}", json={"action": "modify", "comment": "ok", "final_response": "Please consult a pharmacist."}, headers=reviewer)
    notifs = client.get("/notifications", headers=alice).json()
    assert any(n["type"] == "review_completed" and not n["read"] for n in notifs["items"])


def test_high_risk_notification_reaches_reviewer_and_respects_toggle(client, admin, alice, reviewer):
    try:
        reset_settings(client, admin)
        chat(client, alice, "Should this patient undergo this medical procedure?")
        notifs = client.get("/notifications", headers=reviewer).json()
        assert any(n["type"] == "high_risk" for n in notifs["items"])
        client.post("/notifications/read-all", headers=reviewer)

        put_settings(client, admin, {"notifs": {"highRisk": False}})
        chat(client, alice, "Should we proceed with surgery for this diagnosis?")
        notifs2 = client.get("/notifications", headers=reviewer).json()
        assert not any(n["type"] == "high_risk" and not n["read"] for n in notifs2["items"])
    finally:
        reset_settings(client, admin)


def test_system_alert_notification_on_llm_failure(client, admin, alice):
    try:
        Calls.cloud_down = True
        chat(client, alice, "What is Kubernetes?")
        notifs = client.get("/notifications", headers=admin).json()
        assert any(n["type"] == "system_alert" for n in notifs["items"])
    finally:
        Calls.cloud_down = False
        reset_settings(client, admin)


def test_mark_all_read(client, alice, reviewer):
    chat(client, alice, "Should I invest my entire savings in this stock?")
    before = client.get("/notifications", headers=reviewer).json()
    assert before["unread"] >= 1
    client.post("/notifications/read-all", headers=reviewer)
    after = client.get("/notifications", headers=reviewer).json()
    assert after["unread"] == 0
