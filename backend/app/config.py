from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import List


class Settings(BaseSettings):
    app_name: str = "Travelogue Backend"
    environment: str = "development"  # development / production
    debug: bool = True

    # Database
    database_url: str = "postgresql+psycopg2://travelogue:travelogue@localhost:5432/travelogue"

    # File storage (local | cos | supabase)
    storage_type: str = "local"  # local or cos or supabase
    local_storage_path: str = "./uploads"

    # COS (Tencent Cloud Object Storage) — optional, only used when storage_type=cos
    cos_secret_id: str = ""
    cos_secret_key: str = ""
    cos_bucket: str = ""
    cos_region: str = "ap-guangzhou"

    # Supabase — optional, only used when storage_type=supabase
    supabase_url: str = ""
    supabase_service_role_key: str = ""
    supabase_storage_bucket: str = "travelogue"

    # Whisper
    whisper_model: str = "tiny"  # tiny/base/small/medium/large-v3
    whisper_device: str = "cpu"  # cpu/cuda
    whisper_compute_type: str = "int8"

    # LLM (OpenAI-compatible API)
    llm_base_url: str = "http://localhost:8000/v1"  # vLLM or other OpenAI-compatible server
    llm_api_key: str = "dummy"
    llm_model_clean: str = "Qwen2.5-3B-Instruct"
    llm_model_essay: str = "Qwen2.5-14B-Instruct"

    # Vision LLM (for essay generation with images; OpenAI-compatible)
    vision_base_url: str = ""
    vision_api_key: str = ""
    vision_model: str = ""

    # Multimodal (legacy local endpoint)
    multimodal_base_url: str = "http://localhost:8000/v1"
    multimodal_model: str = "Qwen2-VL-7B-Instruct"

    # CORS
    cors_origins: str = "*"  # comma-separated list, e.g. "https://a.com,https://b.com"

    class Config:
        env_file = ".env"

    def get_cors_origins(self) -> List[str]:
        if self.environment == "development":
            return ["*"]

        normalized = self.cors_origins.strip()
        if normalized == "*" or not normalized:
            raise ValueError("Production CORS must explicitly list allowed origins.")

        origins = [origin.strip() for origin in normalized.split(",") if origin.strip()]
        if not origins:
            raise ValueError("Production CORS must include at least one allowed origin.")
        return origins


@lru_cache()
def get_settings() -> Settings:
    return Settings()
