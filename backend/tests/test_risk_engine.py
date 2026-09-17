"""
Tests for 3-Zone Risk Decision Engine (ACCEPT, CHALLENGE, REJECT).
"""

import pytest
from app.ml.risk_engine import RiskDecisionEngine, RiskZone


def test_risk_engine_accept():
    # score >= threshold_high (0.75) -> ACCEPT (allow)
    result = RiskDecisionEngine.evaluate(score=0.85, threshold_low=0.45, threshold_high=0.75)
    assert result["decision"] == RiskZone.ACCEPT.value
    assert result["zone"] == "allow"
    assert result["requires_2fa"] is False
    assert result["is_authorized"] is True


def test_risk_engine_challenge():
    # threshold_low <= score < threshold_high -> CHALLENGE
    result = RiskDecisionEngine.evaluate(score=0.62, threshold_low=0.45, threshold_high=0.75)
    assert result["decision"] == RiskZone.CHALLENGE.value
    assert result["zone"] == "challenge"
    assert result["requires_2fa"] is True
    assert result["is_authorized"] is False


def test_risk_engine_reject():
    # score < threshold_low -> REJECT
    result = RiskDecisionEngine.evaluate(score=0.30, threshold_low=0.45, threshold_high=0.75)
    assert result["decision"] == RiskZone.REJECT.value
    assert result["zone"] == "reject"
    assert result["requires_2fa"] is False
    assert result["is_authorized"] is False


def test_risk_engine_exact_boundaries():
    # Exactly on high boundary -> ACCEPT
    res_high = RiskDecisionEngine.evaluate(score=0.75, threshold_low=0.45, threshold_high=0.75)
    assert res_high["decision"] == RiskZone.ACCEPT.value

    # Exactly on low boundary -> CHALLENGE
    res_low = RiskDecisionEngine.evaluate(score=0.45, threshold_low=0.45, threshold_high=0.75)
    assert res_low["decision"] == RiskZone.CHALLENGE.value

    # Just below low boundary -> REJECT
    res_below = RiskDecisionEngine.evaluate(score=0.449, threshold_low=0.45, threshold_high=0.75)
    assert res_below["decision"] == RiskZone.REJECT.value


def test_risk_engine_threshold_validation():
    assert RiskDecisionEngine.validate_thresholds(0.40, 0.70) is True
    assert RiskDecisionEngine.validate_thresholds(0.70, 0.40) is False  # low > high
    assert RiskDecisionEngine.validate_thresholds(-0.1, 0.5) is False   # negative
    assert RiskDecisionEngine.validate_thresholds(0.5, 1.2) is False    # > 1.0
