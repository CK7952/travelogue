import os
import shutil
import uuid
from typing import Optional
from fastapi import UploadFile
from app.config import get_settings

settings = get_settings()


def _get_local_path(relative_url: str) -> str:
    """将 /uploads/{folder}/{file} 转为本地绝对路径"""
    return os.path.join(settings.local_storage_path, relative_url.lstrip("/uploads/"))


def save_upload_file(upload_file: UploadFile, folder: str) -> str:
    """保存上传文件，返回可访问的 URL 路径"""
    ext = os.path.splitext(upload_file.filename or "")[1]
    filename = f"{uuid.uuid4().hex}{ext}"

    if settings.storage_type == "cos":
        return _save_to_cos(upload_file, folder, filename)
    return _save_to_local(upload_file, folder, filename)


def _save_to_local(upload_file: UploadFile, folder: str, filename: str) -> str:
    upload_dir = os.path.join(settings.local_storage_path, folder)
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, filename)
    with open(file_path, "wb") as f:
        shutil.copyfileobj(upload_file.file, f)
    return f"/uploads/{folder}/{filename}"


def _save_to_cos(upload_file: UploadFile, folder: str, filename: str) -> str:
    try:
        from qcloud_cos import CosConfig, CosS3Client
    except ImportError:
        raise RuntimeError("storage_type is 'cos' but cos-python-sdk-v5 is not installed")

    cos_config = CosConfig(
        Region=settings.cos_region,
        SecretId=settings.cos_secret_id,
        SecretKey=settings.cos_secret_key,
    )
    client = CosS3Client(cos_config)

    key = f"travelogue/{folder}/{filename}"
    client.put_object(
        Bucket=settings.cos_bucket,
        Body=upload_file.file,
        Key=key,
    )
    return f"https://{settings.cos_bucket}.cos.{settings.cos_region}.myqcloud.com/{key}"


def get_file_url(relative_or_cos_url: str) -> str:
    """将存储的 URL 转为可直接访问的地址（local 模式下补全域名需要外部处理）"""
    return relative_or_cos_url
