from sqlalchemy.orm import Session
from typing import Optional
from app.models import User
from app.utils.security import verify_password, get_password_hash, create_access_token
from app.config import settings


class AuthService:
    def __init__(self):
        pass
    
    def register_user(self, db: Session, username: str, password: str) -> User:
        # Verificar si usuario existe
        existing = db.query(User).filter(User.username == username).first()
        if existing:
            raise ValueError("Username already exists")
        
        # Crear usuario con frase fija
        user = User(
            username=username,
            password_hash=get_password_hash(password),
            phrase=settings.PHRASE
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
        # Crear configuración de adaptación por defecto si no existe
        from app.models import AdaptationConfig
        existing_config = db.query(AdaptationConfig).filter(AdaptationConfig.user_id == user.id).first()
        if not existing_config:
            config = AdaptationConfig(user_id=user.id)
            db.add(config)
            db.commit()
        
        return user
    
    def authenticate_user(self, db: Session, username: str, password: str) -> Optional[User]:
        user = db.query(User).filter(User.username == username).first()
        if not user:
            return None
        if not verify_password(password, user.password_hash):
            return None
        if not user.is_active:
            return None
        return user
    
    def create_access_token(self, user_id: int) -> str:
        return create_access_token(data={"sub": str(user_id)})


auth_service = AuthService()