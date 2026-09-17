"""
Idempotent Master Schema Migration for TECLEOLLAVE-ADAPT.
Ensures all tables and enhanced audit/versioning columns exist without data loss.
"""

from sqlalchemy import text
from app.database import engine, Base, SessionLocal
import app.models  # registers all models
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def migrate_master_schema():
    # 1. Crear tablas nuevas si no existen
    Base.metadata.create_all(bind=engine)
    logger.info("Verificación de Base.metadata.create_all() completada.")

    with engine.connect() as conn:
        # --- MODEL_VERSIONS ---
        cursor_mv = conn.execute(text("PRAGMA table_info(model_versions)"))
        mv_cols = [row[1] for row in cursor_mv.fetchall()]

        new_mv_cols = [
            ("version", "INTEGER"),
            ("parent_version_id", "INTEGER"),
            ("status", "VARCHAR(30) DEFAULT 'ACTIVE'"),
            ("far", "FLOAT"),
            ("frr", "FLOAT"),
            ("eer", "FLOAT"),
            ("auc", "FLOAT"),
            ("artifact_path", "VARCHAR(500)"),
            ("training_samples", "INTEGER")
        ]
        for col_name, col_type in new_mv_cols:
            if col_name not in mv_cols:
                logger.info(f"Agregando columna '{col_name}' a model_versions...")
                conn.execute(text(f"ALTER TABLE model_versions ADD COLUMN {col_name} {col_type}"))
                conn.commit()

        # --- AUTH_ATTEMPTS ---
        cursor_aa = conn.execute(text("PRAGMA table_info(auth_attempts)"))
        aa_cols = [row[1] for row in cursor_aa.fetchall()]

        new_aa_cols = [
            ("threshold_low", "FLOAT DEFAULT 0.45"),
            ("threshold_high", "FLOAT DEFAULT 0.75"),
            ("requires_2fa", "BOOLEAN DEFAULT 0"),
            ("ip_address", "VARCHAR(50)"),
            ("user_agent", "VARCHAR(255)"),
            ("reason", "VARCHAR(500)")
        ]
        for col_name, col_type in new_aa_cols:
            if col_name not in aa_cols:
                logger.info(f"Agregando columna '{col_name}' a auth_attempts...")
                conn.execute(text(f"ALTER TABLE auth_attempts ADD COLUMN {col_name} {col_type}"))
                conn.commit()

        # --- ADAPTATION_EVENTS ---
        cursor_ae = conn.execute(text("PRAGMA table_info(adaptation_events)"))
        ae_cols = [row[1] for row in cursor_ae.fetchall()]

        new_ae_cols = [
            ("current_far", "FLOAT"),
            ("candidate_far", "FLOAT"),
            ("current_frr", "FLOAT"),
            ("candidate_frr", "FLOAT"),
            ("epsilon", "FLOAT"),
            ("decision", "VARCHAR(50)")
        ]
        for col_name, col_type in new_ae_cols:
            if col_name not in ae_cols:
                logger.info(f"Agregando columna '{col_name}' a adaptation_events...")
                conn.execute(text(f"ALTER TABLE adaptation_events ADD COLUMN {col_name} {col_type}"))
                conn.commit()

        # --- SECURITY_POLICIES ---
        cursor_sp = conn.execute(text("PRAGMA table_info(security_policies)"))
        sp_cols = [row[1] for row in cursor_sp.fetchall()]

        new_sp_cols = [
            ("threshold_low", "FLOAT DEFAULT 0.45"),
            ("threshold_high", "FLOAT DEFAULT 0.75"),
            ("epsilon", "FLOAT DEFAULT 0.02"),
            ("adaptation_window", "INTEGER DEFAULT 50"),
            ("minimum_samples", "INTEGER DEFAULT 10"),
            ("rate_limit_attempts", "INTEGER DEFAULT 5"),
            ("rate_limit_window_seconds", "INTEGER DEFAULT 300"),
            ("retention_days", "INTEGER DEFAULT 90")
        ]
        for col_name, col_type in new_sp_cols:
            if col_name not in sp_cols:
                logger.info(f"Agregando columna '{col_name}' a security_policies...")
                conn.execute(text(f"ALTER TABLE security_policies ADD COLUMN {col_name} {col_type}"))
                conn.commit()

    logger.info("Migración Master Schema completada exitosamente.")


if __name__ == "__main__":
    migrate_master_schema()
