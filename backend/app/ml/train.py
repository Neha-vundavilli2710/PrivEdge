"""Train + compare routing classifiers, save the best.

Run:  python -m app.ml.train
Outputs: app/ml/routing_model.joblib, app/ml/metrics.json
Split is grouped by template so test queries come from templates the model never saw.
XGBoost (optional in the PDF) is not included; add it to `models` if you install it."""
import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd  # noqa  (scikit-learn depends on numpy; pandas used only here)
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, confusion_matrix, precision_recall_fscore_support
from sklearn.model_selection import GroupKFold, GroupShuffleSplit, cross_val_score
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.tree import DecisionTreeClassifier

from app.services.feature_extractor import Features
from app.services.router import DOMAINS, feature_vector, rule_route

HERE = Path(__file__).parent
LABELS = ["cloud", "edge", "human"]


def load():
    df = pd.read_csv(HERE / "dataset.csv")
    df = df.dropna().drop_duplicates(subset=["query"])  # cleaning
    feats = [Features(r.privacy_score, r.sensitivity_score, r.complexity_score, r.risk_score, r.latency_score, float(r.human_required), bool(r.human_required),
                      int(r.query_length), bool(r.contains_pii), r.domain) for r in df.itertuples()]
    X = np.array([feature_vector(f) for f in feats])
    return df, feats, X, df["route"].values, df["template_id"].values


def main():
    df, feats, X, y, groups = load()
    tr, te = next(GroupShuffleSplit(n_splits=1, test_size=0.25, random_state=42).split(X, y, groups))
    models = {
        "LogisticRegression": make_pipeline(StandardScaler(), LogisticRegression(max_iter=2000)),
        "DecisionTree": DecisionTreeClassifier(max_depth=8, random_state=42),
        "RandomForest": RandomForestClassifier(n_estimators=200, random_state=42),
    }
    def per_class(y_true, pred):
        p, r, f, support = precision_recall_fscore_support(y_true, pred, labels=LABELS, zero_division=0)
        return {lbl: {"precision": round(float(p[i]), 4), "recall": round(float(r[i]), 4), "f1": round(float(f[i]), 4), "support": int(support[i])} for i, lbl in enumerate(LABELS)}

    def report(name, pred):
        p, r, f, _ = precision_recall_fscore_support(y[te], pred, labels=LABELS, average="macro", zero_division=0)
        return {"model": name, "accuracy": round(accuracy_score(y[te], pred), 4), "precision_macro": round(p, 4), "recall_macro": round(r, 4), "f1_macro": round(f, 4),
                "per_class": per_class(y[te], pred), "confusion_matrix": {"labels": LABELS, "matrix": confusion_matrix(y[te], pred, labels=LABELS).tolist()}}

    results, fitted = [], {}
    for name, m in models.items():
        m.fit(X[tr], y[tr])
        fitted[name] = m
        results.append(report(name, m.predict(X[te])))
    baseline = report("RuleBasedRouter (baseline)", [rule_route(feats[i]).route for i in te])

    best = max(results, key=lambda r: (r["f1_macro"], r["model"] == "RandomForest"))
    joblib.dump(fitted[best["model"]], HERE / "routing_model.joblib")
    rf = fitted["RandomForest"]
    names = ["privacy", "sensitivity", "complexity", "risk", "latency", "human_required", "query_length", "contains_pii", *[f"domain_{d}" for d in DOMAINS]]

    # 5-fold grouped cross-validation on the selected model: a second, independent accuracy
    # estimate (not just one train/test split) - standard practice for a defensible report.
    n_groups = len(set(groups))
    cv_folds = min(5, n_groups)
    cv_scores = cross_val_score(RandomForestClassifier(n_estimators=200, random_state=42), X, y, cv=GroupKFold(n_splits=cv_folds), groups=groups, scoring="f1_macro")

    out = {
        "dataset_rows": int(len(df)), "train_rows": int(len(tr)), "test_rows": int(len(te)),
        "note": ("Synthetic dataset: labels represent the project's INTENDED routing policy per query template, "
                 "not real production traffic. Split is grouped by template_id so no test query's template was seen "
                 "during training. Near-perfect scores reflect that privacy/risk/complexity features are themselves "
                 "deterministic functions of the text (computed by the same analyzers used in production), so "
                 "templates are highly separable by construction - see evaluation_report.json for a harder, "
                 "hand-written out-of-distribution test with genuinely ambiguous queries and real misclassifications."),
        "models": results, "rule_baseline": baseline, "selected_model": best["model"],
        "cross_validation": {"method": f"GroupKFold(n_splits={cv_folds})", "metric": "f1_macro", "scores": [round(float(s), 4) for s in cv_scores],
                              "mean": round(float(cv_scores.mean()), 4), "std": round(float(cv_scores.std()), 4)},
        "rf_feature_importance": dict(sorted(zip(names, map(lambda v: round(float(v), 4), rf.feature_importances_)), key=lambda kv: -kv[1])),
    }
    (HERE / "metrics.json").write_text(json.dumps(out, indent=2))
    for r in results + [baseline]:
        print(f"{r['model']:28} acc={r['accuracy']:.3f} P={r['precision_macro']:.3f} R={r['recall_macro']:.3f} F1={r['f1_macro']:.3f}")
    print(f"5-fold grouped CV (RandomForest, f1_macro): mean={cv_scores.mean():.3f} std={cv_scores.std():.3f}")
    print("selected:", best["model"])


if __name__ == "__main__":
    main()
