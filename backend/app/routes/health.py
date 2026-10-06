"""
Health check route.

Purpose: give the frontend (and us, during manual testing) a trivial,
no-auth endpoint to confirm the backend is up and CORS is configured
correctly, before any real PrivEdge logic exists.
"""

from fastapi import APIRouter

from app.core.config import get_settings

router = APIRouter(tags=["health"])


@router.get("/health")
def health_check():
    settings = get_settings()
    return {
        "status": "ok",
        "service": settings.app_name,
        "environment": settings.app_env,
    }
