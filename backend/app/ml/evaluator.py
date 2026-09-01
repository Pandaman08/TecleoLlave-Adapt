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