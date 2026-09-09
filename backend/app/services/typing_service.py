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
        
        # Si se especificó username, resolver el user_id correspondiente
        if request.username:
            target_user = db.query(User).filter(User.username == request.username).first()
            if target_user:
                user_id = target_user.id

        capture_label = request.capture_time_label or datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        # Crear muestra
        sample = TypingSample(
            user_id=user_id,
            raw_timestamps=[_timing_event_to_dict(e) for e in request.raw_timestamps],
            phrase_typed=request.phrase_typed,
            source=SampleSource.enrollment,
            is_validated=True,
            consistency_score=feature_result['consistency_score'],
            sample_quality=SampleQuality(feature_result['sample_quality']),
            context_tag=request.context_tag or "normal",
            session_id=str(request.session_id or "1"),
            capture_time_label=capture_label
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
            # BUG FIXED: when there's no active model, model_version_id stays
            # None from the ValueError branch above. The DB row two lines up
            # already normalizes this to 0 (`model_version_id or 0`) — this
            # response dict must match, since AuthenticateResponse requires
            # a non-nullable int. Without this, a "no model yet" reject
            # crashed with a 500 pydantic ValidationError instead of cleanly
            # reporting the reject decision.
            "model_version_id": model_version_id or 0,
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

    def get_user_multi_session_status(self, db: Session, user_id: int) -> dict:
        """
        Retorna el estado del enrolamiento multi-sesión y multi-contexto del usuario.
        """
        from collections import defaultdict

        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError(f"User {user_id} not found")

        samples = db.query(TypingSample).filter(
            TypingSample.user_id == user_id,
            TypingSample.source == SampleSource.enrollment,
            TypingSample.is_validated == True
        ).order_by(TypingSample.created_at.asc()).all()

        total_samples = len(samples)

        session_map = defaultdict(list)
        context_distribution = defaultdict(int)

        for s in samples:
            sess_key = str(s.session_id or "1")
            session_map[sess_key].append(s)
            c_tag = s.context_tag or "normal"
            context_distribution[c_tag] += 1

        sessions_info = []
        for sess_id in sorted(session_map.keys(), key=lambda x: int(x) if x.isdigit() else str(x)):
            sess_samples = session_map[sess_id]
            s_ctx = defaultdict(int)
            for s in sess_samples:
                s_ctx[s.context_tag or "normal"] += 1

            first_ts = sess_samples[0].capture_time_label or sess_samples[0].created_at.strftime("%H:%M")
            last_ts = sess_samples[-1].capture_time_label or sess_samples[-1].created_at.strftime("%H:%M")

            sessions_info.append({
                "session_id": sess_id,
                "samples_count": len(sess_samples),
                "context_counts": dict(s_ctx),
                "first_captured": first_ts,
                "last_captured": last_ts
            })

        sessions_count = len(session_map)
        is_ready = total_samples >= 30 and sessions_count >= 3

        active_model = db.query(ModelVersion).filter(
            ModelVersion.user_id == user_id,
            ModelVersion.is_active == True
        ).first()

        return {
            "user_id": user.id,
            "username": user.username,
            "total_samples": total_samples,
            "target_samples_min": 30,
            "target_samples_max": 40,
            "sessions_count": sessions_count,
            "min_sessions_required": 3,
            "is_ready_for_training": is_ready,
            "context_distribution": dict(context_distribution),
            "sessions": sessions_info,
            "active_model_version": active_model.id if active_model else None
        }


typing_service = TypingService()