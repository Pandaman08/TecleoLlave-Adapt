"""
Tests for Phase 4:
- Student registration with email, age, full name, career, and student code.
- Email duplicate prevention.
- Masked email hint endpoint for 2FA challenge fallback.
- Continuous biometric adaptation: how typing over time updates candidate pool and evolves model.
- 2FA challenge resolution feeding legitimate samples into the adaptation pipeline.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.models import (
    AdaptationConfig, AdaptationEvent, AdaptationAction, CandidateModel,
    User, TypingSample, SampleQuality, AuthAttempt, AuthDecision,
    ModelVersion, SecurityPolicy
)
from app.utils.security import get_password_hash
from app.services.adaptive_service import adaptive_service


@pytest.fixture
def test_db_client():
    test_engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool
    )
    Base.metadata.create_all(bind=test_engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
    session = TestingSessionLocal()

    # Create security policy
    policy = SecurityPolicy(max_failed_attempts=5, lockout_duration_seconds=15, is_enabled=True)
    session.add(policy)
    session.commit()

    def override_get_db():
        try:
            yield session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    client = TestClient(app)

    yield {
        "client": client,
        "session": session,
        "db": session
    }

    app.dependency_overrides.clear()
    session.close()


def test_student_registration_with_email_and_age(test_db_client):
    """Verifica el registro completo de un estudiante con email, edad y metadatos académicos."""
    client = test_db_client["client"]
    db = test_db_client["db"]

    payload = {
        "username": "alexis_sanchez",
        "password": "Password123!",
        "email": "alexis.sanchez@unt.edu.pe",
        "full_name": "Alexis Daniel Sanchez",
        "age": 22,
        "career": "Ingeniería de Sistemas",
        "student_code": "1023400120"
    }

    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == 200, response.text
    data = response.json()

    assert data["username"] == "alexis_sanchez"
    assert data["email"] == "alexis.sanchez@unt.edu.pe"
    assert data["full_name"] == "Alexis Daniel Sanchez"
    assert data["age"] == 22
    assert data["career"] == "Ingeniería de Sistemas"
    assert data["student_code"] == "1023400120"
    assert "password" not in data
    assert "password_hash" not in data

    # Verificar aislamiento en base de datos: el password_hash existe pero no la contraseña en texto plano
    user_in_db = db.query(User).filter(User.username == "alexis_sanchez").first()
    assert user_in_db is not None
    assert user_in_db.password_hash != "Password123!"
    assert user_in_db.password_hash.startswith("$2b$") or len(user_in_db.password_hash) > 20
    assert user_in_db.age == 22
    assert user_in_db.email == "alexis.sanchez@unt.edu.pe"


def test_duplicate_email_registration_rejected(test_db_client):
    """Verifica que no se permitan cuentas duplicadas con el mismo correo electrónico."""
    client = test_db_client["client"]

    # 1. Registrar primer usuario
    payload1 = {
        "username": "usuario_uno",
        "password": "Password123!",
        "email": "repetido@unt.edu.pe",
        "full_name": "Usuario Uno",
        "age": 20
    }
    r1 = client.post("/api/auth/register", json=payload1)
    assert r1.status_code == 200

    # 2. Intentar registrar segundo usuario con el mismo email
    payload2 = {
        "username": "usuario_dos",
        "password": "Password456!",
        "email": "REPETIDO@unt.edu.pe",  # Mayúsculas deben normalizarse
        "full_name": "Usuario Dos",
        "age": 23
    }
    r2 = client.post("/api/auth/register", json=payload2)
    assert r2.status_code == 400
    assert "correo electrónico ya se encuentra registrado" in r2.json()["detail"]


def test_challenge_hint_endpoint_returns_masked_email(test_db_client):
    """Verifica que el endpoint de challenge-hint retorne el correo enmascarado para validación 2FA."""
    client = test_db_client["client"]

    # Registrar usuario con email
    payload = {
        "username": "estudiante_demo",
        "password": "Password123!",
        "email": "estudiante.seguridad@unt.edu.pe",
        "full_name": "Estudiante Prueba",
        "age": 21
    }
    r = client.post("/api/auth/register", json=payload)
    assert r.status_code == 200

    # Consultar pista de correo para el desafío 2FA
    hint_res = client.get("/api/auth/challenge-hint/estudiante_demo")
    assert hint_res.status_code == 200
    hint_data = hint_res.json()

    assert hint_data["username"] == "estudiante_demo"
    assert hint_data["has_email"] is True
    # Correo enmascarado debe proteger privacidad: es***d@unt.edu.pe
    assert "@unt.edu.pe" in hint_data["masked_email"]
    assert "***" in hint_data["masked_email"]
    assert "2FA" in hint_data["message"] or "correo" in hint_data["message"]


def test_verify_2fa_and_continuous_adaptation_hook(test_db_client):
    """
    Verifica que al superar la verificación 2FA (por ambigüedad en tecleo CHALLENGE):
    1. Se actualice challenge_passed = True.
    2. Se integre la muestra al pool de adaptación para que el modelo evolucione con el tiempo.
    """
    client = test_db_client["client"]
    db = test_db_client["db"]

    # 1. Crear usuario
    user = User(
        username="adapt_user",
        password_hash=get_password_hash("test1234"),
        phrase="La seguridad protege la información",
        role="user",
        email="adapt@unt.edu.pe",
        full_name="Usuario Adaptativo",
        age=24,
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # 2. Crear muestra y auth_attempt en estado CHALLENGE
    sample = TypingSample(
        user_id=user.id,
        raw_timestamps=[{"key": "L", "keydown_ts": 100.0, "keyup_ts": 180.0}],
        phrase_typed="La seguridad protege la información",
        source="auth",
        is_validated=True,
        consistency_score=0.72,
        sample_quality=SampleQuality.high
    )
    db.add(sample)
    db.commit()
    db.refresh(sample)

    attempt = AuthAttempt(
        user_id=user.id,
        sample_id=sample.id,
        model_version_id=1,
        score=0.72,  # En zona challenge
        decision=AuthDecision.challenge,
        challenge_passed=None
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)

    # 3. Superar el 2FA con código demo
    response = client.post("/api/auth/verify-2fa", json={
        "username": "adapt_user",
        "otp_code": "123456"
    })
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["verified"] is True
    assert "access_token" in data

    # 4. Verificar que challenge_passed se marcó como True en base de datos
    db.refresh(attempt)
    assert attempt.challenge_passed is True

    # 5. Verificar que el evento de adaptación fue registrado
    event = db.query(AdaptationEvent).filter(
        AdaptationEvent.user_id == user.id,
        AdaptationEvent.auth_attempt_id == attempt.id
    ).first()
    assert event is not None
    assert event.action in [AdaptationAction.sample_enqueued, AdaptationAction.candidate_created]


def test_continuous_adaptation_candidate_accumulation(test_db_client):
    """
    Verifica el principio eje del proyecto:
    Cada vez que el usuario teclea de forma válida, sus muestras se acumulan en el candidate pool
    y el perfil se adapta con el tiempo según la variación temporal.
    """
    db = test_db_client["db"]

    user = User(
        username="drift_student",
        password_hash=get_password_hash("pass123"),
        phrase="La seguridad protege la información",
        role="user",
        age=21,
        email="drift@unt.edu.pe",
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    config = AdaptationConfig(
        user_id=user.id,
        candidate_window_size=10,
        min_candidate_samples=5
    )
    db.add(config)
    db.commit()

    # Simular 3 eventos de tecleo sucesivos acumulándose en el candidate pool
    for i in range(3):
        sample = TypingSample(
            user_id=user.id,
            raw_timestamps=[{"key": "L", "keydown_ts": 100.0, "keyup_ts": 180.0}],
            phrase_typed="La seguridad protege la información",
            source="auth",
            is_validated=True,
            consistency_score=0.80,
            sample_quality=SampleQuality.high
        )
        db.add(sample)
        db.commit()
        db.refresh(sample)

        attempt = AuthAttempt(
            user_id=user.id,
            sample_id=sample.id,
            model_version_id=1,
            score=0.88,
            decision=AuthDecision.allow,
            challenge_passed=None
        )
        db.add(attempt)
        db.commit()
        db.refresh(attempt)

        # Procesar con el motor de adaptación continua
        res = adaptive_service.process_auth_result(
            db=db,
            user_id=user.id,
            auth_attempt_id=attempt.id,
            decision="allow",
            sample_id=sample.id
        )

        assert res.action == "sample_enqueued"
        assert f"({i+1}/5)" in res.message

    # Verificar que los 3 eventos legítimos quedaron registrados en auditoría de adaptación
    events = db.query(AdaptationEvent).filter(AdaptationEvent.user_id == user.id).all()
    assert len(events) == 3


def test_anti_poisoning_defense_routes_to_quarantine(test_db_client):
    """
    Verifica que la adaptación continua no acepte muestras sospechosas o maliciosas:
    Si un score es bajo o la calidad es errática, la muestra es enviada a cuarentena (Anti-Poisoning)
    y no envenena el modelo adaptativo.
    """
    db = test_db_client["db"]

    user = User(
        username="secure_student",
        password_hash=get_password_hash("pass123"),
        phrase="La seguridad protege la información",
        role="user",
        age=23,
        email="secure@unt.edu.pe",
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    sample = TypingSample(
        user_id=user.id,
        raw_timestamps=[{"key": "X", "keydown_ts": 50.0, "keyup_ts": 200.0}],
        phrase_typed="La seguridad protege la información",
        source="auth",
        is_validated=True,
        consistency_score=0.20,  # Ritmo errático o inconsistente
        sample_quality=SampleQuality.low
    )
    db.add(sample)
    db.commit()
    db.refresh(sample)

    attempt = AuthAttempt(
        user_id=user.id,
        sample_id=sample.id,
        model_version_id=1,
        score=0.55,  # Score por debajo de la confianza adaptativa (0.60)
        decision=AuthDecision.allow,
        challenge_passed=None
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)

    res = adaptive_service.process_auth_result(
        db=db,
        user_id=user.id,
        auth_attempt_id=attempt.id,
        decision="allow",
        sample_id=sample.id
    )

    assert res.action == "sample_quarantined"
    assert "cuarentena" in res.message.lower() or "anti-poisoning" in res.message.lower()

    # Comprobar que existe el evento de cuarentena
    event = db.query(AdaptationEvent).filter(
        AdaptationEvent.user_id == user.id,
        AdaptationEvent.action == AdaptationAction.sample_quarantined
    ).first()
    assert event is not None
