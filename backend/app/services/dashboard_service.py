"""
Dashboard Service - Metrics and statistics for TECLEOLLAVE-ADAPT.
Provides aggregated metrics for dashboard visualization.
"""

from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, desc
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass

from app.models import (
    User, TypingSample, AuthAttempt, ModelVersion, 
    CandidateModel, AdaptationEvent, AdaptationConfig,
    AuthDecision, AdaptationAction, CandidateStatus
)


@dataclass
class AuthMetrics:
    """Authentication metrics for a time period."""
    total_attempts: int
    allow_count: int
    challenge_count: int
    reject_count: int
    far: float
    frr: float
    avg_score: float
    period_start: datetime
    period_end: datetime


@dataclass
class ModelMetrics:
    """Model version metrics."""
    version_id: int
    user_id: int
    is_active: bool
    created_at: datetime
    training_samples: int
    metrics: Dict[str, float]
    auth_count: int
    allow_rate: float
    avg_score: float


@dataclass
class AdaptationMetrics:
    """Adaptation events summary."""
    total_events: int
    candidate_created: int
    candidate_accepted: int
    candidate_rejected: int
    sample_enqueued: int
    challenge_requested: int
    challenge_passed: int
    challenge_failed: int
    current_model_version: Optional[int]
    last_adaptation: Optional[datetime]


@dataclass
class TimeSeriesPoint:
    """Single point in time series."""
    timestamp: datetime
    value: float
    label: Optional[str] = None


