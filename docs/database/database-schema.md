# Database Schema

This document describes the database exactly as defined by the current ORM models in `backend/app/db/models.py`.

## 1. Overview

- **Database engine:** the academic implementation uses **SQLite**. The default connection string is `DATABASE_URL=sqlite:///./privedge.db`, so the database is a single local file created automatically on first start.
- **Access layer:** SQLAlchemy 2.0 ORM. Tables are created at startup with `Base.metadata.create_all()`.
- **Migration:** there is no migration framework. `backend/app/db/migrate.py` runs at startup and adds a small, fixed set of *columns that were introduced after the first version* to tables that already exist (`users.last_active_at`, `messages.caption`, `messages.attachment_name`), so an older `privedge.db` keeps working.
- **Seed data:** on first start `db/seed.py` creates one admin account, one reviewer account and six starter Knowledge Base documents.
- **Timestamps:** all date-time columns use a custom `UTCDateTime` type that always returns timezone-aware UTC values.
- **Other databases:** the models use portable SQLAlchemy types, but only SQLite is configured and tested in this project (no PostgreSQL driver is included).

Nine tables exist:

| Table | Purpose | Origin |
|---|---|---|
| `users` | Accounts, roles, status | Core |
| `conversations` | A user's chat threads | Core |
| `messages` | Each question/answer exchange | Core |
| `routing_logs` | Scores and decision for each exchange | Core |
| `human_reviews` | Review queue and outcomes | Core |
| `knowledge_documents` | Knowledge Base for RAG | Project extension |
| `audit_logs` | Security / admin event trail | Core (audit logging) |
| `system_settings` | Admin settings (one JSON row) | Project extension |
| `notifications` | In-app notifications | Project extension |

## 2. Entity-relationship overview

```text
users ──────────────┬──< conversations ──< messages ──┬── 1:1 ── routing_logs
(user_id)           │   (user_id)          (conversation_id)    └── 1:1 ── human_reviews
   │                │                                                       │ reviewer_id
   │                └──< routing_logs.user_id                               ▼
   │                                                                      users
   └──< notifications.user_id   (nullable: role-wide notifications have no user_id)

knowledge_documents   – standalone (read by the RAG service)
audit_logs            – standalone (user_id stored as a plain integer, no foreign key)
system_settings       – standalone key/value (key "settings" holds the admin settings as JSON)
```

Legend: `──<` one-to-many, `── 1:1 ──` one-to-one.

## 3. Tables

### 3.1 `users`

| Column | Type | Constraints / default | Notes |
|---|---|---|---|
| `user_id` | Integer | **PK** | |
| `name` | String(120) | required | |
| `email` | String(255) | **unique**, indexed | Stored lower-case. |
| `password_hash` | String(255) | required | bcrypt hash; the plain password is never stored. |
| `role` | String(20) | default `USER` | `USER`, `REVIEWER` or `ADMIN`. |
| `is_active` | Boolean | default `true` | Deactivated accounts cannot log in or use existing tokens. |
| `created_at` | UTCDateTime | default now | |
| `last_active_at` | UTCDateTime | nullable | Refreshed at login and on each authenticated request; used by the idle-session timeout. |

### 3.2 `conversations`

| Column | Type | Constraints / default | Notes |
|---|---|---|---|
| `conversation_id` | Integer | **PK** | |
| `user_id` | Integer | **FK → users.user_id**, indexed | Owner; all access is checked against it. |
| `title` | String(255) | default `New conversation` | Derived from the first message with identifiers masked; **not encrypted**. Can be renamed. |
| `created_at`, `updated_at` | UTCDateTime | default now; `updated_at` auto-updates | |

Relationship: one conversation has many `messages` (`cascade = all, delete-orphan`, ordered by `message_id`).

### 3.3 `messages`

One row per question/answer exchange.

| Column | Type | Constraints / default | Notes |
|---|---|---|---|
| `message_id` | Integer | **PK** | |
| `conversation_id` | Integer | **FK → conversations.conversation_id**, indexed | |
| `message` | Text | required | **Encrypted (Fernet).** Full text analysed and sent to the model, including extracted attachment text. |
| `caption` | Text | default `""` | **Encrypted.** What the user typed / what the chat bubble shows. |
| `attachment_name` | String(255) | nullable | Attachment file name, **not encrypted**. |
| `response` | Text | default `""` | **Encrypted.** The answer, the pending-review notice, or the final reviewed answer. |
| `route` | String(10) | default `cloud` | `edge`, `cloud` or `human`. |
| `status` | String(20) | default `COMPLETED` | `COMPLETED`, `PENDING_REVIEW`, `REVIEWED`, `ERROR`. |
| `timestamp` | UTCDateTime | default now | |

### 3.4 `routing_logs`

The research/evaluation record of each decision. It contains **scores and metadata, not message content**.

| Column | Type | Constraints / default | Notes |
|---|---|---|---|
| `routing_id` | Integer | **PK** | |
| `message_id` | Integer | **FK → messages.message_id**, **unique**, indexed | One log per message. |
| `user_id` | Integer | **FK → users.user_id**, indexed | |
| `privacy_score`, `sensitivity_score`, `complexity_score`, `risk_score`, `latency_score` | Float | required | 0–1. |
| `human_required` | Boolean | default `false` | |
| `domain` | String(30) | default `general` | `general`, `medical`, `legal`, `financial`, `hr`, `safety`. |
| `selected_route` | String(10) | required | `edge`, `cloud`, `human`. |
| `router_used` | String(10) | default `rule` | `rule` or `ml`. |
| `reason` | Text | default `""` | Human-readable explanation of the decision. |
| `processing_time` | Float | nullable | Seconds; empty for Human Review. |
| `timestamp` | UTCDateTime | default now | |

