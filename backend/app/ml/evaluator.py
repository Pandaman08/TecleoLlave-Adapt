"""
Model evaluation module for TECLEOLLAVE-ADAPT.
Computes FAR, FRR, EER, and other metrics for authentication.
"""

from typing import Dict, List, Tuple, Optional,Any, Dict
import numpy as np
from sklearn.metrics import (
    roc_curve, auc, accuracy_score, precision_score,
    recall_score, f1_score, confusion_matrix
)
from dataclasses import dataclass


@dataclass
class EvaluationMetrics:
    """Container for evaluation metrics."""
    far: float
    frr: float
    eer: float
    accuracy: float
    precision: float
    recall: float
    f1: float
    auc_roc: float
    threshold_at_eer: float
    n_legitimate: int
    n_impostor: int


def compute_far_frr(
    legitimate_scores: np.ndarray,
    impostor_scores: np.ndarray,
    threshold: float
) -> Tuple[float, float]:
    """
    Compute FAR and FRR at a given threshold.

    FAR = P(score >= threshold | impostor) = False Accept Rate
    FRR = P(score < threshold | legitimate) = False Reject Rate
    """
    if len(impostor_scores) == 0:
        far = 0.0
    else:
        far = np.mean(impostor_scores >= threshold)

    if len(legitimate_scores) == 0:
        frr = 0.0
    else:
        frr = np.mean(legitimate_scores < threshold)

    return far, frr


def compute_eer(
    legitimate_scores: np.ndarray,
    impostor_scores: np.ndarray
) -> Tuple[float, float]:
    """
    Compute Equal Error Rate (EER) and threshold at EER.

    Returns: (eer, threshold_at_eer)
    """
    if len(legitimate_scores) == 0 or len(impostor_scores) == 0:
        return 0.0, 0.5

    # Combine scores and labels
    y_scores = np.concatenate([legitimate_scores, impostor_scores])
    y_true = np.concatenate([
        np.ones(len(legitimate_scores)),
        np.zeros(len(impostor_scores))
    ])

    # Compute ROC curve
    fpr, tpr, thresholds = roc_curve(y_true, y_scores)

    # FAR = FPR, FRR = 1 - TPR
    far = fpr
    frr = 1 - tpr

    # Find threshold where FAR ≈ FRR
    diff = np.abs(far - frr)
    eer_idx = np.argmin(diff)

    eer = (far[eer_idx] + frr[eer_idx]) / 2
    threshold_at_eer = thresholds[eer_idx]

    return float(eer), float(threshold_at_eer)


def evaluate_authentication(
    legitimate_scores: np.ndarray,
    impostor_scores: np.ndarray,
    threshold_allow: float = 0.85,
    threshold_challenge: float = 0.70,
    threshold_reject: float = 0.60
) -> EvaluationMetrics:
    """
    Comprehensive evaluation of authentication performance.
    """
    # Compute EER
    eer, threshold_eer = compute_eer(legitimate_scores, impostor_scores)

    # FAR/FRR at allow threshold
    far, frr = compute_far_frr(legitimate_scores, impostor_scores, threshold_allow)

    # Binary predictions at allow threshold
    y_scores = np.concatenate([legitimate_scores, impostor_scores])
    y_true = np.concatenate([
        np.ones(len(legitimate_scores)),
        np.zeros(len(impostor_scores))
    ])
    y_pred = (y_scores >= threshold_allow).astype(int)

    # Standard metrics
    accuracy = accuracy_score(y_true, y_pred)
    precision = precision_score(y_true, y_pred, zero_division=0)
    recall = recall_score(y_true, y_pred, zero_division=0)
    f1 = f1_score(y_true, y_pred, zero_division=0)

    # AUC
    try:
        auc_roc = auc(*roc_curve(y_true, y_scores)[:2])
    except:
        auc_roc = 0.5

    return EvaluationMetrics(
        far=float(far),
        frr=float(frr),
        eer=float(eer),
        accuracy=float(accuracy),
        precision=float(precision),
        recall=float(recall),
        f1=float(f1),
        auc_roc=float(auc_roc),
        threshold_at_eer=float(threshold_eer),
        n_legitimate=len(legitimate_scores),
        n_impostor=len(impostor_scores)
    )


