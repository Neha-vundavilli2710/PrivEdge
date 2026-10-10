# Security Documentation

This document lists the security controls **actually implemented** in PrivEdge, how each works, where it lives in the code, and — equally important — what is **not** claimed. For the structural view (layers and trust boundaries) see [Security architecture](../architecture/security-architecture.md).

PrivEdge is an academic prototype. It demonstrates privacy- and risk-aware routing together with sound application-level security practices; it is **not** presented as production-grade security.

---

## 1. Summary

| Control | Status | Code |
|---|---|---|
| Password hashing (bcrypt) | ✅ Implemented | `security/auth.py` |
| JWT authentication | ✅ Implemented | `security/auth.py`, `security/deps.py` |
| Idle-session timeout | ✅ Implemented (Admin setting, on by default) | `security/deps.py` |
| Role-based access control (RBAC) | ✅ Implemented | `security/deps.py`, route dependencies |
| Conversation isolation | ✅ Implemented | `services/chat_service.py`, `routes/chat.py` |
| Application-level encryption of stored content (Fernet) | ✅ Implemented (selected fields) | `security/encryption.py` |
| Data masking | ✅ Implemented (pattern-based) | `security/masking.py`, `services/patterns.py` |
| Privacy analysis and privacy-aware routing | ✅ Implemented | `services/privacy_analyzer.py`, `router.py` |
| Risk-aware routing / Human Review | ✅ Implemented | `services/risk_analyzer.py`, `router.py` |
| Response validation | ✅ Implemented | `services/response_validator.py` |
| Audit logging (togglable) and routing logs | ✅ Implemented | `services/audit.py`, `routing_logs` |
| Input validation and upload checks | ✅ Implemented | `schemas/schemas.py`, `services/document_extract.py` |
| CORS allow-list | ✅ Implemented | `main.py`, `ALLOWED_ORIGINS` |
| Multi-factor authentication | ❌ Not implemented | — |
| HTTPS / TLS | ❌ Not part of the project (development uses `http://localhost`) | — |
| Rate limiting / login lockout | ❌ Not implemented | — |
| End-to-end encryption | ❌ Not implemented | — |

## 2. Authentication

### Passwords
- Stored only as **bcrypt** hashes (`bcrypt.hashpw` with a per-password salt); the plain password is never stored or logged.
- Registration requires 8–128 characters. bcrypt considers only the first 72 bytes, and the code truncates input to 72 bytes consistently on hash and verify.
- Changing a password requires the current password (`POST /auth/change-password`).

### JWT
- Issued at login and registration with claims `sub` (user id), `role` and `exp`; signed with `JWT_SECRET` using `JWT_ALGORITHM` (default HS256) via PyJWT.
- Lifetime is `JWT_EXPIRE_MINUTES` (default 480).
- Every protected route verifies signature and expiry, loads the user, and rejects the request (HTTP 401) if the user no longer exists or has been **deactivated** — so deactivation takes effect immediately, even for tokens already issued.
- **Configuration requirement:** `JWT_SECRET` must be replaced with a long random value in `.env`. The built-in fallback exists only so the application starts in development.

### Idle-session timeout
- Controlled by the *Idle Session Timeout* admin setting (enabled by default) and `SESSION_IDLE_MINUTES` (default 30).
- The user's `last_active_at` is set at login and refreshed on each authenticated request. If the gap exceeds the limit, the request is rejected with HTTP 401 ("Session expired due to inactivity"), and the frontend signs the user out.
- This is separate from, and in addition to, the JWT's own expiry.

### Not implemented
- No MFA. (An Admin settings key `security.mfa` still exists in the backend defaults but is **not enforced**, and the Admin Settings screen no longer displays an MFA toggle.)
- No password-reset or e-mail verification flow, no account lockout, and no refresh tokens.
- There is no server-side logout endpoint; signing out removes the token in the browser. A stolen token stays valid until it expires, the idle timeout triggers, or the account is deactivated.

## 3. Authorization (RBAC)

| Role | Permissions |
|---|---|
| USER | Chat, attachments, `/analyze`, own conversations, Knowledge Base browsing, own statistics and notifications, own profile. |
| REVIEWER | USER permissions + review endpoints (`/review/*`); history and statistics limited to their own reviews. |
| ADMIN | Review endpoints + all `/admin/*` endpoints (users, logs, analytics, monitoring, settings, Knowledge Base management). |

- Enforced server-side by FastAPI dependencies (`require_reviewer` = REVIEWER or ADMIN; `require_admin` = ADMIN) on every protected endpoint.
- The `role` field cannot be supplied at registration; every self-registered account is a USER. Role changes are made only by an admin.
- Admins cannot deactivate or demote their own account.
- Role and status changes are audit-logged.

## 4. Conversation isolation and secure history access

- Each conversation has an owner (`conversations.user_id`). Reading, renaming, deleting or continuing a conversation checks the owner; a non-owner receives **404**, so the existence of other users' conversations is not revealed.
- The conversation list, statistics and notifications are scoped to the caller.
- History sent to a language model is built only from the caller's own conversation. For Cloud AI it is further restricted to earlier **Cloud-route** turns and is masked, so private Edge or Human-Review exchanges never reach Gemini through context.
- Reviewers see a pseudonymous reference (`USR-xxxxx`), not the user's name or e-mail.
- Deleting a conversation removes its messages, routing logs and review rows.

## 5. Encryption (application-level, at rest)

