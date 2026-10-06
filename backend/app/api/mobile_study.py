from fastapi import APIRouter, Depends, HTTPException, status, Response
from pydantic import BaseModel, EmailStr
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
import io
import csv

from app.database import get_db
from app.services.mobile_study_service import mobile_study_service

router = APIRouter(prefix="/mobile", tags=["mobile_study"])


# --- Schemas ---

class RequestOtpSchema(BaseModel):
    email: EmailStr


class VerifyOtpSchema(BaseModel):
    email: EmailStr
    code: str
    full_name: Optional[str] = None
    dominant_hand: Optional[str] = "diestro"
    age_range: Optional[str] = "18-25"
    device_model: Optional[str] = "Android Device"
    screen_refresh_rate: Optional[int] = 60


class Enroll30Schema(BaseModel):
    participant_id: int
    phrase: str
    repetitions: List[List[Dict[str, Any]]]


class EvaluateAuthSchema(BaseModel):
    participant_id: int
    phrase_typed: str
    raw_events: List[Dict[str, Any]]
    target_app: Optional[str] = "WhatsApp"
    is_impostor_mode: Optional[bool] = False
    ground_truth: Optional[str] = "LEGITIMATE"
    device_posture: Optional[str] = "ESTATICO"


class BatchSyncSchema(BaseModel):
    participant_id: int
    events: List[Dict[str, Any]]


class SatisfactionFeedbackSchema(BaseModel):
    participant_id: int
    score: int  # 1 a 5
    comment: Optional[str] = None


# --- Endpoints ---

@router.post("/auth/request-otp")
def request_otp(data: RequestOtpSchema, db: Session = Depends(get_db)):
    try:
        return mobile_study_service.request_otp(db, email=data.email)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/auth/verify-otp")
def verify_otp(data: VerifyOtpSchema, db: Session = Depends(get_db)):
    try:
        return mobile_study_service.verify_otp(
            db=db,
            email=data.email,
            code=data.code,
            full_name=data.full_name,
            dominant_hand=data.dominant_hand or "diestro",
            age_range=data.age_range or "18-25",
            device_model=data.device_model or "Android Device",
            screen_refresh_rate=data.screen_refresh_rate or 60
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/study/enroll-30")
def enroll_30(data: Enroll30Schema, db: Session = Depends(get_db)):
    try:
        return mobile_study_service.enroll_30_repetitions(
            db=db,
            participant_id=data.participant_id,
            phrase=data.phrase,
            repetitions=data.repetitions
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/study/evaluate-auth")
def evaluate_auth(data: EvaluateAuthSchema, db: Session = Depends(get_db)):
    try:
        return mobile_study_service.evaluate_auth_attempt(
            db=db,
            participant_id=data.participant_id,
            raw_events=data.raw_events,
            phrase_typed=data.phrase_typed,
            target_app=data.target_app or "WhatsApp",
            is_impostor_mode=data.is_impostor_mode or False,
            ground_truth=data.ground_truth or "LEGITIMATE",
            device_posture=data.device_posture or "ESTATICO"
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/study/batch-sync")
def batch_sync_telemetry(data: BatchSyncSchema, db: Session = Depends(get_db)):
    """Sincroniza telemetría encolada offline en el dispositivo móvil."""
    processed = 0
    for ev in data.events:
        try:
            mobile_study_service.evaluate_auth_attempt(
                db=db,
                participant_id=data.participant_id,
                raw_events=ev.get("raw_events", []),
                phrase_typed=ev.get("phrase_typed", ""),
                target_app=ev.get("target_app", "APP_LOCKER"),
                is_impostor_mode=ev.get("is_impostor_mode", False),
                ground_truth=ev.get("ground_truth", "LEGITIMATE"),
                device_posture=ev.get("device_posture", "ESTATICO")
            )
            processed += 1
        except Exception:
            continue
    return {"success": True, "synced_events": processed}


@router.post("/study/satisfaction")
def submit_satisfaction(data: SatisfactionFeedbackSchema, db: Session = Depends(get_db)):
    """Registra la calificación de satisfacción (1 a 5 estrellas) y comentario del usuario para la APK."""
    try:
        return mobile_study_service.record_satisfaction(
            db=db,
            participant_id=data.participant_id,
            score=data.score,
            comment=data.comment
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


# --- Observatorio Científico Web Endpoints (Para el Admin e Investigador) ---

@router.get("/study/observatory/overview")
def get_observatory_overview(db: Session = Depends(get_db)):
    try:
        return mobile_study_service.get_observatory_overview(db)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/study/observatory/participants")
def list_observatory_participants(db: Session = Depends(get_db)):
    from app.models.mobile_study import MobileParticipant
    participants = db.query(MobileParticipant).order_by(MobileParticipant.id.asc()).all()
    return [
        {
            "id": p.id,
            "code": p.participant_code,
            "email": p.email,
            "full_name": p.full_name,
            "device": p.device_model,
            "refresh_rate": p.screen_refresh_rate,
            "dominant_hand": p.dominant_hand,
            "is_enrolled": p.is_enrolled,
            "reps_count": p.enrolled_reps_count,
            "drift": p.current_drift,
            "created_at": p.created_at.strftime("%Y-%m-%d %H:%M")
        }
        for p in participants
    ]


@router.get("/study/observatory/participants/{participant_id}")
def get_participant_details(participant_id: int, db: Session = Depends(get_db)):
    try:
        return mobile_study_service.get_participant_drilldown(db, participant_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/study/export/csv")
def export_dataset_csv(db: Session = Depends(get_db)):
    """Genera y descarga el dataset consolidado del estudio para análisis en Python/Pandas."""
    from app.models.mobile_study import MobileStudySample, MobileParticipant

    samples = db.query(MobileStudySample, MobileParticipant).join(
        MobileParticipant, MobileStudySample.participant_id == MobileParticipant.id
    ).all()

    output = io.StringIO()
    writer = csv.writer(output)

    # Cabecera CSV
    writer.writerow([
        "sample_id",
        "participant_code",
        "sample_type",
        "repetition_index",
        "phrase",
        "ground_truth",
        "target_app",
        "device_model",
        "screen_refresh_rate",
        "wpm",
        "mean_hold_time_ms",
        "std_hold_time_ms",
        "mean_latency_ms",
        "consistency_score",
        "similarity_score",
        "is_accepted",
        "created_at"
    ])

    for sample, part in samples:
        f = sample.features or {}
        writer.writerow([
            sample.id,
            part.participant_code,
            sample.sample_type,
            sample.repetition_index or "",
            sample.phrase,
            sample.ground_truth,
            sample.target_app,
            part.device_model,
            part.screen_refresh_rate,
            f.get("wpm", ""),
            f.get("mean_ht", ""),
            f.get("std_ht", ""),
            f.get("mean_lt", ""),
            f.get("consistency_score", ""),
            sample.similarity_score or "",
            1 if sample.is_accepted else 0,
            sample.created_at.strftime("%Y-%m-%d %H:%M:%S")
        ])

    csv_content = output.getvalue()
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=tecleollave_mobile_study_dataset.csv"}
    )