class DashboardService:
    """Service for dashboard metrics and statistics."""
    
    def __init__(self):
        pass
    
    def get_user_summary(self, db: Session, user_id: int) -> Dict[str, Any]:
        """Get overall user summary."""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return {}
        
        # Active model
        active_model = db.query(ModelVersion).filter(
            ModelVersion.user_id == user_id,
            ModelVersion.is_active == True
        ).first()
        
        # Total samples
        total_samples = db.query(TypingSample).filter(
            TypingSample.user_id == user_id
        ).count()
        
        enrollment_samples = db.query(TypingSample).filter(
            TypingSample.user_id == user_id,
            TypingSample.source == 'enrollment'
        ).count()
        
        auth_samples = db.query(TypingSample).filter(
            TypingSample.user_id == user_id,
            TypingSample.source == 'auth'
        ).count()
        
        # Total auth attempts
        total_auth = db.query(AuthAttempt).filter(
            AuthAttempt.user_id == user_id
        ).count()
        
        # Total adaptations
        total_adaptations = db.query(AdaptationEvent).filter(
            AdaptationEvent.user_id == user_id
        ).count()
        
        return {
            'user_id': user_id,
            'username': user.username,
            'created_at': user.created_at.isoformat() if user.created_at else None,
            'active_model_version': active_model.id if active_model else None,
            'total_samples': total_samples,
            'enrollment_samples': enrollment_samples,
            'auth_samples': auth_samples,
            'total_auth_attempts': total_auth,
            'total_adaptations': total_adaptations
        }
    
    def get_auth_metrics(
        self, 
        db: Session, 
        user_id: int, 
        days: int = 30
    ) -> AuthMetrics:
        """Get authentication metrics for a period."""
        cutoff = datetime.utcnow() - timedelta(days=days)
        
        attempts = db.query(AuthAttempt).filter(
            AuthAttempt.user_id == user_id,
            AuthAttempt.created_at >= cutoff
        ).all()
        
        if not attempts:
            return AuthMetrics(
                total_attempts=0,
                allow_count=0,
                challenge_count=0,
                reject_count=0,
                far=0.0,
                frr=0.0,
                avg_score=0.0,
                period_start=cutoff,
                period_end=datetime.utcnow()
            )
        
        total = len(attempts)
        allow = sum(1 for a in attempts if a.decision == 'allow')
        challenge = sum(1 for a in attempts if a.decision == 'challenge')
        reject = sum(1 for a in attempts if a.decision == 'reject')
        
        # FAR: impostor accepted / impostor attempts
        # For MVP: we don't have impostor labels, use reject rate as proxy
        far = reject / total if total > 0 else 0.0
        
        # FRR: legitimate rejected / legitimate attempts
        # For MVP: use challenge + reject / (allow + challenge) as proxy
        frr = (challenge + reject) / (allow + challenge) if (allow + challenge) > 0 else 0.0
        
        avg_score = sum(a.score for a in attempts) / total if total > 0 else 0.0
        
        return AuthMetrics(
            total_attempts=total,
            allow_count=allow,
            challenge_count=challenge,
            reject_count=reject,
            far=far,
            frr=frr,
            avg_score=avg_score,
            period_start=cutoff,
            period_end=datetime.utcnow()
        )
    
    def get_auth_time_series(
        self, 
        db: Session, 
        user_id: int, 
        days: int = 30,
        bucket_hours: int = 24
    ) -> List[Dict[str, Any]]:
        """Get time series of authentication metrics."""
        cutoff = datetime.utcnow() - timedelta(days=days)
        
        attempts = db.query(AuthAttempt).filter(
            AuthAttempt.user_id == user_id,
            AuthAttempt.created_at >= cutoff
        ).order_by(AuthAttempt.created_at).all()
        
        if not attempts:
            return []
        
        # Bucket by time
        buckets = {}
        for attempt in attempts:
            bucket_time = attempt.created_at.replace(
                minute=0, second=0, microsecond=0
            )
            # Round to bucket
            hour = attempt.created_at.hour
            bucket_hour = (hour // bucket_hours) * bucket_hours
            bucket_key = attempt.created_at.replace(
                hour=bucket_hour, minute=0, second=0, microsecond=0
            )
            
            if bucket_key not in buckets:
                buckets[bucket_key] = {'allow': 0, 'challenge': 0, 'reject': 0, 'scores': []}
            
            buckets[bucket_key][attempt.decision.value] += 1
            buckets[bucket_key]['scores'].append(attempt.score)
        
        # Convert to list
        result = []
        for ts in sorted(buckets.keys()):
            b = buckets[ts]
            total = b['allow'] + b['challenge'] + b['reject']
            avg_score = sum(b['scores']) / len(b['scores']) if b['scores'] else 0
            
            result.append({
                'timestamp': ts.isoformat(),
                'allow': b['allow'],
                'challenge': b['challenge'],
                'reject': b['reject'],
                'total': total,
                'avg_score': avg_score,
                'allow_rate': b['allow'] / total if total > 0 else 0
            })
        
        return result
    
    def get_model_versions(self, db: Session, user_id: int) -> List[ModelMetrics]:
        """Get all model versions with metrics."""
        models = db.query(ModelVersion).filter(
            ModelVersion.user_id == user_id
        ).order_by(ModelVersion.created_at.desc()).all()
        
        result = []
        for model in models:
            # Count auth attempts for this model
            auth_count = db.query(AuthAttempt).filter(
                AuthAttempt.model_version_id == model.id
            ).count()
            
            allow_count = db.query(AuthAttempt).filter(
                AuthAttempt.model_version_id == model.id,
                AuthAttempt.decision == 'allow'
            ).count()
            
            avg_score = db.query(func.avg(AuthAttempt.score)).filter(
                AuthAttempt.model_version_id == model.id
            ).scalar() or 0.0
            
            result.append(ModelMetrics(
                version_id=model.id,
                user_id=model.user_id,
                is_active=model.is_active,
                created_at=model.created_at,
                training_samples=model.training_samples_count,
                metrics=model.metrics,
                auth_count=auth_count,
                allow_rate=allow_count / auth_count if auth_count > 0 else 0,
                avg_score=float(avg_score)
            ))
        
        return result
    
    def get_adaptation_summary(self, db: Session, user_id: int) -> AdaptationMetrics:
        """Get adaptation events summary."""
        events = db.query(AdaptationEvent).filter(
            AdaptationEvent.user_id == user_id
        ).all()
        
        # Current model
        current_model = db.query(ModelVersion).filter(
            ModelVersion.user_id == user_id,
            ModelVersion.is_active == True
        ).first()
        
        # Last adaptation
        last_event = db.query(AdaptationEvent).filter(
            AdaptationEvent.user_id == user_id
        ).order_by(desc(AdaptationEvent.created_at)).first()
        
        return AdaptationMetrics(
            total_events=len(events),
            candidate_created=sum(1 for e in events if e.action == 'candidate_created'),
            candidate_accepted=sum(1 for e in events if e.action == 'candidate_accepted'),
            candidate_rejected=sum(1 for e in events if e.action == 'candidate_rejected'),
            sample_enqueued=sum(1 for e in events if e.action == 'sample_enqueued'),
            challenge_requested=sum(1 for e in events if e.action == 'challenge_requested'),
            challenge_passed=sum(1 for e in events if e.action == 'challenge_passed'),
            challenge_failed=sum(1 for e in events if e.action == 'challenge_failed'),
            current_model_version=current_model.id if current_model else None,
            last_adaptation=last_event.created_at if last_event else None
        )
    
    def get_adaptation_timeline(
        self, 
        db: Session, 
        user_id: int, 
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Get adaptation events timeline."""
        events = db.query(AdaptationEvent).filter(
            AdaptationEvent.user_id == user_id
        ).order_by(desc(AdaptationEvent.created_at)).limit(limit).all()
        
        return [
            {
                'id': e.id,
                'action': e.action.value,
                'candidate_model_id': e.candidate_model_id,
                'old_model_version_id': e.old_model_version_id,
                'new_model_version_id': e.new_model_version_id,
                'reason': e.reason,
                'metrics_comparison': e.metrics_comparison,
                'created_at': e.created_at.isoformat()
            }
            for e in events
        ]
    
    def get_candidate_status(self, db: Session, user_id: int) -> Dict[str, Any]:
        """Get current candidate pool status."""
        from app.services.adaptive_service import adaptive_service
        return adaptive_service.get_candidate_status(db, user_id)
    
    def get_comparison_static_vs_adaptive(
        self, 
        db: Session, 
        user_id: int
    ) -> Dict[str, Any]:
        """Get comparison data for static vs adaptive experiment."""
        # This is a simplified version - real experiment would need controlled data
        models = self.get_model_versions(db, user_id)
        
        if len(models) < 2:
            return {'message': 'Need at least 2 model versions for comparison'}
        
        # First model (static baseline)
        static = models[-1]  # Oldest
        # Latest model (adaptive)
        adaptive = models[0]  # Newest
        
        return {
            'static_model': {
                'version_id': static.version_id,
                'created_at': static.created_at.isoformat() if static.created_at else None,
                'metrics': static.metrics,
                'auth_count': static.auth_count,
                'allow_rate': static.allow_rate
            },
            'adaptive_model': {
                'version_id': adaptive.version_id,
                'created_at': adaptive.created_at.isoformat() if adaptive.created_at else None,
                'metrics': adaptive.metrics,
                'auth_count': adaptive.auth_count,
                'allow_rate': adaptive.allow_rate
            },
            'improvement': {
                'allow_rate_delta': adaptive.allow_rate - static.allow_rate,
                'avg_score_delta': adaptive.avg_score - static.avg_score
            }
        }


dashboard_service = DashboardService()