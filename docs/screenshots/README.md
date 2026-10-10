# Screenshots Checklist

This folder is for screenshots of the **running PrivEdge application**. No placeholder or mock images are included — capture the images below from your own running system (three terminals: Ollama, backend, frontend — see the root [README](../../README.md#17-how-to-run)) and save them in this folder using the suggested file names.

**Tips**

- Use a browser window of roughly 1440 × 900, 100 % zoom, and the same theme (light or dark) for the whole set.
- Use only **fake** data in queries and accounts. Do not capture API keys, tokens, `.env` files or real personal information.
- Capture the full page including the sidebar and top bar unless noted.
- Prefer PNG.

Once captured, embed them in the root README or your report with, for example:

```markdown
![Chatbot](docs/screenshots/04-chatbot.png)
```

| # | Suggested file name | Page / state to capture | What it demonstrates |
|---|---|---|---|
| 1 | `01-landing-page.png` | Public landing page (`/`), top of the page | Product overview and the Edge / Cloud / Human concept. |
| 2 | `02-login.png` | Login page (`/login`), empty form | Authentication entry point. |
| 3 | `03-user-dashboard.png` | Signed in as a **user** → User Dashboard (`/user/dashboard`) after a few queries | Personal totals, per-route counts and recent conversations. |
| 4 | `04-chatbot.png` | AI Assistant page (`/user/chatbot`) with a short conversation visible and the conversation list on the left | The AI Assistant as the conversational interface inside PrivEdge. |
| 5 | `05-cloud-ai-response.png` | Ask a general question, e.g. *"Explain inheritance in Java."* Expand the **PrivEdge Decision** card under the answer | A **Cloud AI** route: Cloud AI badge, Low privacy/risk, and the routing reason. *(Requires Gemini to be available.)* |
| 6 | `06-edge-ai-response.png` | Ask e.g. *"Analyze this confidential employee salary report."* Expand the Decision card | An **Edge AI** route: Edge AI badge, High privacy and sensitivity, processed locally by Ollama + Llama 3.2. |
| 7 | `07-human-review-pending.png` | Ask e.g. *"Should this patient change their medication dosage?"* | The **Human Review** pending state: "Human review is required…" banner, Human Review badge, High risk. |
| 8 | `08-reviewer-dashboard.png` | Signed in as the **reviewer** → Reviewer Dashboard, with the request from #7 pending (optionally also the Review Queue) | Reviewer workflow entry point: pending reviews and statistics. |
| 9 | `09-reviewer-approval.png` | Reviewer opens the request (`/reviewer/review/<id>`) showing the masked query, analysis and AI draft with Approve / Modify / Reject — *then* a second capture of the user's conversation showing "Reviewed by a human expert" and the final answer (save as `09b-reviewed-result.png`) | The end-to-end Human Review lifecycle. |
| 10 | `10-knowledge-base.png` | User → Knowledge Base (`/user/knowledge-base`); optionally a second capture of a document with a search term highlighted (`10b-kb-document-search.png`) | Knowledge Base browsing and document-content search (RAG source material). |
| 11 | `11-user-insights.png` | User → Insights (`/user/insights`) | Routing distribution, weekly activity, complexity and response-time charts. |
| 12 | `12-admin-dashboard.png` | Signed in as **admin** → Admin Dashboard (`/admin/dashboard`) | System-wide totals, routing distribution and service status. |
| 13 | `13-admin-settings.png` | Admin → System Settings (`/admin/settings`) | The enforced settings: route toggles, Auto-Routing, audit logging, idle session timeout, RAG, temperature, context window, notifications. |
| 14 | `14-system-monitoring.png` | Admin → System Monitoring (`/admin/system`) after clicking Refresh | Live status of API Gateway, Database, Cloud AI (Gemini), Edge AI (Ollama) and RAG. |

**Optional extras** (if useful for your report): Routing Analytics (`/admin/routing`), Query Logs (`/admin/logs`), Human Review Monitoring (`/admin/reviews`), User Management (`/admin/users`), the notification bell open, a file attachment in the chat, and the floating AI assistant.

> If Gemini is temporarily unavailable (HTTP 503 during high demand) when you capture #5, try again later — this is an external service condition, not a PrivEdge problem.
