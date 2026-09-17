from sqlalchemy import Column, Integer, Boolean, DateTime, String, Float
from app.database import Base
from datetime import datetime


class SecurityPolicy(Base):
    __tablename__ = "security_policies"

    id = Column(Integer, primary_key=True, index=True)
    max_failed_attempts = Column(Integer, default=5, nullable=False)
    lockout_duration_seconds = Column(Integer, default=15, nullable=False)
    lockout_duration_minutes = Column(Integer, default=1, nullable=True)
    is_enabled = Column(Boolean, default=True, nullable=False)
    threshold_low = Column(Float, default=0.45, nullable=False)
    threshold_high = Column(Float, default=0.75, nullable=False)
    epsilon = Column(Float, default=0.02, nullable=False)
    adaptation_window = Column(Integer, default=50, nullable=False)
    minimum_samples = Column(Integer, default=10, nullable=False)
    rate_limit_attempts = Column(Integer, default=5, nullable=False)
    rate_limit_window_seconds = Column(Integer, default=300, nullable=False)
    retention_days = Column(Integer, default=90, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by = Column(String(50), nullable=True, default="admin")

