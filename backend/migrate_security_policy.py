"""
Migración idempotente para la tabla users y la nueva tabla security_policies.
Agrega failed_attempts, locked_until y last_failed_at a users si no existen,
y asegura la creación y registro por defecto de security_policies.
"""
from sqlalchemy import text
from app.database import engine, Base, SessionLocal
from app.models.security_policy import SecurityPolicy
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def migrate_security_policy():
    # 1. Crear tablas faltantes (security_policies)
    Base.metadata.create_all(bind=engine)
    logger.info("Verificación de tablas Base.metadata.create_all() completada.")

    with engine.connect() as conn:
        # 2. Verificar columnas en tabla users
        cursor = conn.execute(text("PRAGMA table_info(users)"))
        columns = [row[1] for row in cursor.fetchall()]
        logger.info(f"Columnas actuales en users: {columns}")

        if "failed_attempts" not in columns:
            logger.info("Agregando columna 'failed_attempts' a users...")
            conn.execute(text("ALTER TABLE users ADD COLUMN failed_attempts INTEGER NOT NULL DEFAULT 0"))
            conn.commit()
            logger.info("Columna 'failed_attempts' agregada exitosamente.")

        if "locked_until" not in columns:
            logger.info("Agregando columna 'locked_until' a users...")
            conn.execute(text("ALTER TABLE users ADD COLUMN locked_until DATETIME"))
            conn.commit()
            logger.info("Columna 'locked_until' agregada exitosamente.")

        if "last_failed_at" not in columns:
            logger.info("Agregando columna 'last_failed_at' a users...")
            conn.execute(text("ALTER TABLE users ADD COLUMN last_failed_at DATETIME"))
            conn.commit()
            logger.info("Columna 'last_failed_at' agregada exitosamente.")

    # 3. Asegurar política por defecto en security_policies
    db = SessionLocal()
    try:
        policy = db.query(SecurityPolicy).first()
        if not policy:
            logger.info("Inicializando SecurityPolicy por defecto (3 intentos, 15 min)...")
            policy = SecurityPolicy(
                max_failed_attempts=3,
                lockout_duration_minutes=15,
                is_enabled=True,
                updated_by="admin"
            )
            db.add(policy)
            db.commit()
            db.refresh(policy)
            logger.info(f"SecurityPolicy inicializada con id={policy.id}.")
        else:
            logger.info(f"SecurityPolicy existente: max_attempts={policy.max_failed_attempts}, duration={policy.lockout_duration_minutes}m")
    finally:
        db.close()

    logger.info("Migración de seguridad y bloqueo completada exitosamente.")


if __name__ == "__main__":
    migrate_security_policy()
