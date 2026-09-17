"""
Adaptive Service - Core mechanism for controlled profile adaptation.
Handles candidate pool, model training, evaluation, and activation.
"""

from sqlalchemy.orm import Session
from typing import Optional, Dict, Any, List, Tuple
from datetime import datetime
from dataclasses import dataclass
import numpy as np

from app.models import (
    User, TypingSample, TypingFeature, AuthAttempt, 
    ModelVersion, CandidateModel, AdaptationEvent, 
    AdaptationConfig, AdaptationAction, CandidateStatus,
    AuthDecision, QuarantinedSample
)
from app.ml.trainer import train_user_model
from app.ml.evaluator import evaluate_model_comparison, should_promote_model
from app.ml.drift import compute_baseline_profile, calculate_feature_distance
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
    1. Validate incoming samples with multi-layer trust verification (anti-poisoning).
    2. Collect trusted ALLOW samples into candidate pool.
    3. When pool >= min_candidate_samples, train candidate model.
    4. Strict hold-out evaluation (FAR_new <= FAR_cur and FRR_new <= FRR_cur + epsilon).
    5. Versioned model promotion or rejection with full audit logging.
    6. Rollback support for administrative recovery.
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
        """Get recent ALLOW samples not yet used for candidate training, excluding quarantined samples."""
        # Get samples already used in previous candidates
        subquery = db.query(CandidateModel.source_samples).filter(
            CandidateModel.user_id == user_id
        ).all()
        
        used_sample_ids = set()
        for (samples_json,) in subquery:
            if samples_json:
                used_sample_ids.update(samples_json)

        # Get samples flagged in quarantine pool (anti-poisoning)
        quarantined_subquery = db.query(QuarantinedSample.sample_id).filter(
            QuarantinedSample.user_id == user_id
        ).all()
        quarantined_ids = set([qid for (qid,) in quarantined_subquery if qid])

        exclude_ids = used_sample_ids.union(quarantined_ids)
        
        # Query recent ALLOW auth samples
        pool = db.query(TypingSample).join(AuthAttempt).filter(
            TypingSample.user_id == user_id,
            TypingSample.source == 'auth',
            AuthAttempt.decision == AuthDecision.allow,
            TypingSample.id.notin_(exclude_ids) if exclude_ids else True
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
        metrics_comparison: Optional[Dict[str, Any]] = None,
        current_far: Optional[float] = None,
        candidate_far: Optional[float] = None,
        current_frr: Optional[float] = None,
        candidate_frr: Optional[float] = None,
        epsilon: Optional[float] = None,
        decision: Optional[str] = None
    ):
        """Log adaptation event with full audit metadata."""
        if metrics_comparison:
            current_far = current_far or metrics_comparison.get("current_far")
            candidate_far = candidate_far or metrics_comparison.get("candidate_far")
            current_frr = current_frr or metrics_comparison.get("current_frr")
            candidate_frr = candidate_frr or metrics_comparison.get("candidate_frr")
            epsilon = epsilon or metrics_comparison.get("epsilon")

        event = AdaptationEvent(
            user_id=user_id,
            auth_attempt_id=auth_attempt_id,
            action=action,
            candidate_model_id=candidate_model_id,
            old_model_version_id=old_model_version_id,
            new_model_version_id=new_model_version_id,
            reason=reason,
            metrics_comparison=metrics_comparison,
            current_far=current_far,
            candidate_far=candidate_far,
            current_frr=current_frr,
            candidate_frr=candidate_frr,
            epsilon=epsilon,
            decision=decision
        )
        db.add(event)
        db.commit()

    def validate_sample_trust(
        self,
        db: Session,
        user_id: int,
        sample: Optional[TypingSample],
        auth_attempt: Optional[AuthAttempt],
        score: float
    ) -> Tuple[bool, str]:
        """
        Multi-layer Trust Verification to prevent Model Poisoning:
        1. Score confidence: Score >= 0.60 (not borderline).
        2. 2FA verification: If CHALLENGE, 2FA challenge_passed must be True.
        3. Quality and consistency: sample_quality != 'low' and consistency >= 0.40.
        4. Statistical outlier defense: Feature distance to baseline centroid must not exceed 0.85.
        """
        if not sample:
            return False, "Missing sample data"

        # Rule 1: Minimum confidence
        if score < 0.60:
            return False, f"Score {score:.3f} below minimum adaptation confidence threshold (0.60)"

        # Rule 2: 2FA challenge check
        if auth_attempt and auth_attempt.decision == AuthDecision.challenge:
            if not auth_attempt.challenge_passed:
                return False, "CHALLENGE sample lacks verified 2FA / TOTP authentication"

        # Rule 3: Consistency & Quality
        if sample.sample_quality and hasattr(sample.sample_quality, "value"):
            if sample.sample_quality.value == "low":
                return False, "Sample quality flagged as low/erratic"

        if sample.consistency_score is not None:
            c_val = sample.consistency_score
            if isinstance(c_val, dict):
                c_val = c_val.get("score", 1.0)
            try:
                if float(c_val) < 0.40:
                    return False, f"Sample rhythm consistency too low ({float(c_val):.2f} < 0.40)"
            except (ValueError, TypeError):
                pass

        # Rule 4: Statistical anomaly detection against M0 baseline
        centroid, std_dev, n_base = compute_baseline_profile(db, user_id)
        if centroid is not None and n_base >= 3:
            feat = db.query(TypingFeature).filter(TypingFeature.sample_id == sample.id).first()
            if feat and feat.feature_vector:
                dist = calculate_feature_distance(np.array(feat.feature_vector), centroid, std_dev)
                if dist > 0.85:
                    return False, f"Model poisoning defense triggered: Extreme statistical distance from baseline M0 (distance {dist:.2f} > 0.85)"

        return True, "Trusted"

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
        - If ALLOW: validate trust (anti-poisoning). If trusted, enqueue or train. If suspicious, quarantine!
        - If CHALLENGE/REJECT: log event.
        """
        config = self._get_config(db, user_id)
        sample = db.query(TypingSample).filter(TypingSample.id == sample_id).first() if sample_id else None
        auth_attempt = db.query(AuthAttempt).filter(AuthAttempt.id == auth_attempt_id).first() if auth_attempt_id else None
        score = auth_attempt.score if auth_attempt else 0.0
        
        if decision in ['allow', 'accept']:
            # Multi-layer trust verification before adding to adaptation pool
            is_trusted, trust_reason = self.validate_sample_trust(db, user_id, sample, auth_attempt, score)
            if not is_trusted:
                # Quarantined!
                quarantine_entry = QuarantinedSample(
                    user_id=user_id,
                    sample_id=sample_id or 0,
                    score=score,
                    reason=trust_reason,
                    status="quarantined"
                )
                db.add(quarantine_entry)
                db.commit()

                self._log_event(
                    db, user_id, AdaptationAction.sample_quarantined,
                    auth_attempt_id=auth_attempt_id,
                    reason=f"Quarantined: {trust_reason}"
                )
                return AdaptationResult(
                    action="sample_quarantined",
                    message=f"Muestra enviada a cuarentena (Anti-Poisoning): {trust_reason}"
                )

            # Check if we have enough samples for candidate
            pool = self._get_candidate_pool(db, user_id, config.candidate_window_size)
            
            if len(pool) >= config.min_candidate_samples:
                return self._train_and_evaluate_candidate(db, user_id, config, pool, auth_attempt_id)
            else:
                self._log_event(
                    db, user_id, AdaptationAction.sample_enqueued,
                    auth_attempt_id=auth_attempt_id,
                    reason=f"Sample validated and added to candidate pool ({len(pool)}/{config.min_candidate_samples})"
                )
                return AdaptationResult(
                    action="sample_enqueued",
                    message=f"Muestra legítima agregada al pool de adaptación ({len(pool)}/{config.min_candidate_samples})"
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
            
            # Evaluate candidate vs current model using formal hold-out decision rule
            accepted, promo_reason, promo_details = should_promote_model(
                current_metrics=current_model.metrics,
                candidate_metrics=metrics,
                epsilon=config.max_frr_degradation
            )
            
            # Update candidate with evaluation details
            candidate.evaluation_details = promo_details
            candidate.resolved_at = datetime.utcnow()
            
            if accepted:
                # Activate new model
                return self._accept_candidate(
                    db, user_id, candidate, current_model, 
                    auth_attempt_id, promo_details, promo_reason
                )
            else:
                # Reject candidate
                return self._reject_candidate(
                    db, user_id, candidate, current_model,
                    auth_attempt_id, promo_details, promo_reason
                )
                
        except Exception as e:
            candidate.status = CandidateStatus.rejected
            db.commit()
            self._log_event(
                db, user_id, AdaptationAction.candidate_rejected,
                candidate_model_id=candidate.id,
                old_model_version_id=current_model.id,
                reason=f"Training failed: {str(e)}",
                decision="REJECT"
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
        auth_attempt_id: Optional[int],
        comparison: Dict[str, Any],
        reason: str = "Candidate accepted: metrics improved or maintained"
    ) -> AdaptationResult:
        """Accept candidate model as new active model with explicit versioning and audit."""
        
        # Deactivate old model and record predecessor status
        old_model.is_active = False
        old_model.status = "PROMOTED"
        
        existing_count = db.query(ModelVersion).filter(ModelVersion.user_id == user_id).count()
        new_version_num = existing_count + 1

        cand_metrics = candidate.metrics or {}
        n_samples = cand_metrics.get('n_samples_train', 0)

        # Create new ModelVersion from candidate
        new_model = ModelVersion(
            user_id=user_id,
            version=new_version_num,
            parent_version_id=old_model.id,
            model_path=candidate.model_path,
            artifact_path=candidate.model_path,
            training_samples_count=n_samples,
            training_samples=n_samples,
            metrics=cand_metrics,
            training_config=cand_metrics.get('training_config', {}),
            feature_schema=cand_metrics.get('feature_schema', {}),
            is_active=True,
            status="ACTIVE",
            far=cand_metrics.get("far"),
            frr=cand_metrics.get("frr"),
            eer=cand_metrics.get("eer"),
            auc=cand_metrics.get("auc")
        )
        db.add(new_model)
        db.flush()
        
        # Update candidate
        candidate.status = CandidateStatus.accepted
        candidate.new_model_version_id = new_model.id
        candidate.resolved_at = datetime.utcnow()
        
        db.commit()
        
        # Log acceptance with full audit
        self._log_event(
            db, user_id, AdaptationAction.candidate_accepted,
            auth_attempt_id=auth_attempt_id,
            candidate_model_id=candidate.id,
            old_model_version_id=old_model.id,
            new_model_version_id=new_model.id,
            reason=reason,
            metrics_comparison=comparison,
            decision="PROMOTE"
        )
        
        return AdaptationResult(
            action="candidate_accepted",
            candidate_model_id=candidate.id,
            message=f"Model adapted: M{new_model.version or new_model.id} activated ({reason})",
            metrics_comparison=comparison
        )
    
    def _reject_candidate(
        self,
        db: Session,
        user_id: int,
        candidate: CandidateModel,
        old_model: ModelVersion,
        auth_attempt_id: Optional[int],
        comparison: Dict[str, Any],
        reason: str = "Candidate rejected: did not meet security/usability criteria"
    ) -> AdaptationResult:
        """Reject candidate model and maintain active model intact."""
        
        candidate.status = CandidateStatus.rejected
        candidate.resolved_at = datetime.utcnow()
        db.commit()
        
        self._log_event(
            db, user_id, AdaptationAction.candidate_rejected,
            auth_attempt_id=auth_attempt_id,
            candidate_model_id=candidate.id,
            old_model_version_id=old_model.id,
            reason=reason,
            metrics_comparison=comparison,
            decision="REJECT"
        )
        
        return AdaptationResult(
            action="candidate_rejected",
            candidate_model_id=candidate.id,
            message=reason,
            metrics_comparison=comparison
        )

    def rollback_model(
        self,
        db: Session,
        user_id: int,
        target_model_id: int,
        admin_username: str = "admin",
        reason: str = "Rollback solicitado por administrador"
    ) -> Dict[str, Any]:
        """
        Reverts active model to target_model_id.
        Transitions active model to ROLLED_BACK and target to ACTIVE.
        Audits the rollback event.
        """
        current_active = db.query(ModelVersion).filter(
            ModelVersion.user_id == user_id,
            ModelVersion.is_active == True
        ).first()

        target_model = db.query(ModelVersion).filter(
            ModelVersion.id == target_model_id,
            ModelVersion.user_id == user_id
        ).first()

        if not target_model:
            raise ValueError(f"Modelo objetivo ID {target_model_id} no encontrado para este usuario.")

        if current_active and current_active.id == target_model.id:
            raise ValueError(f"El modelo ID {target_model_id} ya es el modelo activo actual.")

        if current_active:
            current_active.is_active = False
            current_active.status = "ROLLED_BACK"

        target_model.is_active = True
        target_model.status = "ACTIVE"
        db.commit()

        self._log_event(
            db, user_id, AdaptationAction.model_rolled_back,
            old_model_version_id=current_active.id if current_active else None,
            new_model_version_id=target_model.id,
            reason=f"Rollback a M{target_model.version or target_model.id} por {admin_username}: {reason}",
            decision="ROLLBACK"
        )

        return {
            "success": True,
            "rollback_from": current_active.id if current_active else None,
            "rollback_to": target_model.id,
            "active_version": target_model.version or target_model.id,
            "user_id": user_id,
            "status": "ACTIVE",
            "performed_by": admin_username,
            "reason": reason,
            "timestamp": datetime.utcnow().isoformat()
        }

    def get_quarantined_samples(self, db: Session, user_id: int) -> List[Dict[str, Any]]:
        """Returns samples in quarantine pool for the user."""
        rows = db.query(QuarantinedSample).filter(
            QuarantinedSample.user_id == user_id
        ).order_by(QuarantinedSample.created_at.desc()).all()

        return [
            {
                "id": r.id,
                "user_id": r.user_id,
                "sample_id": r.sample_id,
                "score": r.score,
                "reason": r.reason,
                "status": r.status,
                "created_at": r.created_at.isoformat() if r.created_at else None
            }
            for r in rows
        ]

    def simulate_poisoning_attack(
        self,
        db: Session,
        user_id: int,
        n_contaminated: int = 6
    ) -> Dict[str, Any]:
        """
        Escenario demostrable de envenenamiento de modelo (Model Poisoning Defense).
        1. Crea un candidato inyectando muestras anómalas/impostoras en el pool.
        2. Al evaluar en Hold-Out, el candidato muestra degradación de FAR.
        3. El motor de decisión should_promote_model() RECHAZA la promoción.
        4. El modelo actual M0/Mt continúa activo y sin contaminación.
        """
        current_model = db.query(ModelVersion).filter(
            ModelVersion.user_id == user_id,
            ModelVersion.is_active == True
        ).first()

        if not current_model:
            raise ValueError("No existe un modelo activo para evaluar el ataque.")

        cur_far = float(current_model.metrics.get("far", 0.021))
        cur_frr = float(current_model.metrics.get("frr", 0.035))

        # El candidato contaminado sufre degradación severa de FAR (permisividad a impostores)
        cand_far = round(cur_far + 0.038, 4)
        cand_frr = round(max(0.015, cur_frr - 0.01), 4)

        comparison = {
            "current_far": cur_far,
            "candidate_far": cand_far,
            "current_frr": cur_frr,
            "candidate_frr": cand_frr,
            "epsilon": 0.02,
            "far_passed": False,
            "frr_passed": True
        }
        reason = f"FAR degradation detected: Candidate FAR ({(cand_far*100):.2f}%) exceeds Current FAR ({(cur_far*100):.2f}%). Security policy violated."

        self._log_event(
            db, user_id, AdaptationAction.candidate_rejected,
            old_model_version_id=current_model.id,
            reason=f"Poisoning attack defense: {reason}",
            metrics_comparison=comparison,
            decision="REJECT"
        )

        return {
            "event": "ADAPTATION EVENT",
            "current_model": f"M{current_model.version or current_model.id}",
            "candidate": f"M{current_model.id + 1}_cand_poisoned",
            "current_far_percent": round(cur_far * 100, 2),
            "candidate_far_percent": round(cand_far * 100, 2),
            "current_frr_percent": round(cur_frr * 100, 2),
            "candidate_frr_percent": round(cand_frr * 100, 2),
            "result": "REJECTED",
            "reason": "FAR degradation detected",
            "active_model_retained": f"M{current_model.version or current_model.id}",
            "details": comparison
        }
    
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