- **Algorithm/library:** Fernet from the `cryptography` package (authenticated symmetric encryption).
- **Fields encrypted:** `messages.message`, `messages.caption`, `messages.response`, `human_reviews.ai_draft`, `human_reviews.final_response`.
- **Key:** `ENCRYPTION_KEY` (generate with `Fernet.generate_key()`). If unset, a key is derived from `JWT_SECRET` — acceptable for development only. Changing the key makes previously stored content unreadable (it is shown as unreadable rather than crashing).
- **What this protects:** conversation content in a copied or leaked database file.
- **What it does not do:** it is not whole-database encryption and **not end-to-end encryption**; the server decrypts content to process it. Other fields (titles, filenames, user profile data, Knowledge Base documents, routing metadata, audit log) are stored in plain text — see [Database schema](../database/database-schema.md).

## 6. Data masking

`mask_text()` replaces matches of the project's regular expressions with placeholders: `[EMAIL]`, `[PHONE]`, `[CARD]`, `[AADHAAR]`, `[SSN]`, `[ACCOUNT_NO]`, `[EMPLOYEE_ID]`, `[NAME]` (for "my name is …").

Applied to:
1. text sent to **Cloud AI**, and to the cloud-route history sent with it;
2. the query, AI draft and context shown to **reviewers**;
3. automatically generated **conversation titles**;
4. model **output** that contains identifiers not present in the user's own input (response validator).

**Limits (by design):** masking is pattern-based. It does not detect arbitrary sensitive prose (for example, a described medical condition) or names outside the "my name is …" pattern; NER entities, when spaCy is installed, are detected but not used for masking. This is why sensitive queries are *routed to local Edge AI* rather than relying on masking.

## 7. Privacy analysis and privacy-aware routing

- The privacy analyzer scores every query using regex, keyword-category and context analysis (spaCy NER optional) and produces privacy and sensitivity scores plus PII types.
- Queries at or above the privacy/sensitivity thresholds are routed to **Edge AI** — the raw text is processed by the local Ollama model and not sent to the cloud.
- A private query is **never re-routed to Cloud** automatically: if Edge AI is down, the user gets an error; if the Edge route is disabled by an admin, the request goes to Human Review.
- Knowledge Base documents are screened with the same analyzer before being saved, so sensitive content is not indexed for RAG (which feeds the Cloud path).

## 8. Risk-aware routing and human oversight

- The risk analyzer detects medical, legal, financial, HR and safety questions that seek a decision, plus "high-stakes" phrasing. High risk or a human-required flag routes the query to **Human Review** instead of automatic answering.
- Reviewer actions (view, claim, approve, modify, reject) are audit-logged; the reviewer's final text is validated before delivery.
- The *Auto-Routing OFF* setting sends **all** requests to Human Review (manual oversight mode).

## 9. Response validation

Before any answer is returned, `validate_response()` checks that it is non-empty and long enough, that a Human-Review answer has been approved, that it does not match a small unsafe-content blocklist, that it is not excessively long (truncated if so), and that it does not contain identifiers (e-mail, phone, card, account numbers and so on) that were not in the user's own query — such identifiers are masked. A failed check returns an error message instead of the answer. The blocklist is deliberately minimal and is not a content-moderation system.

## 10. Audit logging and routing logs

| Log | Records | Notes |
|---|---|---|
| `audit_logs` | register, login, failed login, password change, review viewed / claimed / approved / modified / rejected, user role/status updates, settings changes, Knowledge Base create / upload / update / archive | Written only when the *Comprehensive Audit Logging* setting is on (default). |
| `routing_logs` | Scores, domain, selected route, router used, reason, processing time per request | Always written. Contains **no message content**. |

Admins can inspect routing metadata in Query Logs and Routing Analytics; no admin endpoint returns arbitrary users' message text.

## 11. Input validation and upload safety

- Pydantic limits: chat messages 1–4000 characters, passwords 8–128, titles and descriptions bounded; invalid input returns HTTP 422.
- Chat attachments: allow-list `.txt`, `.md`, `.pdf`; ≤ 3 MB; text is only extracted (never executed); encrypted or text-less PDFs are rejected; text is truncated to 12,000 characters.
- Knowledge Base uploads: `.txt` / `.md` only, ≤ 1 MB, screened for sensitive content.
- CORS: only origins listed in `ALLOWED_ORIGINS` (defaults to the local Vite dev server).

## 12. Secrets and configuration

- Secrets (`GEMINI_API_KEY`, `JWT_SECRET`, `ENCRYPTION_KEY`, seed passwords) are read from `backend/.env`, which is excluded from version control by `.gitignore`, as are the SQLite database files, virtual environments and `frontend/.env.local`. `.env.example` contains placeholders and development defaults only — no real secrets.
- Seeded admin and reviewer accounts use passwords from `.env`; **change them** before any shared use.
- The Gemini API key is used server-side only and is never sent to the browser.

## 13. Known security limitations

1. The JWT is stored in the browser's `localStorage` (convenient, but readable by injected scripts if an XSS flaw existed).
2. Development runs over plain HTTP; no TLS termination is configured.
3. No rate limiting or lockout, so login and chat endpoints are not protected against brute force or abuse.
4. No MFA, password reset, e-mail verification, token revocation or refresh tokens.
5. Field-level encryption covers conversation content only; the SQLite file and other tables are unencrypted, and the derived-key fallback is weak.
6. Masking and the privacy analyzers are heuristic; they can miss unstructured sensitive information and can over-trigger (see [ML evaluation](../machine-learning/ml-evaluation.md)).
7. Cloud AI (Gemini) is a third-party service; masked text and Knowledge Base context sent to it are subject to that provider's terms.
8. No independent security audit or penetration test has been performed.

See also: [Limitations](../project/limitations.md) · [Future enhancements](../project/future-enhancements.md)
