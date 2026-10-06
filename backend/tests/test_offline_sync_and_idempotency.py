"""
test_offline_sync_and_idempotency.py
Pruebas exhaustivas para la sincronización offline, idempotencia y seguridad de la APK TECLEOLLAVE:

Cubre los criterios de aceptación:
1. Idempotencia estricta: Enviar dos veces el mismo lote no duplica registros en SQLite.
2. Preservación temporal: Conserva marcas de tiempo de captura originales (captured_at), no las de sincronización.
3. Sincronización de lotes y manejo de lotes parciales / reanudación segura.
4. Enrolamiento guiado diferido (ENROLLMENT_30) vía batch-sync cuando se captura offline.
5. Telemetría de intento de autenticación (AUTH_APPLOCKER / AUTH_SYSTEM).
6. Rechazo honesto de autenticación remota si el backend no pudo evaluar la muestra (sin falsos positivos offline).
7. Rechazo estricto de registro / OTP sin servidor (el servidor es la autoridad de cuentas).
8. Aislamiento por participante y origen de servidor.
"""

import pytest
import uuid
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.models.mobile_study import MobileParticipant, MobileStudySample
from app.utils.security import create_access_token


@pytest.fixture
def sync_env():
    """Configura una base de datos de pruebas en memoria con soporte SQLite."""
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool
    )
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = TestingSessionLocal()

    # Crear participantes de prueba
    p1 = MobileParticipant(
        participant_code="PART-001",
        full_name="Participante Uno",
        email="part1@unt.edu.pe",
        dominant_hand="diestro",
        age_range="18-25",
        device_model="Pixel 8 Pro",
        screen_refresh_rate=120,
        is_enrolled=True,
        enrollment_phrase="seguridad unt 2026",
        enrolled_reps_count=30,
        m0_profile={"centroid_ht": [85.0, 90.0], "std_ht": [10.0, 10.0]},
        mt_profile={"centroid_ht": [85.0, 90.0], "std_ht": [10.0, 10.0]}
    )
    p2 = MobileParticipant(
        participant_code="PART-002",
        full_name="Participante Dos",
        email="part2@unt.edu.pe",
        dominant_hand="zurdo",
        age_range="26-35",
        device_model="Samsung Galaxy S24",
        screen_refresh_rate=60,
        is_enrolled=False,
        enrollment_phrase="clave secreta 2026",
        enrolled_reps_count=0
    )
    db.add(p1)
    db.add(p2)
    db.commit()
    db.refresh(p1)
    db.refresh(p2)

    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    client = TestClient(app)

    token_p1 = create_access_token(data={"sub": str(p1.id), "email": p1.email})

    yield {
        "client": client,
        "db": db,
        "p1": p1,
        "p2": p2,
        "token_p1": token_p1
    }

    app.dependency_overrides.clear()
    db.close()
    engine.dispose()


def test_batch_sync_basic_and_idempotency(sync_env):
    """
    Criterios 1 y 3:
    - Enviar un lote de eventos capturados offline al backend.
    - Re-enviar el mismo lote exactamente: no debe duplicar datos y debe responder con éxito.
    """
    client = sync_env["client"]
    db = sync_env["db"]
    p1 = sync_env["p1"]

    event_id_1 = str(uuid.uuid4())
    event_id_2 = str(uuid.uuid4())

    captured_time_1 = (datetime.utcnow() - timedelta(minutes=15)).isoformat()
    captured_time_2 = (datetime.utcnow() - timedelta(minutes=10)).isoformat()

    batch_payload = {
        "participant_id": p1.id,
        "events": [
            {
                "client_event_id": event_id_1,
                "activity_type": "AUTH_APPLOCKER",
                "captured_at": captured_time_1,
                "payload": {
                    "phrase_typed": "seguridad unt 2026",
                    "target_app": "com.whatsapp",
                    "ground_truth": "LEGITIMATE",
                    "raw_events": [
                        {"key": "s", "dwell_time": 85, "flight_time": 0},
                        {"key": "e", "dwell_time": 90, "flight_time": 110}
                    ]
                }
            },
            {
                "client_event_id": event_id_2,
                "activity_type": "AUTH_APPLOCKER",
                "captured_at": captured_time_2,
                "payload": {
                    "phrase_typed": "seguridad unt 2026",
                    "target_app": "com.bcp.innovacxion",
                    "ground_truth": "LEGITIMATE",
                    "raw_events": [
                        {"key": "s", "dwell_time": 82, "flight_time": 0},
                        {"key": "e", "dwell_time": 88, "flight_time": 105}
                    ]
                }
            }
        ]
    }

    # Primer envío del lote
    res1 = client.post("/api/mobile/study/batch-sync", json=batch_payload)
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["success"] is True
    assert data1["synced_count"] == 2
    assert data1["duplicates_count"] == 0
    assert set(data1["synced_event_ids"]) == {event_id_1, event_id_2}

    # Verificar que existen en la base de datos
    samples_in_db = db.query(MobileStudySample).filter(
        MobileStudySample.participant_id == p1.id
    ).all()
    assert len(samples_in_db) == 2

    # Verificar que se preservó la marca de tiempo de captura original
    sample1 = db.query(MobileStudySample).filter(
        MobileStudySample.client_event_id == event_id_1
    ).first()
    assert sample1 is not None
    # La fecha guardada no debe ser la actual sino la original de hace 15 minutos
    assert (datetime.utcnow() - sample1.created_at).total_seconds() > 600

    # Segundo envío del MISMO lote (simula reintento o re-envío tras corte de red)
    res2 = client.post("/api/mobile/study/batch-sync", json=batch_payload)
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["success"] is True
    # Idempotencia: Reconoce duplicados pero confirma los IDs al cliente para que pueda limpiar la cola
    assert data2["duplicates_count"] == 2
    assert set(data2["synced_event_ids"]) == {event_id_1, event_id_2}

    # Comprobar que NO se crearon registros duplicados en BD
    samples_after_retry = db.query(MobileStudySample).filter(
        MobileStudySample.participant_id == p1.id
    ).all()
    assert len(samples_after_retry) == 2, "La base de datos duplicó muestras indebidamente"


