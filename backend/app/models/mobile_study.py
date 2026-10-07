from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime


class MobileOtp(Base):
    __tablename__ = "mobile_otps"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(120), index=True, nullable=False)
    code = Column(String(6), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    is_used = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class MobileParticipant(Base):
    __tablename__ = "mobile_participants"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    participant_code = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(120), index=True, nullable=False)
    full_name = Column(String(100), nullable=True)
    dominant_hand = Column(String(20), default="diestro", nullable=False)  # diestro / zurdo
    age_range = Column(String(20), default="18-25", nullable=False)
    device_model = Column(String(100), default="Android Device", nullable=False)
    screen_refresh_rate = Column(Integer, default=60, nullable=False)  # 60, 90, 120 Hz
    enrollment_phrase = Column(String(200), nullable=True)
    is_enrolled = Column(Boolean, default=False, nullable=False)
    enrolled_reps_count = Column(Integer, default=0, nullable=False)
    m0_profile = Column(JSON, nullable=True)  # { centroid, std, feature_names }
    mt_profile = Column(JSON, nullable=True)  # Adaptative profile
    current_drift = Column(Float, default=0.0, nullable=False)
    satisfaction_score = Column(Integer, nullable=True)  # 1 a 5 estrellas
    satisfaction_comment = Column(Text, nullable=True)  # Comentario opcional de usabilidad
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    samples = relationship("MobileStudySample", back_populates="participant", cascade="all, delete-orphan")


class MobileStudySample(Base):
    __tablename__ = "mobile_study_samples"

    id = Column(Integer, primary_key=True, index=True)
    client_event_id = Column(String(64), unique=True, index=True, nullable=True)
    participant_id = Column(Integer, ForeignKey("mobile_participants.id"), nullable=False)
    sample_type = Column(String(50), nullable=False)  # ENROLLMENT_30, AUTH_SYSTEM, AUTH_APPLOCKER, IMPOSTOR_CHALLENGE
    repetition_index = Column(Integer, nullable=True)  # 1..30 if enrollment
    phrase = Column(String(200), nullable=False)
    raw_timestamps = Column(JSON, nullable=False)
    hold_times = Column(JSON, nullable=True)
    latencies = Column(JSON, nullable=True)
    features = Column(JSON, nullable=True)  # { wpm, hold_mean, latency_mean, etc. }
    similarity_score = Column(Float, nullable=True)
    is_accepted = Column(Boolean, nullable=True)
    ground_truth = Column(String(50), default="LEGITIMATE", nullable=False)  # LEGITIMATE, IMPOSTOR_INFORMED, IMPOSTOR_ZERO_EFFORT
    target_app = Column(String(50), default="SYSTEM_LOCK", nullable=False)  # SYSTEM_LOCK, WhatsApp, BCP, Galería
    device_posture = Column(String(50), default="ESTATICO", nullable=False)  # ESTATICO, CAMINANDO
    inference_time_ms = Column(Float, nullable=True)
    total_unlock_delay_ms = Column(Float, nullable=True)
    network_connection_type = Column(String(30), nullable=True)  # WIFI, CELLULAR, OFFLINE, UNKNOWN
    challenge_session_id = Column(String(64), nullable=True)
    attempt_number = Column(Integer, nullable=True)
    auth_context = Column(String(50), nullable=True)  # SYSTEM_LOCK, APPLOCKER
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    participant = relationship("MobileParticipant", back_populates="samples")

