"""
Biometric Drift Measurement Module for TECLEOLLAVE-ADAPT.
Quantifies statistical divergence in keystroke dynamics patterns over time
relative to the initial baseline (M0).

DISCLAIMER:
Biometric drift is a natural statistical phenomenon arising from keyboard changes,
familiarity, posture, typing speed variations, and fatigue. It is strictly a behavioral
statistical metric and does NOT represent any medical condition, illness, or impairment.
"""

from enum import Enum
from typing import Dict, Any, List, Optional, Tuple
import numpy as np
from sqlalchemy.orm import Session
from datetime import datetime

from app.models import User, ModelVersion, TypingSample, TypingFeature, AuthAttempt


class DriftSeverity(str, Enum):
    LOW = "LOW DRIFT"
    MODERATE = "MODERATE DRIFT"
    HIGH = "HIGH DRIFT"


# Umbrales estadísticos de deriva conductual
DRIFT_THRESHOLD_LOW = 0.35
DRIFT_THRESHOLD_MODERATE = 0.70


def compute_baseline_profile(
    db: Session,
    user_id: int
) -> Tuple[Optional[np.ndarray], Optional[np.ndarray], int]:
    """
    Calcula el centroide y la desviación estándar del perfil baseline M0 (muestras de enrolamiento).
    """
    enrollment_samples = db.query(TypingSample).filter(
        TypingSample.user_id == user_id,
        TypingSample.source == "enrollment",
        TypingSample.is_validated == True
    ).all()

    if not enrollment_samples:
        return None, None, 0

    sample_ids = [s.id for s in enrollment_samples]
    features = db.query(TypingFeature.feature_vector).filter(
        TypingFeature.sample_id.in_(sample_ids)
    ).all()

    vectors = [f[0] for f in features if f and f[0]]
    if not vectors:
        return None, None, 0

    X = np.array(vectors, dtype=np.float64)
    centroid = np.mean(X, axis=0)
    std_dev = np.std(X, axis=0)
    std_dev = np.maximum(std_dev, np.abs(centroid) * 0.05 + 1e-4)

    return centroid, std_dev, len(vectors)


def calculate_feature_distance(
    feature_vector: np.ndarray,
    baseline_centroid: np.ndarray,
    baseline_std: np.ndarray
) -> float:
    """
    Calcula la distancia estadística estandarizada (Normalized Mahalanobis-like Distance)
    entre un vector de características y el centroide del baseline M0.
    """
    vec = np.asarray(feature_vector, dtype=np.float64).ravel()
    diff = np.abs(vec - baseline_centroid)
    norm_diff = diff / baseline_std
    # Media armónica/geométrica ponderada acotada
    raw_distance = float(np.median(norm_diff) * 0.5 + np.mean(norm_diff) * 0.5)
    # Escalamiento para referencia comprensible [0.0, 1.0+]
    drift_score = float(np.tanh(raw_distance / 3.0))
    return round(drift_score, 4)


def classify_drift_severity(drift_score: float) -> str:
    """
    Clasifica el estado de drift según umbrales estandarizados.
    """
    if drift_score < DRIFT_THRESHOLD_LOW:
        return DriftSeverity.LOW.value
    elif drift_score < DRIFT_THRESHOLD_MODERATE:
        return DriftSeverity.MODERATE.value
    else:
        return DriftSeverity.HIGH.value


def evaluate_user_biometric_drift(
    db: Session,
    user_id: int,
    limit: int = 20
) -> Dict[str, Any]:
    """
    Evalúa la deriva biométrica integral del usuario respecto a su modelo baseline M0.
    Registra: sample_date, user_id, model_version, score, typing_speed,
    hold_time_mean, flight_time_mean, feature_distance.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise ValueError(f"Usuario {user_id} no encontrado")

    centroid, std_dev, n_baseline = compute_baseline_profile(db, user_id)
    if centroid is None or n_baseline == 0:
        return {
            "baseline": "M0 (No disponible)",
            "user_id": user_id,
            "username": user.username,
            "current_drift_score": 0.0,
            "status": DriftSeverity.LOW.value,
            "thresholds": {"low": DRIFT_THRESHOLD_LOW, "moderate": DRIFT_THRESHOLD_MODERATE},
            "n_baseline_samples": 0,
            "recent_samples": [],
            "message": "El usuario aún no tiene muestras de enrolamiento base para calcular deriva."
        }

    # Obtener intentos recientes autenticados del usuario
    attempts = db.query(AuthAttempt).filter(
        AuthAttempt.user_id == user_id
    ).order_by(AuthAttempt.created_at.desc()).limit(limit).all()

    recent_drift_records = []
    distances = []

    for att in reversed(attempts):
        if not att.sample_id:
            continue
        feat = db.query(TypingFeature).filter(TypingFeature.sample_id == att.sample_id).first()
        sample = db.query(TypingSample).filter(TypingSample.id == att.sample_id).first()
        if not feat or not feat.feature_vector:
            continue

        vec = np.array(feat.feature_vector, dtype=np.float64)
        dist = calculate_feature_distance(vec, centroid, std_dev)
        distances.append(dist)

        # Extraer métricas clave según el esquema
        wpm = float(vec[26]) if len(vec) > 26 else 0.0
        hold_mean = float(vec[27]) if len(vec) > 27 else float(np.mean(vec[:35]))
        flight_mean = float(vec[39]) if len(vec) > 39 else float(np.mean(vec[35:69]))

        model_ver_str = f"M{att.model_version_id}" if att.model_version_id else "M0"

        recent_drift_records.append({
            "sample_id": sample.id if sample else 0,
            "sample_date": (att.created_at or datetime.utcnow()).isoformat(),
            "user_id": user_id,
            "model_version": model_ver_str,
            "score": round(float(att.score), 4),
            "typing_speed": round(wpm, 1),
            "hold_time_mean": round(hold_mean, 1),
            "flight_time_mean": round(flight_mean, 1),
            "feature_distance": dist,
            "decision": att.decision.value if hasattr(att.decision, "value") else str(att.decision)
        })

    # Si no hay intentos de auth, evaluar las muestras baseline entre sí
    if distances:
        current_drift = float(np.mean(distances[-3:])) if len(distances) >= 3 else float(distances[-1])
    else:
        current_drift = 0.0

    current_drift = round(current_drift, 4)
    status = classify_drift_severity(current_drift)

    return {
        "baseline": "M0",
        "user_id": user_id,
        "username": user.username,
        "current_drift_score": current_drift,
        "status": status,
        "thresholds": {
            "low": DRIFT_THRESHOLD_LOW,
            "moderate": DRIFT_THRESHOLD_MODERATE
        },
        "n_baseline_samples": n_baseline,
        "recent_samples": recent_drift_records,
        "disclaimer": (
            "El Biometric Drift mide fluctuaciones estadísticas de cadencia y velocidad de tecleo "
            "(ej. fatiga, hábito, teclado distinto). No constituye un diagnóstico ni estado médico."
        )
    }
