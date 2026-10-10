# Security Architecture

This document explains **how security is structured** in PrivEdge. It covers only mechanisms that exist in the current implementation. Control-by-control detail, and an explicit list of what is *not* claimed, is in [Security documentation](../security/security-documentation.md).

---

## 1. Security layers

```text
Browser (React)                       JWT held by the frontend; 401 → automatic sign-out
      │  HTTP (development: http://localhost)
      ▼
CORS allow-list                       only origins in ALLOWED_ORIGINS may call the API
      ▼
Authentication                        JWT signature + expiry, account must be active,
                                      idle-session timeout (if enabled)
      ▼
Authorization (RBAC)                  USER / REVIEWER / ADMIN dependencies on each route
      ▼
Input validation                      Pydantic length / pattern limits; attachment type + size checks
      ▼
Privacy-aware routing                 private → Edge (local); high-risk → Human Review
      ▼
Data masking                          identifiers masked before Cloud AI, in reviewer views, in titles
      ▼
Response validation                   blocks unsafe output, masks leaked identifiers
      ▼
Encrypted storage                     message text, responses, AI drafts (Fernet)
      ▼
Audit & routing logs                  who did what; which route and why
```

## 2. Trust boundaries — what leaves the machine

```text
 ┌────────────────────────── local machine / institution ─────────────────────────┐
 │  Frontend ──▶ Backend ──▶ Ollama (Edge AI)        raw text stays here           │
 │                  │                                                               │
 │                  ├──▶ SQLite  (message text, response, drafts encrypted)         │
 │                  │                                                               │
 └──────────────────┼───────────────────────────────────────────────────────────────┘
                    │  only on the Cloud route
                    ▼
            Google Gemini API   receives: MASKED query, MASKED cloud-route history,
                                 optional Knowledge Base context
                                 never receives: Edge or Human-Review turns,
                                 unmasked identifiers detected by the patterns
```

The strongest privacy path is **Edge AI** — the raw text is processed locally. **Masking is a secondary protection** for the Cloud path and does not replace Edge routing: it only covers patterns the masking rules recognise.

## 3. Authentication (who are you?)

- Registration and login produce a **JWT** (claims: user id, role, expiry; algorithm `JWT_ALGORITHM`, default HS256; lifetime `JWT_EXPIRE_MINUTES`, default 480).
- Passwords are stored only as **bcrypt** hashes.
- Every protected route resolves the caller through `get_current_user`, which rejects missing, invalid or expired tokens and **deactivated accounts** (HTTP 401).
- **Idle-session timeout** (Admin setting, on by default): a token is also rejected after `SESSION_IDLE_MINUTES` (default 30) without activity. This is independent of the token's own expiry. `last_active_at` is refreshed on login and on each authenticated request.
- The frontend signs the user out automatically on any 401.

Multi-factor authentication is **not implemented**.

## 4. Authorization — RBAC (what may you do?)

| Role | Backend access |
|---|---|
| **USER** | `/chat`, `/chat/attachment`, `/analyze`, own conversations, Knowledge Base browsing, own statistics, own notifications, own profile. |
| **REVIEWER** | Everything a USER has, plus the review endpoints (`/review/*`). Review history and statistics are limited to the reviewer's own work. |
| **ADMIN** | Review endpoints plus all `/admin/*` endpoints (users, logs, analytics, monitoring, settings, Knowledge Base management). |

- The role is stored in the database and **cannot be chosen at registration** (everyone registers as USER).
- An admin cannot deactivate or demote their own account.
- The frontend's route guard improves usability, but authorization is enforced by the backend on every request.

## 5. Conversation isolation

- Every conversation belongs to one user. Requests for another user's conversation (read, rename, delete, or continuing it via `/chat`) return **404**, so existence is not revealed.
- Conversation history sent to a model is built only from the caller's own conversation. For Cloud AI it additionally excludes earlier Edge and Human-Review turns and is masked.
- Reviewers identify requesters only by a reference such as `USR-00042`.

## 6. Privacy-aware routing as a security control

Routing is itself a data-protection mechanism: queries scoring high on privacy or sensitivity are processed by local Edge AI, high-risk queries go to people, and a private query is never silently re-routed to the cloud when Edge AI or an admin toggle prevents the normal path. See [Intelligent routing](intelligent-routing.md).

## 7. Encryption

- **Application-level encryption at rest** with Fernet (the `cryptography` library) for: `messages.message`, `messages.caption`, `messages.response`, `human_reviews.ai_draft` and `human_reviews.final_response`.
- The key is `ENCRYPTION_KEY`; if it is unset, a key is derived from `JWT_SECRET` (acceptable for development only).
- This is *field-level* encryption in the application — it is **not** whole-database encryption and **not** end-to-end encryption. The server decrypts content to process it.

## 8. Data masking

`mask_text()` replaces text matching the project's patterns with placeholders such as `[EMAIL]`, `[PHONE]`, `[CARD]`, `[AADHAAR]`, `[SSN]`, `[ACCOUNT_NO]`, `[EMPLOYEE_ID]` and `[NAME]` (for "my name is …"). It is applied: before text goes to Cloud AI; to cloud-route history; to the query, draft and context shown to reviewers; and to auto-generated conversation titles. The response validator also masks identifiers that appear in a model's output but were not in the user's own input.

## 9. Audit logging and routing logs

- **`audit_logs`** records: register, login, failed login, password change, review viewed / claimed / approved / modified / rejected, user role or status changes, settings changes, and Knowledge Base create / upload / update / archive.
- **`routing_logs`** records, for every chat request: the scores, selected route, router used, reason and processing time — **not** the message content.
- The *Comprehensive Audit Logging* admin setting controls whether `audit_logs` entries are written; `routing_logs` are always written.

## 10. Security-related administrator settings

| Setting | Enforced by the backend? |
|---|---|
| Audit logging | Yes — suppresses `audit_logs` writes when off. |
| Idle session timeout | Yes — enables/disables the idle check in `get_current_user`. |
| Edge / Cloud / Human route enablement, Auto-Routing | Yes — see [Intelligent routing](intelligent-routing.md). |
| Notification toggles (high-risk, system alerts, review backlog) | Yes — gate in-app notifications. |

The Admin Settings screen no longer exposes an MFA toggle. The backend still stores a placeholder `security.mfa` flag that is **not enforced**.

## 11. What administrators and reviewers can see

| Data | Reviewer | Admin |
|---|---|---|
| Masked query text and masked AI draft | ✅ (for items they review) | via review endpoints only |
| Routing scores, route, reason, processing time | analysis levels for reviewed items | ✅ (Query Logs, Routing Analytics) |
| Message content of arbitrary conversations | ❌ | ❌ (no endpoint exposes it) |
| User list, roles, status | ❌ | ✅ |

## 12. Scope

PrivEdge is an academic prototype. HTTPS termination, rate limiting, secret management, multi-factor authentication and database-level encryption are not part of the current implementation — see [Limitations](../project/limitations.md).
