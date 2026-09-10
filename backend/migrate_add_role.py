"""
Script de migración idempotente para agregar la columna 'role' a la tabla 'users'.
Compatible con SQLite y seguro para ejecutar múltiples veces.
"""
import os
import sqlite3
import sys

# Configurar stdout para evitar errores de codificación en Windows
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

def get_db_path():
    env_path = os.getenv("DB_PATH")
    if env_path:
        return env_path
    
    # Ruta por defecto en backend/tecleollave.db
    base_dir = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(base_dir, "tecleollave.db")

def migrate():
    db_path = get_db_path()
    print(f"[*] Verificando base de datos SQLite en: {db_path}")

    if not os.path.exists(db_path):
        print("[i] Base de datos no encontrada aun. Se creara al iniciar la aplicacion.")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # Verificar si la tabla 'users' existe
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
        if not cursor.fetchone():
            print("[i] Tabla 'users' no existe aun. init_db() la creara con la estructura actualizada.")
            return

        # Consultar columnas existentes en 'users'
        cursor.execute("PRAGMA table_info(users)")
        columns = [row[1] for row in cursor.fetchall()]

        if "role" not in columns:
            print("[+] Columna 'role' no encontrada. Aplicando ALTER TABLE...")
            cursor.execute("ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'user'")
            conn.commit()
            print("[+] Columna 'role' agregada exitosamente con valor por defecto 'user'.")
        else:
            print("[+] Columna 'role' ya existe en la tabla 'users'. No se requieren cambios de esquema.")

        # Asegurar que ningún registro existente tenga rol nulo o vacío
        cursor.execute("UPDATE users SET role = 'user' WHERE role IS NULL OR role = ''")
        updated_rows = cursor.rowcount
        conn.commit()
        if updated_rows > 0:
            print(f"[+] Se actualizaron {updated_rows} usuarios existentes a role='user'.")

        # Mostrar estado actual de usuarios y roles
        cursor.execute("SELECT id, username, role FROM users")
        users = cursor.fetchall()
        print(f"[*] Usuarios actuales en la base de datos ({len(users)}):")
        for u_id, uname, urole in users:
            print(f"   - ID: {u_id:2d} | Usuario: {uname:15s} | Rol: {urole}")

    except Exception as e:
        print(f"[-] Error durante la migracion: {e}", file=sys.stderr)
        sys.exit(1)
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
