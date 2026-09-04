"""
Experiment Service - Static vs Adaptive Comparison for TECLEOLLAVE-ADAPT.
Implements controlled experimental protocols for academic evaluation.
"""

import json
import csv
import random
import numpy as np
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from pathlib import Path
from sqlalchemy.orm import Session

from app.models import (
    User, TypingSample, TypingFeature, AuthAttempt, ModelVersion,
    CandidateModel, AdaptationEvent, AdaptationConfig, AuthDecision
)
from app.ml.trainer import train_user_model
from app.ml.predictor import load_user_model, BiometricPredictor
from app.ml.features import extract_features
from app.ml.evaluator import compute_far_frr, compute_eer, evaluate_authentication
from app.services.ml_service import ml_service
from app.services.adaptive_service import adaptive_service
from app.services.typing_service import typing_service
from app.schemas import TypingEnrollRequest, TypingAuthRequest, TimingEvent


@dataclass
class SessionResult:
    """Results for a single session."""
    session: int
    model_version: int
    strategy: str  # 'static' or 'adaptive'
    legitimate_scores: List[float]
    impostor_scores: List[float]
    far: float
    frr: float
    eer: float
    accuracy: float
    precision: float
    recall: float
    f1: float
    n_legitimate: int
    n_impostor: int
    adaptation_event: Optional[str] = None


@dataclass
class ExperimentResult:
    """Complete experiment results."""
    experiment_id: str
    user_id: int
    n_sessions: int
    samples_per_session: int
    impostor_ratio: float
    drift_profile: str
    started_at: str
    completed_at: str
    static_results: List[SessionResult]
    adaptive_results: List[SessionResult]
    summary: Dict[str, Any]


