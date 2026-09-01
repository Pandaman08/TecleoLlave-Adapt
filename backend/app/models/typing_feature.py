from sqlalchemy import Column, Integer, ForeignKey, DateTime, JSON
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime


class TypingFeature(Base):
    __tablename__ = "typing_features"

    id = Column(Integer, primary_key=True, index=True)
    sample_id = Column(Integer, ForeignKey("typing_samples.id"), unique=True, nullable=False)
    feature_vector = Column(JSON, nullable=False)
    feature_names = Column(JSON, nullable=False)
    extracted_at = Column(DateTime, default=datetime.utcnow)

    sample = relationship("TypingSample", back_populates="features")