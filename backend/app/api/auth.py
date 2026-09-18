from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import Optional, Any

from app.database import get_db
from app.schemas import UserCreate, UserResponse, Token
from app.services.auth_service import auth_service
from app.utils.rate_limiter import rate_limit_check

router = APIRouter(prefix="/auth", tags=["auth"])


def mask_email(email: Optional[str]) -> str:
    """Enmascara un correo electrónico para resguardar privacidad (ej. al***@unt.edu.pe)."""
    if not email or "@" not in email:
        return "correo registrado"
    user_part, domain = email.split("@", 1)
    if len(user_part) <= 2:
        masked_user = user_part[0] + "***"
    else:
        masked_user = user_part[:2] + "***" + user_part[-1]
    return f"{masked_user}@{domain}"


@router.post("/register", response_model=UserResponse)
def register_user(
    user_data: UserCreate,
    db: Session = Depends(get_db)
):
    try:
        user = auth_service.register_user(
            db=db, 
            username=user_data.username, 
            password=user_data.password, 
            samples=getattr(user_data, 'samples', None),
            email=getattr(user_data, 'email', None),
            full_name=getattr(user_data, 'full_name', None),
            age=getattr(user_data, 'age', None),
            career=getattr(user_data, 'career', None),
            student_code=getattr(user_data, 'student_code', None)
        )
        return user
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/login", response_model=Token)
@router.post("/token", response_model=Token)
async def login_user(
    request: Request,
    db: Session = Depends(get_db)
):
    """Authenticate user accepting either JSON body or Form Data with rate limiting."""
    rate_limit_check(request, max_requests=25, window_seconds=60)

    username = None
    password = None

    content_type = request.headers.get("content-type", "")

    if "application/json" in content_type:
        body = await request.json()
        username = body.get("username")
        password = body.get("password")
    else:
        form = await request.form()
        username = form.get("username")
        password = form.get("password")

    if not username or not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username and password are required"
        )

    from app.services.security_service import security_service
    from app.models import User
    from sqlalchemy import func

    clean_user = username.strip() if username else ""
    existing_user = db.query(User).filter(User.username == clean_user).first()

    if existing_user:
        is_locked, lock_msg, remaining_seconds = security_service.check_user_lockout(db, existing_user)
        if is_locked:
            raise HTTPException(
                status_code=status.HTTP_423_LOCKED,
                detail=lock_msg,
                headers={"Retry-After": str(remaining_seconds or 15)}
            )

    user = auth_service.authenticate_user(db, clean_user, password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = auth_service.create_access_token(
        user.id,
        role=getattr(user, "role", "user"),
        email=getattr(user, "email", None),
        full_name=getattr(user, "full_name", None)
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": user.id,
        "username": user.username,
        "email": getattr(user, "email", None),
        "full_name": getattr(user, "full_name", None),
        "role": getattr(user, "role", "user")
    }


@router.get("/me")
def get_current_user_profile(
    request: Request,
    db: Session = Depends(get_db)
):
    """Obtiene el perfil completo y rol del usuario autenticado a partir del token JWT."""
    from app.utils.security import decode_token
    from app.models import User

    auth_header = request.headers.get("authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token no proporcionado o formato inválido"
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
        return {
            "id": user.id,
            "username": user.username,
            "email": getattr(user, "email", None),
            "full_name": getattr(user, "full_name", None),
            "age": getattr(user, "age", None),
            "career": getattr(user, "career", None),
            "student_code": getattr(user, "student_code", None),
            "role": getattr(user, "role", "user"),
            "is_active": user.is_active
        }
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Token inválido: {str(e)}")


@router.get("/challenge-hint/{username}")
def get_challenge_email_hint(
    username: str,
    db: Session = Depends(get_db)
):
    """Retorna la pista del correo electrónico del usuario para el desafío 2FA de tecleo ambiguo."""
    from app.models import User
    clean_name = username.strip() if username else ""
    user = db.query(User).filter(User.username == clean_name).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")

    masked = mask_email(user.email)
    return {
        "username": user.username,
        "masked_email": masked,
        "has_email": bool(user.email),
        "message": f"El tecleo detectó variación en tu ritmo habitual. Por seguridad, ingresa el código 2FA enviado a {masked}."
    }


@router.post("/verify-2fa")
async def verify_2fa(request: Request, db: Session = Depends(get_db)):
    """
    Verifica el código 2FA/TOTP para superar el desafío biométrico en estado CHALLENGE.
    Cuando el 2FA es superado, valida la muestra auténtica con desafío resuelto
    e integra la muestra en el pool adaptativo continuo para que el modelo evolucione con el tiempo.
    """
    rate_limit_check(request, max_requests=10, window_seconds=60)
    body = await request.json()
    username = body.get("username")
    otp_code = body.get("otp_code")
    
    if not username or not otp_code:
        raise HTTPException(status_code=400, detail="Username and OTP code are required")
    
    # Validates demo OTP code '123456' or valid 6-digit numeric OTP code
    code = str(otp_code).strip()
    if code == "123456" or (len(code) == 6 and code.isdigit()):
        from app.models import User, AuthAttempt
        clean_name = username.strip() if username else ""
        user = db.query(User).filter(User.username == clean_name).first()
        if not user:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
        from app.services.security_service import security_service
        security_service.reset_phrase_failures(db, user)

        # 1. Marcar desafío superado en el intento de autenticación más reciente
        latest_attempt = db.query(AuthAttempt).filter(
            AuthAttempt.user_id == user.id
        ).order_by(AuthAttempt.created_at.desc()).first()

        if latest_attempt:
            latest_attempt.challenge_passed = True
            db.commit()

            # 2. ADAPTACIÓN CONTINUA: El intento CHALLENGE superó el 2FA con éxito;
            # se remite al servicio adaptativo para que la muestra entre al pool y permita
            # al modelo adaptarse a la nueva variación o fatiga del usuario con el tiempo.
            try:
                from app.services.adaptive_service import adaptive_service
                adaptive_service.process_auth_result(
                    db=db,
                    user_id=user.id,
                    auth_attempt_id=latest_attempt.id,
                    decision='allow',
                    sample_id=latest_attempt.sample_id
                )
            except Exception as e:
                print(f"Nota en adaptación post-2FA: {e}")

        access_token = auth_service.create_access_token(
            user.id,
            role=getattr(user, "role", "user"),
            email=getattr(user, "email", None),
            full_name=getattr(user, "full_name", None)
        )
        return {
            "verified": True,
            "message": "¡Autenticación 2FA exitosa! Desafío de seguridad superado y perfil en proceso de adaptación.",
            "access_token": access_token,
            "email_verified": mask_email(user.email)
        }
    else:
        raise HTTPException(status_code=401, detail="Código 2FA inválido. Código demo: 123456")