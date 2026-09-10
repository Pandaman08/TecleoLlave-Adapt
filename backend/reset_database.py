"""
reset_database.py — Script para vaciar completamente la base de datos y los modelos antiguos,
dejando el sistema limpio y listo para enrolar con el modelo óptimo.
"""
import os
import sys
import glob
import sqlite3

# Configurar stdout para evitar errores en Windows CLI
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from app.database import Base, engine, SessionLocal, init_db
from app.models.user import User
from app.services.auth_service import auth_service
from migrate_add_role import migrate


def reset_database():
    print("[*] Iniciando limpieza total de base de datos y modelos entrenados...")

    db_path = os.getenv("DB_PATH", os.path.join(BASE_DIR, "tecleollave.db"))
    models_dir = os.getenv("MODELS_DIR", os.path.join(BASE_DIR, "models"))

    # 1. Eliminar archivos de modelos .joblib y metadata previa
    if os.path.exists(models_dir):
        model_files = glob.glob(os.path.join(models_dir, "*.*"))
        for f in model_files:
            try:
                os.remove(f)
            except Exception as e:
                print(f"[-] No se pudo eliminar {f}: {e}")
        print(f"[+] Se eliminaron {len(model_files)} archivos de modelos antiguos en: {models_dir}")
    else:
        os.makedirs(models_dir, exist_ok=True)

    # 2. Cerrar conexiones activas de SQLite y reiniciar tablas
    if os.path.exists(db_path):
        try:
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            # Desactivar foreign keys temporalmente para vaciar tablas
            cursor.execute("PRAGMA foreign_keys = OFF;")
            tables = [row[0] for row in cursor.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall() if not row[0].startswith("sqlite_")]
            for table in tables:
                cursor.execute(f"DROP TABLE IF EXISTS {table};")
            conn.commit()
            conn.close()
            print(f"[+] Tablas anteriores eliminadas correctamente en: {db_path}")
        except Exception as e:
            print(f"[-] Error limpiando tablas: {e}")

    # 3. Crear esquema de base de datos actualizado
    print("[*] Creando estructura de base de datos limpia...")
    init_db()
    migrate()

    # 4. Crear usuario administrador por defecto
    print("[*] Creando usuario Administrador limpio...")
    db = SessionLocal()
    try:
        admin_user = auth_service.create_admin_user(db, username="admin", password="AdminSecret123")
        print(f"[+] Administrador creado exitosamente:")
        print(f"    - Usuario: {admin_user.username}")
        print(f"    - Contraseña: AdminSecret123")
        print(f"    - Rol: {admin_user.role}")
        print(f"    - Biometría: Deshabilitada (Rol admin)")
    except Exception as e:
        print(f"[-] Error creando admin: {e}")
    finally:
        db.close()

    print("\n[✓] ¡Base de datos vaciada y reiniciada exitosamente!")
    print("[✓] Ahora puedes registrar a tu usuario desde cero.")


if __name__ == "__main__":
    reset_database()
