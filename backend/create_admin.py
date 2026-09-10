"""
create_admin.py — Script CLI para la creación de usuarios Administradores.

Uso por línea de comandos:
    python backend/create_admin.py --username admin --password <contraseña_segura>

Uso interactivo (solicita contraseña oculta si no se especifica):
    python backend/create_admin.py --username admin

En Docker:
    docker compose exec backend python create_admin.py --username admin --password <contraseña_segura>
"""
import argparse
import getpass
import sys
import os

# Configurar encoding utf-8 para Windows CLI
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Asegurar que el backend esté en el path de Python
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from app.database import SessionLocal, init_db
from app.models import User
from app.services.auth_service import auth_service


def main():
    parser = argparse.ArgumentParser(
        description="Crear un usuario administrador en TecleoLlave-Adapt (sin biometría)."
    )
    parser.add_argument(
        "--username", "-u",
        type=str,
        help="Nombre de usuario del administrador (ej. admin)"
    )
    parser.add_argument(
        "--password", "-p",
        type=str,
        help="Contraseña para el administrador"
    )

    args = parser.parse_args()

    username = args.username
    if not username:
        try:
            username = input("Ingrese el nombre de usuario para el Administrador [admin]: ").strip()
            if not username:
                username = "admin"
        except (KeyboardInterrupt, EOFError):
            print("\nOperacion cancelada.")
            sys.exit(1)

    password = args.password
    if not password:
        try:
            password = getpass.getpass(f"Ingrese la contraseña para '{username}': ")
            confirm = getpass.getpass("Confirme la contraseña: ")
            if password != confirm:
                print("[-] Las contraseñas no coinciden.")
                sys.exit(1)
        except (KeyboardInterrupt, EOFError):
            print("\nOperacion cancelada.")
            sys.exit(1)

    if len(password) < 6:
        print("[-] La contraseña debe tener al menos 6 caracteres.")
        sys.exit(1)

    # Asegurar que la estructura de la base de datos esté lista
    init_db()

    db = SessionLocal()
    try:
        # Verificar si ya existe
        existing = db.query(User).filter(User.username == username).first()
        if existing:
            if existing.role == "admin":
                print(f"[!] El usuario '{username}' ya existe y ya tiene rol 'admin'.")
            else:
                print(f"[!] El usuario '{username}' ya existe con rol '{existing.role}'. Actualizando a 'admin'...")
                existing.role = "admin"
                db.commit()
                print(f"[+] Usuario '{username}' actualizado a rol 'admin' exitosamente.")
            return

        # Crear nuevo admin usando el servicio
        admin_user = auth_service.create_admin_user(db, username=username, password=password)
        print(f"[+] Usuario Administrador creado exitosamente:")
        print(f"    - ID: {admin_user.id}")
        print(f"    - Usuario: {admin_user.username}")
        print(f"    - Rol: {admin_user.role}")
        print(f"    - Biometría: Deshabilitada (Rol admin)")
        print(f"[i] El administrador puede iniciar sesion en /login sin ingresar frase de tecleo.")

    except Exception as e:
        print(f"[-] Error creando usuario administrador: {e}", file=sys.stderr)
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()
