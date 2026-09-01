from typing import List, Optional, Dict, Any
from datetime import datetime
from dataclasses import dataclass


@dataclass
class TimingEvent:
    key: str
    keydown_ts: float
    keyup_ts: float


@dataclass
class TypingEnrollRequest:
    raw_timestamps: List[TimingEvent]
    phrase_typed: str
    source: str = "enrollment"


@dataclass
class TypingAuthRequest:
    raw_timestamps: List[TimingEvent]
    phrase_typed: str
    source: str = "auth"


@dataclass
class TypingSampleResponse:
    id: int
    user_id: int
    phrase_typed: str
    source: str
    created_at: datetime
    is_validated: bool
    consistency_score: float = 0.0
    sample_quality: str = "low"


@dataclass
class TypingFeatureResponse:
    id: int
    sample_id: int
    feature_vector: List[float]
    feature_names: List[str]
    extracted_at: datetime


@dataclass
class EnrollResponse:
    sample_id: int
    feature_id: int
    consistency_score: float
    sample_quality: str
    message: str


@dataclass
class AuthenticateResponse:
    decision: str  # allow, challenge, reject
    score: float
    message: str
    model_version_id: int
    auth_attempt_id: int
    sample_id: int = 0
    feature_id: int = 0
    adaptive_action: Optional[str] = None
    adaptive_message: Optional[str] = None
    candidate_model_id: Optional[int] = None
    metrics_comparison: Optional[Dict[str, Any]] = None