from tests.conftest import Calls


def chat(client, h, msg, cid=None):
    return client.post("/chat", json={"message": msg, "conversation_id": cid}, headers=h)


# ---------- auth / RBAC ----------
def test_auth_required(client):
    assert client.post("/chat", json={"message": "hi"}).status_code == 401


def test_register_duplicate_and_bad_login(client, alice):
    assert client.post("/auth/register", json={"name": "A", "email": "alice@example.com", "password": "Password123"}).status_code == 409
    assert client.post("/auth/login", json={"email": "alice@example.com", "password": "wrong-pass"}).status_code == 401


def test_role_cannot_be_self_assigned(client):
    r = client.post("/auth/register", json={"name": "Eve", "email": "eve@example.com", "password": "Password123", "role": "ADMIN"})
    assert r.status_code == 201 and r.json()["user"]["role"] == "user"


def test_rbac(client, alice, reviewer, admin):
    assert client.get("/admin/users", headers=alice).status_code == 403
    assert client.get("/review/pending", headers=alice).status_code == 403
    assert client.get("/admin/users", headers=reviewer).status_code == 403
    assert client.get("/review/pending", headers=reviewer).status_code == 200
    assert client.get("/admin/users", headers=admin).status_code == 200


# ---------- routing paths ----------
def test_cloud_path(client, alice):
    r = chat(client, alice, "Explain inheritance in Java.").json()
    assert r["route"] == "cloud" and r["response"].startswith("CLOUD") and Calls.cloud and not Calls.edge
    assert r["decision"]["privacy"] == "Low" and not r["human_review"]


def test_edge_path_keeps_raw_data_local(client, alice):
    r = chat(client, alice, "Analyze this confidential employee salary report.").json()
    assert r["route"] == "edge" and r["response"].startswith("EDGE")
    assert Calls.edge and not Calls.cloud


def test_cloud_receives_only_masked_text(client, alice):
    chat(client, alice, "Explain what an API is. Reply to me at my.name@example.org if long.")
    sent = Calls.cloud or Calls.edge
    assert not any("my.name@example.org" in c["prompt"] for c in Calls.cloud)


def test_cloud_history_excludes_private_turns(client, alice):
    a = chat(client, alice, "My email is carol@example.com, help me draft a note.").json()
    assert a["route"] == "edge"
    cid = a["conversation_id"]
    chat(client, alice, "Now explain what recursion is.", cid)
    assert Calls.cloud and all("carol@example.com" not in str(c) for c in Calls.cloud)


def test_edge_down_for_private_query_never_falls_back_to_cloud(client, alice):
    Calls.edge_down = True
    r = chat(client, alice, "Analyze this confidential company report.").json()
    assert r["error"] and r["route"] == "edge" and not Calls.cloud
    Calls.edge_down = False


def test_cloud_down_returns_friendly_error(client, alice):
    Calls.cloud_down = True
    r = chat(client, alice, "What is Kubernetes?").json()
    assert r["error"] and "unavailable" in r["response"].lower()


def test_analyze_dry_run(client, alice):
    r = client.post("/analyze", json={"message": "Should I take this medication?"}, headers=alice).json()
    assert r["route"] == "human" and not Calls.cloud and not Calls.edge


# ---------- human review lifecycle ----------
def test_human_review_full_flow(client, alice, reviewer):
    r = chat(client, alice, "Should this patient undergo this medical procedure?").json()
    assert r["route"] == "human" and r["human_review"] and "Human review is required" in r["response"]
    assert not Calls.cloud                               # nothing high-risk goes to cloud
    cid = r["conversation_id"]

    q = client.get("/review/pending", headers=reviewer).json()
    item = next(i for i in q if "patient" in i["query"].lower())
    d = client.get(f"/review/{item['id']}", headers=reviewer).json()
    assert d["user_ref"].startswith("USR-") and d["analysis"]["route"] == "Human Review"

    assert client.post(f"/review/{item['id']}", json={"action": "modify", "comment": "c"}, headers=reviewer).status_code == 400
    ok = client.post(f"/review/{item['id']}", json={"action": "modify", "comment": "Checked", "final_response": "Please consult the treating physician."}, headers=reviewer)
    assert ok.status_code == 200
    assert client.post(f"/review/{item['id']}", json={"action": "reject"}, headers=reviewer).status_code == 409

    conv = client.get(f"/conversations/{cid}", headers=alice).json()
    assert conv["messages"][0]["status"] == "reviewed" and "treating physician" in conv["messages"][0]["response"]
    hist = client.get("/review/history", headers=reviewer).json()
    assert any(h["action"] == "Modified" for h in hist)


def test_reject_and_stats(client, alice, reviewer):
    chat(client, alice, "Is this legal document safe to sign?")
    item = client.get("/review/pending", headers=reviewer).json()[0]
    assert client.post(f"/review/{item['id']}/claim", headers=reviewer).status_code == 200
    assert client.post(f"/review/{item['id']}", json={"action": "reject", "comment": "Needs a lawyer"}, headers=reviewer).status_code == 200
    s = client.get("/review/stats", headers=reviewer).json()
    assert s["completed"] >= 2 and any(o["name"] == "Rejected" and o["value"] >= 1 for o in s["outcomes"])


# ---------- isolation & data handling ----------
def test_conversation_ownership(client, alice, bob):
    cid = chat(client, alice, "What is HTML?").json()["conversation_id"]
    assert client.get(f"/conversations/{cid}", headers=bob).status_code == 404
    assert client.delete(f"/conversations/{cid}", headers=bob).status_code == 404
    assert client.post("/chat", json={"message": "hi", "conversation_id": cid}, headers=bob).status_code == 404


