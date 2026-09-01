from dataclasses import dataclass
from typing import List, Dict, Any, Optional, Union
from datetime import datetime


@dataclass
class UserSummaryResponse:
    user_id: int
    username: str
    created_at: Optional[Union[str, datetime]]
    active_model_version: Optional[int]
    total_samples: int
    enrollment_samples: int
    auth_samples: int
    total_auth_attempts: int
    total_adaptations: int


@dataclass
class AuthMetricsResponse:
    total_attempts: int
    allow_count: int
    challenge_count: int
    reject_count: int
    far: float
    frr: float
    avg_score: float
    period_start: Optional[Union[str, datetime]]
    period_end: Optional[Union[str, datetime]]


@dataclass
class TimeSeriesResponse:
    timestamp: Optional[Union[str, datetime]]
    allow: int
    challenge: int
    reject: int
    total: int
    avg_score: float
    allow_rate: float


@dataclass
class ModelMetricsResponse:
    version_id: int
    user_id: int
    is_active: bool
    created_at: Optional[Union[str, datetime]]
    training_samples: int
    metrics: Dict[str, Any]
    auth_count: int
    allow_rate: float
    avg_score: float


@dataclass
class AdaptationMetricsResponse:
    total_events: int
    candidate_created: int
    candidate_accepted: int
    candidate_rejected: int
    sample_enqueued: int
    challenge_requested: int
    challenge_passed: int
    challenge_failed: int
    current_model_version: Optional[int]
    last_adaptation: Optional[Union[str, datetime]]


@dataclass
class AdaptationEventResponse:
    id: int
    action: str
    candidate_model_id: Optional[int]
    old_model_version_id: Optional[int]
    new_model_version_id: Optional[int]
    reason: Optional[str]
    metrics_comparison: Optional[Dict[str, Any]]
    created_at: Optional[Union[str, datetime]]


@dataclass
class CandidateStatusResponse:
    pool_size: int
    min_required: int
    window_size: int
    pool_samples: List[Dict[str, Any]]
    current_model_version: Optional[int]
    pending_candidate: Optional[Dict[str, Any]]


@dataclass
class ComparisonResponse:
    static_model: Dict[str, Any]
    adaptive_model: Dict[str, Any]
    improvement: Dict[str, Any]