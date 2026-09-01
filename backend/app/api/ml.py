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