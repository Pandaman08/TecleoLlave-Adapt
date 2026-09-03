from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.schemas import (
    TypingEnrollRequest,
    TypingAuthRequest,
    EnrollResponse,
    AuthenticateResponse,
    TypingSampleResponse
)
from app.services.typing_service import typing_service

router = APIRouter(prefix="/typing", tags=["typing"])


@router.post("/enroll", response_model=EnrollResponse)
def enroll_typing_sample(
    request: TypingEnrollRequest,
    db: Session = Depends(get_db)
):
    """
    Registra una muestra de dinámica de tecleo para enrolamiento.
    """
    try:
        result = typing_service.enroll_sample(db, request)
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/authenticate", response_model=AuthenticateResponse)
def authenticate_typing(
    request: TypingAuthRequest,
    db: Session = Depends(get_db)
):
    """
    Autentica una muestra de dinámica de tecleo contra el modelo del usuario.
    """
    try:
        user_id = 1
        if request.username:
            from app.models import User
            user = db.query(User).filter(User.username == request.username).first()
            if not user:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
            user_id = user.id
        result = typing_service.authenticate_sample(db, request, user_id=user_id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/samples/{user_id}", response_model=List[TypingSampleResponse])
def get_user_samples(
    user_id: int,
    db: Session = Depends(get_db)
):
    """
    Obtiene todas las muestras de un usuario.
    """
    return typing_service.get_user_samples(db, user_id)