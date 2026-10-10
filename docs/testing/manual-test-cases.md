# Manual Test Cases

These cases record the manual end-to-end verification of the running PrivEdge application (React frontend, FastAPI backend, Ollama + Llama 3.2, Google Gemini). **PASS** is used only where the project's verification supports it. Automated coverage of the same behaviour is cited where it exists (see the [Testing report](testing-report.md)).

Status key: **PASS** — verified as expected. **PASS¹** — verified as expected in the earlier successful run; the latest re-test was affected by the external Gemini condition described in the note below the tables.

---

## A. Authentication and access

| Test Case | Expected Result | Actual Result | Status |
|---|---|---|---|
| Sign in as a normal user | Login succeeds and the user is taken to the user area | Login succeeded; user dashboard shown | PASS |
| Sign in as the seeded reviewer | Login succeeds and the reviewer area is shown | Reviewer dashboard shown | PASS |
| Sign in as the seeded admin | Login succeeds and the admin area is shown | Admin dashboard shown | PASS |
| Role-based access (RBAC) | Each role sees only its own area and navigation | Each account saw its own role's pages | PASS |

*Automated: `test_rbac`, `test_auth_required`, `test_role_cannot_be_self_assigned`, `Login.test.tsx`, `Register.test.tsx`.*

## B. Intelligent routing — the three paths

| Test Case | Expected Result | Actual Result | Status |
|---|---|---|---|
| **Normal query → Cloud AI** (general, non-sensitive question) | Privacy/risk Low; routed to Cloud AI; Gemini answers | Routed to Cloud AI and answered by Gemini in the verified run | PASS¹ |
| **Sensitive query → Edge AI** (confidential employee information) | Privacy and Sensitivity High; routed to Edge AI; answered locally by Ollama (Llama 3.2) | Privacy High, Sensitivity High, Risk Low, Human Review No → **Edge AI**; processed by the local model | PASS |
| **High-risk query → Human Review** (medication-dosage question) | Risk High; Human Review required; not answered automatically | Risk High, Human Review Yes → **Human Review**; status "awaiting reviewer" | PASS |
| Route is chosen by the system, not the user | No control for choosing Edge / Cloud / Human; the route badge and decision card are shown after the answer | Route badge and decision card displayed; no manual route control | PASS |

*Automated: `test_three_demo_queries`, `test_cloud_path`, `test_edge_path_keeps_raw_data_local`, `test_human_review_full_flow`, `Chatbot.test.tsx`.*

## C. Human Review workflow

| Test Case | Expected Result | Actual Result | Status |
|---|---|---|---|
| High-risk request appears in the reviewer queue | A pending item is visible to the reviewer | Pending request shown in the reviewer queue and dashboard | PASS |
| Reviewer opens the request | Masked query, analysis and AI draft are shown | Request opened with the details | PASS |
| **Reviewer approves** | Decision is saved and the **user receives the reviewed result** in the conversation | Approval succeeded; the user's conversation was updated with the result | PASS |
| Reviewer statistics and history | Completed review appears in history and statistics | Review history and statistics updated | PASS |

*Automated: `test_human_review_full_flow`, `test_reject_and_stats`, `ReviewQuery.test.tsx`.*

## D. Conversations, attachments and Knowledge Base

| Test Case | Expected Result | Actual Result | Status |
|---|---|---|---|
| Conversation history | Cloud, Edge and Human-Review conversations open with their history preserved | All three conversation types opened correctly | PASS |
| **File attachment** | The attached file is accepted, analysed and routed through the normal pipeline | Attachment processed successfully | PASS |
| Knowledge Base browsing | Six published documents with categories and viewable content | Documents, categories and content displayed | PASS |
| **Knowledge Base search by content** | Searching for text inside documents returns matching documents; in-document search finds matches | Content search returned matching content | PASS |
| **RAG** — ask "How does PrivEdge protect sensitive user data?" | Knowledge Base context is retrieved and used in the answer | Context retrieved; the answer discussed Edge processing, encryption, data masking and private-conversation handling | PASS¹ |
| Floating AI Assistant | A message sent from the floating assistant goes through the same pipeline and shows the processing path | Floating assistant worked as expected | PASS |

*Automated: `test_txt_attachment_*`, `test_pdf_attachment_*`, `test_knowledge_and_rag`, `test_knowledge_list_search_and_type_filter`, `Conversations.test.tsx`.*

## E. Dashboards and analytics

| Test Case | Expected Result | Actual Result | Status |
|---|---|---|---|
| User Dashboard and Insights | Total / Cloud / Edge / Human counts, average response time, routing distribution, weekly activity, complexity and response-time charts | All displayed with the user's own data | PASS |
| Reviewer Dashboard | Pending reviews, statistics and recent activity | Displayed | PASS |
| Admin Dashboard | System-wide totals, routing distribution, service status and recent events | Displayed | PASS |
| Admin pages: User Management, Routing Analytics, Query Logs, Human Review Monitoring, Knowledge Base management | Each page loads real data and its actions work | All pages verified | PASS |
| System Monitoring | Live status of API Gateway, Database, Cloud AI (Gemini), Edge AI (Ollama), RAG | API Gateway, Database, Ollama and RAG **Operational**; Gemini reported reachable (HTTP 200) in the verified run | PASS¹ |

## F. Admin settings enforcement

| Test Case | Expected Result | Actual Result | Status |
|---|---|---|---|
| **Auto-Routing OFF** | Every new request is routed to Human Review regardless of its analysis | Requests were routed to Human Review | PASS |
| **Audit Logging OFF** | No new audit events are recorded | Audit events suppressed | PASS |
| **Audit Logging ON** | Audit events are recorded again | Audit event recorded | PASS |
| Admin settings generally | Enforced settings change backend behaviour and persist after saving | Settings enforcement verified | PASS |

*Automated: `test_auto_route_off_forces_human_review`, `test_audit_log_toggle`, `test_session_timeout_*`, `test_context_window_*`, `test_*_notification*`, `AdminSettings.test.tsx`.*

---

## Note ¹ — Gemini availability

Cloud AI integration is implemented and was previously verified successfully. During the **latest** manual testing, Gemini temporarily returned **HTTP 503** because the external Gemini service was experiencing high demand. This is an external service-availability issue — not a PrivEdge implementation, routing, API-key or backend failure. Cases marked PASS¹ were verified in the earlier successful run and depend on Gemini being available when re-tested. The behaviour of PrivEdge during a Cloud AI outage (friendly error message, data not re-routed, system-alert notification) is covered by automated tests.

## Behaviour covered by automated tests only

The following are verified by the automated suites but are not part of the manual case list above: idle-session timeout, context-window trimming, in-app notification generation and read-state, attachment rejection rules (type, size, empty, no-text PDF), conversation ownership and deletion, encryption of stored messages, Knowledge Base upload screening, and admin user-management rules (an admin cannot deactivate or demote themself).
