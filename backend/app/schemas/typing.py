from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel


class TimingEvent(BaseModel):
    key: str
    keydown_ts: float
    keyup_ts: float


class TypingEnrollRequest(BaseModel):
    raw_timestamps: List[TimingEvent]
    phrase_typed: str
    source: str = "enrollment"
    username: Optional[str] = None
    context_tag: Optional[str] = "normal"  # "normal", "con prisa", "cansado", "relajado", etc.
    session_id: Optional[str] = "1"        # "1", "2", "3"...
    capture_time_label: Optional[str] = None


class TypingAuthRequest(BaseModel):
    raw_timestamps: List[TimingEvent]
    phrase_typed: str
    username: Optional[str] = None
    source: str = "auth"


class TypingSampleResponse(BaseModel):
    id: int
    user_id: int
    phrase_typed: str
    source: Optional[str] = None
    created_at: datetime
    is_validated: bool
    consistency_score: Optional[Any] = None
    sample_quality: Optional[str] = None
    context_tag: Optional[str] = "normal"
    session_id: Optional[str] = "1"
    capture_time_label: Optional[str] = None

    class Config:
        orm_mode = True


class EnrollmentSessionInfo(BaseModel):
    session_id: str
    samples_count: int
    context_counts: Dict[str, int]
    first_captured: Optional[str] = None
    last_captured: Optional[str] = None


class MultiSessionStatusResponse(BaseModel):
    user_id: int
    username: str
    total_samples: int
    target_samples_min: int = 30
    target_samples_max: int = 40
    sessions_count: int
    min_sessions_required: int = 3
    is_ready_for_training: bool
    context_distribution: Dict[str, int]
    sessions: List[EnrollmentSessionInfo]
    active_model_version: Optional[int] = None



class TypingFeatureResponse(BaseModel):
    id: int
    sample_id: int
    feature_vector: List[float]
    feature_names: List[str]
    extracted_at: datetime

    class Config:
        orm_mode = True


class EnrollResponse(BaseModel):
    sample_id: int
    feature_id: int
    consistency_score: float
    sample_quality: str
    message: str


class AuthenticateResponse(BaseModel):
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


class EnrolledUserItem(BaseModel):
    id: int
    username: str
    has_active_model: bool
    model_version: Optional[int] = None
    samples_count: int = 0
    algorithm: Optional[str] = None
    eer: Optional[float] = None
    selection_reason: Optional[str] = None


class LiveTestRequest(BaseModel):
    username: str
    raw_timestamps: List[TimingEvent]
    phrase_typed: str
    attempt_type: str = "legitimate"  # "legitimate" | "impostor"
    tester_label: Optional[str] = None


class LiveTestResponse(BaseModel):
    username: str
    user_id: int
    attempt_type: str
    score: float
    score_pct: float
    decision: str
    is_recognized: bool
    model_version: int
    metrics: Dict[str, Any]
    verdict_title: str
    verdict_detail: str
    status_type: str
    timestamp: str