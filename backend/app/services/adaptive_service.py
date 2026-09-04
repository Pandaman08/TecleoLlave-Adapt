"""
Adaptive Service - Core mechanism for controlled profile adaptation.
Handles candidate pool, model training, evaluation, and activation.
"""

from sqlalchemy.orm import Session
from typing import Optional, Dict, Any, List
from datetime import datetime
from dataclasses import dataclass

from app.models import (
    User, TypingSample, TypingFeature, AuthAttempt, 
    ModelVersion, CandidateModel, AdaptationEvent, 
    AdaptationConfig, AdaptationAction, CandidateStatus,
    AuthDecision
)
from app.ml.trainer import train_user_model
from app.ml.evaluator import evaluate_model_comparison
from app.config import adaptation_config


@dataclass
class AdaptationResult:
    action: str
    candidate_model_id: Optional[int] = None
    message: str = ""
    metrics_comparison: Optional[Dict[str, Any]] = None


class AdaptiveService:
    """
    Manages the adaptive adaptation process:
    1. Collect ALLOW samples into candidate pool
    2. When pool >= min_candidate_samples, train candidate model
    3. Evaluate candidate vs current model
    4. Accept (activate) or reject based on criteria
    """
    
    def __init__(self):
        pass
    
    def _get_config(self, db: Session, user_id: int) -> AdaptationConfig:
        """Get user's adaptation config, create default if not exists."""
        config = db.query(AdaptationConfig).filter(
            AdaptationConfig.user_id == user_id
        ).first()
        if not config:
            config = AdaptationConfig(user_id=user_id)
            db.add(config)
            db.commit()
            db.refresh(config)
        return config
    
    def _get_candidate_pool(self, db: Session, user_id: int, window_size: int) -> List[TypingSample]:
        """Get recent ALLOW samples not yet used for candidate training."""
        # Get samples from successful authentications (ALLOW)
        # that are not yet part of any candidate model
        subquery = db.query(CandidateModel.source_samples).filter(
            CandidateModel.user_id == user_id
        ).all()
        
        used_sample_ids = set()
        for (samples_json,) in subquery:
            if samples_json:
                used_sample_ids.update(samples_json)
        
        # Get recent ALLOW auth samples
        pool = db.query(TypingSample).join(AuthAttempt).filter(
            TypingSample.user_id == user_id,
            TypingSample.source == 'auth',
            AuthAttempt.decision == AuthDecision.allow,
            TypingSample.id.notin_(used_sample_ids) if used_sample_ids else True
        ).order_by(TypingSample.created_at.desc()).limit(window_size).all()
        
        return list(reversed(pool))  # Oldest first
    
    def _create_candidate_model(
        self, 
        db: Session, 
        user_id: int, 
        sample_ids: List[int],
        parent_version_id: int
    ) -> CandidateModel:
        """Create candidate model record."""
        candidate = CandidateModel(
            user_id=user_id,
            model_path="",  # Will be set after training
            source_samples=sample_ids,
            metrics={},
            status=CandidateStatus.training,
            parent_version_id=parent_version_id
        )
        db.add(candidate)
        db.commit()
        db.refresh(candidate)
        return candidate
    
    def _log_event(
        self,
        db: Session,
        user_id: int,
        action: AdaptationAction,
        auth_attempt_id: Optional[int] = None,
        candidate_model_id: Optional[int] = None,
        old_model_version_id: Optional[int] = None,
        new_model_version_id: Optional[int] = None,
        reason: Optional[str] = None,
        metrics_comparison: Optional[Dict[str, Any]] = None
    ):
        """Log adaptation event."""
        event = AdaptationEvent(
            user_id=user_id,
            auth_attempt_id=auth_attempt_id,
            action=action,
            candidate_model_id=candidate_model_id,
            old_model_version_id=old_model_version_id,
            new_model_version_id=new_model_version_id,
            reason=reason,
            metrics_comparison=metrics_comparison
        )
        db.add(event)
        db.commit()
    
    def process_auth_result(
        self, 
        db: Session, 
        user_id: int, 
        auth_attempt_id: int,
        decision: str,
        sample_id: int
    ) -> AdaptationResult:
        """
        Process authentication result:
        - If ALLOW: add to candidate pool, check if should train candidate
        - If CHALLENGE/REJECT: log event
        """
        config = self._get_config(db, user_id)
        
        if decision == 'allow':
            # Add to candidate pool implicitly (sample already saved)
            # Check if we have enough samples for candidate
            pool = self._get_candidate_pool(db, user_id, config.candidate_window_size)
            
            if len(pool) >= config.min_candidate_samples:
                return self._train_and_evaluate_candidate(db, user_id, config, pool, auth_attempt_id)
            else:
                self._log_event(
                    db, user_id, AdaptationAction.sample_enqueued,
                    auth_attempt_id=auth_attempt_id,
                    reason=f"Sample added to candidate pool ({len(pool)}/{config.min_candidate_samples})"
                )
                return AdaptationResult(
                    action="sample_enqueued",
                    message=f"Sample added to candidate pool ({len(pool)}/{config.min_candidate_samples})"
                )
        
        elif decision == 'challenge':
            self._log_event(
                db, user_id, AdaptationAction.challenge_requested,
                auth_attempt_id=auth_attempt_id,
                reason="Biometric score in challenge range"
            )
            return AdaptationResult(action="challenge_requested")
        
        elif decision == 'reject':
            self._log_event(
                db, user_id, AdaptationAction.candidate_rejected,
                auth_attempt_id=auth_attempt_id,
                reason="Biometric score below reject threshold"
            )
            return AdaptationResult(action="rejected")
        
        return AdaptationResult(action="unknown")
    
    def _train_and_evaluate_candidate(
        self,
        db: Session,
        user_id: int,
        config: AdaptationConfig,
        pool: List[TypingSample],
        auth_attempt_id: int
    ) -> AdaptationResult:
        """Train candidate model and evaluate against current model."""
        
        # Get current active model
        current_model = db.query(ModelVersion).filter(
            ModelVersion.user_id == user_id,
            ModelVersion.is_active == True
        ).first()
        
        if not current_model:
            return AdaptationResult(
                action="error",
                message="No active model to compare against"
            )
        
        sample_ids = [s.id for s in pool]
        
        # Create candidate record
        candidate = self._create_candidate_model(
            db, user_id, sample_ids, current_model.id
        )
        
        # Log candidate creation
        self._log_event(
            db, user_id, AdaptationAction.candidate_created,
            auth_attempt_id=auth_attempt_id,
            candidate_model_id=candidate.id,
            old_model_version_id=current_model.id,
            reason=f"Candidate trained with {len(pool)} samples"
        )
        
        # Update candidate status to evaluating
        candidate.status = CandidateStatus.evaluating
        db.commit()
        
        self._log_event(
            db, user_id, AdaptationAction.candidate_evaluating,
            candidate_model_id=candidate.id,
            old_model_version_id=current_model.id
        )
        
        try:
            # Train candidate model with pool samples + recent original training data
            # For MVP: retrain with all enrollment samples + pool
            # In future: use sliding window
            import os
            models_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'models')
            os.makedirs(models_dir, exist_ok=True)
            model_output_path = os.path.join(models_dir, f"user_{user_id}_candidate_{candidate.id}")
            
            # Train the candidate with the historical enrollment data PLUS the
            # current candidate pool (the new ALLOW samples representing the
            # user's recent/drifted typing behavior). This is what actually
            # makes M1 differ from M0 in response to behavioral drift.
            biometric_model, metrics = train_user_model(
                db=db,
                user_id=user_id,
                model_output_path=model_output_path,
                extra_sample_ids=sample_ids
            )
            
            # Update candidate with metrics
            candidate.model_path = model_output_path + '.joblib'
            candidate.metrics = metrics
            candidate.status = CandidateStatus.evaluating
            db.commit()
            
            # Evaluate candidate vs current model
            accepted, comparison = evaluate_model_comparison(
                old_metrics=current_model.metrics,
                new_metrics=metrics,
                config={
                    'max_far_degradation': config.max_far_degradation,
                    'max_frr_degradation': config.max_frr_degradation,
                    'max_eer_degradation': config.max_eer_degradation,
                    'min_precision_delta': config.min_precision_delta,
                    'min_recall_delta': config.min_recall_delta,
                    'require_all_constraints': config.require_all_constraints
                }
            )
            
            # Update candidate with evaluation details
            candidate.evaluation_details = comparison
            candidate.resolved_at = datetime.utcnow()
            
            if accepted:
                # Activate new model
                return self._accept_candidate(
                    db, user_id, candidate, current_model, 
                    auth_attempt_id, comparison
                )
            else:
                # Reject candidate
                return self._reject_candidate(
                    db, user_id, candidate, current_model,
                    auth_attempt_id, comparison
                )
                
        except Exception as e:
            candidate.status = CandidateStatus.rejected
            db.commit()
            self._log_event(
                db, user_id, AdaptationAction.candidate_rejected,
                candidate_model_id=candidate.id,
                old_model_version_id=current_model.id,
                reason=f"Training failed: {str(e)}"
            )
            return AdaptationResult(
                action="candidate_rejected",
                message=f"Candidate training failed: {str(e)}"
            )
    
    def _accept_candidate(
        self,
        db: Session,
        user_id: int,
        candidate: CandidateModel,
        old_model: ModelVersion,
        auth_attempt_id: int,
        comparison: Dict[str, Any]
    ) -> AdaptationResult:
        """Accept candidate model as new active model."""
        
        # Deactivate old model
        old_model.is_active = False
        
        # Create new ModelVersion from candidate
        new_model = ModelVersion(
            user_id=user_id,
            model_path=candidate.model_path,
            training_samples_count=candidate.metrics.get('n_samples_train', 0),
            metrics=candidate.metrics,
            training_config=candidate.metrics.get('training_config', {}),
            feature_schema=candidate.metrics.get('feature_schema', {}),
            is_active=True
        )
        db.add(new_model)
        db.flush()
        
        # Update candidate
        candidate.status = CandidateStatus.accepted
        candidate.new_model_version_id = new_model.id
        candidate.resolved_at = datetime.utcnow()
        
        db.commit()
        
        # Log acceptance
        self._log_event(
            db, user_id, AdaptationAction.candidate_accepted,
            auth_attempt_id=auth_attempt_id,
            candidate_model_id=candidate.id,
            old_model_version_id=old_model.id,
            new_model_version_id=new_model.id,
            reason=f"Candidate accepted: metrics improved or maintained",
            metrics_comparison=comparison
        )
        
        return AdaptationResult(
            action="candidate_accepted",
            candidate_model_id=candidate.id,
            message=f"Model adapted: v{new_model.id} activated",
            metrics_comparison=comparison
        )
    
    def _reject_candidate(
        self,
        db: Session,
        user_id: int,
        candidate: CandidateModel,
        old_model: ModelVersion,
        auth_attempt_id: int,
        comparison: Dict[str, Any]
    ) -> AdaptationResult:
        """Reject candidate model."""
        
        candidate.status = CandidateStatus.rejected
        candidate.resolved_at = datetime.utcnow()
        db.commit()
        
        self._log_event(
            db, user_id, AdaptationAction.candidate_rejected,
            auth_attempt_id=auth_attempt_id,
            candidate_model_id=candidate.id,
            old_model_version_id=old_model.id,
            reason="Candidate did not meet acceptance criteria",
            metrics_comparison=comparison
        )
        
        return AdaptationResult(
            action="candidate_rejected",
            candidate_model_id=candidate.id,
            message="Candidate rejected: did not meet security/usability criteria",
            metrics_comparison=comparison
        )
    
    def get_candidate_status(self, db: Session, user_id: int) -> Dict[str, Any]:
        """Get current candidate pool status."""
        config = self._get_config(db, user_id)
        pool = self._get_candidate_pool(db, user_id, config.candidate_window_size)
        
        current_model = db.query(ModelVersion).filter(
            ModelVersion.user_id == user_id,
            ModelVersion.is_active == True
        ).first()
        
        pending_candidate = db.query(CandidateModel).filter(
            CandidateModel.user_id == user_id,
            CandidateModel.status.in_([CandidateStatus.training, CandidateStatus.evaluating])
        ).first()
        
        return {
            'pool_size': len(pool),
            'min_required': config.min_candidate_samples,
            'window_size': config.candidate_window_size,
            'pool_samples': [{'id': s.id, 'created_at': s.created_at.isoformat()} for s in pool],
            'current_model_version': current_model.id if current_model else None,
            'pending_candidate': {
                'id': pending_candidate.id,
                'status': pending_candidate.status.value,
                'created_at': pending_candidate.created_at.isoformat()
            } if pending_candidate else None
        }
    
    def force_evaluation(self, db: Session, user_id: int) -> AdaptationResult:
        """Force evaluation of candidate pool."""
        config = self._get_config(db, user_id)
        pool = self._get_candidate_pool(db, user_id, config.candidate_window_size)
        
        if len(pool) < config.min_candidate_samples:
            return AdaptationResult(
                action="error",
                message=f"Insufficient samples: {len(pool)}/{config.min_candidate_samples}"
            )
        
        # Get latest auth attempt for logging
        latest_auth = db.query(AuthAttempt).filter(
            AuthAttempt.user_id == user_id
        ).order_by(AuthAttempt.created_at.desc()).first()
        
        auth_id = latest_auth.id if latest_auth else None
        
        return self._train_and_evaluate_candidate(db, user_id, config, pool, auth_id)
    
    def update_config(self, db: Session, user_id: int, updates: Dict[str, Any]) -> AdaptationConfig:
        """Update user's adaptation configuration."""
        config = self._get_config(db, user_id)
        
        for key, value in updates.items():
            if hasattr(config, key):
                setattr(config, key, value)
        
        config.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(config)
        return config


adaptive_service = AdaptiveService()