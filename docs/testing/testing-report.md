# Testing Report

This report records the verified testing status of the current PrivEdge implementation: automated tests, type-checking, the production build, and manual end-to-end verification.

## 1. Results at a glance

| Check | Result |
|---|---|
| Backend automated tests (pytest) | **53 / 53 passed** |
| Frontend automated tests (Vitest + React Testing Library) | **34 / 34 passed** |
| **Total automated tests** | **87 / 87 passed** |
| TypeScript type-check (`tsc --noEmit`) | **0 errors** |
| Frontend production build (`npm run build`) | **Successful** |
| Manual end-to-end verification | Completed for all areas listed in §4 |

Notes:

- The backend run reports two third-party deprecation warnings (Starlette/anyio and ReportLab); neither affects results.
- The production build prints an advisory message that the JavaScript bundle is larger than 500 kB. It is a build hint, not an error.
- Automated tests **mock** Gemini and Ollama, so they need no API key and no running model. Real Edge AI and Cloud AI behaviour was verified manually (§4).

## 2. Backend automated tests — 53

Run from `backend/` with the virtual environment active:

```bash
pytest -q
```

| File | Tests | Focus |
|---|---|---|
| `tests/test_analyzers_router.py` | 7 | The three demonstration queries (Cloud / Edge / Human); human-review priority over privacy; regex PII detection; low scores for public queries; complex non-sensitive query → Cloud; data masking; response-validator behaviour (rejects empty output, masks leaked identifiers, blocks unapproved human-path output). |
| `tests/test_api.py` | 26 | **Security & access:** authentication required, duplicate registration, bad login, role cannot be self-assigned, RBAC across user / reviewer / admin, conversation ownership, deactivated accounts blocked, input validation, messages encrypted at rest. **Routing paths:** Cloud path, Edge path keeps raw data local, Cloud receives only masked text, Cloud history excludes private turns, Edge outage never falls back to Cloud for private queries, Cloud outage returns a friendly error, `/analyze` dry run. **Human Review:** full lifecycle (queue → detail → modify → user sees reviewed answer), reject + statistics. **Other:** delete conversation, user statistics, admin views and logs (no message content), admin user management, route toggles enforced, Knowledge Base browsing + RAG context injection, Knowledge Base upload screening, profile and password change, Knowledge Base search and type filter. |
| `tests/test_attachments.py` | 9 | `.txt` → Cloud when non-sensitive; confidential `.txt` → Edge; PDF text extraction and routing; unsupported type (415); oversized file (413); empty file (422); PDF with no text (422); caption versus full text handling; authentication required. |
| `tests/test_settings_enforcement.py` | 11 | Auto-Routing OFF → Human Review (and clean blocking if Human Review is disabled too); audit-logging toggle; context-window trimming (unit + end-to-end); idle-session timeout rejects an idle token and can be disabled; review-completed, high-risk (including its toggle) and system-alert notifications; mark-all-read. |

## 3. Frontend automated tests — 34

Run from `frontend/`:

```bash
npm test                # Vitest, 8 files, 34 tests (API mocked)
npx tsc --noEmit        # TypeScript: 0 errors
npm run build           # production build
```

| File | Tests | Focus |
|---|---|---|
| `pages/public/Login.test.tsx` | 2 | Successful login navigates to the role's dashboard; failed login shows the error and does not navigate. |
| `pages/public/Register.test.tsx` | 4 | Rejects short passwords and mismatched passwords without calling the API; successful registration; duplicate-e-mail error shown. |
| `pages/user/Chatbot.test.tsx` | 5 | Cloud response with route badge; Edge badge for a confidential query; Human-Review pending banner; friendly error bubble on failure; empty message not sent. |
| `pages/user/Conversations.test.tsx` | 6 | Lists conversations with route badges; search; route filter; delete after confirmation; no delete if cancelled; empty state. |
| `pages/reviewer/ReviewQuery.test.tsx` | 6 | Loads query, analysis and draft and claims the item; approve; reject with comment; modify with edited text; Approve disabled without a draft; error on failed submit. |
| `pages/admin/UserManagement.test.tsx` | 5 | User list; role change; deactivate; an admin cannot change or deactivate their own account; search. |
| `pages/admin/AdminSettings.test.tsx` | 3 | Loads settings from the backend; toggling Automatic Routing and saving sends the right payload; save error is shown. |
| `components/layout/TopBar.test.tsx` | 3 | Notifications load; dropdown lists them and marks them read; empty state. |

