# System Architecture

This document describes the architecture of **PrivEdge** as implemented in the current codebase.

**Terminology.** *PrivEdge* is the complete secure Edge–Cloud conversational AI framework. The *AI Assistant* is the conversational interface inside PrivEdge. The *Intelligent Router* is the decision-making component. *Edge AI* is local processing with Ollama + Llama 3.2. *Cloud AI* is Google Gemini. *Human Review* is the manual / high-risk path. The user never chooses between these paths; the backend analyses the query and the Intelligent Router decides.

---

## 1. The architecture in one picture

```text
User
 │
 ▼
React Frontend  (AI Assistant, dashboards, reviewer & admin screens)
 │   REST/JSON + JWT bearer token
 ▼
FastAPI Backend  (authentication · RBAC · input validation)
 │
 ▼
Privacy Analysis ─┐
Sensitivity ──────┤
Complexity ───────┼─▶ Feature Extraction ─▶ Intelligent Router ─┬─▶ Edge AI       (Ollama + Llama 3.2)
Risk ─────────────┤                          (rule-based or      ├─▶ Cloud AI      (Google Gemini)
Latency ──────────┘                           Random Forest      └─▶ Human Review  (reviewer workflow)
                                              + safety guardrails
                                              + admin route toggles)
 │
 ▼
Response Validation
 │
 ▼
Database / Logs  (SQLite: messages, routing logs, reviews, audit log)
 │
 ▼
Frontend  (response + route badge + decision card)
```

## 2. Runtime topology

PrivEdge runs as three local processes plus one external service:

| Component | Technology | Default address | Notes |
|---|---|---|---|
| Frontend | React + TypeScript + Vite | `http://localhost:5173` | Calls the backend at `VITE_API_URL` (default `http://localhost:8000`). |
| Backend | FastAPI + Uvicorn | `http://127.0.0.1:8000` | Swagger/OpenAPI at `/docs`. CORS limited to `ALLOWED_ORIGINS`. |
| Edge AI | Ollama + Llama 3.2 (`llama3.2:3b`) | `http://localhost:11434` | Runs on the same machine as the backend. |
| Database | SQLite file (`privedge.db`) | local file | Created automatically at startup. |
| Cloud AI | Google Gemini REST API | external | Requires `GEMINI_API_KEY` and internet access; subject to Gemini availability. |

## 3. Backend components

The backend lives in `backend/app/`.

| Layer | Module(s) | Responsibility |
|---|---|---|
| Application | `main.py` | Creates the FastAPI app, enables CORS, registers routers; on startup creates tables, runs the additive migration (`db/migrate.py`) and seeds data (`db/seed.py`). |
| Configuration | `core/config.py` | Typed settings read from `.env` (keys, models, thresholds, JWT, timeouts, router mode). |
| API routes | `routes/` | `health`, `auth`, `chat`, `review`, `dashboard`, `admin`, `knowledge` (user + admin), `notifications`. Thin HTTP layer. |
| Request schemas | `schemas/schemas.py` | Pydantic models with length/pattern validation. |
| Security | `security/auth.py`, `deps.py`, `encryption.py`, `masking.py` | Password hashing + JWT; authentication/RBAC dependencies; Fernet encryption; regex masking. |
| Analysis | `services/privacy_analyzer.py`, `risk_analyzer.py`, `complexity_analyzer.py`, `patterns.py` | Score each query (see below). |
| Feature extraction | `services/feature_extractor.py` | Combines analyzer outputs (+ latency need) into one `Features` object. |
| Decision | `services/router.py`, `services/policy.py` | Rule-based and ML routing, safety guardrails, score→level helpers. |
| Pipeline | `services/chat_service.py` | Orchestrates analysis → routing → execution → validation → persistence → notifications. |
| AI paths | `services/edge_ai.py`, `cloud_ai.py`, `llm_errors.py` | Ollama and Gemini clients; a shared `LLMUnavailable` error. |
| RAG | `services/rag_service.py` | TF-IDF retrieval over published Knowledge Base documents. |
| Validation | `services/response_validator.py` | Final safety/quality check on every response. |
| Attachments | `services/document_extract.py` | Text extraction from `.txt`, `.md`, `.pdf`. |
| Operations | `services/settings_store.py`, `notifications.py`, `audit.py`, `analytics.py` | Admin settings, in-app notifications, audit log, dashboard aggregations. |
| Persistence | `db/database.py`, `db/models.py` | SQLAlchemy engine/session and ORM models. |
| ML | `ml/` | Dataset generation, training, evaluation, trained model (`routing_model.joblib`), reports. |

