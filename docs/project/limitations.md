# Limitations

PrivEdge is a final-year academic implementation. The items below describe its **current scope and known limits** so that its claims can be read correctly. They are statements of scope, not unfinished work hidden from view.

## 1. Platform and deployment scope

| Area | Current state |
|---|---|
| **Database** | **SQLite** is used (single local file). It is well suited to the academic demo but not to many concurrent users or multi-server deployment. Schema evolution is handled by a small additive start-up migration rather than a migration framework. |
| **Production hardening** | HTTPS/TLS termination, rate limiting and login lockout, secret management, containerisation and production monitoring are outside the current scope. The application runs as three local processes over `http://localhost`. |
| **Multi-factor authentication** | **Full MFA is not implemented.** The backend keeps a placeholder `security.mfa` setting that is not enforced, and the Admin Settings screen no longer exposes an MFA toggle. |
| **Account lifecycle** | No password-reset, e-mail verification or token-revocation flow. A signed-in session ends on token expiry, the idle-session timeout, account deactivation, or when the user signs out in the browser. |
| **Token storage** | The JWT is kept in browser `localStorage`. |

## 2. External dependencies

| Dependency | Limitation |
|---|---|
| **Cloud AI (Google Gemini)** | Requires internet access and a valid API key, and depends on **external service availability**. During the latest manual testing Gemini temporarily returned **HTTP 503** because the service was experiencing high demand. PrivEdge reports this as "Cloud AI is currently unavailable" and does not re-route the data; it is not a routing, API-key or backend fault. Model names and quotas are controlled by Google. |
| **Edge AI (Ollama + Llama 3.2)** | Requires Ollama to be installed and running and the model (`llama3.2:3b` by default) to be pulled. Response quality and speed depend on the host machine; a small local model is less capable than a cloud model. If Ollama is unavailable, private queries return an error rather than falling back to the cloud. |

## 3. Analysis and routing

- **Heuristic analyzers.** Privacy, sensitivity, risk and complexity are computed with regex patterns, keyword categories and phrasing cues (spaCy NER is optional and not part of scoring). They can miss sensitive information that has no recognisable pattern or keyword, and they can over-trigger — for example, a creative prompt containing the word "confidential" is routed to Edge AI.
- **Masking is pattern-based.** It covers e-mail, phone, card, Aadhaar, SSN, account and employee-ID patterns and the "my name is …" phrase only. Sensitive queries are protected mainly by being routed to local Edge AI, not by masking.
- **English-only, single-message analysis.** Each message is analysed on its own; no multi-turn or multilingual analysis, and no defence against deliberate attempts to evade the detectors.
- **Human-required is rule-based.** The decision to involve a human uses fixed phrasing/domain rules and thresholds, which are project-defined policy values rather than universal constants.
- **Rule-based routing is the default.** The Random Forest router is optional (`ROUTER_MODE=ml`) because on the hand-written evaluation set it scored below the rule router (91.2% vs 97.1%), although it never sent a sensitive or high-risk case to Cloud.

## 4. Machine-learning evaluation

- The training dataset is **synthetic**; its labels encode the project's intended routing policy, not real traffic. Near-perfect held-out scores therefore show policy learning, not real-world accuracy.
- The out-of-distribution test set has only 34 hand-written queries, so its percentages carry wide uncertainty.
- Cross-validation (macro-F1 mean 96.1 %, std 4.3 %) shows noticeable sensitivity to which templates are held out.

## 5. RAG and Knowledge Base

- RAG uses **TF-IDF with cosine similarity** over ~350-character chunks. It is lexical, so it can miss paraphrases that share no vocabulary with a document; it is not a vector database with semantic embeddings.
- Retrieval recomputes the index on each Cloud query over the published documents, which is fine for a handful of documents but would not scale to a large corpus.
- RAG applies only to the Cloud path. Knowledge Base uploads accept `.txt` and `.md` only.
- The user-facing Knowledge Base search is a substring match, not a ranked search.

## 6. Attachments

- Chat attachments: `.txt`, `.md` and `.pdf` only, up to 3 MB; text beyond 12,000 characters is truncated. There is no OCR, so scanned or image-only PDFs are rejected; `.docx`, images and spreadsheets are not supported. The attachment file name is stored unencrypted.

## 7. Data protection scope

- Field-level encryption covers message text, responses and AI drafts only. Conversation titles (stored in masked form), file names, user profile data, Knowledge Base documents, routing metadata and the audit log are stored in plain text, and the database file itself is not encrypted.
- If `ENCRYPTION_KEY` is not set, the key is derived from `JWT_SECRET` (development convenience).
- Reviewers see masked text, which protects the user but can limit what a reviewer can judge.

## 8. Operations and user experience

- **Human Review** has a single shared queue; there are no service-level timers, escalation or assignment rules.
- **Notifications** are in-app only (no e-mail or push) and are refreshed by polling every 20 seconds.
- **Settings:** some settings are admin-wide rather than per-user, and changing the router mode (`rule` / `ml`) requires editing `.env` and restarting the backend.
- **Frontend bundle** exceeds 500 kB and is not code-split (a build advisory, not an error).

## 9. Testing scope

- 87 automated tests (53 backend, 34 frontend) pass, but frontend tests use a mocked API, there is no automated browser-level test, and real Gemini/Ollama calls were verified manually rather than in the automated suite.
- No load, penetration or accessibility testing was carried out.

Related: [Future enhancements](future-enhancements.md) · [Security documentation](../security/security-documentation.md)
