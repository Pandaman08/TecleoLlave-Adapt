from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Tuple, Optional, Dict, Any, List
import math

from app.models.user import User
from app.models.security_policy import SecurityPolicy


class SecurityService:
    def get_security_policy(self, db: Session) -> SecurityPolicy:
        """Obtiene la política de seguridad global o inicializa una por defecto."""
        policy = db.query(SecurityPolicy).first()
        if not policy:
            policy = SecurityPolicy(
                max_failed_attempts=3,
                lockout_duration_minutes=15,
                is_enabled=True,
                updated_by="admin"
            )
            db.add(policy)
            db.commit()
            db.refresh(policy)
        return policy

    def update_security_policy(
        self,
        db: Session,
        max_failed_attempts: int,
        lockout_duration_minutes: int,
        is_enabled: bool,
        updated_by: str = "admin"
    ) -> SecurityPolicy:
        """Actualiza la política de seguridad (exclusivo para administradores)."""
        policy = self.get_security_policy(db)
        policy.max_failed_attempts = max(1, min(20, int(max_failed_attempts)))
        policy.lockout_duration_minutes = max(1, min(1440, int(lockout_duration_minutes)))
        policy.is_enabled = bool(is_enabled)
        policy.updated_by = updated_by
        policy.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(policy)
        return policy

    def check_user_lockout(self, db: Session, user: User) -> Tuple[bool, Optional[str], Optional[int]]:
        """
        Verifica si el usuario está actualmente en período de bloqueo.
        Retorna (is_locked, mensaje_alerta, minutos_restantes).
        Si el tiempo de bloqueo ya expiró, desbloquea automáticamente al usuario.
        """
        policy = self.get_security_policy(db)
        if not policy.is_enabled:
            return False, None, None

        if not user.locked_until:
            return False, None, None

        now = datetime.utcnow()
        if user.locked_until > now:
            remaining_seconds = (user.locked_until - now).total_seconds()
            remaining_minutes = max(1, math.ceil(remaining_seconds / 60))
            msg = (
                f"Cuenta bloqueada temporalmente por intentos fallidos de tecleo en la frase de seguridad. "
                f"Podrás volver a intentar en {remaining_minutes} minuto(s) o solicita el desbloqueo al administrador."
            )
            return True, msg, remaining_minutes
        else:
            # El período de bloqueo ha expirado -> desbloquear automáticamente
            user.failed_attempts = 0
            user.locked_until = None
            db.commit()
            return False, None, None

    def register_phrase_failure(self, db: Session, user: User) -> Dict[str, Any]:
        """
        Registra un fallo en la frase/biometría de tecleo.
        Si alcanza max_failed_attempts, bloquea la cuenta por lockout_duration_minutes.
        """
        policy = self.get_security_policy(db)
        if not policy.is_enabled or user.role == "admin":
            return {
                "is_locked": False,
                "failed_attempts": 0,
                "remaining_attempts": None,
                "message": "Acceso denegado: El patrón biométrico de tecleo no coincide."
            }

        user.failed_attempts = (user.failed_attempts or 0) + 1
        user.last_failed_at = datetime.utcnow()

        if user.failed_attempts >= policy.max_failed_attempts:
            user.locked_until = datetime.utcnow() + timedelta(minutes=policy.lockout_duration_minutes)
            db.commit()
            db.refresh(user)
            return {
                "is_locked": True,
                "failed_attempts": user.failed_attempts,
                "remaining_attempts": 0,
                "locked_until": user.locked_until.isoformat(),
                "lockout_duration_minutes": policy.lockout_duration_minutes,
                "message": (
                    f"Cuenta bloqueada temporalmente por exceder el límite de {policy.max_failed_attempts} intentos fallidos en la frase. "
                    f"Bloqueo activo por {policy.lockout_duration_minutes} minutos."
                )
            }
        else:
            remaining = policy.max_failed_attempts - user.failed_attempts
            db.commit()
            db.refresh(user)
            return {
                "is_locked": False,
                "failed_attempts": user.failed_attempts,
                "remaining_attempts": remaining,
                "message": (
                    f"Acceso denegado: El patrón biométrico de tecleo no coincide. "
                    f"Te queda(n) {remaining} intento(s) antes del bloqueo temporal."
                )
            }

    def reset_phrase_failures(self, db: Session, user: User) -> None:
        """Resetea el contador de fallos tras una autenticación biométrica exitosa."""
        if user.failed_attempts > 0 or user.locked_until is not None:
            user.failed_attempts = 0
            user.locked_until = None
            db.commit()

    def admin_unlock_user(self, db: Session, user_id: int) -> User:
        """Desbloqueo manual forzado ejecutado por un Administrador."""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError(f"Usuario con id {user_id} no encontrado")
        user.failed_attempts = 0
        user.locked_until = None
        user.last_failed_at = None
        db.commit()
        db.refresh(user)
        return user

    def get_users_security_status(self, db: Session) -> List[Dict[str, Any]]:
        """Retorna el estado de seguridad y bloqueo de todos los usuarios registrados (solo rol user)."""
        users = db.query(User).filter(User.role != "admin").all()
        now = datetime.utcnow()
        results = []

        for u in users:
            is_locked = False
            remaining_minutes = 0
            if u.locked_until and u.locked_until > now:
                is_locked = True
                remaining_minutes = max(1, math.ceil((u.locked_until - now).total_seconds() / 60))

            results.append({
                "id": u.id,
                "username": u.username,
                "role": u.role,
                "is_active": u.is_active,
                "failed_attempts": u.failed_attempts or 0,
                "is_locked": is_locked,
                "locked_until": u.locked_until.isoformat() if u.locked_until else None,
                "remaining_minutes": remaining_minutes,
                "last_failed_at": u.last_failed_at.isoformat() if u.last_failed_at else None
            })

        return results


security_service = SecurityService()
