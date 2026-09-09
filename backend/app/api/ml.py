from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.schemas import (
    TrainRequest, TrainResponse,
    ModelInfoResponse,
    PredictRequest, PredictResponse,
    DecideRequest, DecideResponse
)
from app.services.ml_service import ml_service

router = APIRouter(prefix="/ml", tags=["ml"])


@router.post("/train", response_model=TrainResponse)
def train_model(
    request: TrainRequest,
    db: Session = Depends(get_db)
):
    """
    Train a new model for the user.
    """
    try:
        result = ml_service.train_model(db, request.user_id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/model/{user_id}", response_model=ModelInfoResponse)
def get_model_info(
    user_id: int,
    db: Session = Depends(get_db)
):
    """
    Get the active model info for a user.
    """
    model_version = ml_service.get_active_model(db, user_id)
    if not model_version:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active model for user"
        )
    return model_version


@router.get("/models/{user_id}", response_model=List[ModelInfoResponse])
def get_all_models(
    user_id: int,
    db: Session = Depends(get_db)
):
    """
    Get all model versions for a user.
    """
    from app.models import ModelVersion
    models = db.query(ModelVersion).filter(
        ModelVersion.user_id == user_id
    ).order_by(ModelVersion.created_at.desc()).all()
    return models


@router.post("/predict", response_model=PredictResponse)
def predict_score(
    request: PredictRequest,
    db: Session = Depends(get_db)
):
    """
    Compute biometric score for a feature vector.
    """
    try:
        result = ml_service.predict_score(db, request.user_id, request.feature_vector)
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/decide", response_model=DecideResponse)
def predict_decision(
    request: DecideRequest,
    db: Session = Depends(get_db)
):
    """
    Compute biometric score and make decision (allow/challenge/reject).
    """
    try:
        result = ml_service.predict_decision(db, request.user_id, request.feature_vector)
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/model-comparison/{user_id_or_name}")
def get_user_model_comparison(
    user_id_or_name: str,
    db: Session = Depends(get_db)
):
    """
    Retorna la tabla comparativa de algoritmos candidatos (Random Forest, SVM RBF, Gradient Boosting)
    con FAR, FRR, EER, AUC y la justificación técnica de la selección automática para este usuario.
    """
    from app.models import User
    if user_id_or_name.isdigit():
        user = db.query(User).filter(User.id == int(user_id_or_name)).first()
    else:
        user = db.query(User).filter(User.username == user_id_or_name).first()

    if not user:
        raise HTTPException(status_code=404, detail=f"Usuario '{user_id_or_name}' no encontrado")

    try:
        comparison_data = ml_service.get_model_comparison(db, user.id)
        return comparison_data
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener comparativa: {e}")


@router.post("/select-best-model")
def trigger_best_model_selection(
    payload: dict,
    db: Session = Depends(get_db)
):
    """
    Ejecuta el proceso de comparación multi-algoritmo (RandomForest, SVM RBF, Gradient Boosting)
    usando validación cruzada sobre las muestras del usuario + impostores registrados + dataset CMU,
    selecciona automáticamente el modelo con menor EER y lo activa como el perfil oficial en BD.
    """
    from app.models import User
    user_id = payload.get("user_id")
    username = payload.get("username")

    if user_id:
        user = db.query(User).filter(User.id == user_id).first()
    elif username:
        user = db.query(User).filter(User.username == username).first()
    else:
        user = db.query(User).first()

    if not user:
        raise HTTPException(status_code=404, detail="Usuario no especificado o no encontrado")

    try:
        train_result = ml_service.train_model(db, user.id, select_best=True)
        return {
            "success": True,
            "user_id": user.id,
            "username": user.username,
            "model_version": train_result.get("version"),
            "selected_algorithm": train_result.get("selected_algorithm"),
            "selection_reason": train_result.get("selection_reason"),
            "candidate_comparison": train_result.get("candidate_comparison"),
            "metrics": train_result.get("metrics"),
            "message": train_result.get("message")
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en selección de modelo: {e}")