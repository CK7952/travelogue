from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.database import engine, Base
from app.routers import trips, fragments, essays
from app.config import get_settings
import os

# Create tables
Base.metadata.create_all(bind=engine)

settings = get_settings()

app = FastAPI(
    title="Travelogue",
    description="旅行感悟随手记，自动汇总成小记",
    version="0.1.0",
)

# CORS: 后续生产环境应限制为小程序域名
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 静态文件服务（图片、音频）
uploads_dir = os.path.abspath(settings.local_storage_path)
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

# Routers
app.include_router(trips.router, prefix="/api/trips", tags=["trips"])
app.include_router(fragments.router, prefix="/api/fragments", tags=["fragments"])
app.include_router(essays.router, prefix="/api/essays", tags=["essays"])


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "travelogue"}
