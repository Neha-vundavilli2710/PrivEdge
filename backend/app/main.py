"""PrivEdge backend entrypoint."""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.db import migrate, models  # noqa: F401  (models registers tables)
from app.db.database import Base, SessionLocal, engine
from app.db.seed import seed
from app.routes import admin, auth, chat, dashboard, health, knowledge, notifications, review

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    migrate.run(engine)  # additive column migrations for pre-existing dev databases
    with SessionLocal() as db:
        seed(db)
    yield


app = FastAPI(title=settings.app_name, description="Privacy-aware, risk-aware conversational AI backend.", version="1.0.0", lifespan=lifespan)

app.add_middleware(CORSMiddleware, allow_origins=settings.origins_list, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

for r in (health.router, auth.router, chat.router, review.router, dashboard.router, admin.router, knowledge.user_router, knowledge.admin_router, notifications.router):
    app.include_router(r)


@app.get("/", tags=["root"])
def root():
    return {"message": "PrivEdge backend is running. See /docs for the API explorer."}