class ExperimentService:
    """
    Runs controlled experiments comparing static vs adaptive strategies.
    """
    
    def __init__(self, output_dir: str = "experiments/results"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
    
    def generate_synthetic_timestamps(
        self, 
        phrase: str, 
        base_pattern: Dict[str, float],
        drift: float = 0.0,
        session: int = 0,
        seed: int = 42
    ) -> List[Dict]:
        """
        Generate synthetic keystroke timestamps with optional drift.
        
        Args:
            phrase: Target phrase
            base_pattern: Base timing pattern {char: (hold_mean, latency_mean)}
            drift: Drift factor (0.0 = no drift, 0.1 = 10% change per session)
            session: Current session number
            seed: Random seed for reproducibility
        """
        random.seed(seed + session)
        np.random.seed(seed + session)
        
        events = []
        base_time = 1000.0
        prev_ku = 0
        
        for i, char in enumerate(phrase):
            key = 'Space' if char == ' ' else char
            
            # Apply drift to base pattern
            drift_factor = 1.0 + (drift * session)
            
            if key in base_pattern:
                hold_mean, latency_mean = base_pattern[key]
            else:
                hold_mean, latency_mean = 80.0, 120.0
            
            # Apply drift
            hold_mean *= drift_factor
            latency_mean *= drift_factor
            
            # Add noise
            kd = base_time + i * latency_mean + random.uniform(-10, 10)
            if i > 0:
                kd = max(kd, prev_ku + 5)
            
            hold_time = max(30, np.random.normal(hold_mean, hold_mean * 0.1))
            ku = kd + hold_time
            
            events.append({
                'key': key,
                'keydown_ts': kd,
                'keyup_ts': ku
            })
            prev_ku = ku
            base_time = kd
        
        return events
    
    def create_base_pattern(self, phrase: str) -> Dict[str, Tuple[float, float]]:
        """Create a base timing pattern for a user."""
        # Simulate a realistic user pattern
        base_hold = 85.0
        base_latency = 130.0
        pattern = {}
        
        for i, char in enumerate(phrase):
            key = 'Space' if char == ' ' else char
            # Add some variation per key
            variation = np.random.normal(1.0, 0.05)
            pattern[key] = (base_hold * variation, base_latency * variation)
        
        return pattern
    
    def run_static_experiment(
        self,
        db: Session,
        user_id: int,
        model_version_id: int,
        n_sessions: int,
        samples_per_session: int,
        impostor_ratio: float,
        drift_profile: str,
        base_pattern: Dict
    ) -> List[SessionResult]:
        """Run experiment with STATIC model (no adaptation)."""
        
        # Load the static model
        model_version = db.query(ModelVersion).filter(
            ModelVersion.id == model_version_id
        ).first()
        
        if not model_version:
            raise ValueError(f"Model version {model_version_id} not found")
        
        model = load_user_model(model_version.model_path)
        predictor = BiometricPredictor(model)
        
        # Drift per profile
        drift_map = {'none': 0.0, 'gradual': 0.02, 'abrupt': 0.1}
        drift = drift_map.get(drift_profile, 0.0)
        
        results = []
        
        for session in range(n_sessions):
            # Generate legitimate samples with drift
            legitimate_scores = []
            impostor_scores = []
            
            n_legitimate = int(samples_per_session * (1 - impostor_ratio))
            n_impostor = samples_per_session - n_legitimate
            
            # Legitimate samples with drift
            for i in range(n_legitimate):
                events = self.generate_synthetic_timestamps(
                    phrase="La seguridad protege la información",
                    base_pattern=base_pattern,
                    drift=drift,
                    session=session,
                    seed=42 + session * 100 + i
                )
                
                feature_result = extract_features(events, "La seguridad protege la información")
                if feature_result['valid']:
                    score = predictor.predict_score(np.array(feature_result['feature_vector']))
                    legitimate_scores.append(score)
            
            # Impostor samples (random/noisy)
            for i in range(n_impostor):
                events = self.generate_synthetic_timestamps(
                    phrase="La seguridad protege la información",
                    base_pattern=base_pattern,
                    drift=drift + 0.3,  # Impostor has different pattern
                    session=session,
                    seed=999 + session * 100 + i
                )
                
                feature_result = extract_features(events, "La seguridad protege la información")
                if feature_result['valid']:
                    score = predictor.predict_score(np.array(feature_result['feature_vector']))
                    impostor_scores.append(score)
            
            # Evaluate
            if legitimate_scores and impostor_scores:
                metrics = evaluate_authentication(
                    np.array(legitimate_scores),
                    np.array(impostor_scores),
                    threshold_allow=0.85,
                    threshold_challenge=0.70,
                    threshold_reject=0.60
                )
                
                results.append(SessionResult(
                    session=session,
                    model_version=model_version_id,
                    strategy='static',
                    legitimate_scores=legitimate_scores,
                    impostor_scores=impostor_scores,
                    far=metrics.far,
                    frr=metrics.frr,
                    eer=metrics.eer,
                    accuracy=metrics.accuracy,
                    precision=metrics.precision,
                    recall=metrics.recall,
                    f1=metrics.f1,
                    n_legitimate=len(legitimate_scores),
                    n_impostor=len(impostor_scores)
                ))
        
        return results
    
    def run_adaptive_experiment(
        self,
        db: Session,
        user_id: int,
        initial_model_version_id: int,
        n_sessions: int,
        samples_per_session: int,
        impostor_ratio: float,
        drift_profile: str,
        base_pattern: Dict
    ) -> List[SessionResult]:
        """Run experiment with ADAPTIVE model (full adaptation pipeline)."""
        
        drift_map = {'none': 0.0, 'gradual': 0.02, 'abrupt': 0.1}
        drift = drift_map.get(drift_profile, 0.0)
        
        results = []
        current_model_version_id = initial_model_version_id
        
        # Get user's adaptation config
        config = db.query(AdaptationConfig).filter(
            AdaptationConfig.user_id == user_id
        ).first()
        
        if not config:
            config = AdaptationConfig(user_id=user_id)
            db.add(config)
            db.commit()
        
        for session in range(n_sessions):
            # Load current model
            model_version = db.query(ModelVersion).filter(
                ModelVersion.id == current_model_version_id
            ).first()
            
            if not model_version:
                raise ValueError(f"Model version {current_model_version_id} not found")
            
            model = load_user_model(model_version.model_path)
            predictor = BiometricPredictor(model)
            
            adaptation_event = None
            
            # Generate samples for this session
            legitimate_scores = []
            impostor_scores = []
            
            n_legitimate = int(samples_per_session * (1 - impostor_ratio))
            n_impostor = samples_per_session - n_legitimate
            
            # Process each sample through full adaptive pipeline
            for i in range(n_legitimate):
                events = self.generate_synthetic_timestamps(
                    phrase="La seguridad protege la información",
                    base_pattern=base_pattern,
                    drift=drift,
                    session=session,
                    seed=42 + session * 100 + i
                )
                
                feature_result = extract_features(events, "La seguridad protege la información")
                if not feature_result['valid']:
                    continue
                
                # Full adaptive pipeline: authenticate + adapt
                from app.schemas import TypingAuthRequest, TimingEvent
                
                auth_request = TypingAuthRequest(
                    raw_timestamps=[TimingEvent(**e) for e in events],
                    phrase_typed="La seguridad protege la información",
                    source='auth'
                )
                
                auth_result = typing_service.authenticate_sample(db, auth_request, user_id=user_id)
                
                score = auth_result['score']
                legitimate_scores.append(score)
                
                # Check for adaptation
                if auth_result['adaptive_action'] == 'candidate_accepted':
                    adaptation_event = f"Model adapted at session {session}"
            
            # Impostor samples
            for i in range(n_impostor):
                events = self.generate_synthetic_timestamps(
                    phrase="La seguridad protege la información",
                    base_pattern=base_pattern,
                    drift=drift + 0.3,
                    session=session,
                    seed=999 + session * 100 + i
                )
                
                feature_result = extract_features(events, "La seguridad protege la información")
                if feature_result['valid']:
                    score = predictor.predict_score(np.array(feature_result['feature_vector']))
                    impostor_scores.append(score)
            
            # Evaluate
            if legitimate_scores and impostor_scores:
                metrics = evaluate_authentication(
                    np.array(legitimate_scores),
                    np.array(impostor_scores),
                    threshold_allow=0.85,
                    threshold_challenge=0.70,
                    threshold_reject=0.60
                )
                
                # Get current model version after potential adaptation
                current_model = db.query(ModelVersion).filter(
                    ModelVersion.user_id == user_id,
                    ModelVersion.is_active == True
                ).first()
                current_model_version_id = current_model.id if current_model else current_model_version_id
                
                results.append(SessionResult(
                    session=session,
                    model_version=current_model_version_id,
                    strategy='adaptive',
                    legitimate_scores=legitimate_scores,
                    impostor_scores=impostor_scores,
                    far=metrics.far,
                    frr=metrics.frr,
                    eer=metrics.eer,
                    accuracy=metrics.accuracy,
                    precision=metrics.precision,
                    recall=metrics.recall,
                    f1=metrics.f1,
                    n_legitimate=len(legitimate_scores),
                    n_impostor=len(impostor_scores),
                    adaptation_event=adaptation_event
                ))
        
        return results
    
    def run_comparison_experiment(
        self,
        db: Session,
        user_id: int,
        n_sessions: int = 30,
        samples_per_session: int = 10,
        impostor_ratio: float = 0.3,
        drift_profile: str = 'gradual',
        seed: int = 42
    ) -> ExperimentResult:
        """
        Run full comparison experiment: Static vs Adaptive.
        """
        experiment_id = f"exp_{user_id}_{drift_profile}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        # Create base pattern for this user
        random.seed(seed)
        np.random.seed(seed)
        base_pattern = self.create_base_pattern("La seguridad protege la información")
        
        # Get initial model
        initial_model = db.query(ModelVersion).filter(
            ModelVersion.user_id == user_id,
            ModelVersion.is_active == True
        ).first()
        
        if not initial_model:
            raise ValueError(f"No active model for user {user_id}")
        
        initial_model_version_id = initial_model.id
        
        print(f"Starting experiment {experiment_id}")
        print(f"User: {user_id}, Model: {initial_model_version_id}")
        print(f"Sessions: {n_sessions}, Drift: {drift_profile}")
        
        # Run static experiment
        print("Running STATIC experiment...")
        static_results = self.run_static_experiment(
            db=db,
            user_id=user_id,
            model_version_id=initial_model_version_id,
            n_sessions=n_sessions,
            samples_per_session=samples_per_session,
            impostor_ratio=impostor_ratio,
            drift_profile=drift_profile,
            base_pattern=base_pattern
        )
        
        # Run adaptive experiment
        print("Running ADAPTIVE experiment...")
        adaptive_results = self.run_adaptive_experiment(
            db=db,
            user_id=user_id,
            initial_model_version_id=initial_model_version_id,
            n_sessions=n_sessions,
            samples_per_session=samples_per_session,
            impostor_ratio=impostor_ratio,
            drift_profile=drift_profile,
            base_pattern=base_pattern
        )
        
        # Compute summary
        static_far = np.mean([r.far for r in static_results])
        static_frr = np.mean([r.frr for r in static_results])
        static_eer = np.mean([r.eer for r in static_results])
        static_acc = np.mean([r.accuracy for r in static_results])
        
        adaptive_far = np.mean([r.far for r in adaptive_results])
        adaptive_frr = np.mean([r.frr for r in adaptive_results])
        adaptive_eer = np.mean([r.eer for r in adaptive_results])
        adaptive_acc = np.mean([r.accuracy for r in adaptive_results])
        
        # Count adaptations
        n_adaptations = sum(1 for r in adaptive_results if r.adaptation_event)
        
        summary = {
            'static': {
                'mean_far': float(static_far),
                'mean_frr': float(static_frr),
                'mean_eer': float(static_eer),
                'mean_accuracy': float(static_acc)
            },
            'adaptive': {
                'mean_far': float(adaptive_far),
                'mean_frr': float(adaptive_frr),
                'mean_eer': float(adaptive_eer),
                'mean_accuracy': float(adaptive_acc)
            },
            'improvement': {
                'far_delta': float(adaptive_far - static_far),
                'frr_delta': float(adaptive_frr - static_frr),
                'eer_delta': float(adaptive_eer - static_eer),
                'accuracy_delta': float(adaptive_acc - static_acc)
            },
            'n_adaptations': sum(1 for r in adaptive_results if r.adaptation_event),
            'model_versions_used': len(set(r.model_version for r in adaptive_results))
        }
        
        result = ExperimentResult(
            experiment_id=f"exp_{user_id}_{drift_profile}_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            user_id=user_id,
            n_sessions=n_sessions,
            samples_per_session=samples_per_session,
            impostor_ratio=impostor_ratio,
            drift_profile=drift_profile,
            started_at=datetime.now().isoformat(),
            completed_at=datetime.now().isoformat(),
            static_results=static_results,
            adaptive_results=adaptive_results,
            summary=summary
        )
        
        # Save results
        self.save_results(result)
        
        return result
    
    def save_results(self, result: ExperimentResult):
        """Save experiment results to JSON."""
        output_file = self.output_dir / f"{result.experiment_id}.json"
        
        # Convert to serializable dict
        data = {
            'experiment_id': result.experiment_id,
            'user_id': result.user_id,
            'n_sessions': result.n_sessions,
            'samples_per_session': result.samples_per_session,
            'impostor_ratio': result.impostor_ratio,
            'drift_profile': result.drift_profile,
            'started_at': result.started_at,
            'completed_at': result.completed_at,
            'summary': result.summary,
            'static_results': [
                {
                    'session': r.session,
                    'model_version': r.model_version,
                    'strategy': r.strategy,
                    'far': r.far,
                    'frr': r.frr,
                    'eer': r.eer,
                    'accuracy': r.accuracy,
                    'precision': r.precision,
                    'recall': r.recall,
                    'f1': r.f1,
                    'n_legitimate': r.n_legitimate,
                    'n_impostor': r.n_impostor,
                    'adaptation_event': r.adaptation_event
                }
                for r in result.static_results
            ],
            'adaptive_results': [
                {
                    'session': r.session,
                    'model_version': r.model_version,
                    'strategy': r.strategy,
                    'far': r.far,
                    'frr': r.frr,
                    'eer': r.eer,
                    'accuracy': r.accuracy,
                    'precision': r.precision,
                    'recall': r.recall,
                    'f1': r.f1,
                    'n_legitimate': r.n_legitimate,
                    'n_impostor': r.n_impostor,
                    'adaptation_event': r.adaptation_event
                }
                for r in result.adaptive_results
            ],
            'summary': result.summary
        }
        
        with open(output_file, 'w') as f:
            json.dump(data, f, indent=2)
        
        print(f"Results saved to {output_file}")
        
        # Also save CSV for easy analysis
        self.save_csv(result)
    
    def save_csv(self, result: ExperimentResult):
        """Save results as CSV for analysis."""
        csv_file = self.output_dir / f"{result.experiment_id}.csv"
        
        with open(csv_file, 'w', newline='') as f:
            writer = csv.writer(f)
            writer.writerow([
                'experiment_id', 'session', 'strategy', 'model_version',
                'far', 'frr', 'eer', 'accuracy', 'precision', 'recall', 'f1',
                'n_legitimate', 'n_impostor', 'adaptation_event'
            ])
            
            for r in result.static_results:
                writer.writerow([
                    result.experiment_id, r.session, 'static', r.model_version,
                    r.far, r.frr, r.eer, r.accuracy, r.precision, r.recall, r.f1,
                    r.n_legitimate, r.n_impostor, r.adaptation_event or ''
                ])
            
            for r in result.adaptive_results:
                writer.writerow([
                    result.experiment_id, r.session, 'adaptive', r.model_version,
                    r.far, r.frr, r.eer, r.accuracy, r.precision, r.recall, r.f1,
                    r.n_legitimate, r.n_impostor, r.adaptation_event or ''
                ])
        
        print(f"CSV saved to {csv_file}")


# Convenience function
def run_experiment(
    db: Session,
    user_id: int,
    n_sessions: int = 30,
    samples_per_session: int = 10,
    impostor_ratio: float = 0.3,
    drift_profile: str = 'gradual'
) -> ExperimentResult:
    """Run a full comparison experiment."""
    service = ExperimentService()
    return service.run_comparison_experiment(
        db=db,
        user_id=user_id,
        n_sessions=n_sessions,
        samples_per_session=samples_per_session,
        impostor_ratio=impostor_ratio,
        drift_profile=drift_profile
    )


experiment_service = ExperimentService()