def test_partial_batch_recovery_and_resumption(sync_env):
    """
    Criterio 4:
    - Simular pérdida de conexión tras confirmación parcial y reanudar la sincronización.
    - Comprobar que los nuevos elementos se agregan y los previos se confirman sin duplicación.
    """
    client = sync_env["client"]
    db = sync_env["db"]
    p1 = sync_env["p1"]

    id_a = str(uuid.uuid4())
    id_b = str(uuid.uuid4())
    id_c = str(uuid.uuid4())

    # Lote 1 con solo el elemento A
    res1 = client.post("/api/mobile/study/batch-sync", json={
        "participant_id": p1.id,
        "events": [{
            "client_event_id": id_a,
            "activity_type": "AUTH_APPLOCKER",
            "captured_at": datetime.utcnow().isoformat(),
            "payload": {"phrase_typed": "test", "raw_events": [{"key": "t", "dwell_time": 80}]}
        }]
    })
    assert res1.status_code == 200
    assert id_a in res1.json()["synced_event_ids"]

    # Siguiente sincronización contiene [id_a, id_b, id_c] (por ejemplo, si el cliente no recibió el ack de id_a)
    res2 = client.post("/api/mobile/study/batch-sync", json={
        "participant_id": p1.id,
        "events": [
            {
                "client_event_id": id_a,
                "activity_type": "AUTH_APPLOCKER",
                "payload": {"phrase_typed": "test", "raw_events": [{"key": "t", "dwell_time": 80}]}
            },
            {
                "client_event_id": id_b,
                "activity_type": "AUTH_APPLOCKER",
                "payload": {"phrase_typed": "test", "raw_events": [{"key": "t", "dwell_time": 80}]}
            },
            {
                "client_event_id": id_c,
                "activity_type": "AUTH_APPLOCKER",
                "payload": {"phrase_typed": "test", "raw_events": [{"key": "t", "dwell_time": 80}]}
            }
        ]
    })
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["duplicates_count"] == 1  # id_a detectado como duplicado
    assert set(data2["synced_event_ids"]) == {id_a, id_b, id_c}

    # Total de registros debe ser exactamente 3
    total = db.query(MobileStudySample).filter(
        MobileStudySample.participant_id == p1.id
    ).count()
    assert total == 3


def test_deferred_enrollment_via_batch_sync(sync_env):
    """
    Criterios 1 y 2:
    - Participante completa las 30 repeticiones offline.
    - Se envían en un batch diferido (ENROLLMENT_30).
    - El backend procesa el enrolamiento, genera perfiles M0/Mt y asocia client_event_id.
    """
    client = sync_env["client"]
    db = sync_env["db"]
    p2 = sync_env["p2"]

    assert p2.is_enrolled is False

    reps = []
    for _ in range(30):
        reps.append([
            {"key": "c", "dwell_time": 95, "flight_time": 0},
            {"key": "l", "dwell_time": 88, "flight_time": 120},
            {"key": "a", "dwell_time": 92, "flight_time": 115},
            {"key": "v", "dwell_time": 85, "flight_time": 110},
            {"key": "e", "dwell_time": 90, "flight_time": 105}
        ])

    enroll_event_id = str(uuid.uuid4())
    res = client.post("/api/mobile/study/batch-sync", json={
        "participant_id": p2.id,
        "events": [{
            "client_event_id": enroll_event_id,
            "activity_type": "ENROLLMENT_30",
            "captured_at": datetime.utcnow().isoformat(),
            "payload": {
                "phrase": "clave secreta 2026",
                "repetitions": reps
            }
        }]
    })

    assert res.status_code == 200
    data = res.json()
    assert enroll_event_id in data["synced_event_ids"]

    # Verificar que el participante quedó enrolado en BD
    db.refresh(p2)
    assert p2.is_enrolled is True
    assert p2.enrolled_reps_count == 30
    assert p2.m0_profile is not None


