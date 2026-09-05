"""
RandomForest model wrapper for TECLEOLLAVE-ADAPT.
Handles model persistence, loading, and metadata.
"""

import joblib
import numpy as np
from pathlib import Path
from typing import Dict, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime
import json


@dataclass
class ModelMetadata:
    """Metadata stored alongside the model."""
    version: int
    user_id: int
    created_at: str
    n_samples_train: int
    n_features: int
    hyperparameters: Dict[str, Any]
    feature_names: list
    feature_schema: Dict[str, Any]
    metrics: Dict[str, float]
    training_config: Dict[str, Any]


class PrefitIsotonicCalibrator:
    """
    Lightweight prefit + isotonic calibration wrapper.

    BUG FIXED: sklearn's CalibratedClassifierCV, even when wrapping a
    FrozenEstimator (whose .fit() is a no-op), still internally performs
    cross_val_predict with a default cv=5 to build the calibration curve.
    With the very small validation sets typical of per-user keystroke-dynamics
    models (as few as 4-10 samples), this either:
      - raises "n_splits=5 greater than the number of samples" outright, or
      - silently degenerates into calibrating on tiny 1-2-sample folds,
        producing an unstable/near-arbitrary calibration curve that can
        contradict the underlying (correctly discriminating) RandomForest.

    This class instead fits a single IsotonicRegression directly on the
    already-fitted base model's raw validation predictions vs the true
    validation labels -- the actual "prefit" semantics the codebase always
    intended (REPRODUCIBILITY_CONFIG['calibration_cv'] == 'prefit'), with
    no internal re-splitting, so it works reliably down to a handful of
    validation samples per class.
    """

    def __init__(self, base_model, legit_class_index: int = 1):
        self.base_model = base_model
        self.legit_class_index = legit_class_index
        from sklearn.isotonic import IsotonicRegression
        self.isotonic = IsotonicRegression(out_of_bounds='clip', y_min=0.0, y_max=1.0)
        self.classes_ = np.array([0, 1])

    def fit(self, X_scaled: np.ndarray, y: np.ndarray) -> "PrefitIsotonicCalibrator":
        raw_proba = self.base_model.predict_proba(X_scaled)[:, self.legit_class_index]
        self.isotonic.fit(raw_proba, y)
        return self

    def predict_proba(self, X_scaled: np.ndarray) -> np.ndarray:
        raw_proba = self.base_model.predict_proba(X_scaled)[:, self.legit_class_index]
        calibrated_legit = np.clip(self.isotonic.predict(raw_proba), 0.0, 1.0)
        return np.column_stack([1.0 - calibrated_legit, calibrated_legit])


class BiometricModel:
    """
    Wrapper for RandomForest classifier with calibration.
    Handles save/load of model + scaler + calibrator + metadata.
    """
    
    def __init__(
        self,
        model=None,
        scaler=None,
        calibrator=None,
        metadata: Optional[ModelMetadata] = None
    ):
        self.model = model
        self.scaler = scaler
        self.calibrator = calibrator
        self.metadata = metadata
    
    @property
    def is_fitted(self) -> bool:
        return self.model is not None and self.scaler is not None
    
    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        """Predict calibrated probabilities."""
        if not self.is_fitted:
            raise ValueError("Model not fitted")
        X_scaled = self.scaler.transform(X)
        if self.calibrator is not None:
            return self.calibrator.predict_proba(X_scaled)
        return self.model.predict_proba(X_scaled)
    
    def predict(self, X: np.ndarray) -> np.ndarray:
        """Predict class labels."""
        if not self.is_fitted:
            raise ValueError("Model not fitted")
        X_scaled = self.scaler.transform(X)
        return self.model.predict(X_scaled)
    
    def score(self, X: np.ndarray) -> float:
        """
        Return biometric score for a single sample.
        Score = P(class=legitimate | features) ∈ [0, 1]
        """
        if X.ndim == 1:
            X = X.reshape(1, -1)
        proba = self.predict_proba(X)
        # Handle both single-class (shape [n, 1]) and binary (shape [n, 2]) cases
        if proba.shape[1] == 2:
            return float(proba[0, 1])  # Probability of class 1 (legitimate)
        else:
            return float(proba[0, 0])  # Single class - return the only probability
    
    def save(self, base_path: str) -> Dict[str, str]:
        """
        Save model components to disk.
        
        Returns dict with paths to saved files.
        """
        path = Path(base_path)
        path.parent.mkdir(parents=True, exist_ok=True)
        
        # Save components
        model_path = str(path.with_suffix('.joblib'))
        scaler_path = str(path.with_name(path.stem + '_scaler.joblib'))
        calibrator_path = str(path.with_name(path.stem + '_calibrator.joblib'))
        metadata_path = str(path.with_name(path.stem + '_metadata.json'))
        
        joblib.dump(self.model, model_path)
        joblib.dump(self.scaler, scaler_path)
        if self.calibrator is not None:
            joblib.dump(self.calibrator, calibrator_path)
        
        # Save metadata
        if self.metadata:
            meta_dict = asdict(self.metadata)
            with open(metadata_path, 'w') as f:
                json.dump(meta_dict, f, indent=2)
        
        return {
            'model': model_path,
            'scaler': scaler_path,
            'calibrator': calibrator_path,
            'metadata': metadata_path
        }
    
    @classmethod
    def load(cls, base_path: str) -> 'BiometricModel':
        """Load model components from disk."""
        path = Path(base_path)
        
        model_path = str(path.with_suffix('.joblib'))
        scaler_path = str(path.with_name(path.stem + '_scaler.joblib'))
        calibrator_path = str(path.with_name(path.stem + '_calibrator.joblib'))
        metadata_path = str(path.with_name(path.stem + '_metadata.json'))
        
        model = joblib.load(model_path)
        scaler = joblib.load(scaler_path)
        
        calibrator = None
        if Path(calibrator_path).exists():
            calibrator = joblib.load(calibrator_path)
        
        metadata = None
        if Path(metadata_path).exists():
            with open(metadata_path, 'r') as f:
                meta_dict = json.load(f)
            metadata = ModelMetadata(**meta_dict)
        
        return cls(model=model, scaler=scaler, calibrator=calibrator, metadata=metadata)


def create_model(hyperparameters: Dict[str, Any]):
    """Create a new RandomForest model with given hyperparameters."""
    from sklearn.ensemble import RandomForestClassifier
    return RandomForestClassifier(**hyperparameters)


def create_scaler(scaler_type: str = "RobustScaler"):
    """Create a scaler instance."""
    from sklearn.preprocessing import RobustScaler, StandardScaler, MinMaxScaler
    scalers = {
        "RobustScaler": RobustScaler,
        "StandardScaler": StandardScaler,
        "MinMaxScaler": MinMaxScaler
    }
    return scalers.get(scaler_type, RobustScaler)()


def create_calibrator(method: str = "isotonic", cv: str = "prefit"):
    """Create a calibrated classifier."""
    from sklearn.calibration import CalibratedClassifierCV
    return CalibratedClassifierCV(method=method, cv=cv)