## 4. Manual end-to-end verification

Manual testing exercised the running application (React frontend, FastAPI backend, Ollama with Llama 3.2, and Google Gemini). Full case list: [Manual test cases](manual-test-cases.md).

| Area | Outcome |
|---|---|
| **Authentication** | Login and role-based access verified for user, reviewer and admin accounts. |
| **Normal query → Cloud AI** | Routed to Cloud AI and answered by Gemini in the verified run. *See the Gemini note below.* |
| **Sensitive query → Edge AI** | A confidential employee query showed Privacy High, Sensitivity High, Risk Low, no Human Review, and was processed locally by Edge AI (Ollama + Llama 3.2). |
| **High-risk query → Human Review** | A medication-dosage question showed Risk High and Human Review required; it appeared in the reviewer queue and the user saw it as awaiting review. |
| **Reviewer workflow** | Reviewer dashboard, pending request, opening and approving a request; the user's conversation then showed the reviewed result; review statistics and history updated. |
| **RAG / Knowledge Base** | Six published documents displayed with categories and content; a question about how PrivEdge protects sensitive data retrieved Knowledge Base context and produced a grounded answer (Edge processing, encryption, masking, private-conversation handling). Admin Knowledge Base management verified. |
| **Knowledge Base content search** | Matching documents and in-document matches found by content. |
| **File attachments** | Attachments were accepted, analysed and routed through the normal pipeline. |
| **User Dashboard / Insights** | Totals, per-route counts, response time, routing distribution, weekly activity and complexity charts displayed. |
| **Reviewer Dashboard** | Pending reviews, statistics and history displayed. |
| **Admin Dashboard and pages** | Dashboard, User Management, Routing Analytics, Query Logs, Human Review Monitoring, Knowledge Base management, System Monitoring and Settings verified. System Monitoring showed API Gateway, Database, Ollama and RAG as Operational. |
| **Admin settings enforcement** | Auto-Routing OFF sent requests to Human Review; audit logging OFF suppressed audit events and ON recorded them. |
| **Floating AI Assistant** | Messages sent through the floating assistant were processed by the same pipeline. |
| **Conversation history** | Cloud, Edge and Human-Review conversations opened correctly with their history preserved. |

### Gemini / Cloud AI availability note

Cloud AI integration is implemented and was previously verified successfully (System Monitoring reported Gemini reachable with HTTP 200 and a real Cloud AI query completed through the UI). During the **latest** manual testing, Gemini temporarily returned **HTTP 503** because the external Gemini service was experiencing high demand.

This is an **external service availability** condition. It is **not** a PrivEdge implementation failure, routing failure, API-key failure or backend failure. Cloud AI depends on the availability of the Gemini service; PrivEdge's behaviour in that situation (a clear "Cloud AI is currently unavailable" message, no re-routing of the data to another path, and an admin system-alert notification) is covered by automated tests that simulate a Cloud AI outage.

## 5. Reproducing the test run

```bash
# Backend
cd backend
python -m venv venv && venv\Scripts\activate    # macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
pytest -q

# Frontend
cd frontend
npm install
npm test
npx tsc --noEmit
npm run build
```

## 6. Coverage gaps (stated plainly)

- Frontend tests cover eight key screens/components with a mocked API; they are not a full UI regression suite.
- There is no automated browser-level (end-to-end) test; end-to-end behaviour was verified manually.
- Real Gemini and Ollama calls are verified manually, not in the automated suite.
- No load, penetration or accessibility testing was performed.
