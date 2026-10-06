import os
from pathlib import Path

DB = Path(__file__).parent / "test.db"
if DB.exists():
    DB.unlink()
os.environ.update({"DATABASE_URL": f"sqlite:///{DB}", "GEMINI_API_KEY": "test-key", "ROUTER_MODE": "rule", "JWT_SECRET": "test-secret"})

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services import cloud_ai, edge_ai
from app.services.llm_errors import LLMUnavailable


class Calls:
    cloud: list = []
    edge: list = []
    edge_down = False
    cloud_down = False


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture(autouse=True)
def fake_llms(monkeypatch):
    Calls.cloud, Calls.edge, Calls.edge_down, Calls.cloud_down = [], [], False, False

    def cloud(prompt, history=None, context="", temperature=0.7):
        if Calls.cloud_down:
            raise LLMUnavailable("Cloud AI is currently unavailable.")
        Calls.cloud.append({"prompt": prompt, "history": history or [], "context": context})
        return f"CLOUD ANSWER to: {prompt[:40]}"

    def edge(prompt, history=None, temperature=0.7, system=None):
        if Calls.edge_down:
            raise LLMUnavailable("Edge AI (Ollama) is not running on this machine.")
        Calls.edge.append({"prompt": prompt, "history": history or []})
        return f"EDGE ANSWER to: {prompt[:40]}"

    monkeypatch.setattr(cloud_ai, "generate", cloud)
    monkeypatch.setattr(edge_ai, "generate", edge)
    return Calls


def _login(client, email, password):
    r = client.post("/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture(scope="session")
def admin(client):
    return _login(client, "admin@privedge.io", "Admin@12345")


@pytest.fixture(scope="session")
def reviewer(client):
    return _login(client, "reviewer@privedge.io", "Reviewer@12345")


@pytest.fixture(scope="session")
def alice(client):
    client.post("/auth/register", json={"name": "Alice", "email": "alice@example.com", "password": "Password123"})
    return _login(client, "alice@example.com", "Password123")


@pytest.fixture(scope="session")
def bob(client):
    client.post("/auth/register", json={"name": "Bob", "email": "bob@example.com", "password": "Password123"})
    return _login(client, "bob@example.com", "Password123")
