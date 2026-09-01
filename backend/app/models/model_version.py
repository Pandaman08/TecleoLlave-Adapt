from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, JSON, Text
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime


class ModelVersion(Base):
    __tablename__ = "model_versions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    model_path = Column(String(500), nullable=False)
    training_samples_count = Column(Integer, nullable=False)
    metrics = Column(JSON, nullable=False)
    training_config = Column(JSON, nullable=False)
    feature_schema = Column(JSON, nullable=False)
    is_active = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="model_versions", foreign_keys=[user_id])
    auth_attempts = relationship("AuthAttempt", back_populates="model_version")
    candidate_models = relationship("CandidateModel", back_populates="parent_version")