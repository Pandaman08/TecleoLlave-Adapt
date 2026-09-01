from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import Optional, Any

from app.database import get_db
from app.schemas import UserCreate, UserResponse, Token
from app.services.auth_service import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserResponse)
def register_user(
    user_data: UserCreate,
    db: Session = Depends(get_db)
):
    try:
        user = auth_service.register_user(db, user_data.username, user_data.password)
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
    """Authenticate user accepting either JSON body or Form Data."""
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

    user = auth_service.authenticate_user(db, username, password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = auth_service.create_access_token(user.id)
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/seed-demo")
def seed_demo(db: Session = Depends(get_db)):
    """Seed demo data for both user1 (password123) and demo_user (demo123456)."""
    try:
        from demo_setup import run_demo_setup
        
        # Seed user1
        run_demo_setup(
            username="user1",
            password="password123",
            n_enroll=10,
            n_auth_sessions=12,
            drift_profile="gradual"
        )

        # Seed user2
        run_demo_setup(
            username="user2",
            password="password123",
            n_enroll=10,
            n_auth_sessions=8,
            drift_profile="abrupt"
        )

        return {
            "message": "Demo data created successfully for user1 and user2",
            "samples_created": 22,
            "demo_users": [
                {"username": "user1", "password": "password123"},
                {"username": "user2", "password": "password123"}
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))