"""
Tests for Biometric Drift Measurement & Statistical Divergence Module.
Verifies standardized Mahalanobis-like distance and severity classification.
"""

import pytest
import numpy as np
from app.ml.drift import (
    calculate_feature_distance,
    classify_drift_severity,
    DriftSeverity,
    DRIFT_THRESHOLD_LOW,
    DRIFT_THRESHOLD_MODERATE
)


def test_classify_drift_severity_thresholds():
    assert classify_drift_severity(0.10) == DriftSeverity.LOW.value
    assert classify_drift_severity(0.34) == DriftSeverity.LOW.value
    assert classify_drift_severity(0.35) == DriftSeverity.MODERATE.value
    assert classify_drift_severity(0.55) == DriftSeverity.MODERATE.value
    assert classify_drift_severity(0.69) == DriftSeverity.MODERATE.value
    assert classify_drift_severity(0.70) == DriftSeverity.HIGH.value
    assert classify_drift_severity(0.95) == DriftSeverity.HIGH.value


def test_calculate_feature_distance_identical_features():
    centroid = np.array([100.0, 150.0, 80.0, 200.0])
    std_dev = np.array([10.0, 15.0, 8.0, 20.0])
    
    # Exactly matches baseline centroid
    sample_vec = np.copy(centroid)
    dist = calculate_feature_distance(sample_vec, centroid, std_dev)
    
    assert dist == 0.0
    assert classify_drift_severity(dist) == DriftSeverity.LOW.value


def test_calculate_feature_distance_slight_drift():
    centroid = np.array([100.0, 150.0, 80.0, 200.0])
    std_dev = np.array([10.0, 15.0, 8.0, 20.0])
    
    # 1.5 standard deviations shift
    sample_vec = centroid + 1.5 * std_dev
    dist = calculate_feature_distance(sample_vec, centroid, std_dev)
    
    assert 0.15 <= dist <= 0.65
    assert classify_drift_severity(dist) in [DriftSeverity.LOW.value, DriftSeverity.MODERATE.value]


def test_calculate_feature_distance_extreme_drift():
    centroid = np.array([100.0, 150.0, 80.0, 200.0])
    std_dev = np.array([10.0, 15.0, 8.0, 20.0])
    
    # 8 standard deviations shift (e.g. completely different typing speed / cadence)
    sample_vec = centroid + 8.0 * std_dev
    dist = calculate_feature_distance(sample_vec, centroid, std_dev)
    
    assert dist >= DRIFT_THRESHOLD_MODERATE
    assert classify_drift_severity(dist) == DriftSeverity.HIGH.value
