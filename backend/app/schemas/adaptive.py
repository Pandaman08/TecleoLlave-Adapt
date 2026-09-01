from dataclasses import dataclass
from typing import Optional, Dict, Any, List
from datetime import datetime


@dataclass
class AdaptationConfigUpdate:
    threshold_allow: Optional[float] = None
    threshold_challenge: Optional[float] = None
    threshold_reject: Optional[float] = None
    min_candidate_samples: Optional[int] = None
    candidate_window_size: Optional[int] = None
    max_far_degradation: Optional[float] = None
    max_frr_degradation: Optional[float] = None
    max_eer_degradation: Optional[float] = None
    min_precision_delta: Optional[float] = None
    min_recall_delta: Optional[float] = None
    require_all_constraints: Optional[bool] = None


@dataclass
class AdaptationConfigResponse:
    id: int
    user_id: int
    threshold_allow: float
    threshold_challenge: float
    threshold_reject: float
    min_candidate_samples: int
    candidate_window_size: int
    max_far_degradation: float
    max_frr_degradation: float
    max_eer_degradation: float
    min_precision_delta: float
    min_recall_delta: float
    require_all_constraints: bool
    created_at: datetime
    updated_at: datetime


@dataclass
class CandidateStatusResponse:
    pool_size: int
    min_required: int
    window_size: int
    pool_samples: List[Dict[str, Any]]
    current_model_version: Optional[int]
    pending_candidate: Optional[Dict[str, Any]]


@dataclass
class ProcessAuthResultRequest:
    user_id: int
    auth_attempt_id: int
    decision: str
    sample_id: int


@dataclass
class ProcessAuthResultResponse:
    action: str
    candidate_model_id: Optional[int] = None
    message: str = ""
    metrics_comparison: Optional[Dict[str, Any]] = None


@dataclass
class ForceEvaluationResponse:
    action: str
    candidate_model_id: Optional[int] = None
    message: str = ""
    metrics_comparison: Optional[Dict[str, Any]] = None


@dataclass
class AdaptationEventResponse:
    id: int
    user_id: int
    auth_attempt_id: Optional[int]
    action: str
    candidate_model_id: Optional[int]
    old_model_version_id: Optional[int]
    new_model_version_id: Optional[int]
    reason: Optional[str]
    metrics_comparison: Optional[Dict[str, Any]]
    created_at: datetime