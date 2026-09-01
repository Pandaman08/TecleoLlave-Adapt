from dataclasses import dataclass
from typing import Optional, List, Dict, Any
from datetime import datetime


@dataclass
class ExperimentRequest:
    user_id: int
    n_sessions: int = 30
    samples_per_session: int = 10
    impostor_ratio: float = 0.3
    drift_profile: str = "gradual"  # 'none', 'gradual', 'abrupt'


@dataclass
class SessionResultResponse:
    session: int
    model_version: int
    strategy: str
    far: float
    frr: float
    eer: float
    accuracy: float
    precision: float
    recall: float
    f1: float
    n_legitimate: int
    n_impostor: int
    adaptation_event: Optional[str] = None


@dataclass
class ExperimentSummaryResponse:
    static: Dict[str, float]
    adaptive: Dict[str, float]
    improvement: Dict[str, float]
    n_adaptations: int
    model_versions_used: int


@dataclass
class ExperimentResultResponse:
    experiment_id: str
    user_id: int
    n_sessions: int
    samples_per_session: int
    impostor_ratio: float
    drift_profile: str
    started_at: str
    completed_at: str
    static_results: List[SessionResultResponse]
    adaptive_results: List[SessionResultResponse]
    summary: ExperimentSummaryResponse


@dataclass
class ExperimentListResponse:
    experiment_id: str
    user_id: int
    drift_profile: str
    n_sessions: int
    started_at: str
    completed_at: str
    summary: Optional[ExperimentSummaryResponse] = None