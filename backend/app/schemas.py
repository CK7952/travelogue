from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


TripStatus = Literal["ongoing", "completed"]
EssayStyle = Literal["literary", "casual", "observational"]


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class DeleteResponse(BaseModel):
    message: str


class PhotoUploadResponse(BaseModel):
    photo_url: str


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
    status: Optional[TripStatus] = None


class TripResponse(ORMModel, TripBase):
    id: int
    status: TripStatus
    created_at: datetime


# ==================== Fragment ====================
class FragmentBase(BaseModel):
    trip_id: int
    content: str
    raw_text: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    tags: List[str] = Field(default_factory=list)
    mood: Optional[str] = None


class FragmentCreate(FragmentBase):
    pass


class FragmentUpdate(BaseModel):
    content: Optional[str] = None
    tags: Optional[List[str]] = None
    mood: Optional[str] = None


class FragmentResponse(ORMModel, FragmentBase):
    id: int
    audio_url: Optional[str] = None
    photos: Optional[List[str]] = None
    recorded_at: datetime
    created_at: datetime


# ==================== Essay ====================
class EssayBase(BaseModel):
    trip_id: int
    style: EssayStyle = "casual"


class EssayCreate(EssayBase):
    pass


class EssayResponse(ORMModel):
    id: int
    trip_id: int
    title: Optional[str] = None
    content: Optional[str] = None
    style: EssayStyle
    status: str
    created_at: datetime


# ==================== Transcribe ====================
class TranscribeResponse(BaseModel):
    raw_text: str
    cleaned_text: str
    suggested_tags: List[str] = Field(default_factory=list)
