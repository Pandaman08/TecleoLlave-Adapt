from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.schemas.dashboard import (
    UserSummaryResponse,
    AuthMetricsResponse,
    TimeSeriesResponse,
    ModelMetricsResponse,
    AdaptationMetricsResponse,
    AdaptationEventResponse,
    CandidateStatusResponse,
    ComparisonResponse
)
from app.services.dashboard_service import dashboard_service

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary/{user_id}", response_model=UserSummaryResponse)
def get_user_summary(
    user_id: int,
    db: Session = Depends(get_db)
):
    """Get overall user summary."""
    return dashboard_service.get_user_summary(db, user_id)


@router.get("/auth-metrics/{user_id}", response_model=AuthMetricsResponse)
def get_auth_metrics(
    user_id: int,
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db)
):
    """Get authentication metrics for a period."""
    return dashboard_service.get_auth_metrics(db, user_id, days)


@router.get("/time-series/{user_id}", response_model=List[TimeSeriesResponse])
def get_time_series(
    user_id: int,
    days: int = Query(30, ge=1, le=365),
    bucket_hours: int = Query(24, ge=1, le=168),
    db: Session = Depends(get_db)
):
    """Get time series of authentication metrics."""
    return dashboard_service.get_auth_time_series(db, user_id, days, bucket_hours)


@router.get("/models/{user_id}", response_model=List[ModelMetricsResponse])
def get_model_versions(
    user_id: int,
    db: Session = Depends(get_db)
):
    """Get all model versions with metrics."""
    return dashboard_service.get_model_versions(db, user_id)


@router.get("/adaptation/{user_id}", response_model=AdaptationMetricsResponse)
def get_adaptation_metrics(
    user_id: int,
    db: Session = Depends(get_db)
):
    """Get adaptation events summary."""
    return dashboard_service.get_adaptation_summary(db, user_id)


@router.get("/adaptation-timeline/{user_id}", response_model=List[AdaptationEventResponse])
def get_adaptation_timeline(
    user_id: int,
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    """Get adaptation events timeline."""
    return dashboard_service.get_adaptation_timeline(db, user_id, limit)


@router.get("/candidate-status/{user_id}", response_model=CandidateStatusResponse)
def get_candidate_status(
    user_id: int,
    db: Session = Depends(get_db)
):
    """Get current candidate pool status."""
    return dashboard_service.get_candidate_status(db, user_id)


@router.get("/comparison/{user_id}", response_model=ComparisonResponse)
def get_comparison(
    user_id: int,
    db: Session = Depends(get_db)
):
    """Get static vs adaptive comparison."""
    return dashboard_service.get_comparison_static_vs_adaptive(db, user_id)