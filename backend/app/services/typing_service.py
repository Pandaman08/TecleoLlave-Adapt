from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from dataclasses import asdict

from app.models import TypingSample, TypingFeature, User, SampleSource, SampleQuality, AuthAttempt, AuthDecision, ModelVersion
from app.schemas import TypingEnrollRequest, TypingAuthRequest, EnrollResponse, TimingEvent
from app.ml.features import extract_features, FEATURE_NAMES
from app.services.ml_service import ml_service
from app.services.adaptive_service import adaptive_service


def _timing_event_to_dict(event: TimingEvent) -> dict:
    """Convert TimingEvent (dataclass or pydantic) to dict."""
    if hasattr(event, 'dict'):
        return event.dict()
    return asdict(event)


class TypingService:
    def __init__(self):
        pass
    
    def enroll_sample(self, db: Session, request: TypingEnrollRequest, user_id: int = 1) -> EnrollResponse:
        """
        Procesa y guarda una muestra de enrolamiento.
        """
        # Extraer características
        feature_result = extract_features(
            [_timing_event_to_dict(e) for e in request.raw_timestamps],
            request.phrase_typed
        )
        
        if not feature_result['valid']:
            raise ValueError(f"Invalid sample: {feature_result['error']}")
        
        # Crear muestra
        sample = TypingSample(
            user_id=user_id,
            raw_timestamps=[_timing_event_to_dict(e) for e in request.raw_timestamps],
            phrase_typed=request.phrase_typed,
            source=SampleSource.enrollment,
            is_validated=True,
            consistency_score=feature_result['consistency_score'],
            sample_quality=SampleQuality(feature_result['sample_quality'])
        )
        db.add(sample)
        db.flush()
        
        # Crear features
        feature = TypingFeature(
            sample_id=sample.id,
            feature_vector=feature_result['feature_vector'],
            feature_names=feature_result['feature_names']
        )
        db.add(feature)
        db.commit()
        db.refresh(sample)
        db.refresh(feature)
        
        return EnrollResponse(
            sample_id=sample.id,
            feature_id=feature.id,
            consistency_score=feature_result['consistency_score'],
            sample_quality=feature_result['sample_quality'],
            message=f"Sample enrolled successfully (quality: {feature_result['sample_quality']})"
        )
    
    def authenticate_sample(self, db: Session, request: TypingAuthRequest, user_id: int = 1) -> dict:
        """
        Autentica una muestra contra el modelo usando el predictor ML.
        Luego procesa el resultado con el servicio adaptativo.
        """
        # Extraer características
        feature_result = extract_features(
            [_timing_event_to_dict(e) for e in request.raw_timestamps],
            request.phrase_typed
        )
        
        if not feature_result['valid']:
            raise ValueError(f"Invalid sample: {feature_result['error']}")
        
        # Guardar muestra de autenticación
        sample = TypingSample(
            user_id=user_id,
            raw_timestamps=[_timing_event_to_dict(e) for e in request.raw_timestamps],
            phrase_typed=request.phrase_typed,
            source=SampleSource.auth,
            is_validated=True,
            consistency_score=feature_result['consistency_score'],
            sample_quality=SampleQuality(feature_result['sample_quality'])
        )
        db.add(sample)
        db.flush()
        
        feature = TypingFeature(
            sample_id=sample.id,
            feature_vector=feature_result['feature_vector'],
            feature_names=feature_result['feature_names']
        )
        db.add(feature)
        db.flush()  # Get sample.id and feature.id
        
        # Get biometric prediction
        try:
            predict_result = ml_service.predict_decision(db, user_id, feature_result['feature_vector'])
            decision = predict_result['decision']
            score = predict_result['score']
            model_version_id = predict_result['model_version_id']
        except ValueError as e:
            # No active model
            decision = 'reject'
            score = 0.0
            model_version_id = None
        
        # Map decision to enum
        decision_enum = AuthDecision(decision) if decision in ['allow', 'challenge', 'reject'] else AuthDecision.reject
        
        # Create auth attempt record
        auth_attempt = AuthAttempt(
            user_id=user_id,
            sample_id=sample.id,
            model_version_id=model_version_id or 0,
            score=score,
            decision=decision_enum,
            challenge_passed=None  # Will be updated if challenge
        )
        db.add(auth_attempt)
        db.commit()
        db.refresh(sample)
        db.refresh(feature)
        db.refresh(auth_attempt)
        
        # Generate message
        if decision == 'allow':
            message = f"Acceso concedido (score: {score:.3f})"
        elif decision == 'challenge':
            message = f"Verificación adicional requerida (score: {score:.3f})"
        else:
            message = f"Acceso denegado (score: {score:.3f})"
        
        # Process with adaptive service
        adaptive_result = adaptive_service.process_auth_result(
            db=db,
            user_id=user_id,
            auth_attempt_id=auth_attempt.id,
            decision=decision,
            sample_id=sample.id
        )
        
        return {
            "decision": decision,
            "score": score,
            "message": message,
            "model_version_id": model_version_id,
            "auth_attempt_id": auth_attempt.id,
            "sample_id": sample.id,
            "feature_id": feature.id,
            "adaptive_action": adaptive_result.action,
            "adaptive_message": adaptive_result.message,
            "candidate_model_id": adaptive_result.candidate_model_id,
            "metrics_comparison": adaptive_result.metrics_comparison
        }
    
    def get_user_samples(self, db: Session, user_id: int) -> List[TypingSample]:
        return db.query(TypingSample).filter(TypingSample.user_id == user_id).all()


typing_service = TypingService()