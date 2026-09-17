"""
Tests for Rate Limiting & Biometric Data Privacy Retention.
Verifies:
- SlidingWindowRateLimiter enforces request limits and retry cooldowns
- purge_expired_raw_biometrics purges sensitive raw keystroke event streams
  older than retention_days, preserving feature vectors and privacy.
"""

import pytest
from datetime import datetime, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base
from app.models import User, TypingSample
from app.utils.rate_limiter import SlidingWindowRateLimiter
from app.services.security_service import security_service


def test_sliding_window_rate_limiter():
    limiter = SlidingWindowRateLimiter()
    key = "test_client_ip:endpoint"

    # Allow 3 requests per 5-second window
    assert limiter.is_allowed(key, max_requests=3, window_seconds=5)[0] is True
    assert limiter.is_allowed(key, max_requests=3, window_seconds=5)[0] is True
    assert limiter.is_allowed(key, max_requests=3, window_seconds=5)[0] is True

    # 4th request must be rejected
    allowed, retry_after = limiter.is_allowed(key, max_requests=3, window_seconds=5)
    assert allowed is False
    assert retry_after >= 1

    # Reset clears tracking
    limiter.reset(key)
    assert limiter.is_allowed(key, max_requests=3, window_seconds=5)[0] is True


@pytest.fixture
def privacy_db():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool
    )
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = Session()

    user = User(username="privacy_user", password_hash="pw", phrase="test phrase", is_active=True)
    session.add(user)
    session.commit()
    session.refresh(user)

    # Sample 1: Old (100 days ago) -> should be purged
    old_sample = TypingSample(
        user_id=user.id,
        source="auth",
        sample_quality="high",
        phrase_typed="test phrase",
        raw_timestamps=[{"key": "t", "press_time": 10, "release_time": 90}],
        created_at=datetime.utcnow() - timedelta(days=100)
    )
    session.add(old_sample)

    # Sample 2: Recent (10 days ago) -> should be kept
    recent_sample = TypingSample(
        user_id=user.id,
        source="auth",
        sample_quality="high",
        phrase_typed="test phrase",
        raw_timestamps=[{"key": "a", "press_time": 20, "release_time": 110}],
        created_at=datetime.utcnow() - timedelta(days=10)
    )
    session.add(recent_sample)
    session.commit()

    yield session, old_sample, recent_sample

    session.close()
    engine.dispose()


def test_biometric_data_retention_purge(privacy_db):
    session, old_sample, recent_sample = privacy_db

    status_before = security_service.get_retention_status(session, retention_days=90)
    assert status_before["total_samples"] == 2
    assert status_before["expired_samples_pending_purge"] == 1

    # Purge samples older than 90 days
    purge_res = security_service.purge_expired_raw_biometrics(session, retention_days=90)
    assert purge_res["purged_count"] == 1

    session.refresh(old_sample)
    session.refresh(recent_sample)

    # Old sample has its raw timestamps wiped
    assert old_sample.raw_timestamps == []

    # Recent sample still retains its raw timestamps
    assert len(recent_sample.raw_timestamps) == 1

    # Status after purge
    status_after = security_service.get_retention_status(session, retention_days=90)
    assert status_after["expired_samples_pending_purge"] == 0