def evaluate_model_comparison(
    old_metrics: Dict[str, float],
    new_metrics: Dict[str, float],
    config: Dict[str, Any]
) -> Tuple[bool, Dict[str, Any]]:
    """
    Compare two models based on acceptance criteria.

    Returns: (accepted, comparison_details)
    """
    # Security constraints (HARD - must all pass)
    far_ok = new_metrics.get('far', 1.0) <= old_metrics.get('far', 1.0) + config.get('max_far_degradation', 0.0)
    frr_ok = new_metrics.get('frr', 1.0) <= old_metrics.get('frr', 1.0) + config.get('max_frr_degradation', 0.02)
    eer_ok = new_metrics.get('eer', 1.0) <= old_metrics.get('eer', 1.0) + config.get('max_eer_degradation', 0.0)

    # Performance constraints (SOFT)
    precision_ok = new_metrics.get('precision', 0.0) >= old_metrics.get('precision', 0.0) + config.get('min_precision_delta', -0.01)
    recall_ok = new_metrics.get('recall', 0.0) >= old_metrics.get('recall', 0.0) + config.get('min_recall_delta', -0.01)

    hard_constraints = [far_ok, frr_ok, eer_ok]
    soft_constraints = [precision_ok, recall_ok]

    require_all = config.get('require_all_constraints', True)

    if require_all:
        accepted = all(hard_constraints) and all(soft_constraints)
    else:
        accepted = all(hard_constraints) and any(soft_constraints)

    comparison = {
        'hard_constraints': {
            'far': {'old': old_metrics.get('far'), 'new': new_metrics.get('far'), 'ok': far_ok, 'max_degradation': config.get('max_far_degradation', 0.0)},
            'frr': {'old': old_metrics.get('frr'), 'new': new_metrics.get('frr'), 'ok': frr_ok, 'max_degradation': config.get('max_frr_degradation', 0.02)},
            'eer': {'old': old_metrics.get('eer'), 'new': new_metrics.get('eer'), 'ok': eer_ok, 'max_degradation': config.get('max_eer_degradation', 0.0)},
        },
        'soft_constraints': {
            'precision': {'old': old_metrics.get('precision'), 'new': new_metrics.get('precision'), 'ok': precision_ok, 'min_delta': config.get('min_precision_delta', -0.01)},
            'recall': {'old': old_metrics.get('recall'), 'new': new_metrics.get('recall'), 'ok': recall_ok, 'min_delta': config.get('min_recall_delta', -0.01)},
        },
        'accepted': accepted,
        'require_all_constraints': require_all
    }

    return accepted, comparison


