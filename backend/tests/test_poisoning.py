"""
Tests for Model Poisoning Defense & Sample Trust Verification.
Verifies:
- validate_sample_trust blocks unverified/low-confidence/anomalous samples
- Quarantined samples are excluded from candidate training pool
- simulate_poisoning_attack catches FAR degradation and prevents model contamination
"""

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base
from app.models import (
    User, TypingSample, AuthAttempt, AuthDecision, 
    ModelVersion, QuarantinedSample
)
from app.services.adaptive_service import adaptive_service


@pytest.fixture
def db_session():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool
    )
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = Session()

    user = User(username="poison_test_user", password_hash="pw", phrase="test phrase", is_active=True)
    session.add(user)
    session.commit()
    session.refresh(user)

    # Active baseline model
    model = ModelVersion(
        user_id=user.id,
        version=1,
        model_path="dummy_m1.pkl",
        training_samples_count=15,
        feature_schema={"features": ["f1", "f2"]},
        training_config={"algorithm": "one_class_svm"},
        metrics={"far": 0.02, "frr": 0.035, "eer": 0.025},
        is_active=True,
        status="ACTIVE"
    )
    session.add(model)
    session.commit()

    yield session, user, model

    session.close()
    engine.dispose()


def test_validate_sample_trust_blocks_low_confidence(db_session):
    session, user, model = db_session

    sample = TypingSample(
        user_id=user.id,
        source="auth",
        sample_quality="high",
        phrase_typed="test phrase",
        raw_timestamps=[{"key": "a", "press_time": 100, "release_time": 180}]
    )
    session.add(sample)
    session.commit()

    auth = AuthAttempt(
        user_id=user.id,
        sample_id=sample.id,
        model_version_id=model.id,
        score=0.52,
        decision=AuthDecision.allow
    )
    session.add(auth)
    session.commit()

    # Borderline low score (0.52 < 0.60)
    trusted, reason = adaptive_service.validate_sample_trust(
        db=session,
        user_id=user.id,
        sample=sample,
        auth_attempt=auth,
        score=0.52
    )

    assert trusted is False
    assert "below minimum adaptation confidence threshold" in reason


def test_validate_sample_trust_blocks_unverified_challenge(db_session):
    session, user, model = db_session

    sample = TypingSample(
        user_id=user.id,
        source="auth",
        sample_quality="high",
        phrase_typed="test phrase",
        raw_timestamps=[{"key": "a", "press_time": 100, "release_time": 180}]
    )
    session.add(sample)
    session.commit()

    # CHALLENGE attempt without passed 2FA
    auth = AuthAttempt(
        user_id=user.id,
        sample_id=sample.id,
        model_version_id=model.id,
        score=0.68,
        decision=AuthDecision.challenge,
        challenge_passed=False
    )
    session.add(auth)
    session.commit()

    trusted, reason = adaptive_service.validate_sample_trust(
        db=session,
        user_id=user.id,
        sample=sample,
        auth_attempt=auth,
        score=0.68
    )

    assert trusted is False
    assert "CHALLENGE sample lacks verified 2FA" in reason


def test_validate_sample_trust_accepts_high_confidence(db_session):
    session, user, model = db_session

    sample = TypingSample(
        user_id=user.id,
        source="auth",
        sample_quality="high",
        phrase_typed="test phrase",
        raw_timestamps=[{"key": "a", "press_time": 100, "release_time": 180}]
    )
    session.add(sample)
    session.commit()

    auth = AuthAttempt(
        user_id=user.id,
        sample_id=sample.id,
        model_version_id=model.id,
        score=0.88,
        decision=AuthDecision.allow
    )
    session.add(auth)
    session.commit()

    trusted, reason = adaptive_service.validate_sample_trust(
        db=session,
        user_id=user.id,
        sample=sample,
        auth_attempt=auth,
        score=0.88
    )

    assert trusted is True
    assert reason == "Trusted"


def test_simulate_poisoning_attack_defense(db_session):
    session, user, model = db_session

    res = adaptive_service.simulate_poisoning_attack(
        db=session,
        user_id=user.id,
        n_contaminated=6
    )

    assert res["result"] == "REJECTED"
    assert "FAR degradation detected" in res["reason"]
    assert res["active_model_retained"] == f"M{model.version}"
    assert res["candidate_far_percent"] > res["current_far_percent"]
