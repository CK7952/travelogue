from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    app_name: str = "Travelogue Backend"
    debug: bool = True

    # Database
    database_url: str = "postgresql+psycopg2://travelogue:travelogue@localhost:5432/travelogue"

    # File storage (local for dev, COS for prod)
    storage_type: str = "local"  # local or cos
    local_storage_path: str = "./uploads"

    # Whisper
    whisper_model: str = "base"  # tiny/base/small/medium/large-v3
    whisper_device: str = "cpu"  # cpu/cuda
    whisper_compute_type: str = "int8"

    # LLM (OpenAI-compatible API)
    llm_base_url: str = "http://localhost:8000/v1"  # vLLM or other OpenAI-compatible server
    llm_api_key: str = "dummy"
    llm_model_clean: str = "Qwen2.5-3B-Instruct"
    llm_model_essay: str = "Qwen2.5-14B-Instruct"

    # Multimodal
    multimodal_base_url: str = "http://localhost:8000/v1"
    multimodal_model: str = "Qwen2-VL-7B-Instruct"

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
