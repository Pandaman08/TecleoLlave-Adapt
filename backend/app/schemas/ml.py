from dataclasses import dataclass
from typing import List, Optional, Dict, Any
from datetime import datetime


@dataclass
class TrainRequest:
    user_id: int


@dataclass
class TrainResponse:
    model_version_id: int
    version: int
    model_path: str
    metrics: Dict[str, Any]
    message: str


@dataclass
class ModelInfoResponse:
    id: int
    user_id: int
    model_path: str
    training_samples_count: int
    metrics: Dict[str, Any]
    is_active: bool
    created_at: datetime


@dataclass
class PredictRequest:
    user_id: int
    feature_vector: List[float]


@dataclass
class PredictResponse:
    score: float
    model_version_id: Optional[int] = None


@dataclass
class DecideRequest:
    user_id: int
    feature_vector: List[float]


@dataclass
class DecideResponse:
    decision: str
    score: float
    model_version_id: Optional[int] = None