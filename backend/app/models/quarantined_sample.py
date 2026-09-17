"""
Quarantined Samples Model for Model Poisoning Prevention in TECLEOLLAVE-ADAPT.
Stores suspicious or anomalous keystroke samples that were blocked from entering
the adaptation candidate pool.
"""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float, Text
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime


class QuarantinedSample(Base):
    __tablename__ = "quarantined_samples"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    sample_id = Column(Integer, ForeignKey("typing_samples.id"), nullable=False)
    score = Column(Float, nullable=False)
    reason = Column(Text, nullable=False)
    status = Column(String(50), default="quarantined", nullable=False)  # 'quarantined' | 'reviewed' | 'discarded'
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")
    sample = relationship("TypingSample")
