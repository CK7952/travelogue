from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional


# ==================== Trip ====================
class TripBase(BaseModel):
    title: str
    destination: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


class TripCreate(TripBase):
    pass


class TripUpdate(BaseModel):
    title: Optional[str] = None
    destination: Optional[str] = None
    status: Optional[str] = None


class TripResponse(TripBase):
    id: int
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


# ==================== Fragment ====================
class FragmentBase(BaseModel):
    trip_id: int
    content: str
    raw_text: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    tags: List[str] = []
    mood: Optional[str] = None


class FragmentCreate(FragmentBase):
    pass


class FragmentUpdate(BaseModel):
    content: Optional[str] = None
    tags: Optional[List[str]] = None
    mood: Optional[str] = None


class FragmentResponse(FragmentBase):
    id: int
    audio_url: Optional[str] = None
    photos: Optional[List[str]] = None
    recorded_at: datetime
    created_at: datetime

    class Config:
        from_attributes = True


# ==================== Essay ====================
class EssayBase(BaseModel):
    trip_id: int
    style: str = "casual"  # literary, casual, observational


class EssayCreate(EssayBase):
    pass


class EssayResponse(BaseModel):
    id: int
    trip_id: int
    title: Optional[str] = None
    content: Optional[str] = None
    style: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


# ==================== Transcribe ====================
class TranscribeResponse(BaseModel):
    raw_text: str
    cleaned_text: str
    suggested_tags: List[str]
