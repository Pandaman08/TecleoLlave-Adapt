from fastapi import APIRouter, Depends, HTTPException, status as http_status
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.schemas.health import HealthResponse
from app.database import get_db
from app.config import settings

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
def health_check(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception as exc:
        raise HTTPException(
            status_code=http_status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"status": "error", "db": "disconnected"}
        ) from exc

    return HealthResponse(
        status="ok",
        db=db_status,
        version="1.0.0"
    )