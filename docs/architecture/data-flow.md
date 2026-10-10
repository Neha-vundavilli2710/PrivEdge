# Data Flow

This document follows a query through PrivEdge from the moment the user presses **Send** to the moment the answer is displayed, and then covers the attachment, RAG, Human Review and supporting flows.

---

## 1. Main query lifecycle

```text
User enters a query in the AI Assistant
        │
        ▼
POST /chat   { message, conversation_id? }          (JWT bearer token)
        │
        ▼
1. Authentication         – valid JWT, active account, idle-session check
2. Input validation       – message 1–4000 characters
3. Load admin settings    – route toggles, auto-routing, RAG, temperature, context window
4. Conversation ownership – existing conversation must belong to the caller (else 404)
        │
        ▼
5. Query analysis         – privacy · sensitivity · complexity · risk · latency · human-required
6. Feature extraction     – one Features object
7. Routing decision       – rule-based (default) or Random Forest + safety guardrails
8. Admin overrides        – Auto-Routing OFF → Human Review; disabled routes handled safely
        │
        ├────────────── EDGE ────────────▶ Ollama (Llama 3.2) with the raw text
        ├────────────── CLOUD ───────────▶ mask → (RAG context) → Gemini
        └────────────── HUMAN ───────────▶ review item + local AI draft; user told "sent for review"
        │
        ▼
9. Response validation    – empty / unsafe / leaked identifiers / length
10. Persistence           – encrypted message + response, routing log, review item (if any)
11. Notifications         – high-risk, backlog or system alert (if enabled)
        │
        ▼
Response → Frontend: answer, route, reason, status, decision levels, scores, router used,
           processing time, validator issues, RAG sources
```

### Step details

| # | Step | Where | Notes |
|---|---|---|---|
| 1 | Authentication | `security/deps.py` | Rejects missing/invalid/expired tokens and deactivated accounts (HTTP 401). If the *Idle Session Timeout* setting is on, a token is also rejected after `SESSION_IDLE_MINUTES` (default 30) of inactivity; `last_active_at` is refreshed on login and on every authenticated request. |
| 2 | Validation | `schemas/schemas.py` | Pydantic enforces length limits (HTTP 422 on failure). |
| 3 | Settings | `services/settings_store.py` | Read on every request, so changes take effect immediately. |
| 5–6 | Analysis & features | `services/feature_extractor.py` | `human_required` is true when the human-required score ≥ `HUMAN_THRESHOLD` (0.60). |
| 7 | Routing | `services/router.py` | See [Intelligent Routing](intelligent-routing.md). |
| 8 | Overrides | `services/chat_service.py` | If *Auto-Routing* is off every request is sent to Human Review. If the chosen route is disabled: a private Edge request goes to Human Review (never Cloud); a non-private Edge request goes to Cloud; a disabled Cloud route goes to Edge; if nothing is available the user receives an explanatory error. |
| Edge | Local processing | `services/edge_ai.py` | Prior turns are included (up to 6 turns, trimmed to the configured context window). If Ollama is down the user gets an error and the data is **not** sent anywhere else. Only a non-private, latency-triggered route may fall back to Cloud. |
| Cloud | Cloud processing | `services/cloud_ai.py` | Query is masked with `mask_text`; history contains only earlier *cloud-route* turns, also masked; RAG context is added if enabled. HTTP errors from Gemini (for example 503 "high demand") are surfaced as a friendly "Cloud AI is currently unavailable" message and raise a system-alert notification. |
| 9 | Validation | `services/response_validator.py` | A failed check returns an error message instead of the answer. |
| 10 | Persistence | `services/chat_service.py` | `messages.message`, `caption`, `response` and `human_reviews.ai_draft/final_response` are Fernet-encrypted. The routing log stores scores and metadata, not content. |

### What the frontend receives

`route`, `reason`, `status` (`completed`, `pending_review`, `error`), `error`, `human_review`, `decision` (levels: privacy, sensitivity, complexity, risk, latency, humanReview, reason), `scores`, `router_used` (`rule` or `ml`), `processing_time`, `validator_issues`, `sources` (RAG titles), `conversation_id`, `message_id`, `attachment_name`.

---

## 2. Dry-run analysis flow

`POST /analyze` runs steps 5–7 only and returns the route, reason, scores and decision levels. It does **not** call Edge AI or Cloud AI and does **not** store anything.

---

## 3. File attachment flow

