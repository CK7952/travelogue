import os
from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import get_settings

settings = get_settings()

# In development we allow a SQLite fallback so local onboarding stays simple.
# In production we must fail fast instead of silently writing to the wrong database.
def _create_engine_with_fallback():
    try:
        eng = create_engine(settings.database_url, pool_pre_ping=True)
        with eng.connect() as conn:
            conn.execute(text("SELECT 1"))
        print(f"[DB] Connected using {eng.url.drivername}")
        return eng
    except Exception as e:
        if settings.environment != "development":
            raise RuntimeError(
                f"Database connection failed in {settings.environment} mode; refusing to fall back to SQLite."
            ) from e

        sqlite_path = os.path.join(os.path.dirname(__file__), "..", "travelogue_dev.db")
        sqlite_url = f"sqlite:///{os.path.abspath(sqlite_path)}"
        print(f"[DB] PostgreSQL unavailable ({e}), falling back to SQLite: {sqlite_url}")
        return create_engine(sqlite_url, connect_args={"check_same_thread": False})


engine = _create_engine_with_fallback()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
