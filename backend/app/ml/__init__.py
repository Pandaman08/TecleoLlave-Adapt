from app.ml.config import REPRODUCIBILITY_CONFIG
from app.ml.features import (
    extract_features,
    get_feature_schema,
    FEATURE_NAMES,
    PHRASE,
    PHRASE_LENGTH,
    N_FEATURES
)
from app.ml.model import BiometricModel, ModelMetadata
from app.ml.trainer import ModelTrainer, train_user_model
from app.ml.predictor import BiometricPredictor, load_user_model, create_predictor_for_user
from app.ml.evaluator import (
    EvaluationMetrics,
    compute_far_frr,
    compute_eer,
    evaluate_authentication,
    evaluate_model_comparison,
    compute_metrics_from_predictions
)

__all__ = [
    "REPRODUCIBILITY_CONFIG",
    "extract_features",
    "get_feature_schema",
    "FEATURE_NAMES",
    "PHRASE",
    "PHRASE_LENGTH",
    "N_FEATURES",
    "BiometricModel",
    "ModelMetadata",
    "ModelTrainer",
    "train_user_model",
    "BiometricPredictor",
    "load_user_model",
    "create_predictor_for_user",
    "EvaluationMetrics",
    "compute_far_frr",
    "compute_eer",
    "evaluate_authentication",
    "evaluate_model_comparison",
    "compute_metrics_from_predictions",
]