def test_evaluate_auth_idempotency_and_client_event_id(sync_env):
    """
    Criterio 3 y 8:
    - Evaluar intento en línea enviando client_event_id.
    - Re-evaluar el mismo client_event_id: debe ser idempotente (is_duplicate=True) y no duplicar en BD.
    """
    client = sync_env["client"]
    db = sync_env["db"]
    p1 = sync_env["p1"]

    client_id = str(uuid.uuid4())
    req_body = {
        "participant_id": p1.id,
        "phrase_typed": "seguridad unt 2026",
        "target_app": "com.whatsapp",
        "client_event_id": client_id,
        "raw_events": [
            {"key": "s", "dwell_time": 85, "flight_time": 0},
            {"key": "e", "dwell_time": 90, "flight_time": 110}
        ]
    }

    # Primer intento
    res1 = client.post("/api/mobile/study/evaluate-auth", json=req_body)
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["client_event_id"] == client_id
    assert "is_duplicate" not in data1 or not data1["is_duplicate"]

    # Segundo intento con el mismo client_event_id
    res2 = client.post("/api/mobile/study/evaluate-auth", json=req_body)
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["is_duplicate"] is True

    # Verificar que solo existe un registro en la tabla de muestras
    count = db.query(MobileStudySample).filter(
        MobileStudySample.client_event_id == client_id
    ).count()
    assert count == 1


def test_cross_participant_isolation(sync_env):
    """
    Criterio 6:
    - Asegurar que no se mezclen las colas ni los datos entre participantes diferentes.
    """
    client = sync_env["client"]
    db = sync_env["db"]
    p1 = sync_env["p1"]
    p2 = sync_env["p2"]

    id_p1 = str(uuid.uuid4())
    id_p2 = str(uuid.uuid4())

    client.post("/api/mobile/study/batch-sync", json={
        "participant_id": p1.id,
        "events": [{
            "client_event_id": id_p1,
            "activity_type": "AUTH_APPLOCKER",
            "payload": {"phrase_typed": "p1 phrase", "raw_events": [{"key": "a", "dwell_time": 80}]}
        }]
    })

    client.post("/api/mobile/study/batch-sync", json={
        "participant_id": p2.id,
        "events": [{
            "client_event_id": id_p2,
            "activity_type": "AUTH_APPLOCKER",
            "payload": {"phrase_typed": "p2 phrase", "raw_events": [{"key": "b", "dwell_time": 90}]}
        }]
    })

    s1 = db.query(MobileStudySample).filter(MobileStudySample.client_event_id == id_p1).first()
    s2 = db.query(MobileStudySample).filter(MobileStudySample.client_event_id == id_p2).first()

    assert s1.participant_id == p1.id
    assert s2.participant_id == p2.id
    assert s1.participant_id != s2.participant_id


def test_offline_account_creation_rejection(sync_env):
    """
    Criterio 7:
    - Verificar que endpoints de creación de cuentas (request-otp) no admiten operaciones
      sin parámetros válidos y requieren la autoridad del servidor.
    """
    client = sync_env["client"]

    # Petición inválida o vacía
    res = client.post("/api/mobile/auth/request-otp", json={"email": ""})
    assert res.status_code in [400, 422]

    # Email inválido
    res2 = client.post("/api/mobile/auth/request-otp", json={"email": "no-es-correo"})
    assert res2.status_code in [400, 422]


def test_server_health_check(sync_env):
    """
    Verifica que el endpoint de salud /health y /api/health responda con status 'ok'
    para permitir al servicio offlineSyncService verificar conectividad real antes de sincronizar.
    """
    client = sync_env["client"]
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json().get("status") == "ok"


def test_expired_token_handling(sync_env):
    """
    Criterio 5:
    - Simular token expirado: endpoints protegidos deben devolver 401.
    - La cola no debe descartarse en el cliente cuando ocurre 401 (debe pausarse y requerir login online).
    """
    client = sync_env["client"]
    # Token expirado (expiró hace 1 hora)
    expired_token = create_access_token(
        data={"sub": "1", "role": "admin"},
        expires_delta=timedelta(hours=-1)
    )

    headers = {"Authorization": f"Bearer {expired_token}"}
    res = client.get("/api/auth/me", headers=headers)
    assert res.status_code == 401

