import hashlib
import secrets
from datetime import datetime, timedelta
from jose import jwt
import bcrypt
from app.config import settings


def _is_legacy_sha256_hash(hashed_password: str) -> bool:
    """Los hashes SHA256 (legado, sin sal) son hex de 64 caracteres."""
    return len(hashed_password) == 64 and all(c in "0123456789abcdef" for c in hashed_password.lower())


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifica una contraseña contra su hash.
    Soporta hashes bcrypt (nuevos) y SHA256 (usuarios creados antes de este fix),
    para no invalidar cuentas existentes.
    """
    if _is_legacy_sha256_hash(hashed_password):
        return hashlib.sha256(plain_password.encode()).hexdigest() == hashed_password
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except ValueError:
        return False


def get_password_hash(password: str) -> str:
    """Hashea una contraseña con bcrypt (con sal y factor de costo)."""
    password_bytes = password.encode("utf-8")[:72]
    hashed = bcrypt.hashpw(password_bytes, bcrypt.gensalt())
    return hashed.decode("utf-8")


def create_access_token(data: dict, expires_delta: timedelta = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def decode_token(token: str) -> dict:
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])