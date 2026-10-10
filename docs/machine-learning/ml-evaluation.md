# Machine Learning Evaluation

This document presents the verified evaluation of PrivEdge's routing classifiers. The primary source is `backend/app/ml/ML_EVALUATION.md`, which is generated from `metrics.json` and `evaluation_report.json` (so no figure here was typed in by hand). Method: [ML methodology](ml-methodology.md).

## 1. Summary

| Evaluation | Result |
|---|---|
| Held-out test split (200 queries, grouped by template) | Random Forest, Decision Tree and the rule-based baseline: **100%**; Logistic Regression: **97.5%** accuracy |
| **5-fold grouped cross-validation** (Random Forest, **macro-F1**) | **Mean 96.1%**, **standard deviation 4.3%** |
| **Out-of-distribution (OOD) hand-written set** — 34 queries | **Rule-based router: 97.1% (33/34)** · **ML router: 91.2% (31/34)** |
| Privacy-routing rate on the OOD set (sensitive / high-risk kept off Cloud) | **19/19 = 100%** for both routers |

> **Reading these numbers.** The cross-validation metric is **macro-averaged F1**, not plain accuracy. The 100% held-out figures come from a *template-generated* dataset and therefore show that the router learned the **intended policy**; the **OOD figures are the more credible estimate** of generalisation, and they are deliberately not 100%.

## 2. Dataset and split

- **658** unique synthetic labelled queries across three classes: `cloud`, `edge`, `human`.
- Labels encode the project's intended routing policy per query template — **not real production traffic**.
- Train / test: **458 / 200** queries, using `GroupShuffleSplit` **grouped by template**, so no test query shares a template with any training query.

## 3. Model comparison (held-out test split)

| Model | Accuracy | Precision (macro) | Recall (macro) | F1 (macro) |
|---|---|---|---|---|
| Logistic Regression | 97.5% | 95.2% | 98.3% | 96.6% |
| Decision Tree | 100.0% | 100.0% | 100.0% | 100.0% |
| **Random Forest** (selected) | **100.0%** | **100.0%** | **100.0%** | **100.0%** |
| Rule-based router (baseline) | 100.0% | 100.0% | 100.0% | 100.0% |

Random Forest was selected (highest macro-F1; ties are broken in its favour because it provides feature importance).

**Why the baseline also scores 100%:** the dataset's labels follow the same kind of policy the rule router implements, and the features are the analyzers' own outputs, so the classes are highly separable on this data. This is why the OOD test below matters.

## 4. Cross-validation

- Method: `GroupKFold(n_splits=5)` on the Random Forest; metric: **macro-F1**.
- Per-fold scores: **98.8%, 90.8%, 90.7%, 100.0%, 100.0%**.
- **Mean 96.1%, standard deviation 4.3%.**

The spread between folds (roughly 91% to 100%) shows that performance depends on which templates are held out — a more honest picture than a single perfect split.

## 5. Per-class results and confusion matrix (Random Forest, test split)

| Class | Precision | Recall | F1 | Support |
|---|---|---|---|---|
| cloud | 100.0% | 100.0% | 100.0% | 98 |
| edge | 100.0% | 100.0% | 100.0% | 72 |
| human | 100.0% | 100.0% | 100.0% | 30 |

```text
 rows = actual, columns = predicted
           cloud    edge   human
   cloud      98       0       0
    edge       0      72       0
   human       0       0      30
```

## 6. Feature importance (Random Forest)

| Feature | Importance |
|---|---|
| latency | 16.9% |
| human_required | 16.8% |
| risk | 15.7% |
| privacy | 13.0% |
| sensitivity | 12.7% |
| complexity | 10.5% |
| query_length | 5.9% |
| domain_general | 3.3% |

The six score features carry most of the importance, matching the intended policy (risk and human-required → Human Review; privacy and sensitivity → Edge; latency and complexity separate the remaining cases). Importance values describe this model on this synthetic data; they are not a statement about real traffic.

## 7. Out-of-distribution evaluation

`ml/evaluate.py` runs a **hand-written set of 34 queries that were not generated from the training templates**, including deliberately tricky and borderline cases. Expected routes: 15 cloud, 11 edge, 8 human (19 sensitive or high-risk cases in total).

| Router | Correct | Accuracy | Cloud | Edge | Human | Privacy-routing rate |
|---|---|---|---|---|---|---|
| Rule-based | 33 / 34 | **97.1%** | 14 / 15 | 11 / 11 | 8 / 8 | 19 / 19 (100%) |
| ML (Random Forest + guardrails) | 31 / 34 | **91.2%** | 12 / 15 | 11 / 11 | 8 / 8 | 19 / 19 (100%) |

### The documented misses

| Router | Query | Expected | Got | Likely explanation |
|---|---|---|---|---|
| Rule + ML | "Write a confidential-sounding spy story." | cloud | edge | The word "confidential" triggers the confidential-keyword category (a keyword heuristic cannot tell a story prompt from a real confidential document). |
| ML only | "Explain what patient confidentiality means." | cloud | edge | A definitional question that mentions a medical term; the rule router handled it correctly, the learned model over-weighted it. |
| ML only | "What is the difference between TCP and UDP?" | cloud | edge | No sensitive keyword is present; the classifier's prediction reflects its learned feature interactions. The cause was not investigated further. |

**Pattern:** every miss moved a query **toward more protection** (cloud → edge). No sensitive or high-risk query was routed toward Cloud, which is why the privacy-routing rate stayed at 100% for both routers. The system's observed failure mode is being over-cautious, not under-cautious.

## 8. Interpretation

1. The rule-based router is accurate and interpretable on the hand-written set; the ML router is slightly less accurate there (91.2% vs 97.1%) because a model trained on template data over-generalises on some everyday questions.
2. The **safety guardrails** are what make the ML router acceptable: it may be over-cautious but, on this set, not unsafe.
3. This is why the **rule-based router remains the default** and ML routing is an optional mode.

## 9. Limitations of this evaluation

- The training dataset is synthetic and template-based; high in-distribution scores say little about real-world accuracy.
- The OOD set is small (34 queries), hand-written by the project team, and English-only; the confidence intervals around 97.1% and 91.2% are wide.
- Single-turn queries only; multi-turn context and adversarial attempts to evade the analyzers are not evaluated.
- Latency and response-time performance of the Edge, Cloud and Human paths are observed at runtime (Admin → Routing Analytics) rather than in this offline evaluation.

Related: [`backend/app/ml/ML_EVALUATION.md`](../../backend/app/ml/ML_EVALUATION.md) (generated source) · [Testing report](../testing/testing-report.md)
