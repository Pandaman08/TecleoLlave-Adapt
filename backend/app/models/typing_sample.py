from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, Text, Enum as SQLEnum, JSON
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime
import enum


class SampleSource(str, enum.Enum):
    enrollment = "enrollment"
    auth = "auth"
    update = "update"


class SampleQuality(str, enum.Enum):
    high = "high"
    medium = "medium"
    low = "low"


class TypingSample(Base):
    __tablename__ = "typing_samples"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    raw_timestamps = Column(JSON, nullable=False)
    phrase_typed = Column(String(200), nullable=False)
    source = Column(SQLEnum(SampleSource), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_validated = Column(Boolean, default=False)
    consistency_score = Column(JSON, nullable=True)
    sample_quality = Column(SQLEnum(SampleQuality), nullable=True)

    user = relationship("User", back_populates="typing_samples")
    features = relationship("TypingFeature", back_populates="sample", uselist=False)
    auth_attempts = relationship("AuthAttempt", back_populates="sample")