### 3.5 `human_reviews`

| Column | Type | Constraints / default | Notes |
|---|---|---|---|
| `review_id` | Integer | **PK** | Displayed as `REV-001`, `REV-002`, … |
| `message_id` | Integer | **FK → messages.message_id**, **unique**, indexed | |
| `reviewer_id` | Integer | **FK → users.user_id**, nullable | Set when the item is claimed or decided. |
| `status` | String(20) | default `PENDING` | `PENDING`, `IN_REVIEW`, `APPROVED`, `MODIFIED`, `REJECTED`. |
| `review_comment` | Text | default `""` | Reviewer's note. |
| `ai_draft` | Text | default `""` | **Encrypted.** Draft produced locally by Edge AI. |
| `final_response` | Text | default `""` | **Encrypted.** The response delivered to the user. |
| `created_at` | UTCDateTime | default now | |
| `completed_at` | UTCDateTime | nullable | Used for review-time analytics. |

### 3.6 `knowledge_documents` (project extension)

| Column | Type | Constraints / default | Notes |
|---|---|---|---|
| `doc_id` | Integer | **PK** | |
| `title` | String(255) | required | |
| `doc_type` | String(30) | default `Guide` | Category (Guide, Support, Security, FAQ, Technical, Legal, …). |
| `description` | Text | default `""` | |
| `content` | Text | default `""` | Plain text; used by RAG and search. **Not encrypted.** |
| `version` | String(20) | default `1.0.0` | |
| `status` | String(20) | default `Published` | `Published`, `Draft`, `Archived`. Only *Published* documents are visible to users and used by RAG; "delete" in the admin UI archives. |
| `updated_at` | UTCDateTime | default now; auto-updates | |

### 3.7 `audit_logs`

| Column | Type | Constraints / default | Notes |
|---|---|---|---|
| `audit_id` | Integer | **PK** | |
| `user_id` | Integer | nullable | Plain integer — deliberately **not** a foreign key, so audit rows survive user changes. |
| `action` | String(60) | required | e.g. `login`, `login_failed`, `register`, `password_changed`, `review_claimed`, `review_approve`, `user_updated`, `settings_changed`, `knowledge_created`. |
| `detail` | Text | default `""` | Short description (e.g. email, review code). |
| `timestamp` | UTCDateTime | default now | |

Writing to this table is controlled by the *Comprehensive Audit Logging* admin setting.

### 3.8 `system_settings` (project extension)

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `key` | String(60) | **PK** | The application uses a single row, `settings`. |
| `value` | Text | default `""` | JSON with groups `routing`, `security`, `ai`, `notifs`. Missing values fall back to built-in defaults. |

### 3.9 `notifications` (project extension)

| Column | Type | Constraints / default | Notes |
|---|---|---|---|
| `notification_id` | Integer | **PK** | |
| `user_id` | Integer | **FK → users.user_id**, nullable, indexed | Set for a notification addressed to one person. |
| `roles` | String(40) | nullable | For broadcast notifications, e.g. `reviewer,admin` or `admin`. |
| `type` | String(30) | required | `review_completed`, `high_risk`, `system_alert`, `review_backlog`. |
| `title` | String(120) | required | |
| `message` | String(500) | required | |
| `read` | Boolean | default `false` | Marked read for everything visible to the caller when the bell is opened. |
| `created_at` | UTCDateTime | default now | |

A notification has either `user_id` (personal) or `roles` (broadcast), not both.

## 4. Relationships and deletion behaviour

| Relationship | Cardinality | Notes |
|---|---|---|
| `users` → `conversations` | 1 : many | Owner check on every access. |
| `conversations` → `messages` | 1 : many | Deleting a conversation deletes its messages (ORM cascade). |
| `messages` → `routing_logs` | 1 : 1 | |
| `messages` → `human_reviews` | 1 : 1 | Only for messages routed to Human Review. |
| `users` → `human_reviews` (`reviewer_id`) | 1 : many | The reviewer who handled the item. |
| `users` → `notifications` | 1 : many (optional) | Broadcast rows have no user. |

**User-initiated deletion.** `DELETE /conversations/{id}` removes the conversation, its messages, its routing logs and any review rows for those messages. Notifications and audit-log entries are not removed.

## 5. What is encrypted and what is not

| Encrypted (Fernet, application level) | Stored in plain text |
|---|---|
| `messages.message`, `messages.caption`, `messages.response` | `conversations.title` (masked), `messages.attachment_name`, `messages.route/status` |
| `human_reviews.ai_draft`, `human_reviews.final_response` | `human_reviews.review_comment` |
| | `routing_logs.*` (scores, metadata, reason — no content) |
| | `users.*` except the password (hashed), `knowledge_documents.*`, `audit_logs.*`, `notifications.*` |

## 6. Seed data

| Item | Detail |
|---|---|
| Admin | `admin@privedge.io` (password from `SEED_ADMIN_PASSWORD`) |
| Reviewer | `reviewer@privedge.io` (password from `SEED_REVIEWER_PASSWORD`) |
| Knowledge Base | Six published documents: PrivEdge User Guide, Troubleshooting Guide, Security Documentation, Frequently Asked Questions, Application Documentation, Privacy Policy & Data Handling |

Change the seed passwords in `.env` before any shared use.