### What each analyzer produces

| Analyzer | Output | Technique (as implemented) |
|---|---|---|
| Privacy / sensitivity | `privacy_score`, `sensitivity_score`, `contains_pii`, PII types, categories | Regex patterns (email, phone, card, Aadhaar, SSN, account no., employee ID, "my name is …"), keyword categories (financial, medical, confidential, personal, identification), context cue ("analyze this document"). spaCy NER is used only if installed. |
| Complexity | `complexity_score` | Query length, task verbs, technical terms, clause/structure cues. |
| Risk | `risk_score`, `human_required_score`, `domain` | Domain detection (medical, legal, financial, hr, safety, general) + decision-seeking phrasing + "high-stakes" cues. |
| Latency | `latency_score` | Urgency words ("quick", "asap", "tl;dr"…) and very short queries. |

## 4. Frontend components

The frontend lives in `frontend/src/`.

| Area | Location | Responsibility |
|---|---|---|
| Routing & guard | `App.tsx` | Public routes plus `/user/*`, `/reviewer/*`, `/admin/*`. `AuthGuard` redirects unauthenticated visitors to `/login` and each role to its own area. |
| API client | `api/client.ts`, `api/types.ts` | `fetch` wrapper that adds the JWT, normalises errors, and triggers sign-out on HTTP 401. |
| State | `contexts/AppContext.tsx`, `ThemeContext.tsx` | Authenticated user/role, login/register/logout, theme. |
| Layout | `components/layout/` | `Layout`, `Sidebar` (role-specific navigation), `TopBar` (notification bell, profile menu). |
| Shared UI | `components/shared/` | `RouteBadge`, `DecisionCard`, `StatCard`, `FloatingAssistant`. |
| Pages | `pages/public`, `pages/user`, `pages/reviewer`, `pages/admin` | One page per screen (see the README role table). |
| Tests | `**/*.test.tsx`, `test/` | Vitest + React Testing Library suites with the API mocked. |

The **frontend never decides the route.** It sends the query to `POST /chat` (or `/chat/attachment`) and renders what the backend returns: the answer, the route badge and the *decision card* (privacy, sensitivity, complexity, risk, latency, human-review flag and the reason).

## 5. The three processing paths

| Path | Used when | What happens |
|---|---|---|
| **Edge AI** | Privacy or sensitivity is high, or a fast response is requested for a simple query | The raw text is sent to the local Ollama model; nothing goes to the cloud. |
| **Cloud AI** | General or complex queries with no privacy concern | Identifiers are masked, cloud-only history and optional RAG context are added, and Gemini answers. |
| **Human Review** | Risk is high or human judgement is required (or Auto-Routing is switched off by an admin) | A review item is created with a locally generated draft; a reviewer approves, modifies or rejects. |

## 6. Cross-cutting capabilities

- **Admin settings** (`settings_store.py`) — 12 settings are enforced by the backend: Edge/Cloud/Human enablement, Auto-Routing, audit logging, idle-session timeout, RAG, temperature, context window and three notification types. See [Intelligent Routing](intelligent-routing.md) and [Security Architecture](security-architecture.md).
- **Notifications** — in-app only (review completed, high-risk query, system alert, review backlog), delivered through the bell in the top bar.
- **Audit log** — records authentication, account, review and admin events; routing decisions are stored in `routing_logs`.
- **Analytics** — user, reviewer and admin dashboards are computed from `routing_logs` and `human_reviews`.

## 7. Key design decisions

1. **Decision before generation.** The route is chosen before any model receives the text.
2. **Fail safe, never fail open.** If Edge AI is unavailable for a private query, PrivEdge returns an error rather than falling back to the cloud. Cloud fallback exists only for non-private, latency-triggered Edge routes.
3. **Guardrails around learned behaviour.** The ML router can never route a private query to Cloud or a high-risk query away from Human Review.
4. **Least privilege for people.** Reviewers see masked text; administrators see routing metadata, not message content.
5. **Replaceable AI providers.** Edge and Cloud clients are small, isolated modules (`edge_ai.py`, `cloud_ai.py`) with one shared error type.

## 8. Related documents

[Data flow](data-flow.md) · [Intelligent routing](intelligent-routing.md) · [Security architecture](security-architecture.md) · [Database schema](../database/database-schema.md) · [API documentation](../api/api-documentation.md)
