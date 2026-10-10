# Future Enhancements

Possible directions for taking PrivEdge beyond the current academic scope. **None of these are implemented**; they are listed to show a realistic path from prototype to production and to record ideas that follow naturally from the project's [limitations](limitations.md).

## 1. Production readiness

| Enhancement | Why / what it would involve |
|---|---|
| **PostgreSQL** | Replace SQLite with PostgreSQL for concurrency and durability. The ORM models are portable; a database driver, connection configuration and a real migration tool (such as Alembic) would be added. |
| **Docker** | Containerise the frontend, backend and database, with Ollama as a separate service or host dependency, and a `docker-compose` file for one-command start-up. |
| **HTTPS production deployment** | Terminate TLS at a reverse proxy, serve the frontend as static files, tighten CORS, and move away from the development servers. |
| **Production secret management** | Load keys and secrets from a secrets manager or the platform's secret store instead of a local `.env`; rotate keys; provide an encryption-key rotation path. |
| **Production monitoring** | Structured logging, metrics and alerting (health checks, error rates, latency of Edge/Cloud/Human paths), building on the existing System Monitoring page. |

## 2. Security

| Enhancement | Why / what it would involve |
|---|---|
| **Full multi-factor authentication** | TOTP enrolment (QR code, backup codes) and a second login step, then re-introduce an enforced MFA setting. |
| **Rate limiting and login lockout** | Protect authentication and AI endpoints from brute force and abuse. |
| **Account lifecycle** | Password reset, e-mail verification, server-side token revocation or refresh tokens, and moving the token to an HTTP-only cookie. |
| **Broader encryption** | Encrypt more fields (titles, attachment names) or the whole database; separate encryption key from the JWT secret by default. |
| **Independent security review** | Penetration testing and a dependency/vulnerability audit before any real deployment. |

## 3. Intelligence and data

| Enhancement | Why / what it would involve |
|---|---|
| **Advanced vector-based RAG** | Chunking with embeddings stored in a vector database for semantic retrieval, with incremental indexing instead of recomputing TF-IDF per query. |
| **Real routing data** | Collect consented, anonymised routing feedback (including reviewer corrections) to retrain and evaluate the router on real traffic rather than a synthetic dataset. |
| **Stronger privacy detection** | Use NER (spaCy or a transformer model) inside scoring and masking, add multilingual support, and detect context-dependent sensitive prose. |
| **Additional LLM providers** | Make the Cloud AI client pluggable so other production providers can be used where appropriate, with the same masking and routing guarantees. |
| **Richer attachments** | `.docx` and spreadsheet support, and OCR for scanned PDFs. |
| **Better ML experimentation** | Calibrated confidence from the classifier, XGBoost comparison, and per-class threshold tuning. |

## 4. Product and quality

| Enhancement | Why / what it would involve |
|---|---|
| **Human Review operations** | Assignment rules, service-level timers, escalation and reviewer workload views. |
| **Notification channels** | E-mail or push delivery in addition to the in-app bell. |
| **Automated end-to-end tests** | Browser-level tests (for example Playwright) and broader frontend coverage. |
| **Performance** | Code-split the frontend bundle; response streaming for long answers. |
| **Accessibility and internationalisation** | Accessibility review and multi-language UI. |
