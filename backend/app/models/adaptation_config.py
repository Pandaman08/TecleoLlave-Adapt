from sqlalchemy import Column, Integer, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime


class AdaptationConfig(Base):
    __tablename__ = "adaptation_configs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    threshold_allow = Column(Float, default=0.85)
    threshold_challenge = Column(Float, default=0.70)
    threshold_reject = Column(Float, default=0.60)
    min_candidate_samples = Column(Integer, default=10)
    candidate_window_size = Column(Integer, default=50)
    max_far_degradation = Column(Float, default=0.0)
    max_frr_degradation = Column(Float, default=0.02)
    max_eer_degradation = Column(Float, default=0.0)
    min_precision_delta = Column(Float, default=-0.01)
    min_recall_delta = Column(Float, default=-0.01)
    require_all_constraints = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="adaptation_config")