from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, JSON, Text, Float
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime


class ModelVersion(Base):
    __tablename__ = "model_versions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    version = Column(Integer, nullable=True)
    parent_version_id = Column(Integer, ForeignKey("model_versions.id"), nullable=True)
    model_path = Column(String(500), nullable=False)
    artifact_path = Column(String(500), nullable=True)
    training_samples_count = Column(Integer, nullable=False, default=10)
    training_samples = Column(Integer, nullable=True)
    metrics = Column(JSON, nullable=False)
    training_config = Column(JSON, nullable=False)
    feature_schema = Column(JSON, nullable=False)
    is_active = Column(Boolean, default=False)
    status = Column(String(30), default="ACTIVE", nullable=True)  # 'ACTIVE', 'CANDIDATE', 'PROMOTED', 'REJECTED', 'ROLLED_BACK'
    far = Column(Float, nullable=True)
    frr = Column(Float, nullable=True)
    eer = Column(Float, nullable=True)
    auc = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="model_versions", foreign_keys=[user_id])
    auth_attempts = relationship("AuthAttempt", back_populates="model_version")
    candidate_models = relationship("CandidateModel", back_populates="parent_version")
    parent_version = relationship("ModelVersion", remote_side=[id])