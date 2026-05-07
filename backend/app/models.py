from sqlalchemy import Column, Integer, String, Text, DateTime, Float, JSON, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base
import datetime


class Trip(Base):
    __tablename__ = "trips"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    destination = Column(String(200))
    start_date = Column(DateTime)
    end_date = Column(DateTime)
    status = Column(String(20), default="ongoing")  # ongoing, completed
    created_at = Column(DateTime, default=datetime.datetime.now)

    fragments = relationship("Fragment", back_populates="trip", cascade="all, delete-orphan")
    essays = relationship("Essay", back_populates="trip", cascade="all, delete-orphan")


class Fragment(Base):
    __tablename__ = "fragments"

    id = Column(Integer, primary_key=True, index=True)
    trip_id = Column(Integer, ForeignKey("trips.id"), nullable=False)
    content = Column(Text, nullable=False)          # 用户确认后的最终文本
    raw_text = Column(Text)                          # Whisper原始输出（清理前）
    audio_url = Column(String(500))
    photos = Column(JSON, default=list)              # ["url1", "url2"]
    latitude = Column(Float)
    longitude = Column(Float)
    recorded_at = Column(DateTime, default=datetime.datetime.now)
    tags = Column(JSON, default=list)                # ["食物", "天气"]
    mood = Column(String(10))                        # emoji或文本
    created_at = Column(DateTime, default=datetime.datetime.now)

    trip = relationship("Trip", back_populates="fragments")


class Scene(Base):
    __tablename__ = "scenes"

    id = Column(Integer, primary_key=True, index=True)
    trip_id = Column(Integer, ForeignKey("trips.id"), nullable=False)
    name = Column(String(200))
    fragment_ids = Column(JSON, default=list)
    center_lat = Column(Float)
    center_lng = Column(Float)
    start_time = Column(DateTime)
    end_time = Column(DateTime)
    summary = Column(Text)
    tags = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.datetime.now)


class Essay(Base):
    __tablename__ = "essays"

    id = Column(Integer, primary_key=True, index=True)
    trip_id = Column(Integer, ForeignKey("trips.id"), nullable=False)
    title = Column(String(300))
    content = Column(Text)
    style = Column(String(50), default="casual")     # literary, casual, observational
    fragment_ids = Column(JSON, default=list)
    scene_ids = Column(JSON, default=list)
    status = Column(String(20), default="draft")     # draft, published
    created_at = Column(DateTime, default=datetime.datetime.now)

    trip = relationship("Trip", back_populates="essays")
