"""
Biometric prediction module for TECLEOLLAVE-ADAPT.
Handles loading models and computing biometric scores.
"""

from typing import Optional, Tuple
import numpy as np
from pathlib import Path

from app.ml.model import BiometricModel
from app.ml.features import extract_features, N_FEATURES
from app.config import settings, adaptation_config


class BiometricPredictor:
    """
    Handles biometric prediction for a specific user.
    Loads the active model and computes scores.
    """
    
    def __init__(self, model: BiometricModel):
        self.model = model
    
    def predict_score(self, feature_vector: np.ndarray) -> float:
        """
        Compute biometric score for a feature vector.
        
        Score = P(class=legitimate | features) ∈ [0, 1]
        """
        if feature_vector.ndim == 1:
            feature_vector = feature_vector.reshape(1, -1)
        
        # Validate feature count
        if feature_vector.shape[1] != N_FEATURES:
            raise ValueError(
                f"Expected {N_FEATURES} features, got {feature_vector.shape[1]}"
            )
        
        return self.model.score(feature_vector)
    
    def predict_decision(
        self, 
        feature_vector: np.ndarray,
        threshold_allow: Optional[float] = None,
        threshold_challenge: Optional[float] = None,
        threshold_reject: Optional[float] = None
    ) -> Tuple[str, float]:
        """
        Compute biometric score and make decision.
        
        Returns: (decision, score)
        decision: 'allow' | 'challenge' | 'reject'
        """
        # Use config defaults if not provided
        thresh_allow = threshold_allow or adaptation_config.threshold_allow
        thresh_challenge = threshold_challenge or adaptation_config.threshold_challenge
        thresh_reject = threshold_reject or adaptation_config.threshold_reject
        
        score = self.predict_score(feature_vector)
        
        if score >= thresh_allow:
            decision = 'allow'
        elif score >= thresh_challenge:
            decision = 'challenge'
        else:
            decision = 'reject'
        
        return decision, score


def load_user_model(model_path: str) -> BiometricModel:
    """Load a user's biometric model from disk."""
    if not Path(model_path).exists():
        raise FileNotFoundError(f"Model not found: {model_path}")
    return BiometricModel.load(model_path)


def create_predictor_for_user(user_id: int, db_session) -> Optional[BiometricPredictor]:
    """
    Load the active model for a user and create a predictor.
    Returns None if no active model exists.
    """
    from app.models import ModelVersion
    
    model_version = db_session.query(ModelVersion).filter(
        ModelVersion.user_id == user_id,
        ModelVersion.is_active == True
    ).first()
    
    if not model_version:
        return None
    
    try:
        model = load_user_model(model_version.model_path)
        return BiometricPredictor(model)
    except Exception:
        return None