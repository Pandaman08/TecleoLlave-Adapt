from sqlalchemy import Column, Integer, Boolean, DateTime, String
from app.database import Base
from datetime import datetime


class SecurityPolicy(Base):
    __tablename__ = "security_policies"

    id = Column(Integer, primary_key=True, index=True)
    max_failed_attempts = Column(Integer, default=5, nullable=False)
    lockout_duration_seconds = Column(Integer, default=15, nullable=False)
    lockout_duration_minutes = Column(Integer, default=1, nullable=True)
    is_enabled = Column(Boolean, default=True, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by = Column(String(50), nullable=True, default="admin")
