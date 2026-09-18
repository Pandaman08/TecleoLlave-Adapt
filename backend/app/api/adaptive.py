from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from pydantic import BaseModel

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
from app.ml.drift import evaluate_user_biometric_drift
from app.api.dependencies import get_current_admin
from app.models.user import User

router = APIRouter(prefix="/adaptive", tags=["adaptive"])


class RollbackRequest(BaseModel):
    user_id: int
    reason: Optional[str] = "Rollback solicitado por administrador"


class SimulatePoisoningRequest(BaseModel):
    user_id: int
    n_contaminated: Optional[int] = 6


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
    admin: User = Depends(get_current_admin),
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

    return [
        {
            "id": e.id,
            "user_id": e.user_id,
            "auth_attempt_id": e.auth_attempt_id,
            "action": e.action.value if hasattr(e.action, "value") else e.action,
            "candidate_model_id": e.candidate_model_id,
            "old_model_version_id": e.old_model_version_id,
            "new_model_version_id": e.new_model_version_id,
            "reason": e.reason,
            "metrics_comparison": e.metrics_comparison,
            "created_at": e.created_at
        }
        for e in events
    ]


@router.post("/rollback/{model_id}")
def rollback_model_endpoint(
    model_id: int,
    request: RollbackRequest,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Rollback active model to target model version.
    """
    try:
        res = adaptive_service.rollback_model(
            db=db,
            user_id=request.user_id,
            target_model_id=model_id,
            admin_username="admin",
            reason=request.reason or "Rollback solicitado por administrador"
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/quarantine/{user_id}")
def get_quarantined_samples_endpoint(
    user_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Retrieve all quarantined biometric samples that failed trust/anti-poisoning verification.
    """
    try:
        samples = adaptive_service.get_quarantined_samples(db=db, user_id=user_id)
        return {
            "user_id": user_id,
            "quarantined_samples": samples,
            "total": len(samples)
        }
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/simulate-poisoning")
def simulate_poisoning_endpoint(
    request: SimulatePoisoningRequest,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Simulate a model poisoning attack (adversarial injection) and verify automated rejection.
    """
    try:
        res = adaptive_service.simulate_poisoning_attack(
            db=db,
            user_id=request.user_id,
            n_contaminated=request.n_contaminated or 6
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/drift/{user_id}")
def get_user_drift_endpoint(
    user_id: int,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """
    Evaluate behavioral biometric drift for a user relative to baseline M0 centroid.
    """
    try:
        res = evaluate_user_biometric_drift(db=db, user_id=user_id, limit=limit)
        return res
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))