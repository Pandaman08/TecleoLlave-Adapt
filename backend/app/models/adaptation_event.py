from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Enum as SQLEnum, JSON
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime
import enum


class AdaptationAction(str, enum.Enum):
    candidate_created = "candidate_created"
    candidate_evaluating = "candidate_evaluating"
    candidate_accepted = "candidate_accepted"
    candidate_rejected = "candidate_rejected"
    challenge_requested = "challenge_requested"
    challenge_passed = "challenge_passed"
    challenge_failed = "challenge_failed"
    sample_enqueued = "sample_enqueued"


class AdaptationEvent(Base):
    __tablename__ = "adaptation_events"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    auth_attempt_id = Column(Integer, ForeignKey("auth_attempts.id"), nullable=True)
    action = Column(SQLEnum(AdaptationAction), nullable=False)
    candidate_model_id = Column(Integer, ForeignKey("candidate_models.id"), nullable=True)
    old_model_version_id = Column(Integer, ForeignKey("model_versions.id"), nullable=True)
    new_model_version_id = Column(Integer, ForeignKey("model_versions.id"), nullable=True)
    reason = Column(Text, nullable=True)
    metrics_comparison = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="adaptation_events")
    auth_attempt = relationship("AuthAttempt", back_populates="adaptation_events")