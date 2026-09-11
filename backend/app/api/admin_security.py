from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

from app.database import get_db
from app.models.user import User
from app.utils.security import decode_token
from app.services.security_service import security_service

router = APIRouter(prefix="/admin/security", tags=["admin-security"])


class SecurityPolicyUpdate(BaseModel):
    max_failed_attempts: int = Field(..., ge=1, le=20, description="Máximo número de intentos fallidos permitidos")
    lockout_duration_seconds: Optional[int] = Field(None, ge=5, le=86400, description="Duración del bloqueo temporal en segundos")
    lockout_duration_minutes: Optional[int] = Field(None, ge=1, le=1440, description="Duración del bloqueo temporal en minutos")
    is_enabled: bool = Field(True, description="Indica si la política de bloqueo está activa")


def get_current_admin(request: Request, db: Session = Depends(get_db)) -> User:
    """Valida que el token pertenezca a un usuario con rol de Administrador."""
    auth_header = request.headers.get("authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de autenticación no proporcionado"
        )
    token = auth_header.split(" ", 1)[1]
    try:
        payload = decode_token(token)
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token sin identificador de usuario")
        user = db.query(User).filter(User.id == int(user_id)).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")
        if getattr(user, "role", "user") != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acceso restringido: Se requieren permisos de Administrador para configurar políticas de seguridad."
            )
        return user
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Token inválido: {e}")


@router.get("/policy")
def get_security_policy(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Consulta la política de seguridad global de bloqueo de frase (Solo Administrador)."""
    import math
    policy = security_service.get_security_policy(db)
    sec = getattr(policy, "lockout_duration_seconds", None) or (policy.lockout_duration_minutes * 60 if policy.lockout_duration_minutes else 15)
    return {
        "id": policy.id,
        "max_failed_attempts": policy.max_failed_attempts,
        "lockout_duration_seconds": sec,
        "lockout_duration_minutes": max(1, math.ceil(sec / 60)),
        "is_enabled": policy.is_enabled,
        "updated_at": policy.updated_at.isoformat() if policy.updated_at else None,
        "updated_by": policy.updated_by
    }


@router.put("/policy")
def update_security_policy(
    data: SecurityPolicyUpdate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Actualiza la política de seguridad global (Solo Administrador)."""
    import math
    sec = data.lockout_duration_seconds
    if sec is None and data.lockout_duration_minutes is not None:
        sec = data.lockout_duration_minutes * 60
    sec = sec or 15

    policy = security_service.update_security_policy(
        db=db,
        max_failed_attempts=data.max_failed_attempts,
        lockout_duration_seconds=sec,
        is_enabled=data.is_enabled,
        updated_by=admin.username
    )
    time_desc = f"{sec} seg" if sec < 60 else f"{round(sec / 60, 1)} min"
    return {
        "success": True,
        "message": f"Política de seguridad actualizada: Máx. {policy.max_failed_attempts} intentos, bloqueo de {time_desc}.",
        "policy": {
            "id": policy.id,
            "max_failed_attempts": policy.max_failed_attempts,
            "lockout_duration_seconds": sec,
            "lockout_duration_minutes": max(1, math.ceil(sec / 60)),
            "is_enabled": policy.is_enabled,
            "updated_at": policy.updated_at.isoformat() if policy.updated_at else None,
            "updated_by": policy.updated_by
        }
    }


@router.get("/users-status")
def get_users_security_status(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Obtiene el listado de usuarios con sus intentos fallidos y estado de bloqueo (Solo Administrador)."""
    users_status = security_service.get_users_security_status(db)
    return users_status


@router.post("/unlock-user/{user_id}")
def unlock_user(
    user_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Desbloquea manualmente a un usuario bloqueado (Solo Administrador)."""
    try:
        user = security_service.admin_unlock_user(db, user_id)
        return {
            "success": True,
            "message": f"Cuenta de '{user.username}' desbloqueada exitosamente por el administrador.",
            "user_id": user.id,
            "username": user.username
        }
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
