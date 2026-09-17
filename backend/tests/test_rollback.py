"""
Tests for Model Rollback & Versioning State Transitions.
Verifies:
- Reverting active model Mt to M(t-1)
- ModelVersion status updates (ACTIVE -> ROLLED_BACK, target -> ACTIVE)
- AdaptationEvent audit trail generation
"""

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base
from app.models import User, ModelVersion, AdaptationEvent, AdaptationAction
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

    # Seed User, M1 (historical), M2 (current active)
    user = User(username="rollback_test_user", password_hash="pw", phrase="test phrase", is_active=True)
    session.add(user)
    session.commit()
    session.refresh(user)

    m1 = ModelVersion(
        user_id=user.id,
        version=1,
        model_path="dummy_m1.pkl",
        training_samples_count=15,
        feature_schema={"features": ["f1", "f2"]},
        training_config={"algorithm": "one_class_svm"},
        metrics={"far": 0.02, "frr": 0.04, "eer": 0.03},
        is_active=False,
        status="ACTIVE"
    )
    session.add(m1)
    session.commit()
    session.refresh(m1)

    m2 = ModelVersion(
        user_id=user.id,
        version=2,
        model_path="dummy_m2.pkl",
        training_samples_count=20,
        feature_schema={"features": ["f1", "f2"]},
        training_config={"algorithm": "one_class_svm"},
        metrics={"far": 0.035, "frr": 0.04, "eer": 0.038},
        is_active=True,
        status="ACTIVE"
    )
    session.add(m2)
    session.commit()
    session.refresh(m2)

    yield session, user, m1, m2

    session.close()
    engine.dispose()


def test_rollback_model_success(db_session):
    session, user, m1, m2 = db_session

    result = adaptive_service.rollback_model(
        db=session,
        user_id=user.id,
        target_model_id=m1.id,
        admin_username="admin_sec",
        reason="Detected anomalous behavioral shift"
    )

    assert result["success"] is True
    assert result["rollback_from"] == m2.id
    assert result["rollback_to"] == m1.id
    assert result["status"] == "ACTIVE"

    # Refresh entities from DB
    session.refresh(m1)
    session.refresh(m2)

    assert m1.is_active is True
    assert m1.status == "ACTIVE"

    assert m2.is_active is False
    assert m2.status == "ROLLED_BACK"

    # Verify audit event
    audit = session.query(AdaptationEvent).filter(
        AdaptationEvent.user_id == user.id,
        AdaptationEvent.action == AdaptationAction.model_rolled_back
    ).first()

    assert audit is not None
    assert audit.new_model_version_id == m1.id
    assert audit.old_model_version_id == m2.id
    assert audit.decision == "ROLLBACK"
    assert "admin_sec" in audit.reason


def test_rollback_to_same_active_model_rejected(db_session):
    session, user, m1, m2 = db_session

    with pytest.raises(ValueError, match="ya es el modelo activo"):
        adaptive_service.rollback_model(
            db=session,
            user_id=user.id,
            target_model_id=m2.id  # m2 is already active
        )
