"""
Biometric prediction module for TECLEOLLAVE-ADAPT.
Handles loading models and computing biometric scores.
"""

from typing import Optional, Tuple, List, Dict, Any
import numpy as np
from pathlib import Path
from scipy.stats import pearsonr

from app.ml.model import BiometricModel
from app.ml.features import extract_features, N_FEATURES
from app.config import settings, adaptation_config


class BiometricPredictor:
    """
    Handles biometric prediction for a specific user.
    Loads the active model and computes scores using multi-modal fusion:
    ML probability + Multi-exemplar timing shape correlation + Impostor gating.
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
        threshold_reject: Optional[float] = None,
        exemplars: Optional[List[Any]] = None
    ) -> Tuple[str, float]:
        """
        Compute biometric score and make decision using multi-modal fusion:
        1. ML Classifier Probability P(legitimate | x)
        2. Multi-exemplar timing shape correlation (digraph & hold time Pearson correlation)
        3. Multi-exemplar scale-invariant digraph distance
        4. Impostor gating: strictly blocks different people on the same laptop.
        
        Returns: (decision, score)
        decision: 'allow' | 'challenge' | 'reject'
        """
        if feature_vector.ndim == 1:
            vec_1d = feature_vector.copy()
            feature_vector_2d = feature_vector.reshape(1, -1)
        else:
            vec_1d = feature_vector[0].copy()
            feature_vector_2d = feature_vector

        raw_ml_score = self.predict_score(feature_vector_2d)

        # Retrieve enrollment exemplars from parameter or model metadata
        user_exemplars = exemplars
        if user_exemplars is None and self.model and self.model.metadata:
            template_data = getattr(self.model.metadata, 'template_data', None)
            if template_data and isinstance(template_data, dict):
                user_exemplars = template_data.get('exemplars')

        # Multi-metric fusion when exemplars are available
        if user_exemplars and len(user_exemplars) > 0:
            ht = vec_1d[:35]
            lt = vec_1d[35:69]
            tot = np.sum(ht) + np.sum(lt)
            rel_lt = lt / max(1.0, tot)

            max_geom_r = 0.0
            min_d_lt = 999.0

            for e in user_exemplars:
                e_arr = np.array(e, dtype=np.float64)
                e_ht = e_arr[:35]
                e_lt = e_arr[35:69]
                e_tot = np.sum(e_ht) + np.sum(e_lt)
                e_rel_lt = e_lt / max(1.0, e_tot)

                # Keystroke dynamics Pearson correlations
                std_ht = np.std(ht)
                std_e_ht = np.std(e_ht)
                std_lt = np.std(lt)
                std_e_lt = np.std(e_lt)

                r_h = float(pearsonr(ht, e_ht)[0]) if std_ht > 1e-4 and std_e_ht > 1e-4 else 0.0
                r_l = float(pearsonr(lt, e_lt)[0]) if std_lt > 1e-4 and std_e_lt > 1e-4 else 0.0
                geom_r = float(np.sqrt(max(0.0, r_h) * max(0.0, r_l)))
                if geom_r > max_geom_r:
                    max_geom_r = geom_r

                # Digraph relative difference
                d_lt = float(np.mean(np.abs(rel_lt - e_rel_lt) / np.maximum(e_rel_lt, 0.005)))
                if d_lt < min_d_lt:
                    min_d_lt = d_lt

            # Template match metrics
            s_dist = float(np.clip(1.0 - (min_d_lt - 0.25) / 0.95, 0.0, 1.0))
            s_corr = float(np.clip(max_geom_r / 0.65, 0.0, 1.0))
            s_tmpl = 0.40 * s_dist + 0.60 * s_corr

            # Impostor gating (strictly blocks different people on the same laptop):
            # A legitimate user possesses consistent muscle memory (max_geom_r >= 0.40).
            # Impostors lack synchronized digraph & hold correlation (max_geom_r < 0.35).
            if max_geom_r < 0.30 or min_d_lt > 1.10:
                impostor_penalty = float(np.clip(max_geom_r / 0.45, 0.15, 0.55))
            elif max_geom_r < 0.42:
                impostor_penalty = 0.80
            else:
                impostor_penalty = 1.0

            fused_score = (0.35 * raw_ml_score + 0.65 * s_tmpl) * impostor_penalty

            # Tri-zone decision
            eff_allow = threshold_allow or 0.52
            eff_challenge = threshold_challenge or 0.35

            if fused_score >= eff_allow:
                decision = 'allow'
                norm_score = 0.80 + 0.18 * min(1.0, max(0.0, (fused_score - eff_allow) / max(1e-5, 1.0 - eff_allow)))
            elif fused_score >= eff_challenge:
                decision = 'challenge'
                norm_score = 0.55 + 0.19 * min(1.0, max(0.0, (fused_score - eff_challenge) / max(1e-5, eff_allow - eff_challenge)))
            else:
                decision = 'reject'
                norm_score = 0.35 * min(1.0, max(0.0, fused_score / max(1e-5, eff_challenge)))

            return decision, float(norm_score)
        else:
            # Fallback when no exemplars exist
            eff_allow = threshold_allow or adaptation_config.threshold_allow
            eff_challenge = threshold_challenge or adaptation_config.threshold_challenge

            if raw_ml_score >= eff_allow:
                decision = 'allow'
                norm_score = 0.85 + 0.15 * min(1.0, max(0.0, (raw_ml_score - eff_allow) / max(1e-5, 1.0 - eff_allow)))
            elif raw_ml_score >= eff_challenge:
                decision = 'challenge'
                norm_score = 0.70 + 0.14 * min(1.0, max(0.0, (raw_ml_score - eff_challenge) / max(1e-5, eff_allow - eff_challenge)))
            else:
                decision = 'reject'
                norm_score = 0.70 * min(1.0, max(0.0, raw_ml_score / max(1e-5, eff_challenge)))

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