from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import shutil
import tempfile
from app.database import get_db
from app import models, schemas
from app.config import get_settings
from app.storage import save_upload_file
from app.services.whisper_service import transcribe_audio
from app.services.llm_service import clean_transcript, suggest_tags

router = APIRouter()
settings = get_settings()


@router.post("", response_model=schemas.FragmentResponse)
def create_fragment(fragment: schemas.FragmentCreate, db: Session = Depends(get_db)):
    # 验证行程存在
    trip = db.query(models.Trip).filter(models.Trip.id == fragment.trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    db_fragment = models.Fragment(**fragment.model_dump())
    db.add(db_fragment)
    db.commit()
    db.refresh(db_fragment)
    return db_fragment


@router.get("/trip/{trip_id}", response_model=List[schemas.FragmentResponse])
def list_fragments_by_trip(trip_id: int, db: Session = Depends(get_db)):
    fragments = (
        db.query(models.Fragment)
        .filter(models.Fragment.trip_id == trip_id)
        .order_by(models.Fragment.recorded_at.desc())
        .all()
    )
    return fragments


@router.get("/{fragment_id}", response_model=schemas.FragmentResponse)
def get_fragment(fragment_id: int, db: Session = Depends(get_db)):
    fragment = db.query(models.Fragment).filter(models.Fragment.id == fragment_id).first()
    if not fragment:
        raise HTTPException(status_code=404, detail="Fragment not found")
    return fragment


@router.put("/{fragment_id}", response_model=schemas.FragmentResponse)
def update_fragment(fragment_id: int, fragment_update: schemas.FragmentUpdate, db: Session = Depends(get_db)):
    fragment = db.query(models.Fragment).filter(models.Fragment.id == fragment_id).first()
    if not fragment:
        raise HTTPException(status_code=404, detail="Fragment not found")
    for field, value in fragment_update.model_dump(exclude_unset=True).items():
        setattr(fragment, field, value)
    db.commit()
    db.refresh(fragment)
    return fragment


@router.delete("/{fragment_id}")
def delete_fragment(fragment_id: int, db: Session = Depends(get_db)):
    fragment = db.query(models.Fragment).filter(models.Fragment.id == fragment_id).first()
    if not fragment:
        raise HTTPException(status_code=404, detail="Fragment not found")
    db.delete(fragment)
    db.commit()
    return {"message": "Fragment deleted"}


@router.post("/transcribe", response_model=schemas.TranscribeResponse)
def transcribe_fragment(
    audio: UploadFile = File(...),
    trip_id: int = Form(...),
    latitude: Optional[str] = Form(None),
    longitude: Optional[str] = Form(None),
    mood: Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
    """
    上传语音文件，返回转写+清理后的文本+建议标签。
    此接口不保存碎片，前端确认后再调用 create_fragment 保存。
    """
    # 验证行程
    trip = db.query(models.Trip).filter(models.Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    # 前端可能传空字符串，兼容处理
    lat = float(latitude) if latitude and latitude.strip() else None
    lon = float(longitude) if longitude and longitude.strip() else None

    # 保存音频到临时文件供 Whisper 转写（转写后删除，不长期存储）
    suffix = os.path.splitext(audio.filename or "")[1] or ".webm"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        shutil.copyfileobj(audio.file, tmp)
        tmp_path = tmp.name

    try:
        raw_text = transcribe_audio(tmp_path)
    finally:
        os.unlink(tmp_path)

    # 保守清理
    cleaned_text = clean_transcript(raw_text)

    # 建议标签
    suggested_tags = suggest_tags(cleaned_text)

    return schemas.TranscribeResponse(
        raw_text=raw_text,
        cleaned_text=cleaned_text,
        suggested_tags=suggested_tags,
    )


@router.post("/{fragment_id}/photos")
def upload_photo(fragment_id: int, photo: UploadFile = File(...), db: Session = Depends(get_db)):
    fragment = db.query(models.Fragment).filter(models.Fragment.id == fragment_id).first()
    if not fragment:
        raise HTTPException(status_code=404, detail="Fragment not found")

    current_photos = fragment.photos or []
    photo_url = save_upload_file(photo, "photos")
    current_photos.append(photo_url)

    fragment.photos = current_photos
    db.commit()
    db.refresh(fragment)
    return {"photo_url": photo_url}
