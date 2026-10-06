"""Centralized settings loaded from .env."""
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "PrivEdge Backend"
    app_env: str = "development"
    allowed_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    database_url: str = "sqlite:///./privedge.db"

    jwt_secret: str = "dev-secret-change-me"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 480

    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.0-flash"

    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.2:3b"

    router_mode: str = "rule"  # rule | ml
    ml_model_path: str = "app/ml/routing_model.joblib"

    encryption_key: str = ""

    # Routing policy thresholds (project-defined, configurable - not universal values)
    privacy_threshold: float = 0.70
    sensitivity_threshold: float = 0.70
    risk_threshold: float = 0.80
    complexity_threshold: float = 0.55
    latency_threshold: float = 0.70
    human_threshold: float = 0.60

    session_idle_minutes: int = 30
    review_backlog_threshold: int = 5

    seed_admin_email: str = "admin@privedge.io"
    seed_admin_password: str = "Admin@12345"
    seed_reviewer_email: str = "reviewer@privedge.io"
    seed_reviewer_password: str = "Reviewer@12345"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def origins_list(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
