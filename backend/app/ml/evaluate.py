"""System-level routing evaluation on a small HAND-WRITTEN query set (not generated from
the training templates). Reports rule-based vs ML accuracy, per-route recall and the
'privacy routing' rate (sensitive queries kept off Cloud). Numbers are measured, not assumed.

Run:  python -m app.ml.evaluate
Output: app/ml/evaluation_report.json (so results are inspectable later, not just printed)
"""
import json
from datetime import datetime, timezone
from pathlib import Path

from app.services.feature_extractor import extract_features
from app.services.router import ml_route, rule_route

HERE = Path(__file__).parent

CASES = [  # (query, expected route)
    ("What is the capital of France?", "cloud"), ("Explain inheritance in Java.", "cloud"), ("How do I center a div in CSS?", "cloud"),
    ("Write a poem about autumn.", "cloud"), ("What are the pros and cons of remote work?", "cloud"), ("Explain how a hash map works.", "cloud"),
    ("Translate 'good morning' into Spanish.", "cloud"), ("What is the difference between TCP and UDP?", "cloud"), ("Summarize the plot of Romeo and Juliet.", "cloud"),
    ("Design a scalable architecture for a real-time chat system with replication and sharding.", "cloud"), ("What is a credit score?", "cloud"), ("Who was Marie Curie?", "cloud"),
    ("Analyze this confidential employee salary report.", "edge"), ("My email is jane.doe@corp.com, draft a reply to my manager.", "edge"),
    ("Summarize our internal company report on Q3 layoffs planning.", "edge"), ("My phone number is 9876543210, help me write an ad.", "edge"),
    ("Review this private medical record and list the medications.", "edge"), ("My account number is 456789123456, why was I charged twice?", "edge"),
    ("Analyze the proprietary source code in this restricted document.", "edge"), ("Here is my passport number, help me fill the visa form.", "edge"),
    ("quick: what is a REST API?", "edge"), ("Briefly, what is DNS? asap", "edge"),
    ("Should this patient undergo this medical procedure?", "human"), ("Is this legal document safe to sign?", "human"), ("Make a high-stakes professional decision for this case.", "human"),
    ("Should I take this medication with alcohol?", "human"), ("Should we fire this employee after the performance review?", "human"), ("Should I invest all my savings in one stock?", "human"),
    ("Give me legal advice on whether I should sue my employer.", "human"), ("This is a life-or-death situation, what should we do?", "human"),
    # tricky / borderline (expected to expose analyzer limits)
    ("My colleague's SSN is 123-45-6789, is that a valid format?", "edge"), ("What should I know before signing a lease?", "cloud"),
    ("Write a confidential-sounding spy story.", "cloud"), ("Explain what patient confidentiality means.", "cloud"),
]


def summarize(name: str, rows: list[tuple[str, str, str]]) -> dict:
    acc = sum(e == p for _, e, p in rows) / len(rows)
    per_route = {r: {"correct": sum(1 for _, e, p in rows if e == r and p == r), "total": sum(1 for _, e, _ in rows if e == r)} for r in ("cloud", "edge", "human")}
    sens = [(e, p) for _, e, p in rows if e in ("edge", "human")]
    kept = sum(1 for _, p in sens if p != "cloud")
    misses = [{"query": q, "expected": e, "got": p} for q, e, p in rows if e != p]
    return {
        "router": name, "cases": len(rows), "correct": sum(e == p for _, e, p in rows), "accuracy": round(acc, 4),
        "per_route_recall": per_route,
        "privacy_routing_rate": {"description": "Of sensitive/high-risk cases (expected edge or human), how many were correctly kept off Cloud.",
                                  "kept_off_cloud": kept, "sensitive_total": len(sens), "rate": round(kept / len(sens), 4) if sens else None},
        "misclassifications": misses,
    }


def main():
    res = {"rule": [], "ml": []}
    for q, exp in CASES:
        f = extract_features(q)
        r = rule_route(f)
        m = ml_route(f)
        res["rule"].append((q, exp, r.route))
        if m:
            res["ml"].append((q, exp, m.route))

    report = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "description": ("Hand-written, out-of-distribution test set (NOT generated from the training templates in "
                         "generate_dataset.py), used to measure genuine generalization rather than the near-perfect "
                         "in-distribution numbers in metrics.json. Includes deliberately tricky/borderline cases "
                         "expected to expose real analyzer limits."),
        "case_count": len(CASES),
        "results": {},
    }
    for name, rows in res.items():
        if not rows:
            print(f"{name}: (no trained model found - run python -m app.ml.train)")
            report["results"][name] = {"error": "no trained model found"}
            continue
        s = summarize(name, rows)
        report["results"][name] = s
        print(f"\n[{name}] accuracy={s['accuracy']:.3f} ({s['correct']}/{s['cases']})  " +
              "  ".join(f"{k}: {v['correct']}/{v['total']}" for k, v in s['per_route_recall'].items()))
        pr = s["privacy_routing_rate"]
        if pr["rate"] is not None:
            print(f"[{name}] privacy routing (sensitive/high-risk kept off Cloud): {pr['kept_off_cloud']}/{pr['sensitive_total']} = {pr['rate']:.3f}")
        for m in s["misclassifications"]:
            print(f"   MISS  expected={m['expected']:5} got={m['got']:5} | {m['query']}")

    (HERE / "evaluation_report.json").write_text(json.dumps(report, indent=2))
    print(f"\nWrote {HERE / 'evaluation_report.json'}")


if __name__ == "__main__":
    main()
