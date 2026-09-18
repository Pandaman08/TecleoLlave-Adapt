#!/usr/bin/env python3
"""
system_diagnostic.py — Herramienta de Auditoría y Diagnóstico Integral del Sistema TECLEOLLAVE-ADAPT
Realiza la verificación de integridad de:
1. Base de datos SQLite y esquema maestro relacional.
2. Campos extendidos (email, edad, carrera, rol RBAC).
3. Existencia de cuenta de Administrador de Investigación.
4. Modelos biométricos entrenados en disco y persistencia de versiones.
5. Políticas de seguridad y motor de defensa anti-envenenamiento.
6. Estado de cohortes demográficas por edad.
"""

import sys
import os
import json
import sqlite3

# Configurar encoding UTF-8
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from sqlalchemy import text
from app.database import engine, SessionLocal
from app.models import User, ModelVersion, AuthAttempt, SecurityPolicy, TypingSample


def run_diagnostic():
    print("=" * 70)
    print("   TECLEOLLAVE-ADAPT: AUDITORÍA Y DIAGNÓSTICO INTEGRAL (FASE 7)")
    print("=" * 70)

    issues = []
    checks_passed = 0

    # 1. Base de datos
    db_path = os.path.join(BASE_DIR, "tecleollave.db")
    if os.path.exists(db_path):
        print(f"[OK] Archivo de Base de Datos encontrado: {db_path} ({os.path.getsize(db_path) / 1024:.1f} KB)")
        checks_passed += 1
    else:
        print(f"[WARN] Archivo tecleollave.db no encontrado en {db_path}.")

    # 2. Conexión SQLAlchemy y verificación de tablas
    session = SessionLocal()
    try:
        required_tables = [
            "users", "typing_samples", "typing_features", "auth_attempts",
            "model_versions", "candidate_models", "adaptation_events",
            "adaptation_configs", "security_policies", "quarantined_samples"
        ]
        with engine.connect() as conn:
            cursor = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table';"))
            existing_tables = [row[0] for row in cursor.fetchall()]

        missing_tables = [t for t in required_tables if t not in existing_tables]
        if not missing_tables:
            print(f"[OK] Integridad Relacional: Todas las {len(required_tables)} tablas requeridas están presentes.")
            checks_passed += 1
        else:
            msg = f"Tablas faltantes: {missing_tables}"
            print(f"[FAIL] {msg}")
            issues.append(msg)

        # 3. Columnas maestras en Users
        with engine.connect() as conn:
            cursor_u = conn.execute(text("PRAGMA table_info(users);"))
            u_cols = [row[1] for row in cursor_u.fetchall()]

        req_u_cols = ["email", "age", "career", "role", "student_code"]
        missing_u_cols = [c for c in req_u_cols if c not in u_cols]
        if not missing_u_cols:
            print(f"[OK] Esquema de Usuario: Columnas de investigación presentes ({', '.join(req_u_cols)}).")
            checks_passed += 1
        else:
            msg = f"Columnas faltantes en users: {missing_u_cols}"
            print(f"[FAIL] {msg}")
            issues.append(msg)

        # 4. Verificación de Administrador
        admins = session.query(User).filter(User.role == "admin").all()
        if admins:
            print(f"[OK] Administrador de Investigación registrado: {[a.username for a in admins]}")
            checks_passed += 1
        else:
            print("[INFO] No se encontró usuario admin por defecto. Se puede crear con create_admin.py.")

        # 5. Población de Estudiantes y Métricas de Demografía
        students = session.query(User).filter(User.role != "admin").all()
        print(f"[INFO] Estudiantes matriculados: {len(students)}")
        if students:
            with_age = [s for s in students if s.age is not None]
            with_email = [s for s in students if s.email is not None]
            print(f"       - Con edad registrada: {len(with_age)}/{len(students)}")
            print(f"       - Con email registrado: {len(with_email)}/{len(students)}")
            checks_passed += 1

        # 6. Modelos Biométricos
        models = session.query(ModelVersion).filter(ModelVersion.is_active == True).all()
        print(f"[INFO] Modelos biométricos activos en base de datos: {len(models)}")
        models_dir = os.path.join(BASE_DIR, "models")
        if os.path.exists(models_dir):
            files = [f for f in os.listdir(models_dir) if f.endswith(".pkl") or f.endswith(".joblib")]
            print(f"[OK] Directorio de artefactos ML 'models/': {len(files)} archivos serializados.")
            checks_passed += 1

        # 7. Políticas de Seguridad
        policy = session.query(SecurityPolicy).first()
        if policy:
            print(f"[OK] Política de Seguridad activa: max_intentos={policy.max_failed_attempts}, bloqueo={getattr(policy, 'lockout_duration_seconds', 30)}s")
            checks_passed += 1
        else:
            print("[WARN] No se encontró registro en security_policies (se autogenerará en primer uso).")

    except Exception as e:
        msg = f"Error durante la ejecución del diagnóstico: {e}"
        print(f"[ERROR] {msg}")
        issues.append(msg)
    finally:
        session.close()

    print("-" * 70)
    if not issues:
        print(f"[RESULTADO] DIAGNÓSTICO SATISFACTORIO: {checks_passed} chequeos superados con éxito. 0 anomalías.")
        return 0
    else:
        print(f"[RESULTADO] Se detectaron {len(issues)} observaciones.")
        return 1


if __name__ == "__main__":
    code = run_diagnostic()
    sys.exit(code)
