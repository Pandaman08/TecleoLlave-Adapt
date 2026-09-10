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
        Adapts operating thresholds to the user model's calibrated EER operating point when available.
        
        Returns: (decision, score)
        decision: 'allow' | 'challenge' | 'reject'
        """
        raw_score = self.predict_score(feature_vector)
        
        # Check if model has a trained operating threshold at EER from cross-validation
        threshold_at_eer = None
        if self.model and self.model.metadata and self.model.metadata.metrics:
            threshold_at_eer = self.model.metadata.metrics.get("threshold_at_eer")
            if threshold_at_eer is None and "candidate_comparison" in self.model.metadata.metrics:
                for c in self.model.metadata.metrics.get("candidate_comparison", []):
                    if c.get("is_winner"):
                        threshold_at_eer = c.get("threshold_at_eer")
                        break

        # If model has a valid trained operating threshold:
        if threshold_at_eer is not None and isinstance(threshold_at_eer, (int, float)) and 0.01 <= threshold_at_eer <= 0.80:
            eff_allow = threshold_allow if threshold_allow is not None else min(0.68, max(0.40, threshold_at_eer * 1.05))
            eff_challenge = threshold_challenge if threshold_challenge is not None else min(eff_allow - 0.10, max(0.25, threshold_at_eer * 0.70))
        else:
            eff_allow = threshold_allow or adaptation_config.threshold_allow
            eff_challenge = threshold_challenge or adaptation_config.threshold_challenge

        # Tri-zone decision with smooth score normalization for presentation
        if raw_score >= eff_allow:
            decision = 'allow'
            norm_score = 0.85 + 0.15 * min(1.0, max(0.0, (raw_score - eff_allow) / max(1e-5, (1.0 - eff_allow))))
        elif raw_score >= eff_challenge:
            decision = 'challenge'
            norm_score = 0.70 + 0.14 * min(1.0, max(0.0, (raw_score - eff_challenge) / max(1e-5, (eff_allow - eff_challenge))))
        else:
            decision = 'reject'
            norm_score = 0.70 * min(1.0, max(0.0, raw_score / max(1e-5, eff_challenge)))

        return decision, float(norm_score)



def load_user_model(model_path: str) -> BiometricModel:
    """Load a user's biometric model from disk with portable fallback."""
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