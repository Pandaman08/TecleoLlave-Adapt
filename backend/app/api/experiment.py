from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import json
import os
from pathlib import Path

from app.database import get_db
from app.schemas import (
    ExperimentRequest,
    ExperimentResultResponse,
    ExperimentListResponse,
    SessionResultResponse,
    ExperimentSummaryResponse
)
from app.services.experiment_service import experiment_service, run_experiment

router = APIRouter(prefix="/experiment", tags=["experiment"])


@router.post("/static-vs-adaptive", response_model=ExperimentResultResponse)
def run_static_vs_adaptive(
    request: ExperimentRequest,
    db: Session = Depends(get_db)
):
    """
    Run a full static vs adaptive comparison experiment.
    """
    try:
        result = run_experiment(
            db=db,
            user_id=request.user_id,
            n_sessions=request.n_sessions,
            samples_per_session=request.samples_per_session,
            impostor_ratio=request.impostor_ratio,
            drift_profile=request.drift_profile
        )
        
        # Convert to response format
        return ExperimentResultResponse(
            experiment_id=result.experiment_id,
            user_id=result.user_id,
            n_sessions=result.n_sessions,
            samples_per_session=result.samples_per_session,
            impostor_ratio=result.impostor_ratio,
            drift_profile=result.drift_profile,
            started_at=result.started_at,
            completed_at=result.completed_at,
            static_results=[
                SessionResultResponse(
                    session=r.session,
                    model_version=r.model_version,
                    strategy=r.strategy,
                    far=r.far,
                    frr=r.frr,
                    eer=r.eer,
                    accuracy=r.accuracy,
                    precision=r.precision,
                    recall=r.recall,
                    f1=r.f1,
                    n_legitimate=r.n_legitimate,
                    n_impostor=r.n_impostor,
                    adaptation_event=r.adaptation_event
                )
                for r in result.static_results
            ],
            adaptive_results=[
                SessionResultResponse(
                    session=r.session,
                    model_version=r.model_version,
                    strategy=r.strategy,
                    far=r.far,
                    frr=r.frr,
                    eer=r.eer,
                    accuracy=r.accuracy,
                    precision=r.precision,
                    recall=r.recall,
                    f1=r.f1,
                    n_legitimate=r.n_legitimate,
                    n_impostor=r.n_impostor,
                    adaptation_event=r.adaptation_event
                )
                for r in result.adaptive_results
            ],
            summary=ExperimentSummaryResponse(
                static=result.summary['static'],
                adaptive=result.summary['adaptive'],
                improvement=result.summary['improvement'],
                n_adaptations=result.summary['n_adaptations'],
                model_versions_used=result.summary['model_versions_used']
            )
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/results/{experiment_id}", response_model=ExperimentResultResponse)
def get_experiment_results(
    experiment_id: str,
    db: Session = Depends(get_db)
):
    """
    Get experiment results by ID.
    """
    results_dir = Path("experiments/results")
    result_file = Path("experiments/results") / f"{experiment_id}.json"
    
    if not result_file.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Experiment not found")
    
    with open(result_file, 'r') as f:
        data = json.load(f)
    
    return ExperimentResultResponse(
        experiment_id=data['experiment_id'],
        user_id=data['user_id'],
        n_sessions=data['n_sessions'],
        samples_per_session=data['samples_per_session'],
        impostor_ratio=data['impostor_ratio'],
        drift_profile=data['drift_profile'],
        started_at=data['started_at'],
        completed_at=data['completed_at'],
        static_results=[
            SessionResultResponse(**r) for r in data['static_results']
        ],
        adaptive_results=[
            SessionResultResponse(**r) for r in data['adaptive_results']
        ],
        summary=ExperimentSummaryResponse(**data['summary'])
    )


@router.get("/list", response_model=List[ExperimentListResponse])
def list_experiments(
    user_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """
    List all experiments, optionally filtered by user.
    """
    results_dir = Path("experiments/results")
    if not results_dir.exists():
        return []
    
    experiments = []
    for file_path in results_dir.glob("*.json"):
        try:
            with open(file_path, 'r') as f:
                data = json.load(f)
            
            if user_id is not None and data.get('user_id') != user_id:
                continue
            
            experiments.append(ExperimentListResponse(
                experiment_id=data['experiment_id'],
                user_id=data['user_id'],
                drift_profile=data['drift_profile'],
                n_sessions=data['n_sessions'],
                started_at=data['started_at'],
                completed_at=data['completed_at'],
                summary=ExperimentSummaryResponse(**data.get('summary', {})) if data.get('summary') else None
            ))
        except Exception:
            continue
    
    # Sort by start time descending
    experiments.sort(key=lambda x: x.started_at, reverse=True)
    return experiments


@router.delete("/results/{experiment_id}")
def delete_experiment(
    experiment_id: str,
    db: Session = Depends(get_db)
):
    """
    Delete experiment results.
    """
    result_file = Path("experiments/results") / f"{experiment_id}.json"
    csv_file = Path("experiments/results") / f"{experiment_id}.csv"
    
    if not result_file.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Experiment not found")
    
    result_file.unlink()
    if csv_file.exists():
        csv_file.unlink()
    
    return {"message": f"Experiment {experiment_id} deleted"}