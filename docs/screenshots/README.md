# PrivEdge Screenshots Checklist

This folder contains screenshots captured from the running PrivEdge application. The screenshots document the application's interfaces and selected workflows.

## Capture Guidelines

- Capture screenshots from the running application using the three-terminal setup described in the [root README](../../README.md#17-how-to-run): Ollama, the FastAPI backend, and the React frontend.
- Use a consistent browser size, preferably around 1440 × 900 pixels, at 100% zoom.
- Keep the same light or dark theme throughout the screenshot set.
- Use only fake test data. Do not expose real personal information, API keys, access tokens, passwords, or `.env` contents.
- Capture the relevant page, including the sidebar and top bar where applicable.
- Prefer PNG format.
- Only describe a feature as demonstrated when the screenshot visibly supports that claim.

## Existing Screenshots

The following 11 screenshots are present in this folder.

| # | File name | Page or state | What it demonstrates |
|---|---|---|---|
| 1 | `landing-page.png` | Public landing page | PrivEdge overview and its secure Edge–Cloud AI concept. |
| 2 | `login.png` | Login page | Authentication entry point. |
| 3 | `chatbot.png` | PrivEdge chatbot | Conversational interface for submitting queries and viewing responses. |
| 4 | `edge-ai.png` | Edge AI response | A query processed through the local Edge AI route. |
| 5 | `cloud-ai.png` | Cloud AI response | A query processed through the Cloud AI route, when the service is available. |
| 6 | `human-review.png` | Human Review pending state | A high-risk query routed for human review. |
| 7 | `knowledge-base.png` | Knowledge Base | Knowledge Base interface and its document-management capabilities. |
| 8 | `user-insights.png` | User Insights | User activity and routing-related insights visible in the interface. |
| 9 | `reviewer-dashboard.png` | Reviewer Dashboard | Reviewer interface for monitoring pending reviews. |
| 10 | `admin-dashboard.png` | Admin Dashboard | Administrative overview and system information. |
| 11 | `system-monitoring.png` | System Monitoring | Service status and system monitoring interface. |

## Recommended Additional Screenshots

The existing screenshots cover the main application interfaces and the three routing destinations. The following additional screenshots are recommended only if you want more complete visual evidence for your project report.

| Suggested file name | Page or state | What it would demonstrate |
|---|---|---|
| `user-dashboard.png` | User Dashboard after submitting a few test queries | Personal activity totals, route counts, and recent conversations, where displayed. |
| `reviewer-approval.png` | Reviewer opens a pending request | Review details, masked query, AI draft, and available approval, modification, or rejection actions. |
| `reviewed-result.png` | User conversation after review is completed | The final response returned through the Human Review workflow. |
| `admin-settings.png` | Admin System Settings | Available system settings and their enforcement. |
| `routing-analytics.png` | Admin Routing Analytics | Routing distribution and analytics, where displayed. |
| `query-logs.png` | Admin Query Logs | Logged query and routing information, with sensitive values appropriately protected. |
| `admin-users.png` | Admin User Management | User management controls available to administrators. |
| `human-review-monitoring.png` | Admin Human Review management | Administrative monitoring of human-review requests. |
| `notification-bell.png` | Notification panel opened | Notifications displayed to the signed-in user. |
| `chat-attachment.png` | Chat with a test attachment | Attachment upload and the resulting chat interaction. |
| `floating-assistant.png` | Floating AI Assistant open | The separate assistant interface available within the application. |

Capture only the additional screenshots that are relevant to your implementation and report. Do not create placeholder images for unavailable features.

## Suggested Screenshot Usage in the Root README

Use the actual filenames when embedding images in the root README. For example:

```markdown
![PrivEdge landing page](docs/screenshots/landing-page.png)

![Edge AI response](docs/screenshots/edge-ai.png)

![Cloud AI response](docs/screenshots/cloud-ai.png)

![Human Review pending state](docs/screenshots/human-review.png)

![Admin Dashboard](docs/screenshots/admin-dashboard.png)
```

## Notes

- Cloud AI screenshots depend on the availability of the configured Gemini service. If a request temporarily fails, retry when the service is available.
- A screenshot of a pending Human Review request demonstrates routing to review; it does not, by itself, demonstrate the complete approval-and-response lifecycle.
- Screenshots provide visual evidence of selected states. Automated tests and live workflow checks provide additional evidence of application behavior.
- Keep screenshots consistent with the current implementation and update this checklist when files are added, removed, or renamed.