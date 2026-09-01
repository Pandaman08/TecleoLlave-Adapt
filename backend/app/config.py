from pydantic import BaseSettings
from typing import Optional
import json


class Settings(BaseSettings):
    APP_NAME: str = "TECLEOLLAVE-ADAPT"
    DEBUG: bool = True
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    DATABASE_URL: str = "sqlite:///./tecleollave.db"
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    PHRASE: str = "La seguridad protege la información"
    PHRASE_LENGTH: int = 35
    N_FEATURES: int = 100

    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]

    class Config:
        env_file = ".env"
        case_sensitive = True


class AdaptationConfig(BaseSettings):
    threshold_allow: float = 0.85
    threshold_challenge: float = 0.70
    threshold_reject: float = 0.60
    min_candidate_samples: int = 10
    candidate_window_size: int = 50
    max_far_degradation: float = 0.0
    max_frr_degradation: float = 0.02
    max_eer_degradation: float = 0.0
    min_precision_delta: float = -0.01
    min_recall_delta: float = -0.01
    require_all_constraints: bool = True

    class Config:
        env_prefix = "ADAPT_"


REPRODUCIBILITY_CONFIG = {
    "feature_schema_version": "1.0",
    "phrase": "La seguridad protege la información",
    "phrase_length": 35,
    "n_features": 100,
    "feature_order": [
        "hold_times[0..34]",
        "latencies[0..33]",
        "aggregated[0..30]"
    ],
    "algorithm": "RandomForestClassifier",
    "hyperparameters": {
        "n_estimators": 200,
        "max_depth": 10,
        "min_samples_split": 5,
        "min_samples_leaf": 3,
        "max_features": "sqrt",
        "class_weight": "balanced",
        "random_state": 42,
        "n_jobs": -1
    },
    "calibration_method": "isotonic",
    "calibration_cv": "prefit",
    "train_val_test_split": [0.6, 0.2, 0.2],
    "stratify": True,
    "split_random_state": 42,
    "cross_validation": {
        "method": "StratifiedKFold",
        "n_splits": 5,
        "shuffle": True,
        "random_state": 42
    },
    "imputer": "median",
    "scaler": "RobustScaler",
    "score_definition": "Calibrated P(class=legitimate | features) ∈ [0,1]",
    "threshold_allow": 0.85,
    "threshold_challenge": 0.70,
    "threshold_reject": 0.60,
    "adaptation": {
        "min_candidate_samples": 10,
        "candidate_window_size": 50,
        "max_far_degradation": 0.0,
        "max_frr_degradation": 0.02,
        "max_eer_degradation": 0.0,
        "min_precision_delta": -0.01,
        "min_recall_delta": -0.01,
        "require_all_constraints": True
    },
    "experiment": {
        "n_sessions": 30,
        "samples_per_session": 10,
        "impostor_ratio": 0.3,
        "drift_profiles": ["none", "gradual", "abrupt"],
        "random_state": 42
    }
}


settings = Settings()
adaptation_config = AdaptationConfig()