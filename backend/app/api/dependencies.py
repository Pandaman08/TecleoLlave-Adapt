from fastapi import Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.utils.security import decode_token

ROLE_USER = "user"
ROLE_ADMIN = "admin"


def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    """
    Extrae y valida el token JWT de la cabecera Authorization (Bearer).
    Retorna la instancia del usuario autenticado.
    """
    auth_header = request.headers.get("authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de autenticación no proporcionado o formato inválido",
            headers={"WWW-Authenticate": "Bearer"}
        )
    token = auth_header.split(" ", 1)[1]
    try:
        payload = decode_token(token)
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token sin identificador de usuario válido"
            )
        user = db.query(User).filter(User.id == int(user_id)).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuario no encontrado en la base de datos"
            )
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cuenta de usuario desactivada"
            )
        return user
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token inválido o expirado: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"}
        )


def get_current_admin(current_user: User = Depends(get_current_user)) -> User:
    """
    Valida que el usuario autenticado posea estrictamente el rol 'admin'.
    Rechaza usuarios estándar con código HTTP 403 Forbidden.
    """
    if getattr(current_user, "role", "user") != ROLE_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso restringido: Se requieren permisos de Administrador para este recurso."
        )
    return current_user


def get_current_student(current_user: User = Depends(get_current_user)) -> User:
    """
    Valida que el usuario autenticado posea el rol 'user' (estudiante del aula virtual).
    """
    if getattr(current_user, "role", "user") != ROLE_USER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso restringido: Este módulo es exclusivo para estudiantes del Aula Virtual."
        )
    return current_user