def test_messages_encrypted_at_rest(client, alice):
    chat(client, alice, "Tell me about zebras please.")
    from app.db.database import SessionLocal
    from app.db.models import Message
    with SessionLocal() as db:
        raw = [m.message for m in db.query(Message).all()]
    assert raw and all("zebras" not in x for x in raw)


def test_delete_conversation(client, alice):
    cid = chat(client, alice, "What is CSS?").json()["conversation_id"]
    assert client.delete(f"/conversations/{cid}", headers=alice).status_code == 204
    assert client.get(f"/conversations/{cid}", headers=alice).status_code == 404


def test_input_validation(client, alice):
    assert client.post("/chat", json={"message": ""}, headers=alice).status_code == 422
    assert client.post("/chat", json={"message": "x" * 5000}, headers=alice).status_code == 422


# ---------- dashboards / admin ----------
def test_user_statistics(client, alice):
    s = client.get("/dashboard/statistics", headers=alice).json()
    assert s["total"] == sum(s["counts"].values()) and s["total"] >= 1 and len(s["daily"]) == 7


def test_admin_views_and_logs_hide_content(client, admin):
    logs = client.get("/admin/logs", headers=admin).json()
    assert logs and "text" not in logs[0] and "message" not in logs[0] and logs[0]["id"].startswith("Q-")
    assert client.get("/admin/routing-analytics", headers=admin).json()["total"] >= 1
    assert client.get("/admin/statistics", headers=admin).status_code == 200
    assert client.get("/admin/review-monitoring", headers=admin).status_code == 200
    mon = client.get("/admin/monitoring", headers=admin).json()
    assert {s["name"].split(" ")[0] for s in mon["services"]} >= {"API", "Database", "Cloud", "Edge"}


def test_admin_user_management(client, admin, bob):
    users = client.get("/admin/users", headers=admin).json()
    b = next(u for u in users if u["email"] == "bob@example.com")
    assert client.patch(f"/admin/users/{b['id']}", json={"role": "REVIEWER"}, headers=admin).json()["role"] == "Reviewer"
    assert client.patch(f"/admin/users/{b['id']}", json={"role": "USER"}, headers=admin).status_code == 200
    me = next(u for u in users if u["email"] == "admin@privedge.io")
    assert client.patch(f"/admin/users/{me['id']}", json={"is_active": False}, headers=admin).status_code == 400
    assert client.get(f"/admin/users/{b['id']}", headers=admin).json()["email"] == "bob@example.com"


def test_deactivated_user_blocked(client, admin):
    client.post("/auth/register", json={"name": "Zed", "email": "zed@example.com", "password": "Password123"})
    zid = next(u["id"] for u in client.get("/admin/users", headers=admin).json() if u["email"] == "zed@example.com")
    client.patch(f"/admin/users/{zid}", json={"is_active": False}, headers=admin)
    assert client.post("/auth/login", json={"email": "zed@example.com", "password": "Password123"}).status_code == 403


def test_route_toggle_enforced_private_never_goes_cloud(client, admin, alice):
    client.put("/admin/settings", json={"routing": {"edgeEnabled": False}}, headers=admin)
    try:
        r = chat(client, alice, "Analyze this confidential employee salary report.").json()
        assert r["route"] == "human" and not Calls.cloud
    finally:
        client.put("/admin/settings", json={"routing": {"edgeEnabled": True}}, headers=admin)


# ---------- knowledge base / RAG ----------
def test_knowledge_and_rag(client, admin, alice):
    docs = client.get("/knowledge", headers=alice).json()
    assert len(docs) >= 6 and client.get(f"/knowledge/{docs[0]['id']}", headers=alice).json()["content"]
    chat(client, alice, "How do I use the Human Review feature in PrivEdge?")
    assert Calls.cloud and Calls.cloud[-1]["context"]           # RAG context injected on the cloud path


def test_knowledge_upload_blocks_sensitive(client, admin):
    bad = client.post("/admin/knowledge/upload", headers=admin, files={"file": ("x.txt", b"Confidential payroll: my email is a@b.com")})
    assert bad.status_code == 422
    good = client.post("/admin/knowledge/upload", headers=admin, files={"file": ("ok.md", b"Sample public FAQ about opening hours.")}, data={"title": "Hours"})
    assert good.status_code == 201
    assert client.post("/admin/knowledge", json={"title": "t"}, headers=admin).status_code == 201


def test_profile_and_password(client, bob):
    assert client.patch("/auth/me", json={"name": "Bobby"}, headers=bob).json()["name"] == "Bobby"
    assert client.post("/auth/change-password", json={"current_password": "nope", "new_password": "Newpass1234"}, headers=bob).status_code == 400


def test_knowledge_list_search_and_type_filter(client, alice):
    all_docs = client.get("/knowledge", headers=alice).json()
    assert len(all_docs) >= 6
    by_title = client.get("/knowledge?q=troubleshooting", headers=alice).json()
    assert any("troubleshoot" in d["title"].lower() for d in by_title) and len(by_title) < len(all_docs)
    by_content = client.get("/knowledge?q=human+review", headers=alice).json()  # matches inside content, not title/description
    assert any("faq" in d["type"].lower() for d in by_content) and len(by_content) < len(all_docs)
    by_type = client.get("/knowledge?type=FAQ", headers=alice).json()
    assert by_type and all(d["type"] == "FAQ" for d in by_type)
