"""
Tests for Adaptive Model Evaluation & Promotion Rules.
Verifies should_promote_model enforcement:
- FAR_new <= FAR_current (strictly enforced)
- FRR_new <= FRR_current + epsilon (controlled usability tolerance)
"""

import pytest
from app.ml.evaluator import should_promote_model


def test_should_promote_model_success():
    """Candidate improves FAR and keeps FRR within epsilon tolerance."""
    current_metrics = {"far": 0.04, "frr": 0.05, "eer": 0.045}
    candidate_metrics = {"far": 0.03, "frr": 0.06, "eer": 0.040}  # FAR improved, FRR +0.01 <= 0.02
    
    promote, reason, comp = should_promote_model(
        current_metrics=current_metrics,
        candidate_metrics=candidate_metrics,
        epsilon=0.02
    )
    
    assert promote is True
    assert "Promoted" in reason
    assert comp["far_passed"] is True
    assert comp["frr_passed"] is True
    assert comp["candidate_far"] == 0.03


def test_should_reject_model_when_far_degrades():
    """Candidate degrades FAR (allows more impostors) -> MUST REJECT."""
    current_metrics = {"far": 0.02, "frr": 0.05}
    candidate_metrics = {"far": 0.04, "frr": 0.03}  # FAR degraded: 0.04 > 0.02
    
    promote, reason, comp = should_promote_model(
        current_metrics=current_metrics,
        candidate_metrics=candidate_metrics,
        epsilon=0.02
    )
    
    assert promote is False
    assert "FAR degradation detected" in reason
    assert comp["far_passed"] is False


def test_should_reject_model_when_frr_exceeds_epsilon():
    """Candidate degrades FRR beyond epsilon -> MUST REJECT."""
    current_metrics = {"far": 0.03, "frr": 0.04}
    candidate_metrics = {"far": 0.025, "frr": 0.08}  # FRR delta = +0.04 > epsilon 0.02
    
    promote, reason, comp = should_promote_model(
        current_metrics=current_metrics,
        candidate_metrics=candidate_metrics,
        epsilon=0.02
    )
    
    assert promote is False
    assert "FRR degradation exceeded tolerance" in reason
    assert comp["frr_passed"] is False


def test_should_promote_model_exact_threshold_boundary():
    """Candidate matches exact boundary of FAR and FRR + epsilon."""
    current_metrics = {"far": 0.03, "frr": 0.04}
    candidate_metrics = {"far": 0.03, "frr": 0.06}  # FRR delta = 0.02 == epsilon
    
    promote, reason, comp = should_promote_model(
        current_metrics=current_metrics,
        candidate_metrics=candidate_metrics,
        epsilon=0.02
    )
    
    assert promote is True
    assert comp["far_passed"] is True
    assert comp["frr_passed"] is True
