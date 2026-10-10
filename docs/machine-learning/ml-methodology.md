# Machine Learning Methodology — Random Forest Routing

This document describes how the **Random Forest router** is built, trained and used inside PrivEdge. Every detail below reflects the code in `backend/app/ml/` and `backend/app/services/router.py`. Results are in [ML evaluation](ml-evaluation.md).

> **Role of ML in PrivEdge.** The rule-based router is the default and the interpretable baseline. The Random Forest router is an optional, more "learned" alternative (`ROUTER_MODE=ml`). It never operates alone: its output always passes through safety guardrails.

---

## 1. Pipeline at a glance

```text
Dataset  (synthetic, labelled routing examples)        ml/generate_dataset.py → dataset.csv
   ↓
Feature extraction  (the REAL production analyzers)    services/feature_extractor.py
   ↓
Random Forest  (compared with 2 other classifiers)     ml/train.py
   ↓
Training  (grouped split) + cross-validation           ml/train.py → routing_model.joblib, metrics.json
   ↓
Routing prediction  (at runtime, ROUTER_MODE=ml)       services/router.py: ml_route()
   ↓
Safety guardrails  (privacy floor, human floor)        services/router.py
   ↓
Final route  (+ admin policy + fail-safe execution)    services/chat_service.py
```

## 2. The routing problem

Routing is treated as a **three-class classification** problem: given a query's features, predict `cloud`, `edge` or `human`.

## 3. Dataset

`ml/generate_dataset.py` builds a **synthetic labelled dataset**:

- Query *templates* are written for each class — general / educational and complex-but-public questions (`cloud`); confidential documents, personal identifiers, private financial or medical content and fast-answer requests (`edge`); and medical, legal, financial, HR and "high-stakes" decision questions (`human`).
- Templates are filled with topics or **fake** identifiers (fabricated e-mails, phone numbers, account numbers, names) to produce many queries.
- Each query is labelled with the route the **project's routing policy intends** for that kind of query.
- The generator uses a fixed random seed, so the dataset is reproducible.

After duplicate query strings are removed, the training pipeline uses **658 unique labelled queries**.

> **Important:** the labels express the project's *intended policy*; they are **not** real production traffic and do not measure real-world user behaviour. The features, however, are computed by the real analyzers, so the model learns how analyzer outputs relate to the intended route rather than reading the label from the text.

Each row stores the query, the feature values, the route label and a `template_id` (used to group the split — see §6).

## 4. Features

The model uses the same features the rule router sees. `feature_vector()` in `router.py` builds a **14-value vector**:

| # | Feature | Type |
|---|---|---|
| 1 | `privacy_score` | float 0–1 |
| 2 | `sensitivity_score` | float 0–1 |
| 3 | `complexity_score` | float 0–1 |
| 4 | `risk_score` | float 0–1 |
| 5 | `latency_score` | float 0–1 |
| 6 | `human_required` | 0 / 1 |
| 7 | `query_length` | word count |
| 8 | `contains_pii` | 0 / 1 |
| 9–14 | `domain` one-hot: general, medical, legal, financial, hr, safety | 0 / 1 each |

How each score is produced is described in [Intelligent routing](../architecture/intelligent-routing.md).

## 5. Preprocessing

What the code actually does:

- Rows with missing values are dropped and duplicate `query` strings are removed.
- `domain` is one-hot encoded; booleans become 0/1.
- **No scaling** is applied for the tree-based models. A `StandardScaler` is used only inside the Logistic Regression pipeline, where scaling matters.
- No text vectorisation: the model sees engineered features, not raw text.

## 6. Models, training and selection

Three classifiers are trained and compared on the same split (`ml/train.py`):

| Model | Configuration |
|---|---|
| Logistic Regression | `StandardScaler` + `LogisticRegression(max_iter=2000)` |
| Decision Tree | `max_depth=8`, `random_state=42` |
| **Random Forest** | `n_estimators=200`, `random_state=42` |

- **Split:** `GroupShuffleSplit` with 25 % held out, **grouped by `template_id`**. Every query generated from a template is on one side of the split, so no test query shares a template with a training query. This prevents the inflated scores a random split would give on template-generated data.
- **Evaluation:** accuracy, macro precision / recall / F1, per-class metrics and a confusion matrix on the held-out set, for every model **and for the rule-based router as a baseline**.
- **Selection:** the model with the highest macro-F1 is saved; ties are broken in favour of Random Forest. Random Forest was selected.
- **Cross-validation:** a separate 5-fold `GroupKFold` cross-validation of the Random Forest (macro-F1) gives a second estimate that does not depend on one particular split.
- **Persistence:** the selected model is saved with `joblib` to `app/ml/routing_model.joblib`; metrics go to `metrics.json`.

### Why a Random Forest

- Works well on small tabular datasets with mixed numeric and binary features.
- Captures non-linear interactions (for example, "moderate privacy *and* medical domain").
- Needs no feature scaling.
- Provides **feature importance**, which supports explanation and viva discussion.
- Easier to explain and lighter to run than boosted or neural alternatives, which would add little on a synthetic dataset of this size.

## 7. Prediction at runtime

When `ROUTER_MODE=ml`:

1. `extract_features()` produces the feature object.
2. `ml_route()` lazily loads the model once per process from `ML_MODEL_PATH`.
3. The 14-value vector is passed to `predict()`, giving `cloud`, `edge` or `human`.
4. Guardrails are applied (below).
5. The decision is returned with a reason that names the classifier, and `router_used = "ml"` is stored in `routing_logs`.

If the model file is missing or cannot be loaded, `ml_route()` returns nothing and PrivEdge **falls back to the rule-based router** (`router_used = "rule"`).

## 8. Safety guardrails

| Guardrail | Condition | Effect |
|---|---|---|
| **Privacy floor** | Model says *cloud* but privacy ≥ threshold or sensitivity ≥ threshold | Route becomes **edge** |
| **Human floor** | Model says *edge* or *cloud* but `human_required` is true or risk ≥ risk threshold | Route becomes **human** |

Afterwards the admin route toggles and fail-safe execution rules still apply ([Intelligent routing](../architecture/intelligent-routing.md)).

### Why guardrails and rules remain essential

- The model learned from **synthetic labels**; it can be wrong on inputs unlike its training templates (the out-of-distribution evaluation shows this).
- Privacy and safety are **hard requirements**, not statistical preferences — a probabilistic model should not be the only thing standing between private text and the cloud.
- Guardrails are simple, auditable and can only make the outcome *more* protective.
- The rule router gives an interpretable baseline and a working fallback if the model is unavailable.

## 9. Reproducing the results

From `backend/` with the virtual environment active:

```bash
python -m app.ml.generate_dataset   # regenerate dataset.csv
python -m app.ml.train              # train, compare, cross-validate, save model + metrics.json
python -m app.ml.evaluate           # out-of-distribution evaluation → evaluation_report.json
python -m app.ml.make_report        # generate ML_EVALUATION.md from the two JSON files
```

| Artifact | Purpose |
|---|---|
| `ml/dataset.csv` | Labelled dataset |
| `ml/routing_model.joblib` | Trained model used when `ROUTER_MODE=ml` |
| `ml/metrics.json` | Training / cross-validation metrics |
| `ml/evaluation_report.json` | Out-of-distribution evaluation |
| `ml/ML_EVALUATION.md` | Generated report (numbers read from the two JSON files) |

## 10. Scope notes

- The model is trained on the training split and is not re-fitted on all data.
- The dataset is English-only and single-turn; adversarial evasion of the analyzers is not covered.
- No claim is made that these scores represent accuracy on real users' queries.
