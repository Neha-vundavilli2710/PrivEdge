"""Admin settings persisted in system_settings. Only some are ENFORCED by the backend
(see ENFORCED / NOT_ENFORCED) - the rest are stored for the UI only."""
import copy
import json

from sqlalchemy.orm import Session

from app.db.models import SystemSetting

DEFAULTS = {
    "routing": {"edgeEnabled": True, "cloudEnabled": True, "humanEnabled": True, "autoRoute": True},
    "security": {"mfa": False, "auditLog": True, "sessionTimeout": True},
    "ai": {"ragEnabled": True, "contextWindow": "4096", "temperature": "0.7"},
    "notifs": {"highRisk": True, "systemAlerts": True, "reviewBacklog": True},
}
ENFORCED = [
    "routing.edgeEnabled", "routing.cloudEnabled", "routing.humanEnabled", "routing.autoRoute",
    "security.auditLog", "security.sessionTimeout",
    "ai.ragEnabled", "ai.temperature", "ai.contextWindow",
    "notifs.highRisk", "notifs.systemAlerts", "notifs.reviewBacklog",
]
# MFA needs a real TOTP enrollment/verification flow (QR code, backup codes, login-step changes).
# That's a deliberate production-hardening item, not part of this pass - see backend/README.md.
NOT_ENFORCED = ["security.mfa"]


def get_all(db: Session) -> dict:
    row = db.get(SystemSetting, "settings")
    out = copy.deepcopy(DEFAULTS)
    if row and row.value:
        try:
            saved = json.loads(row.value)
            for group, vals in saved.items():
                if group in out and isinstance(vals, dict):
                    out[group].update({k: v for k, v in vals.items() if k in out[group]})
        except ValueError:
            pass
    return out


def save_all(db: Session, data: dict) -> dict:
    merged = get_all(db)
    for group, vals in (data or {}).items():
        if group in merged and isinstance(vals, dict):
            merged[group].update({k: v for k, v in vals.items() if k in merged[group]})
    row = db.get(SystemSetting, "settings") or SystemSetting(key="settings")
    row.value = json.dumps(merged)
    db.add(row)
    db.commit()
    return merged


def temperature(cfg: dict) -> float:
    try:
        return max(0.0, min(1.5, float(cfg["ai"]["temperature"])))
    except (ValueError, KeyError):
        return 0.7
