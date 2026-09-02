from sqlalchemy.orm import Session
from typing import Optional
from app.models import User
from app.utils.security import verify_password, get_password_hash, create_access_token
from app.config import settings


class AuthService:
    def __init__(self):
        pass
    
    def register_user(self, db: Session, username: str, password: str, samples: Optional[list] = None) -> User:
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
        from app.models import AdaptationConfig, TypingSample
        existing_config = db.query(AdaptationConfig).filter(AdaptationConfig.user_id == user.id).first()
        if not existing_config:
            config = AdaptationConfig(user_id=user.id)
            db.add(config)
            db.commit()

        # Si se proporcionaron muestras de enrolamiento, asociarlas al usuario creado
        if samples and len(samples) > 0:
            sample_ids = []
            for s in samples:
                if isinstance(s, dict) and 'sample_id' in s:
                    sample_ids.append(s['sample_id'])
                elif isinstance(s, int):
                    sample_ids.append(s)
            
            if sample_ids:
                db.query(TypingSample).filter(TypingSample.id.in_(sample_ids)).update(
                    {TypingSample.user_id: user.id}, synchronize_session=False
                )
                db.commit()
            
            # Entrenar modelo inicial v1 para el nuevo usuario
            try:
                from app.services.ml_service import ml_service
                ml_service.train_model(db, user.id)
            except Exception as e:
                print(f"Nota: Entrenamiento automático tras registro para {username}: {e}")
        
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