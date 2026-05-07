import os
import warnings
from app.config import get_settings

settings = get_settings()

# 延迟加载模型，避免启动时卡死
_whisper_model = None


def _load_model():
    global _whisper_model
    if _whisper_model is not None:
        return _whisper_model

    try:
        from faster_whisper import WhisperModel
        _whisper_model = WhisperModel(
            settings.whisper_model,
            device=settings.whisper_device,
            compute_type=settings.whisper_compute_type,
        )
        print(f"[Whisper] Model '{settings.whisper_model}' loaded on {settings.whisper_device}")
    except Exception as e:
        warnings.warn(f"Failed to load faster-whisper model: {e}. Transcription will fall back to dummy.")
        _whisper_model = "dummy"
    return _whisper_model


def transcribe_audio(audio_path: str) -> str:
    """将音频文件转写为文字"""
    model = _load_model()

    if model == "dummy":
        # 降级：返回假数据，保证接口可用
        return "（语音转写服务未就绪，这是占位文本）"

    if not os.path.exists(audio_path):
        raise FileNotFoundError(f"Audio file not found: {audio_path}")

    segments, info = model.transcribe(audio_path, beam_size=5, language="zh", condition_on_previous_text=False)
    text = "".join([segment.text for segment in segments]).strip()
    return text
