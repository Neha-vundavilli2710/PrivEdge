# Intelligent Routing

The **Intelligent Router** is the decision-making component of PrivEdge and the project's central contribution. The AI Assistant is only the conversational front door; the router decides *where each query is processed*.

> PrivEdge does not simply answer a question. It first decides how that question should be handled — **Edge AI** (local, Ollama + Llama 3.2), **Cloud AI** (Google Gemini) or **Human Review** (a reviewer).

Implementation: `backend/app/services/router.py` (decision), `feature_extractor.py` (features), `policy.py` (levels), `chat_service.py` (admin overrides and execution).

---

## 1. Overview

```text
Query
  │
  ▼
Feature extraction  (privacy, sensitivity, complexity, risk, latency, human-required, PII, domain)
  │
  ▼
┌──────────────────────────────────────────────────────────────┐
│ Stage A — DECIDE   (chosen by ROUTER_MODE)                   │
│   rule-based router   ← default                              │
│   Random Forest router + safety guardrails  (ROUTER_MODE=ml) │
└──────────────────────────────┬───────────────────────────────┘
                               ▼
┌──────────────────────────────────────────────────────────────┐
│ Stage B — ADMIN POLICY                                       │
│   Auto-Routing OFF → Human Review                            │
│   disabled Edge / Cloud / Human route → safe substitute      │
└──────────────────────────────┬───────────────────────────────┘
                               ▼
              Final route:  EDGE  |  CLOUD  |  HUMAN
                               ▼
┌──────────────────────────────────────────────────────────────┐
│ Stage C — EXECUTE WITH FAIL-SAFE BEHAVIOUR                   │
│   private query + Edge AI down → error, never Cloud          │
└──────────────────────────────────────────────────────────────┘
```

Three things are deliberately distinct:

| | What it is | Where |
|---|---|---|
| **Rule-based routing** | A documented priority policy over the feature values. Interpretable, deterministic, the default. | `rule_route()` |
| **ML-based routing** | A trained Random Forest that predicts the route from the same features. | `ml_route()` |
| **Final safety / priority decision** | Guardrails applied to the ML output, then admin policy and fail-safe execution rules. These can only make the outcome *more* protective. | `ml_route()` guardrails, `apply_toggles()`, `process_chat()` |

## 2. The features

Computed once per query by `extract_features()` from the analyzers:

| Feature | Meaning | How it is computed (summary) |
|---|---|---|
| **Privacy** (`privacy_score`, 0–1) | How private the text appears | Starts from the sensitivity score; +0.10 if structured PII was found; +0.05 for first-person framing; small floor (0.02) so public text is never exactly zero. |
| **Sensitivity** (`sensitivity_score`, 0–1) | Whether it contains sensitive data | Structured PII found by regex (email, phone, card, Aadhaar, SSN, account number, employee ID, "my name is …") scores from 0.75; keyword categories (financial, medical, confidential, personal, identification) score by weight; several categories raise it; a cue such as "analyze this document" adds 0.10. |
| **Complexity** (`complexity_score`, 0–1) | How demanding the request is | Length, task verbs ("design", "optimize", "explain"…), technical terms, clause structure, code cues. |
| **Risk** (`risk_score`, 0–1) | How harmful a wrong automated answer could be | Domain base risk (medical, legal, financial, hr, safety, general) plus decision-seeking phrasing ("should I…", "is it safe to sign…") and "high-stakes" cues. |
| **Latency** (`latency_score`, 0–1) | How much a fast reply matters | 0.85 for urgency words ("quick", "asap", "tl;dr"…); 0.45 for very short queries; otherwise 0.2. |
| **Human-required** (`human_required_score` → `human_required`) | Whether human judgement is needed | High when a decision is sought in a medical/legal/financial/HR/safety domain, or "high-stakes" wording appears. `human_required` is true when the score ≥ `HUMAN_THRESHOLD` (0.60). |
| `contains_pii`, `domain`, `query_length`, `pii_types`, `categories` | Supporting features | Used by the ML router and for explanations. |

The values are heuristic and explainable — see [ML methodology](../machine-learning/ml-methodology.md) for how they are used by the classifier.

### Thresholds (configurable, project-defined)

| Setting | Default | Used for |
|---|---|---|
| `PRIVACY_THRESHOLD` | 0.70 | privacy ≥ → Edge |
| `SENSITIVITY_THRESHOLD` | 0.70 | sensitivity ≥ → Edge |
| `RISK_THRESHOLD` | 0.80 | risk ≥ → Human Review |
| `COMPLEXITY_THRESHOLD` | 0.55 | complexity ≥ → "complex" |
| `LATENCY_THRESHOLD` | 0.70 | latency ≥ → "fast answer wanted" |
| `HUMAN_THRESHOLD` | 0.60 | human-required score ≥ → `human_required` |

These are policy choices, not universal constants. The UI shows scores as **Low / Medium / High** using `policy.level()`: *High* at or above the threshold, *Medium* at or above 55% of it, otherwise *Low* (reviewers also see *Critical* for risk ≥ 0.95).

