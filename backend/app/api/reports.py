from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.report_service import report_service

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/{user_id}/pdf")
def download_pdf_report(
    user_id: int,
    db: Session = Depends(get_db)
):
    """Genera y descarga un reporte en formato PDF para el usuario."""
    try:
        pdf_buffer = report_service.generate_pdf_report(db, user_id)
        filename = f"tecleollave_report_user_{user_id}.pdf"
        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generando PDF: {str(e)}")


@router.get("/{user_id}/excel")
def download_excel_report(
    user_id: int,
    db: Session = Depends(get_db)
):
    """Genera y descarga un reporte en formato Excel (.xlsx) para el usuario."""
    try:
        excel_buffer = report_service.generate_excel_report(db, user_id)
        filename = f"tecleollave_report_user_{user_id}.xlsx"
        return StreamingResponse(
            excel_buffer,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generando Excel: {str(e)}")