def should_promote_model(
    current_metrics: Dict[str, Any],
    candidate_metrics: Dict[str, Any],
    epsilon: float = 0.02
) -> Tuple[bool, str, Dict[str, Any]]:
    """
    Decisión formal de promoción del modelo adaptativo (Hold-Out Validation).
    
    Criterio de Seguridad y Usabilidad:
    1. FAR_new <= FAR_current (La seguridad biométrica NUNCA debe degradarse)
    2. FRR_new <= FRR_current + epsilon (La usabilidad se mantiene dentro de tolerancia)
    
    Returns:
        (promote, reason, details)
        promote: True -> PROMOTE, False -> REJECT
    """
    cur_far = float(current_metrics.get('far', current_metrics.get('far_at_allow', 0.0)))
    cand_far = float(candidate_metrics.get('far', candidate_metrics.get('far_at_allow', 0.0)))

    cur_frr = float(current_metrics.get('frr', current_metrics.get('frr_at_allow', 0.0)))
    cand_frr = float(candidate_metrics.get('frr', candidate_metrics.get('frr_at_allow', 0.0)))

    cur_eer = float(current_metrics.get('eer', 0.0))
    cand_eer = float(candidate_metrics.get('eer', 0.0))

    far_ok = cand_far <= (cur_far + 1e-6)
    frr_ok = cand_frr <= (cur_frr + epsilon + 1e-6)

    details = {
        "current_far": round(cur_far, 4),
        "candidate_far": round(cand_far, 4),
        "current_frr": round(cur_frr, 4),
        "candidate_frr": round(cand_frr, 4),
        "current_eer": round(cur_eer, 4),
        "candidate_eer": round(cand_eer, 4),
        "epsilon": round(float(epsilon), 4),
        "far_passed": far_ok,
        "frr_passed": frr_ok
    }

    if not far_ok:
        reason = (
            f"FAR degradation detected: Candidate FAR ({(cand_far*100):.2f}%) exceeds "
            f"Current FAR ({(cur_far*100):.2f}%). Security policy violated."
        )
        return False, reason, details

    if not frr_ok:
        reason = (
            f"FRR degradation exceeded tolerance: Candidate FRR ({(cand_frr*100):.2f}%) exceeds "
            f"allowable limit (Current FRR {(cur_frr*100):.2f}% + ε {(epsilon*100):.2f}%)."
        )
        return False, reason, details

    reason = (
        f"Promoted: Candidate preserves security (FAR {(cand_far*100):.2f}% <= {(cur_far*100):.2f}%) "
        f"and usability (FRR {(cand_frr*100):.2f}% <= {(cur_frr*100):.2f}% + {(epsilon*100):.2f}%)."
    )
    return True, reason, details



def compute_metrics_from_predictions(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    y_scores: np.ndarray
) -> Dict[str, float]:
    """Compute all metrics from predictions and scores."""
    from sklearn.metrics import (
        accuracy_score, precision_score, recall_score, f1_score,
        roc_auc_score, confusion_matrix
    )

    metrics = {}

    try:
        metrics['accuracy'] = float(accuracy_score(y_true, y_pred))
    except:
        metrics['accuracy'] = 0.0

    try:
        metrics['precision'] = float(precision_score(y_true, y_pred, zero_division=0))
    except:
        metrics['precision'] = 0.0

    try:
        metrics['recall'] = float(recall_score(y_true, y_pred, zero_division=0))
    except:
        metrics['recall'] = 0.0

    try:
        metrics['f1'] = float(f1_score(y_true, y_pred, zero_division=0))
    except:
        metrics['f1'] = 0.0

    try:
        metrics['auc'] = float(roc_auc_score(y_true, y_scores))
    except:
        metrics['auc'] = 0.5

    try:
        tn, fp, fn, tp = confusion_matrix(y_true, y_pred).ravel()
        metrics['far'] = float(fp / (fp + tn)) if (fp + tn) > 0 else 0.0
        metrics['frr'] = float(fn / (fn + tp)) if (fn + tp) > 0 else 0.0
    except:
        metrics['far'] = 0.0
        metrics['frr'] = 0.0

    # EER
    try:
        legitimate_scores = y_scores[y_true == 1]
        impostor_scores = y_scores[y_true == 0]
        if len(legitimate_scores) > 0 and len(impostor_scores) > 0:
            eer, _ = compute_eer(legitimate_scores, impostor_scores)
            metrics['eer'] = float(eer)
        else:
            metrics['eer'] = 0.5
    except:
        metrics['eer'] = 0.5

    return metrics


