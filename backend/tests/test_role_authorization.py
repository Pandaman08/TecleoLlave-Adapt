"""
Tests for Role-Based Access Control (RBAC) & Authorization:
- ROLE_USER (Students) vs ROLE_ADMIN (Administrators)
- Endpoints requiring admin permissions reject standard students with HTTP 403 Forbidden.
- Unauthenticated requests to protected endpoints return HTTP 401 Unauthorized.
- Admin token grants full access to administrative endpoints.
- Admin accounts are excluded from biometric behavioral enrollment and typing authentication (HTTP 400).
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.models.user import User
from app.models.security_policy import SecurityPolicy
from app.utils.security import get_password_hash, create_access_token


@pytest.fixture
def auth_client():
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

    # 1. Standard Student / User
    student = User(
        username="estudiante_1",
        password_hash=get_password_hash("password123"),
        phrase="La seguridad protege la información",
        role="user",
        is_active=True
    )
    session.add(student)

    # 2. Administrator
    admin = User(
        username="admin_supremo",
        password_hash=get_password_hash("AdminSecret123"),
        phrase="[ADMIN - SIN BIOMETRIA]",
        role="admin",
        is_active=True
    )
    session.add(admin)

    session.commit()
    session.refresh(student)
    session.refresh(admin)

    def override_get_db():
        try:
            yield session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db

    client = TestClient(app)

    student_token = create_access_token(data={"sub": str(student.id), "role": "user"})
    admin_token = create_access_token(data={"sub": str(admin.id), "role": "admin"})

    yield client, student, admin, student_token, admin_token

    app.dependency_overrides.clear()
    session.close()
    test_engine.dispose()


def test_unauthenticated_access_rejected(auth_client):
    client, student, admin, student_token, admin_token = auth_client

    # Without Authorization header -> 401 Unauthorized
    res = client.get("/api/admin/security/policy")
    assert res.status_code == 401

    res_users = client.get("/api/dashboard/users")
    assert res_users.status_code == 401


def test_student_cannot_access_admin_endpoints(auth_client):
    client, student, admin, student_token, admin_token = auth_client
    student_headers = {"Authorization": f"Bearer {student_token}"}

    # Student trying to read security policy -> 403 Forbidden
    res = client.get("/api/admin/security/policy", headers=student_headers)
    assert res.status_code == 403
    assert "restringido" in res.json()["detail"].lower() or "administrador" in res.json()["detail"].lower()

    # Student trying to view users list -> 403 Forbidden
    res_users = client.get("/api/dashboard/users", headers=student_headers)
    assert res_users.status_code == 403

    # Student trying to view quarantine -> 403 Forbidden
    res_quarantine = client.get(f"/api/adaptive/quarantine/{student.id}", headers=student_headers)
    assert res_quarantine.status_code == 403


def test_admin_can_access_admin_endpoints(auth_client):
    client, student, admin, student_token, admin_token = auth_client
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Admin reading security policy -> 200 OK
    res = client.get("/api/admin/security/policy", headers=admin_headers)
    assert res.status_code == 200
    assert "max_failed_attempts" in res.json()

    # Admin listing registered users -> 200 OK
    res_users = client.get("/api/dashboard/users", headers=admin_headers)
    assert res_users.status_code == 200
    assert isinstance(res_users.json(), list)


def test_admin_blocked_from_biometric_typing_enrollment(auth_client):
    client, student, admin, student_token, admin_token = auth_client

    # Attempt to enroll admin with biometric keystrokes
    res = client.post("/api/typing/enroll", json={
        "username": admin.username,
        "raw_timestamps": [
            {"key": "a", "keydown_ts": 100, "keyup_ts": 180}
        ],
        "phrase_typed": "La seguridad protege la información"
    })
    assert res.status_code == 400
    assert "administrador no utiliza biometría" in res.json()["detail"].lower()
