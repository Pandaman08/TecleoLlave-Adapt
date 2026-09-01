from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON, Enum as SQLEnum, Text
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime
import enum


class CandidateStatus(str, enum.Enum):
    training = "training"
    evaluating = "evaluating"
    accepted = "accepted"
    rejected = "rejected"


class CandidateModel(Base):
    __tablename__ = "candidate_models"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    model_path = Column(String(500), nullable=False)
    source_samples = Column(JSON, nullable=False)
    metrics = Column(JSON, nullable=False)
    status = Column(SQLEnum(CandidateStatus), default=CandidateStatus.training)
    parent_version_id = Column(Integer, ForeignKey("model_versions.id"), nullable=False)
    evaluation_details = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="candidate_models")
    parent_version = relationship("ModelVersion", back_populates="candidate_models")