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
    metrics: Dict[str, Any]
    training_config: Dict[str, Any]
    algorithm: str = "RandomForestClassifier"


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
        metadata: Optional[ModelMetadata] = None,
        algorithm: Optional[str] = None
    ):
        self.model = model
        self.scaler = scaler
        self.calibrator = calibrator
        self.metadata = metadata
        self.algorithm = algorithm or (metadata.algorithm if metadata else "RandomForestClassifier")
    
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
        """Load model components from disk with portable fallback for cross-PC sharing."""
        path = Path(base_path)
        
        # Resolución portátil: si la ruta absoluta original no existe en esta máquina
        # (ej. transferido a la PC del compañero), buscar el archivo en la carpeta 'models' local
        model_path_obj = path.with_suffix('.joblib')
        if not model_path_obj.exists():
            local_models_dir = Path(__file__).resolve().parent.parent.parent / "models"
            candidate = local_models_dir / path.stem
            if candidate.with_suffix('.joblib').exists():
                path = candidate
                model_path_obj = path.with_suffix('.joblib')

        model_path = str(model_path_obj)
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


def create_model(hyperparameters: Optional[Dict[str, Any]] = None, algorithm: str = "RandomForestClassifier"):
    """
    Create a new ML model instance for biometric classification.
    Supports:
    - 'RandomForestClassifier' / 'random_forest'
    - 'SVC' / 'svm_rbf' (SVM with RBF kernel and calibrated probability)
    - 'GradientBoostingClassifier' / 'gradient_boosting' / 'HistGradientBoostingClassifier'
    """
    hyperparameters = (hyperparameters or {}).copy()
    algo = str(algorithm).lower()
    
    if "svm" in algo or "svc" in algo:
        from sklearn.svm import SVC
        svm_params = {
            "kernel": "rbf",
            "C": 2.0,
            "gamma": "scale",
            "probability": True,
            "class_weight": "balanced",
            "random_state": 42
        }
        for k in ["C", "gamma", "kernel", "random_state", "probability"]:
            if k in hyperparameters:
                svm_params[k] = hyperparameters[k]
        return SVC(**svm_params)
        
    elif "hist" in algo:
        from sklearn.ensemble import HistGradientBoostingClassifier
        hgb_params = {
            "max_iter": 100,
            "learning_rate": 0.1,
            "max_depth": 5,
            "random_state": 42
        }
        for k in ["max_iter", "learning_rate", "max_depth", "random_state"]:
            if k in hyperparameters:
                hgb_params[k] = hyperparameters[k]
        return HistGradientBoostingClassifier(**hgb_params)

    elif "gradient" in algo or "boosting" in algo:
        from sklearn.ensemble import GradientBoostingClassifier
        gb_params = {
            "n_estimators": 100,
            "learning_rate": 0.1,
            "max_depth": 3,
            "subsample": 0.85,
            "random_state": 42
        }
        for k in ["n_estimators", "learning_rate", "max_depth", "subsample", "random_state"]:
            if k in hyperparameters:
                gb_params[k] = hyperparameters[k]
        return GradientBoostingClassifier(**gb_params)
        
    else:
        from sklearn.ensemble import RandomForestClassifier
        rf_params = {
            "n_estimators": 200,
            "max_depth": 10,
            "min_samples_split": 5,
            "min_samples_leaf": 3,
            "max_features": "sqrt",
            "class_weight": "balanced",
            "random_state": 42,
            "n_jobs": -1
        }
        rf_params.update(hyperparameters)
        return RandomForestClassifier(**rf_params)


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