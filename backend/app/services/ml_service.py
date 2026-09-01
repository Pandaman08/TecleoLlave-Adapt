import os
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session

from app.models import User, ModelVersion, TypingSample
from app.ml.trainer import train_user_model
from app.ml.predictor import load_user_model, BiometricPredictor
from app.ml.evaluator import evaluate_authentication
from app.config import settings


class MLService:
    def __init__(self):
        self.models_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'models')
        os.makedirs(self.models_dir, exist_ok=True)
    
    def train_model(self, db: Session, user_id: int) -> Dict[str, Any]:
        """
        Train a new model for the user.
        
        Returns: dict with model info and metrics
        """
        # Verify user exists
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError(f"User {user_id} not found")
        
        # Check minimum samples
        sample_count = db.query(TypingSample).filter(
            TypingSample.user_id == user_id,
            TypingSample.source == 'enrollment',
            TypingSample.is_validated == True
        ).count()
        
        if sample_count < 10:
            raise ValueError(f"Insufficient samples: {sample_count} < 10")
        
        # Determine model version
        existing_versions = db.query(ModelVersion).filter(
            ModelVersion.user_id == user_id
        ).count()
        new_version = existing_versions + 1
        
        # Model output path
        model_filename = f"user_{user_id}_v{new_version}"
        model_path = os.path.join(self.models_dir, model_filename)
        
        # Train model
        biometric_model, metrics = train_user_model(
            db=db,
            user_id=user_id,
            model_output_path=model_path
        )
        
        # Update metadata with correct version
        biometric_model.metadata.version = new_version
        biometric_model.save(model_path)
        
        # Deactivate previous models
        db.query(ModelVersion).filter(
            ModelVersion.user_id == user_id,
            ModelVersion.is_active == True
        ).update({ModelVersion.is_active: False})
        
        # Create new model version record
        model_version = ModelVersion(
            user_id=user_id,
            model_path=model_path + '.joblib',
            training_samples_count=metrics.get('n_samples_train', 0),
            metrics=metrics,
            training_config=biometric_model.metadata.training_config,
            feature_schema=biometric_model.metadata.feature_schema,
            is_active=True
        )
        db.add(model_version)
        db.commit()
        db.refresh(model_version)
        
        return {
            'model_version_id': model_version.id,
            'version': new_version,
            'model_path': model_path + '.joblib',
            'metrics': metrics,
            'message': f'Model v{new_version} trained successfully'
        }
    
    def get_active_model(self, db: Session, user_id: int) -> Optional[ModelVersion]:
        """Get the active model version for a user."""
        return db.query(ModelVersion).filter(
            ModelVersion.user_id == user_id,
            ModelVersion.is_active == True
        ).first()
    
    def load_predictor(self, db: Session, user_id: int) -> Optional[BiometricPredictor]:
        """Load predictor for user's active model."""
        model_version = self.get_active_model(db, user_id)
        if not model_version:
            return None
        
        try:
            model = load_user_model(model_version.model_path)
            return BiometricPredictor(model)
        except Exception:
            return None
    
    def predict_score(self, db: Session, user_id: int, feature_vector: list) -> Dict[str, Any]:
        """Compute biometric score for a feature vector."""
        predictor = self.load_predictor(db, user_id)
        if not predictor:
            raise ValueError("No active model for user")
        
        import numpy as np
        features = np.array(feature_vector, dtype=np.float64)
        score = predictor.predict_score(features)
        
        return {
            'score': score,
            'model_version_id': self.get_active_model(db, user_id).id if self.get_active_model(db, user_id) else None
        }
    
    def predict_decision(self, db: Session, user_id: int, feature_vector: list) -> Dict[str, Any]:
        """Compute biometric score and make decision."""
        predictor = self.load_predictor(db, user_id)
        if not predictor:
            raise ValueError("No active model for user")
        
        import numpy as np
        features = np.array(feature_vector, dtype=np.float64)
        decision, score = predictor.predict_decision(features)
        
        model_version = self.get_active_model(db, user_id)
        
        return {
            'decision': decision,
            'score': score,
            'model_version_id': model_version.id if model_version else None
        }


ml_service = MLService()