```text
User attaches a .txt / .md / .pdf (paperclip) with an optional note
        │
        ▼
POST /chat/attachment   multipart: file, message?, conversation_id?
        │
        ▼
Extension allow-list (.txt .md .pdf)  → else 415
Size ≤ 3 MB                           → else 413
Not empty / text extractable          → else 422 (encrypted or scanned PDFs without text are rejected)
Text truncated to 12,000 characters (with a note)
        │
        ▼
Combined text = [optional note] + "[Attached file: <name>]" + extracted text
        │
        ▼
Same pipeline as a typed query (analysis → routing → Edge / Cloud / Human → validation → storage)
```

- The *full* combined text is analysed, so a confidential document is routed to **Edge AI** exactly as pasted confidential text would be.
- The chat bubble shows only the user's note (or `📎 filename`); the extracted content is stored encrypted in `messages.message`.
- The filename is stored in plain text in `messages.attachment_name`.
- No OCR is performed.

---

## 4. Knowledge Base / RAG flow (Cloud path only)

```text
Cloud route selected and "RAG" setting enabled
        │
        ▼
Masked query
        │
        ▼
Published Knowledge Base documents → split into ~350-character chunks
        │
        ▼
TF-IDF (English stop words, sublinear TF) + cosine similarity
        │
        ▼
Top 3 chunks with similarity ≥ 0.10   →   context block "[Title]\ntext"
        │
        ▼
Gemini receives: reference context + masked question (+ masked cloud-only history)
        │
        ▼
Response, plus "sources" (document titles and scores) returned to the UI
```

- RAG never bypasses routing: it happens *after* the router has chosen Cloud, and it uses the *masked* query.
- Administrators' uploads and edits are screened — content whose sensitivity score reaches the sensitivity threshold is rejected (HTTP 422) and not indexed.
- The user-facing Knowledge Base search (`GET /knowledge?q=`) is a separate substring search over title, description and content; the document viewer adds client-side match highlighting.

---

## 5. Human Review flow

```text
Router selects HUMAN  (or Auto-Routing is OFF)
        │
        ▼
Message saved with status PENDING_REVIEW; user sees "Human review is required…"
        │
        ├─ local Edge AI drafts supporting information (best effort; empty if Ollama is down)
        ├─ HumanReview row created (status PENDING)
        └─ notifications: high-risk alert and/or review-backlog alert (if enabled)
        │
        ▼
Reviewer opens Review Queue → opens item (POST /review/{id}/claim → IN_REVIEW)
        │   sees: masked query, user reference (USR-xxxxx), analysis levels, masked AI draft
        ▼
Decision  POST /review/{id}
   approve → final = AI draft (400 if no draft exists)
   modify  → final = reviewer's text (400 if empty)
   reject  → standard "could not be answered" message + optional reviewer note
        │
        ▼
Final text passes the response validator (422 if it fails)
        │
        ▼
Message status REVIEWED, response replaced, review row completed
User notified ("Query reviewed"); the conversation page picks the answer up automatically
```

Status values: message — `COMPLETED`, `PENDING_REVIEW`, `REVIEWED`, `ERROR`; review — `PENDING`, `IN_REVIEW`, `APPROVED`, `MODIFIED`, `REJECTED`. A review already completed, or claimed by another reviewer, returns HTTP 409.

---

## 6. Authentication and session flow

```text
Register / Login  → backend verifies/creates user (bcrypt) → JWT (sub, role, exp) + user profile
Frontend stores the token → every API call sends Authorization: Bearer <token>
Any HTTP 401 (expired token, idle timeout, deactivated account) → frontend signs the user out
AuthGuard → each role is routed to /user/*, /reviewer/* or /admin/*
```

## 7. Notification flow

| Event | Recipient | Created by | Controlled by |
|---|---|---|---|
| Review decision made | The user who asked | `routes/review.py` | Always on |
| High or critical risk query sent to review | Reviewers + admins | `chat_service` | `notifs.highRisk` |
| Cloud/Edge AI failed on a real request | Admins | `chat_service` | `notifs.systemAlerts` |
| Pending reviews ≥ `REVIEW_BACKLOG_THRESHOLD` (default 5) | Reviewers + admins | `chat_service` | `notifs.reviewBacklog` |

Duplicate unread notifications of the same broadcast type are suppressed. The top-bar bell polls every 20 seconds; opening the bell marks everything as read.

## 8. Floating AI Assistant flow

The floating assistant is another front door to the same pipeline: it sends the typed message to `POST /chat` and displays the answer together with a "Processed by: Edge AI / Cloud AI / Human Review" line. It performs no analysis or routing of its own.
