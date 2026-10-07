"""
hypothesis_routes.py
Endpoints REST para el módulo 'Análisis de Hipótesis' del Observatorio Admin.
Proporciona datos estadísticos, veredictos rigurosos y exportación científica para H1, H2 y H3.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from sqlalchemy.orm import Session
from typing import Optional, List, Dict, Any
from datetime import datetime
import io
import csv
import json

from app.database import get_db
from app.models.mobile_study import MobileStudySample, MobileParticipant
from app.services.hypothesis_service import (
    evaluate_h1,
    evaluate_h2,
    evaluate_h3,
    get_data_quality_report,
    generate_cross_evaluation_impostors
)

router = APIRouter(prefix="/mobile/study/hypotheses", tags=["hypothesis_analysis"])


def _fetch_and_filter_dataset(
    db: Session,
    theta: float = 0.75,
    participant_ids: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    context: Optional[str] = "ALL",
    impostor_source: Optional[str] = "ALL"
) -> Dict[str, Any]:
    """Recupera muestras y participantes de la base de datos aplicando los filtros de usuario."""
    # 1. Participantes
    p_query = db.query(MobileParticipant)
    if participant_ids:
        try:
            pids = [int(p.strip()) for p in participant_ids.split(",") if p.strip()]
            if pids:
                p_query = p_query.filter(MobileParticipant.id.in_(pids))
        except ValueError:
            pass

    participants = p_query.all()
    participants_map = {p.id: p for p in participants}

    # 2. Muestras
    s_query = db.query(MobileStudySample)
    if participants_map:
        s_query = s_query.filter(MobileStudySample.participant_id.in_(list(participants_map.keys())))

    if start_date:
        try:
            s_dt = datetime.fromisoformat(start_date.replace("Z", "+00:00")).replace(tzinfo=None)
            s_query = s_query.filter(MobileStudySample.created_at >= s_dt)
        except Exception:
            pass

    if end_date:
        try:
            e_dt = datetime.fromisoformat(end_date.replace("Z", "+00:00")).replace(tzinfo=None)
            s_query = s_query.filter(MobileStudySample.created_at <= e_dt)
        except Exception:
            pass

    raw_samples = s_query.order_by(MobileStudySample.created_at.asc()).all()

    # Convertir a diccionarios simples para funciones puras
    samples_data = []
    legitimate_by_pid = {}

    for s in raw_samples:
        # Resolver contexto
        ctx = s.auth_context or ("SYSTEM_LOCK" if s.target_app == "SYSTEM_LOCK" else "APPLOCKER")

        # Filtro de contexto si aplica
        if context and context != "ALL" and ctx != context:
            continue

        item = {
            "id": s.id,
            "client_event_id": s.client_event_id,
            "participant_id": s.participant_id,
            "sample_type": s.sample_type,
            "repetition_index": s.repetition_index,
            "phrase": s.phrase,
            "hold_times": s.hold_times or [],
            "latencies": s.latencies or [],
            "features": s.features or {},
            "similarity_score": s.similarity_score,
            "is_accepted": s.is_accepted,
            "ground_truth": s.ground_truth or "LEGITIMATE",
            "target_app": s.target_app or "SYSTEM_LOCK",
            "auth_context": ctx,
            "inference_time_ms": s.inference_time_ms,
            "total_unlock_delay_ms": s.total_unlock_delay_ms,
            "network_connection_type": s.network_connection_type or "WIFI",
            "challenge_session_id": s.challenge_session_id,
            "attempt_number": s.attempt_number or 1,
            "is_cross_eval": False,
            "created_at": s.created_at.isoformat() if s.created_at else None
        }

        # Excluir muestras de entrenamiento puro M0 para la evaluación de pruebas operativas si tienen repetition_index
        # excepto si se usan como donantes en cross-evaluation
        is_enrollment = (s.sample_type == "ENROLLMENT_30")

        if item["ground_truth"] == "LEGITIMATE":
            legitimate_by_pid.setdefault(s.participant_id, []).append(item)

        # Para evaluación de retos e hipótesis solo consideramos intentos de autenticación o retos de impostor
        if not is_enrollment:
            samples_data.append(item)

    # Si no hay intentos de autenticación explícitos (ej. solo muestras basales), incluir las legítimas
    if not samples_data:
        samples_data = [item for p_items in legitimate_by_pid.values() for item in p_items]

    # 3. Separar legítimos e impostores etiquetados
    legitimate_items = [s for s in samples_data if s["ground_truth"] == "LEGITIMATE"]
    labeled_impostors = [s for s in samples_data if s["ground_truth"] != "LEGITIMATE"]

    # 4. Generación opcional o complementaria de impostores por evaluación cruzada (CROSS_EVAL)
    cross_impostors = []
    if impostor_source in ["ALL", "CROSS_EVAL"]:
        cross_impostors = generate_cross_evaluation_impostors(
            participants_map=participants_map,
            legitimate_samples_by_pid=legitimate_by_pid,
            max_impostors_per_target=15
        )

    # Consolidar impostores según la fuente elegida por el usuario
    if impostor_source == "LABELED":
        impostor_items = labeled_impostors
    elif impostor_source == "CROSS_EVAL":
        impostor_items = cross_impostors
    else:  # 'ALL'
        impostor_items = labeled_impostors + cross_impostors

    all_evaluation_items = legitimate_items + impostor_items

    return {
        "participants": participants,
        "participants_map": participants_map,
        "raw_samples": raw_samples,
        "legitimate_items": legitimate_items,
        "impostor_items": impostor_items,
        "all_evaluation_items": all_evaluation_items,
        "cross_eval_count": len(cross_impostors),
        "labeled_impostors_count": len(labeled_impostors)
    }


@router.get("/summary")
def get_hypotheses_summary(
    theta: float = Query(0.75, ge=0.50, le=0.99),
    participant_ids: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    context: Optional[str] = "ALL",
    impostor_source: Optional[str] = "ALL",
    db: Session = Depends(get_db)
):
    """Devuelve las 3 tarjetas de resumen ejecutivo de H1, H2, H3 con veredicto, IC y control de calidad."""
    dataset = _fetch_and_filter_dataset(
        db=db,
        theta=theta,
        participant_ids=participant_ids,
        start_date=start_date,
        end_date=end_date,
        context=context,
        impostor_source=impostor_source
    )

    h1_res = evaluate_h1(dataset["legitimate_items"], dataset["impostor_items"], theta=theta)
    h2_res = evaluate_h2(dataset["all_evaluation_items"], theta=theta)
    h3_res = evaluate_h3(dataset["legitimate_items"], theta=theta)
    quality = get_data_quality_report(dataset["participants"], dataset["raw_samples"])

    # Tarjetas compactas de resumen
    return {
        "cards": [
            {
                "hypothesis_id": "H1",
                "title": "Neutralización de Contraseñas Comunes",
                "status": h1_res["status"],
                "observed_value": f"FAR {h1_res['metrics']['observed_far_pct']}%" if h1_res['metrics']['observed_far_pct'] is not None else "N/A",
                "confidence_interval": f"[{h1_res['metrics']['far_ci'][0]}%, {h1_res['metrics']['far_ci'][1]}%]" if h1_res['metrics']['far_ci'][0] is not None else "N/A",
                "secondary_metric": f"EER {h1_res['metrics']['observed_eer_pct']}% (IC sup: {h1_res['metrics']['eer_ci'][1]}%)" if h1_res['metrics']['observed_eer_pct'] is not None else "N/A",
                "criterion": "FAR < 3.00% y EER ≤ 2.50%",
                "verdict_reason": h1_res["verdict_reason"]
            },
            {
                "hypothesis_id": "H2",
                "title": "Protección Dual (Bloqueo vs App Locker)",
                "status": h2_res["status"],
                "observed_value": f"ΔEER {h2_res.get('comparison', {}).get('diff_eer_pct', 'N/A')}%",
                "confidence_interval": f"[{h2_res.get('comparison', {}).get('diff_ci_95', [None, None])[0]}%, {h2_res.get('comparison', {}).get('diff_ci_95', [None, None])[1]}%]" if h2_res.get('comparison', {}).get('diff_ci_95') else "N/A",
                "secondary_metric": f"Wilcoxon p = {h2_res.get('statistical_tests', {}).get('wilcoxon_signed_rank', {}).get('p_value', 'N/A')}",
                "criterion": "Consistencia estadística (p > 0.05, TOST ±3.0%)",
                "verdict_reason": h2_res["verdict_reason"]
            },
            {
                "hypothesis_id": "H3",
                "title": "Viabilidad Operativa y Usabilidad",
                "status": h3_res["status"],
                "observed_value": f"FRR {h3_res.get('frr_analysis', {}).get('clean_observed_frr', 'N/A')}%",
                "confidence_interval": f"[{h3_res.get('frr_analysis', {}).get('clean_frr_ci', [None, None])[0]}%, {h3_res.get('frr_analysis', {}).get('clean_frr_ci', [None, None])[1]}%]" if h3_res.get('frr_analysis', {}).get('clean_frr_ci') else "N/A",
                "secondary_metric": f"p95 inf={h3_res.get('latencies', {}).get('inference_ms', {}).get('p95', 'N/A')} ms, retardo={h3_res.get('latencies', {}).get('unlock_delay_ms', {}).get('p95', 'N/A')} ms",
                "criterion": "Inferencia < 50 ms, Retardo < 1.8 s, FRR < 2.00%",
                "verdict_reason": h3_res["verdict_reason"]
            }
        ],
        "quality_report": quality,
        "active_filters": {
            "theta": theta,
            "context": context,
            "impostor_source": impostor_source,
            "filtered_participants": len(dataset["participants"]),
            "legitimate_attempts": len(dataset["legitimate_items"]),
            "impostor_attempts": len(dataset["impostor_items"]),
            "cross_eval_synthesized": dataset["cross_eval_count"]
        }
    }


@router.get("/h1")
def get_h1_detailed(
    theta: float = Query(0.75, ge=0.50, le=0.99),
    participant_ids: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    context: Optional[str] = "ALL",
    impostor_source: Optional[str] = "ALL",
    db: Session = Depends(get_db)
):
    """Devuelve el desglose analítico completo de H1 con curvas DET/ROC, histogramas y matrices."""
    dataset = _fetch_and_filter_dataset(
        db=db,
        theta=theta,
        participant_ids=participant_ids,
        start_date=start_date,
        end_date=end_date,
        context=context,
        impostor_source=impostor_source
    )
    return evaluate_h1(dataset["legitimate_items"], dataset["impostor_items"], theta=theta)


@router.get("/h2")
def get_h2_detailed(
    theta: float = Query(0.75, ge=0.50, le=0.99),
    participant_ids: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    impostor_source: Optional[str] = "ALL",
    db: Session = Depends(get_db)
):
    """Devuelve la comparación pareada entre Bloqueo Maestro y App Locker (matrices, TOST, Wilcoxon, apps)."""
    dataset = _fetch_and_filter_dataset(
        db=db,
        theta=theta,
        participant_ids=participant_ids,
        start_date=start_date,
        end_date=end_date,
        context="ALL",
        impostor_source=impostor_source
    )
    return evaluate_h2(dataset["all_evaluation_items"], theta=theta)


@router.get("/h3")
def get_h3_detailed(
    theta: float = Query(0.75, ge=0.50, le=0.99),
    participant_ids: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    context: Optional[str] = "ALL",
    db: Session = Depends(get_db)
):
    """Devuelve las distribuciones ECDF, percentiles de latencia y análisis de FRR por tipo de red."""
    dataset = _fetch_and_filter_dataset(
        db=db,
        theta=theta,
        participant_ids=participant_ids,
        start_date=start_date,
        end_date=end_date,
        context=context,
        impostor_source="ALL"
    )
    return evaluate_h3(dataset["legitimate_items"], theta=theta)


@router.get("/export/summary")
def export_hypotheses_summary(
    format: str = Query("json", pattern="^(json|csv)$"),
    theta: float = Query(0.75, ge=0.50, le=0.99),
    db: Session = Depends(get_db)
):
    """Exporta el resumen formal de resultados listo para citar en las secciones de Resultados y Metodología del paper."""
    dataset = _fetch_and_filter_dataset(db=db, theta=theta)
    h1_res = evaluate_h1(dataset["legitimate_items"], dataset["impostor_items"], theta=theta)
    h2_res = evaluate_h2(dataset["all_evaluation_items"], theta=theta)
    h3_res = evaluate_h3(dataset["legitimate_items"], theta=theta)

    if format == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["hipotesis_id", "titulo", "estado_veredicto", "criterio_paper", "valor_observado", "ic_95_inferior", "ic_95_superior", "metrica_secundaria", "conclusion_metodologica"])

        writer.writerow([
            "H1",
            h1_res["title"],
            h1_res["status"],
            h1_res["criterion"],
            f"{h1_res['metrics'].get('observed_far_pct', '')}%" if h1_res['metrics'].get('observed_far_pct') is not None else "",
            h1_res['metrics'].get('far_ci', ["", ""])[0] if h1_res['metrics'].get('far_ci') else "",
            h1_res['metrics'].get('far_ci', ["", ""])[1] if h1_res['metrics'].get('far_ci') else "",
            f"EER={h1_res['metrics'].get('observed_eer_pct', 'N/A')}%, AUC={h1_res['metrics'].get('auc', 'N/A')}",
            h1_res["verdict_reason"]
        ])

        writer.writerow([
            "H2",
            h2_res["title"],
            h2_res["status"],
            h2_res["criterion"],
            f"Diff_EER={h2_res.get('comparison', {}).get('diff_eer_pct', '')}%",
            h2_res.get('comparison', {}).get('diff_ci_95', ["", ""])[0],
            h2_res.get('comparison', {}).get('diff_ci_95', ["", ""])[1],
            f"Wilcoxon_p={h2_res.get('statistical_tests', {}).get('wilcoxon_signed_rank', {}).get('p_value', '')}",
            h2_res["verdict_reason"]
        ])

        writer.writerow([
            "H3",
            h3_res["title"],
            h3_res["status"],
            h3_res["criterion"],
            f"FRR={h3_res.get('frr_analysis', {}).get('clean_observed_frr', '')}%",
            h3_res.get('frr_analysis', {}).get('clean_frr_ci', ["", ""])[0],
            h3_res.get('frr_analysis', {}).get('clean_frr_ci', ["", ""])[1],
            f"p95_inf={h3_res.get('latencies', {}).get('inference_ms', {}).get('p95', '')}ms, p95_delay={h3_res.get('latencies', {}).get('unlock_delay_ms', {}).get('p95', '')}ms",
            h3_res["verdict_reason"]
        ])

        return Response(
            content=output.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=tecleollave_analisis_hipotesis_summary.csv"}
        )

    from datetime import timezone
    # Formato JSON
    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "theta": theta,
        "study": "TecleoLlave-Adapt: Biometría Conductual Táctil y App Locker Adaptativo",
        "hypotheses": [h1_res, h2_res, h3_res]
    }
