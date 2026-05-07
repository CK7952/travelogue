from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app import models, schemas
from app.services.llm_service import generate_essay

router = APIRouter()


@router.post("/generate", response_model=schemas.EssayResponse)
def generate_essay_endpoint(essay_create: schemas.EssayCreate, db: Session = Depends(get_db)):
    """根据行程ID和风格，自动生成小记"""
    trip = db.query(models.Trip).filter(models.Trip.id == essay_create.trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    # 获取该行程所有碎片
    fragments = (
        db.query(models.Fragment)
        .filter(models.Fragment.trip_id == essay_create.trip_id)
        .order_by(models.Fragment.recorded_at.asc())
        .all()
    )

    if not fragments:
        raise HTTPException(status_code=400, detail="No fragments found for this trip")

    # 调用LLM生成
    title, content = generate_essay(fragments, essay_create.style)

    # 保存为小记草稿
    db_essay = models.Essay(
        trip_id=essay_create.trip_id,
        title=title,
        content=content,
        style=essay_create.style,
        fragment_ids=[f.id for f in fragments],
        status="draft",
    )
    db.add(db_essay)
    db.commit()
    db.refresh(db_essay)
    return db_essay


@router.get("/trip/{trip_id}", response_model=List[schemas.EssayResponse])
def list_essays_by_trip(trip_id: int, db: Session = Depends(get_db)):
    essays = (
        db.query(models.Essay)
        .filter(models.Essay.trip_id == trip_id)
        .order_by(models.Essay.created_at.desc())
        .all()
    )
    return essays


@router.get("/{essay_id}", response_model=schemas.EssayResponse)
def get_essay(essay_id: int, db: Session = Depends(get_db)):
    essay = db.query(models.Essay).filter(models.Essay.id == essay_id).first()
    if not essay:
        raise HTTPException(status_code=404, detail="Essay not found")
    return essay


@router.put("/{essay_id}", response_model=schemas.EssayResponse)
def update_essay(essay_id: int, essay_update: schemas.EssayCreate, db: Session = Depends(get_db)):
    essay = db.query(models.Essay).filter(models.Essay.id == essay_id).first()
    if not essay:
        raise HTTPException(status_code=404, detail="Essay not found")

    # 允许修改标题和内容
    if essay_update.style:
        essay.style = essay_update.style
    db.commit()
    db.refresh(essay)
    return essay


@router.delete("/{essay_id}")
def delete_essay(essay_id: int, db: Session = Depends(get_db)):
    essay = db.query(models.Essay).filter(models.Essay.id == essay_id).first()
    if not essay:
        raise HTTPException(status_code=404, detail="Essay not found")
    db.delete(essay)
    db.commit()
    return {"message": "Essay deleted"}
