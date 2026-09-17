from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float, Boolean, Enum as SQLEnum, JSON
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime
import enum


class AuthDecision(str, enum.Enum):
    allow = "allow"
    challenge = "challenge"
    reject = "reject"


class AuthAttempt(Base):
    __tablename__ = "auth_attempts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    sample_id = Column(Integer, ForeignKey("typing_samples.id"), nullable=True)
    model_version_id = Column(Integer, ForeignKey("model_versions.id"), nullable=False)
    score = Column(Float, nullable=False)
    decision = Column(SQLEnum(AuthDecision), nullable=False)
    threshold_low = Column(Float, nullable=True, default=0.45)
    threshold_high = Column(Float, nullable=True, default=0.75)
    requires_2fa = Column(Boolean, nullable=True, default=False)
    challenge_passed = Column(Boolean, nullable=True)
    ip_address = Column(String(50), nullable=True)
    user_agent = Column(String(255), nullable=True)
    reason = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="auth_attempts")
    sample = relationship("TypingSample", back_populates="auth_attempts")
    model_version = relationship("ModelVersion", back_populates="auth_attempts")
    adaptation_events = relationship("AdaptationEvent", back_populates="auth_attempt")