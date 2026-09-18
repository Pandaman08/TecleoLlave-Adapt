"""
Unit tests for Age-Based Biometric Segmentation & Research Findings:
- GET /api/dashboard/age-segmentation
- Authorization: Unauthenticated (401), Student/User (403), Admin (200)
- Descriptive cohort statistics (14-19, 20-24, 25-34, 35+)
- Pearson correlation calculation & non-causal methodological disclaimer
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.models.user import User
from app.models.auth_attempt import AuthAttempt, AuthDecision
from app.models.typing_sample import TypingSample, SampleSource
from app.models.model_version import ModelVersion
from app.utils.security import get_password_hash, create_access_token


@pytest.fixture
def test_setup():
    test_engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool
    )
    Base.metadata.create_all(bind=test_engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
    session = TestingSessionLocal()

    # 1. Admin user
    admin = User(
        username="admin_investigador",
        password_hash=get_password_hash("AdminPass123!"),
        role="admin",
        phrase="[ADMIN]",
        is_active=True
    )
    session.add(admin)

    # 2. Student in Cohort 1 (18 years old)
    student1 = User(
        username="alumno_joven",
        full_name="Carlos Teclado",
        password_hash=get_password_hash("StudentPass123!"),
        role="user",
        phrase="La seguridad protege la información",
        age=18,
        career="Ingeniería de Sistemas",
        is_active=True
    )
    session.add(student1)

    # 3. Student in Cohort 2 (22 years old)
    student2 = User(
        username="alumna_media",
        full_name="Maria Mecanógrafa",
        password_hash=get_password_hash("StudentPass123!"),
        role="user",
        phrase="La seguridad protege la información",
        age=22,
        career="Ciencia de la Computación",
        is_active=True
    )
    session.add(student2)

    # 4. Student in Cohort 3 (29 years old)
    student3 = User(
        username="alumno_posgrado",
        full_name="Pedro Algoritmo",
        password_hash=get_password_hash("StudentPass123!"),
        role="user",
        phrase="La seguridad protege la información",
        age=29,
        career="Maestría en TI",
        is_active=True
    )
    session.add(student3)

    session.commit()
    session.refresh(admin)
    session.refresh(student1)
    session.refresh(student2)
    session.refresh(student3)

    # Models
    mv1 = ModelVersion(
        user_id=student1.id,
        version=1,
        model_path="dummy1.pkl",
        training_samples_count=10,
        metrics={"far": 0.01, "frr": 0.02, "eer": 0.015},
        training_config={"algorithm": "random_forest"},
        feature_schema={"features": ["f1"]},
        is_active=True
    )
    mv2 = ModelVersion(
        user_id=student2.id,
        version=1,
        model_path="dummy2.pkl",
        training_samples_count=10,
        metrics={"far": 0.01, "frr": 0.02, "eer": 0.015},
        training_config={"algorithm": "random_forest"},
        feature_schema={"features": ["f1"]},
        is_active=True
    )
    session.add_all([mv1, mv2])
    session.commit()
    session.refresh(mv1)
    session.refresh(mv2)

    # Add attempts & samples
    att1 = AuthAttempt(
        user_id=student1.id,
        model_version_id=mv1.id,
        score=0.92,
        decision=AuthDecision.allow
    )
    att2 = AuthAttempt(
        user_id=student2.id,
        model_version_id=mv2.id,
        score=0.88,
        decision=AuthDecision.allow
    )
    att3 = AuthAttempt(
        user_id=student2.id,
        model_version_id=mv2.id,
        score=0.62,
        decision=AuthDecision.challenge
    )
    session.add_all([att1, att2, att3])

    # Sample with raw timestamps for hold time calculation
    sample1 = TypingSample(
        user_id=student1.id,
        phrase_typed="La seguridad protege la información",
        source=SampleSource.enrollment,
        raw_timestamps=[
            {"key": "a", "keydown_ts": 1000, "keyup_ts": 1090}, # 90ms hold time
            {"key": "b", "keydown_ts": 1200, "keyup_ts": 1300}  # 100ms hold time
        ]
    )
    session.add(sample1)
    session.commit()

    def override_get_db():
        try:
            yield session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    client = TestClient(app)

    student_token = create_access_token(data={"sub": str(student1.id), "role": "user"})
    admin_token = create_access_token(data={"sub": str(admin.id), "role": "admin"})

    yield client, student_token, admin_token, (student1, student2, student3)

    app.dependency_overrides.clear()
    session.close()
    test_engine.dispose()


def test_age_segmentation_unauthenticated(test_setup):
    client, _, _, _ = test_setup
    res = client.get("/api/dashboard/age-segmentation")
    assert res.status_code == 401


def test_age_segmentation_forbidden_for_student(test_setup):
    client, student_token, _, _ = test_setup
    headers = {"Authorization": f"Bearer {student_token}"}
    res = client.get("/api/dashboard/age-segmentation", headers=headers)
    assert res.status_code == 403
    assert "restringido" in res.json()["detail"].lower() or "administrador" in res.json()["detail"].lower()


def test_age_segmentation_admin_success(test_setup):
    client, _, admin_token, students = test_setup
    headers = {"Authorization": f"Bearer {admin_token}"}
    res = client.get("/api/dashboard/age-segmentation", headers=headers)
    assert res.status_code == 200

    data = res.json()
    assert "cohorts" in data
    assert "overall_stats" in data

    cohorts = data["cohorts"]
    assert len(cohorts) == 4

    # Cohort 1: 14-19
    c1 = cohorts[0]
    assert c1["min_age"] == 14
    assert c1["max_age"] == 19
    assert c1["users_count"] == 1
    assert c1["users"][0]["username"] == "alumno_joven"
    assert c1["avg_hold_time_ms"] == 95.0 # (90 + 100) / 2

    # Cohort 2: 20-24
    c2 = cohorts[1]
    assert c2["users_count"] == 1
    assert c2["users"][0]["username"] == "alumna_media"
    assert c2["total_attempts"] == 2
    assert c2["allow_rate"] == 50.0
    assert c2["challenge_rate"] == 50.0

    # Overall stats
    stats = data["overall_stats"]
    assert stats["total_users_evaluated"] == 3
    assert stats["min_age"] == 18
    assert stats["max_age"] == 29
    assert "descriptiva" in stats["methodology_note"]