## 3. Stage A — rule-based routing (default)

Priority order — the first matching rule wins:

| Priority | Condition | Route | Meaning |
|---|---|---|---|
| 1 | `human_required` **or** risk ≥ risk threshold | **HUMAN** | Professional or high-stakes judgement; not answered automatically. |
| 2 | privacy ≥ threshold **or** sensitivity ≥ threshold | **EDGE** | Raw data must stay local. |
| 3 | latency ≥ threshold **and** complexity < complexity threshold | **EDGE** | Fast, simple, non-sensitive request is answered locally. |
| 4 | complexity ≥ threshold | **CLOUD** | Complex, non-sensitive — use the more capable model. |
| 5 | otherwise | **CLOUD** | Low-risk general question. |

Human review outranks privacy: a query that is both private *and* high-risk goes to **Human Review** (the reviewer sees masked text and a locally generated draft). Every decision carries a human-readable `reason` that is shown in the decision card and stored in `routing_logs`.

Examples (from the test suite and evaluation set):

| Query | Route | Why |
|---|---|---|
| "Explain inheritance in Java." | Cloud AI | Low privacy and risk. |
| "Design a scalable architecture for a real-time chat system with replication and sharding." | Cloud AI | Complex but non-sensitive. |
| "Analyze this confidential employee salary report." | Edge AI | High sensitivity and privacy. |
| "My email is jane.doe@corp.com, draft a reply to my manager." | Edge AI | Structured PII detected. |
| "quick: what is a REST API?" | Edge AI | Fast, simple, non-sensitive. |
| "Should this patient undergo this medical procedure?" | Human Review | Medical decision → high risk. |
| "Make a high-stakes professional decision for this case." | Human Review | High-stakes wording. |

## 4. Stage A (alternative) — Random Forest routing

Enabled with `ROUTER_MODE=ml`. The 14-value feature vector (privacy, sensitivity, complexity, risk, latency, human_required, query_length, contains_pii and a one-hot encoding of the six domains) is passed to the trained Random Forest, which predicts `cloud`, `edge` or `human`. If the model file cannot be loaded, PrivEdge **falls back to the rule router**. The route actually used (`rule` or `ml`) is stored with each decision (`routing_logs.router_used`).

### Safety guardrails on the ML output

A learned model can be wrong, so its prediction is always checked:

1. **Privacy floor** — if the model predicts *Cloud* but privacy or sensitivity is at/above its threshold, the route becomes **Edge**.
2. **Human floor** — if the model predicts anything other than *Human* but `human_required` is true or risk ≥ the risk threshold, the route becomes **Human Review**.

Guardrails can only move a query toward *more* protection. In the out-of-distribution evaluation the ML router (guardrails included) kept all 19 sensitive or high-risk cases off Cloud — a privacy-routing rate of 19/19 (see [ML evaluation](../machine-learning/ml-evaluation.md)).

## 5. Stage B — administrator policy applied after the decision

| Setting | Effect |
|---|---|
| **Auto-Routing OFF** | Every request is sent to Human Review ("manual oversight mode"), regardless of analysis. |
| **Human Review disabled** | A request that needs Human Review is not answered; the user receives an explanatory message. |
| **Edge AI disabled** | A private request is sent to Human Review (never Cloud); a non-private Edge request goes to Cloud. If the substitute is also disabled the request is not answered. |
| **Cloud AI disabled** | The request is processed by Edge AI if enabled, otherwise not answered. |

## 6. Stage C — fail-safe execution

- If Edge AI (Ollama) is unreachable or the model is missing, a **private** request returns an error — the data is **not** sent to the cloud.
- The only automatic Edge→Cloud fallback is for a **non-private, latency-triggered** route when Cloud AI is enabled.
- If Cloud AI fails (for example Gemini returns HTTP 503), the user is told Cloud AI is unavailable; nothing is re-routed.
- Human Review drafts are generated by Edge AI, never by Cloud AI.

## 7. Why the user does not choose the route

1. **Users cannot reliably judge sensitivity.** A manual "send to cloud" switch makes accidental disclosure one click away; PrivEdge makes the safe choice the default and the only choice.
2. **Safety.** High-risk questions must reach a human whether or not the user thinks they need one.
3. **Consistency and auditability.** A single, documented policy produces comparable, loggable decisions (`routing_logs`) that administrators can review and analyse.
4. **Simplicity.** The user just asks a question; the interface shows *which* path was used and *why*, without requiring routing knowledge.

## 8. Where the decision is visible

- **Chat bubble** — route badge (Edge AI / Cloud AI / Human Review).
- **Decision card** — privacy, sensitivity, complexity, risk, latency, human-review flag and the reason.
- **`POST /analyze`** — a dry run returning the route and scores without calling any model or storing anything.
- **Admin Query Logs / Routing Analytics** — scores, route, router used and processing time per query (no message content).

Related: [System architecture](system-architecture.md) · [Data flow](data-flow.md) · [ML methodology](../machine-learning/ml-methodology.md)
