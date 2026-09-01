from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime
import enum


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    phrase = Column(String(200), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    current_model_version_id = Column(Integer, ForeignKey("model_versions.id"), nullable=True)

    typing_samples = relationship("TypingSample", back_populates="user")
    auth_attempts = relationship("AuthAttempt", back_populates="user")
    model_versions = relationship("ModelVersion", back_populates="user", foreign_keys="ModelVersion.user_id")
    current_model_version = relationship("ModelVersion", foreign_keys=[current_model_version_id])
    adaptation_events = relationship("AdaptationEvent", back_populates="user")
    candidate_models = relationship("CandidateModel", back_populates="user")
    adaptation_config = relationship("AdaptationConfig", back_populates="user", uselist=False)