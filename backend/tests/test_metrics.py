"""
Tests for Biometric Metrics Evaluation: FAR, FRR, EER, ROC-AUC, and Threshold Sweeps.
"""

import pytest
import numpy as np
from app.ml.evaluator import (
    compute_far_frr,
    compute_eer,
    evaluate_biometric_model,
    EvaluationMetrics
)


def test_compute_far_frr_basic():
    legit_scores = np.array([0.80, 0.85, 0.90, 0.70])
    imp_scores = np.array([0.20, 0.30, 0.40, 0.65])
    
    # At threshold 0.75:
    # Impostors >= 0.75: 0/4 -> FAR = 0.0
    # Legitimate < 0.75: 1/4 (0.70) -> FRR = 0.25
    far, frr = compute_far_frr(legit_scores, imp_scores, threshold=0.75)
    assert far == 0.0
    assert frr == 0.25

    # At threshold 0.50:
    # Impostors >= 0.50: 1/4 (0.65) -> FAR = 0.25
    # Legitimate < 0.50: 0/4 -> FRR = 0.0
    far, frr = compute_far_frr(legit_scores, imp_scores, threshold=0.50)
    assert far == 0.25
    assert frr == 0.0


def test_compute_eer_perfect_separation():
    # Perfectly separated scores: legit in [0.7, 0.9], impostors in [0.1, 0.3]
    legit_scores = np.array([0.70, 0.80, 0.85, 0.90, 0.95])
    imp_scores = np.array([0.10, 0.15, 0.20, 0.25, 0.30])

    eer, threshold_at_eer = compute_eer(legit_scores, imp_scores)
    assert eer == 0.0
    assert 0.30 <= threshold_at_eer <= 0.70


def test_evaluate_biometric_model_comprehensive():
    # Synthesize realistic score distributions
    rng = np.random.default_rng(42)
    legit = rng.normal(loc=0.82, scale=0.08, size=100)
    legit = np.clip(legit, 0.0, 1.0)
    
    impostor = rng.normal(loc=0.28, scale=0.10, size=100)
    impostor = np.clip(impostor, 0.0, 1.0)

    result = evaluate_biometric_model(
        legitimate_scores=legit,
        impostor_scores=impostor,
        thresholds=[0.35, 0.45, 0.55, 0.65, 0.75]
    )

    # 1. Top-level keys
    assert "eer" in result
    assert "auc" in result
    assert "threshold_at_eer" in result
    assert "threshold_evaluations" in result
    assert "roc_curve" in result
    assert "eer_point" in result

    # 2. Metric boundaries
    assert 0.0 <= result["eer"] <= 1.0
    assert 0.85 <= result["auc"] <= 1.0  # Well-separated distributions have high AUC
    assert result["n_legitimate"] == 100
    assert result["n_impostor"] == 100

    # 3. Monotonic behavior of thresholds
    evals = result["threshold_evaluations"]
    assert len(evals) == 5
    fars = [e["far"] for e in evals]
    frrs = [e["frr"] for e in evals]

    # As threshold increases:
    # FAR must be non-increasing (harder for impostor to pass)
    # FRR must be non-decreasing (harder for legit to pass)
    for i in range(len(fars) - 1):
        assert fars[i] >= fars[i + 1]
        assert frrs[i] <= frrs[i + 1]

    # 4. ROC curve structure
    roc_points = result["roc_curve"]
    assert len(roc_points) > 0
    for pt in roc_points:
        assert "fpr" in pt
        assert "tpr" in pt
        assert "far" in pt
        assert "frr" in pt
        assert "threshold" in pt


def test_evaluate_biometric_model_empty_graceful():
    result = evaluate_biometric_model([], [])
    assert result["eer"] == 0.0
    assert result["n_legitimate"] == 0
    assert result["n_impostor"] == 0
    assert len(result["threshold_evaluations"]) == 0
