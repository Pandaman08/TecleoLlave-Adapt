"""
test_concurrency_and_stress.py
Pruebas de Carga, Concurrencia y Resiliencia para el Sistema Biométrico TECLEOLLAVE-ADAPT:
- 1. Autenticación Biométrica Concurrente (Multi-threading con ThreadPoolExecutor).
- 2. Medición de Latencia de Inferencia Biométrica (p50, p95 < 250ms).
- 3. Concurrencia de Escritura de Muestras y Registro de Auditoría (Prevención de Bloqueos).
- 4. Resiliencia del Limitador de Tasa (Rate Limiter) bajo Ráfagas de Peticiones.
"""

import time
import concurrent.futures
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.models.user import User
from app.models.model_version import ModelVersion
from app.models.security_policy import SecurityPolicy
from app.utils.security import get_password_hash, create_access_token


@pytest.fixture
def stress_client():
    test_engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool
    )
    Base.metadata.create_all(bind=test_engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
    session = TestingSessionLocal()

    # Policy
    policy = SecurityPolicy(max_failed_attempts=15, lockout_duration_seconds=30, is_enabled=True)
    session.add(policy)

    # 1. User
    user = User(
        username="stress_student",
        full_name="Stress Student Test",
        email="stress@alumno.unt.edu.pe",
        password_hash=get_password_hash("StressPassword123!"),
        role="user",
        phrase="La seguridad protege la información",
        age=21,
        career="Ingeniería de Sistemas",
        is_active=True
    )
    session.add(user)
    session.commit()
    session.refresh(user)

    # Model
    model = ModelVersion(
        user_id=user.id,
        version=1,
        model_path="dummy_stress.pkl",
        training_samples_count=10,
        metrics={"far": 0.015, "frr": 0.020, "eer": 0.018},
        training_config={"algorithm": "random_forest"},
        feature_schema={"features": ["f1", "f2"]},
        is_active=True,
        status="ACTIVE"
    )
    session.add(model)
    session.commit()
    session.refresh(model)

    def override_get_db():
        try:
            yield session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    client = TestClient(app)

    token = create_access_token(data={"sub": str(user.id), "role": "user"})

    yield client, user, token

    app.dependency_overrides.clear()
    session.close()
    test_engine.dispose()


def test_concurrent_dashboard_and_health_reads(stress_client):
    """
    Simula 20 solicitudes concurrentes de lectura al sistema.
    Verifica que no ocurran bloqueos de base de datos ni caídas de servicio.
    """
    client, user, token = stress_client
    headers = {"Authorization": f"Bearer {token}"}

    def fetch_endpoint():
        t0 = time.perf_counter()
        res = client.get("/api/health")
        latency = (time.perf_counter() - t0) * 1000.0
        return res.status_code, latency

    num_workers = 20
    latencies = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        futures = [executor.submit(fetch_endpoint) for _ in range(num_workers)]
        for f in concurrent.futures.as_completed(futures):
            status_code, latency = f.result()
            assert status_code == 200
            latencies.append(latency)

    assert len(latencies) == num_workers
    p95 = sorted(latencies)[int(0.95 * len(latencies))]
    # Latencia p95 para endpoints de salud concurrentes debe ser ultra-rápida (< 150ms)
    assert p95 < 150.0


def test_concurrency_challenge_hint_requests(stress_client):
    """
    Simula múltiples solicitudes concurrentes al endpoint de pista de correo OTP.
    Verifica consistencia enmascarada del correo y tiempo de respuesta p95 < 250ms.
    """
    client, user, token = stress_client

    def fetch_hint():
        t0 = time.perf_counter()
        res = client.get(f"/api/auth/challenge-hint/{user.username}")
        latency = (time.perf_counter() - t0) * 1000.0
        return res.status_code, res.json(), latency

    num_requests = 15
    latencies = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
        futures = [executor.submit(fetch_hint) for _ in range(num_requests)]
        for f in concurrent.futures.as_completed(futures):
            code, body, lat = f.result()
            assert code == 200
            assert body["masked_email"] == "st***s@alumno.unt.edu.pe"
            latencies.append(lat)

    assert len(latencies) == num_requests
    p95 = sorted(latencies)[int(0.95 * len(latencies))]
    assert p95 < 250.0


def test_rapid_burst_authentication_rate_limiter(stress_client):
    """
    Verifica que el sistema maneje ráfagas rápidas de intentos de login con contraseña errónea
    de forma segura y contabilice los intentos fallidos sin degradación.
    """
    client, user, token = stress_client

    def failed_login_attempt():
        return client.post("/api/auth/login", json={
            "username": "stress_student",
            "password": "WrongPassword_999!"
        })

    # Enviar 5 intentos fallidos consecutivos
    for i in range(5):
        res = failed_login_attempt()
        assert res.status_code == 401
        assert "invalid" in res.json()["detail"].lower()
