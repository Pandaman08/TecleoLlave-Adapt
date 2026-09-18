"""
test_e2e_student_and_admin_flows.py
Validación Integral End-to-End (E2E) de los dos flujos del sistema:
- Flujo A: Estudiante (Aula Virtual, registro ampliado, 2FA OTP en CHALLENGE, adaptación continua, RBAC)
- Flujo B: Administrador/Investigador (Panel Admin, segmentación demográfica por edad, políticas, exclusión biométrica)
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.models import (
    User, ModelVersion, SecurityPolicy, AdaptationConfig,
    AuthAttempt, AuthDecision, TypingSample, SampleQuality, SampleSource
)
from app.utils.security import get_password_hash, create_access_token


@pytest.fixture
def e2e_environment():
    test_engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool
    )
    Base.metadata.create_all(bind=test_engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
    session = TestingSessionLocal()

    # 1. Política de seguridad inicial
    policy = SecurityPolicy(max_failed_attempts=5, lockout_duration_seconds=30, is_enabled=True)
    session.add(policy)

    # 2. Administrador del sistema pre-existente
    admin = User(
        username="admin_principal",
        password_hash=get_password_hash("AdminMasterKey2026!"),
        role="admin",
        phrase="[ADMINISTRADOR]",
        is_active=True
    )
    session.add(admin)
    session.commit()
    session.refresh(admin)

    def override_get_db():
        try:
            yield session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    client = TestClient(app)

    admin_token = create_access_token(data={"sub": str(admin.id), "role": "admin"})

    yield {
        "client": client,
        "session": session,
        "admin": admin,
        "admin_token": admin_token
    }

    app.dependency_overrides.clear()
    session.close()
    test_engine.dispose()


def test_flujo_integral_estudiante_e2e(e2e_environment):
    """
    Valida el ciclo de vida completo del Estudiante:
    1. Registro académico con email y edad.
    2. Autenticación con contraseña (Login).
    3. Desafío 2FA en caso de incertidumbre biométrica (CHALLENGE).
    4. Consulta de pista de correo enmascarado y resolución OTP.
    5. Integración del evento resuelto a la adaptación continua.
    6. Verificación de denegación de privilegios administrativos (RBAC).
    """
    client = e2e_environment["client"]
    db = e2e_environment["session"]

    # --- PASO 1: Registro Académico ---
    reg_payload = {
        "username": "carlos_e2e",
        "password": "Password123!",
        "email": "carlos.e2e@unitru.edu.pe",
        "phrase": "La seguridad protege la información",
        "age": 21,
        "career": "Ingeniería de Sistemas",
        "student_code": "UNT-2023-1102"
    }
    reg_res = client.post("/api/auth/register", json=reg_payload)
    assert reg_res.status_code in [200, 201]
    user_data = reg_res.json()
    assert user_data["username"] == "carlos_e2e"
    assert user_data["email"] == "carlos.e2e@unitru.edu.pe"
    assert user_data["age"] == 21
    assert user_data["role"] == "user"

    student_id = user_data["id"]

    # --- PASO 2: Login con Contraseña ---
    login_res = client.post("/api/auth/login", json={
        "username": "carlos_e2e",
        "password": "Password123!"
    })
    assert login_res.status_code == 200
    login_data = login_res.json()
    assert "access_token" in login_data
    assert login_data["role"] == "user"
    student_token = login_data["access_token"]
    student_headers = {"Authorization": f"Bearer {student_token}"}

    # Configurar modelo biométrico activo y configuración de adaptación
    model = ModelVersion(
        user_id=student_id,
        version=1,
        model_path="dummy_e2e.pkl",
        training_samples_count=10,
        metrics={"far": 0.015, "frr": 0.02, "eer": 0.017},
        training_config={"algorithm": "random_forest"},
        feature_schema={"features": ["f1"]},
        is_active=True
    )
    adapt_cfg = db.query(AdaptationConfig).filter(AdaptationConfig.user_id == student_id).first()
    if not adapt_cfg:
        adapt_cfg = AdaptationConfig(
            user_id=student_id,
            candidate_window_size=10,
            min_candidate_samples=5
        )
        db.add(adapt_cfg)
    else:
        adapt_cfg.candidate_window_size = 10
        adapt_cfg.min_candidate_samples = 5
    db.add(model)
    db.commit()

    # --- PASO 3: Simular Intento de Tecleo con Incertidumbre (CHALLENGE) ---
    ambiguous_sample = TypingSample(
        user_id=student_id,
        phrase_typed="La seguridad protege la información",
        source=SampleSource.auth,
        raw_timestamps=[{"key": "L", "keydown_ts": 100, "keyup_ts": 210}],
        sample_quality=SampleQuality.medium,
        is_validated=False
    )
    db.add(ambiguous_sample)
    db.commit()
    db.refresh(ambiguous_sample)

    challenge_attempt = AuthAttempt(
        user_id=student_id,
        sample_id=ambiguous_sample.id,
        model_version_id=model.id,
        score=0.61,  # Rango de desafío (0.45 - 0.75)
        decision=AuthDecision.challenge,
        requires_2fa=True,
        challenge_passed=None
    )
    db.add(challenge_attempt)
    db.commit()
    db.refresh(challenge_attempt)

    # --- PASO 4: Consulta de Pista de Correo OTP ---
    hint_res = client.get(f"/api/auth/challenge-hint/{reg_payload['username']}")
    assert hint_res.status_code == 200
    hint_data = hint_res.json()
    assert hint_data["has_email"] is True
    assert "ca***e@unitru.edu.pe" == hint_data["masked_email"]

    # --- PASO 5: Resolución de Desafío 2FA ---
    verify_payload = {
        "username": "carlos_e2e",
        "otp_code": "123456"
    }
    verify_res = client.post("/api/auth/verify-2fa", json=verify_payload)
    assert verify_res.status_code == 200
    verify_data = verify_res.json()
    assert verify_data["verified"] is True
    assert "access_token" in verify_data

    # Verificar que el intento fue marcado como superado
    db.refresh(challenge_attempt)
    assert challenge_attempt.challenge_passed is True

    # --- PASO 6: Intento de Acceso a Zonas de Administrador (Debe ser Rechazado) ---
    forbidden_policy = client.get("/api/admin/security/policy", headers=student_headers)
    assert forbidden_policy.status_code == 403

    forbidden_age = client.get("/api/dashboard/age-segmentation", headers=student_headers)
    assert forbidden_age.status_code == 403


def test_flujo_integral_administrador_e2e(e2e_environment):
    """
    Valida el ciclo de vida completo del Administrador / Investigador:
    1. Login sin requerimiento de biometría conductual.
    2. Consulta de hallazgos demográficos segmentados por edad (Cohortes 14-19, 20-24, 25-34, 35+).
    3. Clasificación correcta de estudiantes según su edad.
    4. Consulta y modificación de políticas de seguridad.
    5. Exclusión estricta de enrolamiento y autenticación biométrica de tecleo.
    """
    client = e2e_environment["client"]
    db = e2e_environment["session"]
    admin = e2e_environment["admin"]
    admin_token = e2e_environment["admin_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Registrar dos estudiantes en cohortes distintas para validar segmentación
    s1 = User(
        username="alumno_ingresante",
        email="ingresante@unt.edu.pe",
        password_hash=get_password_hash("Pass123!"),
        phrase="La seguridad protege la información",
        role="user",
        age=17,  # Cohorte 1 (14-19)
        career="Ingeniería de Sistemas",
        is_active=True
    )
    s2 = User(
        username="alumno_regular",
        email="regular@unt.edu.pe",
        password_hash=get_password_hash("Pass123!"),
        phrase="La seguridad protege la información",
        role="user",
        age=22,  # Cohorte 2 (20-24)
        career="Ingeniería Industrial",
        is_active=True
    )
    db.add_all([s1, s2])
    db.commit()

    # --- PASO 1: Consulta de Hallazgos por Edad ---
    age_res = client.get("/api/dashboard/age-segmentation", headers=admin_headers)
    assert age_res.status_code == 200
    age_data = age_res.json()
    assert "cohorts" in age_data
    assert "overall_stats" in age_data

    cohorts = age_data["cohorts"]
    assert len(cohorts) == 4

    # Verificar que alumno_ingresante está en Cohorte 1 (14 - 19 años)
    c1 = next(c for c in cohorts if c["id"] == "c1")
    assert any(u["username"] == "alumno_ingresante" for u in c1["users"])

    # Verificar que alumno_regular está en Cohorte 2 (20 - 24 años)
    c2 = next(c for c in cohorts if c["id"] == "c2")
    assert any(u["username"] == "alumno_regular" for u in c2["users"])

    # Descargo metodológico obligatorio
    assert "descriptiva" in age_data["overall_stats"]["methodology_note"]

    # --- PASO 2: Consulta y Actualización de Políticas de Seguridad ---
    pol_get = client.get("/api/admin/security/policy", headers=admin_headers)
    assert pol_get.status_code == 200

    pol_put = client.put("/api/admin/security/policy", json={
        "max_failed_attempts": 7,
        "lockout_duration_seconds": 45,
        "is_enabled": True
    }, headers=admin_headers)
    assert pol_put.status_code == 200
    assert pol_put.json()["policy"]["max_failed_attempts"] == 7
    assert pol_put.json()["policy"]["lockout_duration_seconds"] == 45

    # --- PASO 3: Exclusión de Administración en Enrolamiento / Autenticación Biometría ---
    enroll_try = client.post("/api/typing/enroll", json={
        "username": admin.username,
        "phrase_typed": "La seguridad protege la información",
        "raw_timestamps": [{"key": "A", "keydown_ts": 100, "keyup_ts": 190}],
        "is_final_sample": True
    })
    assert enroll_try.status_code == 400
    assert "administrador" in enroll_try.json()["detail"].lower()