def evaluate_biometric_model(
    legitimate_scores: Any,
    impostor_scores: Any,
    thresholds: Optional[List[float]] = None
) -> Dict[str, Any]:
    """
    Función integral y reutilizable de evaluación biométrica.
    Calcula métricas globales y por umbral a partir de puntuaciones reales:
    - FAR, FRR, EER, ROC-AUC
    - Accuracy, Precision, Recall, F1, TPR, FPR en cada threshold
    - Puntos de la curva ROC (FPR vs TPR / FAR vs FRR)
    """
    legit = np.asarray(legitimate_scores, dtype=np.float64).ravel()
    imp = np.asarray(impostor_scores, dtype=np.float64).ravel()

    n_legit = len(legit)
    n_imp = len(imp)

    if n_legit == 0 or n_imp == 0:
        return {
            "eer": 0.0,
            "threshold_at_eer": 0.5,
            "auc": 0.5,
            "n_legitimate": n_legit,
            "n_impostor": n_imp,
            "threshold_evaluations": [],
            "roc_curve": [],
            "eer_point": {"threshold": 0.5, "far": 0.0, "frr": 0.0}
        }

    # EER y ROC-AUC global
    eer, threshold_at_eer = compute_eer(legit, imp)

    y_true = np.concatenate([np.ones(n_legit), np.zeros(n_imp)])
    y_scores = np.concatenate([legit, imp])

    try:
        fpr_arr, tpr_arr, roc_thresholds = roc_curve(y_true, y_scores)
        roc_auc = float(auc(fpr_arr, tpr_arr))
    except Exception:
        fpr_arr, tpr_arr, roc_thresholds = np.array([0.0, 1.0]), np.array([0.0, 1.0]), np.array([1.0, 0.0])
        roc_auc = 0.5

    # Puntos ordenados para la curva ROC
    roc_points = []
    for f, t, th in zip(fpr_arr, tpr_arr, roc_thresholds):
        roc_points.append({
            "fpr": round(float(f), 4),
            "tpr": round(float(t), 4),
            "far": round(float(f), 4),
            "frr": round(float(1.0 - t), 4),
            "threshold": round(float(th), 4)
        })

    # Umbrales a evaluar
    if thresholds is None:
        thresholds = [0.35, 0.45, 0.50, 0.55, 0.65, 0.70, 0.75, 0.85]

    evaluations_by_threshold = []
    for th in sorted(thresholds):
        far_val = float(np.mean(imp >= th)) if n_imp > 0 else 0.0
        frr_val = float(np.mean(legit < th)) if n_legit > 0 else 0.0
        tpr_val = float(1.0 - frr_val)
        fpr_val = float(far_val)

        y_pred = (y_scores >= th).astype(int)
        acc = float(accuracy_score(y_true, y_pred))
        prec = float(precision_score(y_true, y_pred, zero_division=0))
        rec = float(recall_score(y_true, y_pred, zero_division=0))
        f1_val = float(f1_score(y_true, y_pred, zero_division=0))

        evaluations_by_threshold.append({
            "threshold": round(float(th), 3),
            "far": round(far_val, 4),
            "frr": round(frr_val, 4),
            "far_percent": round(far_val * 100, 2),
            "frr_percent": round(frr_val * 100, 2),
            "tpr": round(tpr_val, 4),
            "fpr": round(fpr_val, 4),
            "accuracy": round(acc, 4),
            "precision": round(prec, 4),
            "recall": round(rec, 4),
            "f1": round(f1_val, 4)
        })

    # Punto exacto de EER
    far_at_eer, frr_at_eer = compute_far_frr(legit, imp, threshold_at_eer)

    return {
        "eer": round(float(eer), 4),
        "eer_percent": round(float(eer) * 100, 2),
        "threshold_at_eer": round(float(threshold_at_eer), 4),
        "auc": round(float(roc_auc), 4),
        "n_legitimate": n_legit,
        "n_impostor": n_imp,
        "eer_point": {
            "threshold": round(float(threshold_at_eer), 4),
            "far": round(float(far_at_eer), 4),
            "frr": round(float(frr_at_eer), 4),
            "far_percent": round(float(far_at_eer) * 100, 2),
            "frr_percent": round(float(frr_at_eer) * 100, 2)
        },
        "threshold_evaluations": evaluations_by_threshold,
        "roc_curve": roc_points
    }