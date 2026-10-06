"""Aggregations over routing_logs / human_reviews for all dashboards."""
from collections import Counter
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.models import HumanReview, Message, RoutingLog
from app.services.policy import level, risk_label

ROUTES = ("edge", "cloud", "human")


def _aware(dt):
    return dt if dt is None or dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def _dist(values, high, order=("Low", "Medium", "High")):
    c = Counter(level(v, high) for v in values)
    n = len(values) or 1
    return [{"name": k, "value": c.get(k, 0), "pct": round(100 * c.get(k, 0) / n, 1)} for k in order]


def summary(db: Session, user_id: int | None = None, days: int = 7) -> dict:
    s = get_settings()
    q = db.query(RoutingLog)
    if user_id:
        q = q.filter(RoutingLog.user_id == user_id)
    logs = q.all()
    total = len(logs)
    counts = {r: sum(1 for l in logs if l.selected_route == r) for r in ROUTES}
    pct = {r: round(100 * counts[r] / total, 1) if total else 0 for r in ROUTES}
    times = [l.processing_time for l in logs if l.processing_time is not None]

    today = datetime.now(timezone.utc).date()
    daily = []
    for i in range(days - 1, -1, -1):
        d = today - timedelta(days=i)
        day_logs = [l for l in logs if _aware(l.timestamp).date() == d]
        daily.append({"date": d.isoformat(), "day": d.strftime("%a"), **{r: sum(1 for l in day_logs if l.selected_route == r) for r in ROUTES}})

    hourly, resp = [], []
    for h in range(0, 24, 4):
        b = [l for l in logs if h <= _aware(l.timestamp).hour < h + 4]
        hourly.append({"time": f"{h:02d}h", "queries": len(b)})
        bt = [l.processing_time for l in b if l.processing_time is not None]
        resp.append({"time": f"{h:02d}:00", "avg": round(sum(bt) / len(bt), 2) if bt else 0})

    sensitive = [l for l in logs if l.privacy_score >= s.privacy_threshold or l.sensitivity_score >= s.sensitivity_threshold]
    def avg(attr):
        return round(sum(getattr(l, attr) for l in logs) / total, 3) if total else 0
    return {
        "total": total, "counts": counts, "pct": pct,
        "avg_processing_time": round(sum(times) / len(times), 3) if times else 0,
        "avg_scores": {k: avg(k) for k in ("privacy_score", "sensitivity_score", "complexity_score", "risk_score", "latency_score")},
        "privacy_distribution": _dist([l.privacy_score for l in logs], s.privacy_threshold),
        "sensitivity_distribution": _dist([l.sensitivity_score for l in logs], s.sensitivity_threshold),
        "complexity_distribution": _dist([l.complexity_score for l in logs], s.complexity_threshold),
        "risk_distribution": _dist([l.risk_score for l in logs], s.risk_threshold),
        "daily": daily, "hourly_volume": hourly, "response_time_by_hour": resp,
        "human_review_rate": round(100 * counts["human"] / total, 1) if total else 0,
        "sensitive_total": len(sensitive),
        "sensitive_kept_off_cloud": sum(1 for l in sensitive if l.selected_route != "cloud"),
        "router_used": dict(Counter(l.router_used for l in logs)),
        "avg_time_by_route": {r: round(sum(t) / len(t), 3) if (t := [l.processing_time for l in logs if l.selected_route == r and l.processing_time is not None]) else None for r in ROUTES},
    }


def review_stats(db: Session, reviewer_id: int | None = None, days: int = 7) -> dict:
    allr = db.query(HumanReview).all()
    done_all = [r for r in allr if r.status in ("APPROVED", "MODIFIED", "REJECTED")]
    done = [r for r in done_all if reviewer_id is None or r.reviewer_id == reviewer_id]
    pending = [r for r in allr if r.status == "PENDING"]
    in_review = [r for r in allr if r.status == "IN_REVIEW" and (reviewer_id is None or r.reviewer_id == reviewer_id)]
    now = datetime.now(timezone.utc)
    today = now.date()

    def minutes(r):
        return (_aware(r.completed_at) - _aware(r.created_at)).total_seconds() / 60 if r.completed_at else None
    mins = [m for r in done if (m := minutes(r)) is not None]
    outcome = Counter(r.status for r in done)
    n = len(done) or 1

    activity = []
    for i in range(days - 1, -1, -1):
        d = today - timedelta(days=i)
        row = [r for r in done if r.completed_at and _aware(r.completed_at).date() == d]
        activity.append({"day": d.strftime("%a"), "approved": sum(r.status == "APPROVED" for r in row),
                         "modified": sum(r.status == "MODIFIED" for r in row), "rejected": sum(r.status == "REJECTED" for r in row)})

    risks = Counter()
    for r in allr:
        log = db.query(RoutingLog).filter_by(message_id=r.message_id).first()
        if log:
            risks[risk_label(log.risk_score)] += 1
    high_pending = sum(1 for r in pending + in_review if (l := db.query(RoutingLog).filter_by(message_id=r.message_id).first()) and l.risk_score >= get_settings().risk_threshold)

    return {
        "pending": len(pending), "in_review": len(in_review), "completed": len(done),
        "completed_today": sum(1 for r in done if r.completed_at and _aware(r.completed_at).date() == today),
        "high_risk_pending": high_pending,
        "avg_review_minutes": round(sum(mins) / len(mins), 1) if mins else 0,
        "outcomes": [{"name": k.title(), "value": outcome.get(k.upper(), 0), "pct": round(100 * outcome.get(k.upper(), 0) / n, 1)} for k in ("approved", "modified", "rejected")],
        "activity": activity,
        "risk_distribution": [{"name": k, "value": risks.get(k, 0)} for k in ("Low", "Medium", "High", "Critical")],
    }
