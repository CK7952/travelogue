from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from app.database import engine, Base, SessionLocal
from app.routers import trips, fragments, essays
from app.config import get_settings
from app.services import whisper_service
import os

settings = get_settings()

app = FastAPI(
    title="Travelogue",
    description="旅行感悟随手记，自动汇总成小记",
    version="0.1.0",
)

# Dev mode: auto-create tables (production should use Alembic migrations)
if settings.environment == "development":
    Base.metadata.create_all(bind=engine)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 静态文件服务（仅本地存储模式下挂载）
if settings.storage_type == "local":
    uploads_dir = os.path.abspath(settings.local_storage_path)
    os.makedirs(uploads_dir, exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

# Routers
app.include_router(trips.router, prefix="/api/trips", tags=["trips"])
app.include_router(fragments.router, prefix="/api/fragments", tags=["fragments"])
app.include_router(essays.router, prefix="/api/essays", tags=["essays"])


@app.get("/health")
def health_check():
    db_status = "connected"
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
    except Exception:
        db_status = "disconnected"

    whisper_status = "ready" if whisper_service._whisper_model is not None else "not_loaded"

    return {
        "status": "ok",
        "service": "travelogue",
        "environment": settings.environment,
        "database": db_status,
        "whisper": whisper_status,
    }
