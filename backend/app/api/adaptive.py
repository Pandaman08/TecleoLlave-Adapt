from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.schemas import (
    AdaptationConfigUpdate,
    AdaptationConfigResponse,
    CandidateStatusResponse,
    ProcessAuthResultRequest,
    ProcessAuthResultResponse,
    ForceEvaluationResponse,
    AdaptationEventResponse
)
from app.services.adaptive_service import adaptive_service

router = APIRouter(prefix="/adaptive", tags=["adaptive"])


@router.post("/process-auth-result", response_model=ProcessAuthResultResponse)
def process_auth_result(
    request: ProcessAuthResultRequest,
    db: Session = Depends(get_db)
):
    """
    Process authentication result and manage candidate pool.
    Called after biometric authentication.
    """
    try:
        result = adaptive_service.process_auth_result(
            db=db,
            user_id=request.user_id,
            auth_attempt_id=request.auth_attempt_id,
            decision=request.decision,
            sample_id=request.sample_id
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/candidate-status/{user_id}", response_model=CandidateStatusResponse)
def get_candidate_status(
    user_id: int,
    db: Session = Depends(get_db)
):
    """
    Get current candidate pool status for a user.
    """
    try:
        result = adaptive_service.get_candidate_status(db, user_id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/force-evaluation/{user_id}", response_model=ForceEvaluationResponse)
def force_evaluation(
    user_id: int,
    db: Session = Depends(get_db)
):
    """
    Force evaluation of candidate pool (manual trigger).
    """
    try:
        result = adaptive_service.force_evaluation(db, user_id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/config/{user_id}", response_model=AdaptationConfigResponse)
def get_adaptation_config(
    user_id: int,
    db: Session = Depends(get_db)
):
    """
    Get user's adaptation configuration.
    """
    from app.models import AdaptationConfig
    config = db.query(AdaptationConfig).filter(
        AdaptationConfig.user_id == user_id
    ).first()
    
    if not config:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Config not found")
    
    return config


@router.put("/config/{user_id}", response_model=AdaptationConfigResponse)
def update_adaptation_config(
    user_id: int,
    updates: AdaptationConfigUpdate,
    db: Session = Depends(get_db)
):
    """
    Update user's adaptation configuration.
    """
    try:
        # Filter out None values
        update_dict = {k: v for k, v in updates.__dict__.items() if v is not None}
        config = adaptive_service.update_config(db, user_id, update_dict)
        return config
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/events/{user_id}", response_model=List[AdaptationEventResponse])
def get_adaptation_events(
    user_id: int,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """
    Get adaptation event history for a user.
    """
    from app.models import AdaptationEvent
    events = db.query(AdaptationEvent).filter(
        AdaptationEvent.user_id == user_id
    ).order_by(AdaptationEvent.created_at.desc()).limit(limit).all()
    
    return events