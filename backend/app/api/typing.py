from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from app.database import get_db
from app.schemas import (
    TypingEnrollRequest,
    TypingAuthRequest,
    EnrollResponse,
    AuthenticateResponse,
    TypingSampleResponse,
    EnrolledUserItem,
    LiveTestRequest,
    LiveTestResponse,
    MultiSessionStatusResponse
)
from app.services.typing_service import typing_service

router = APIRouter(prefix="/typing", tags=["typing"])


@router.post("/enroll", response_model=EnrollResponse)
def enroll_typing_sample(
    request: TypingEnrollRequest,
    db: Session = Depends(get_db)
):
    """
    Registra una muestra de dinámica de tecleo para enrolamiento.
    """
    try:
        if request.username:
            from app.models import User
            user = db.query(User).filter(User.username == request.username).first()
            if user and getattr(user, "role", "user") == "admin":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="El usuario administrador no utiliza biometría conductual ni captura de tecleo."
                )
        result = typing_service.enroll_sample(db, request)
        return result
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/authenticate", response_model=AuthenticateResponse)
def authenticate_typing(
    request: TypingAuthRequest,
    db: Session = Depends(get_db)
):
    """
    Autentica una muestra de dinámica de tecleo contra el modelo del usuario.
    """
    try:
        user_id = 1
        if request.username:
            from app.models import User
            user = db.query(User).filter(User.username == request.username).first()
            if not user:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
            if getattr(user, "role", "user") == "admin":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="El usuario administrador no utiliza biometría conductual."
                )
            user_id = user.id
        result = typing_service.authenticate_sample(db, request, user_id=user_id)
        return result
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/enrolled-users", response_model=List[EnrolledUserItem])
def get_enrolled_users(db: Session = Depends(get_db)):
    """
    Lista usuarios con perfiles biométricos para demostración en vivo.
    """
    from app.models import User, ModelVersion, TypingSample
    users = db.query(User).filter(User.role != "admin").all()
    results = []
    for u in users:
        active_model = db.query(ModelVersion).filter(
            ModelVersion.user_id == u.id,
            ModelVersion.is_active == True
        ).first()
        samples_count = db.query(TypingSample).filter(
            TypingSample.user_id == u.id
        ).count()
        algo = None
        eer_val = None
        reason = None
        if active_model and active_model.metrics:
            algo = active_model.metrics.get("algorithm") or (
                active_model.training_config.get("selected_algorithm") if active_model.training_config else "Random Forest"
            )
            eer_val = active_model.metrics.get("eer")
            reason = active_model.metrics.get("selection_reason")

        results.append(
            EnrolledUserItem(
                id=u.id,
                username=u.username,
                has_active_model=active_model is not None,
                model_version=active_model.id if active_model else None,
                samples_count=samples_count,
                algorithm=algo or ("Random Forest" if active_model else None),
                eer=eer_val,
                selection_reason=reason
            )
        )
    return results


@router.post("/live-test", response_model=LiveTestResponse)
def live_biometric_test(
    request: LiveTestRequest,
    db: Session = Depends(get_db)
):
    """
    Evaluación biométrica en vivo para sustentación ante el profesor.
    Permite probar intentos legítimos (tolerancia intra-usuario) e
    intentos de impostores (aislamiento de cuenta y rechazo en vivo).
    """
    import numpy as np
    from app.models import User, ModelVersion, TypingSample, TypingFeature, AuthAttempt, AuthDecision
    from app.ml.features import extract_features
    from app.services.ml_service import ml_service

    # 1. Validar usuario y modelo activo
    user = db.query(User).filter(User.username == request.username).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Usuario '{request.username}' no encontrado."
        )

    active_model = db.query(ModelVersion).filter(
        ModelVersion.user_id == user.id,
        ModelVersion.is_active == True
    ).first()
    if not active_model:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"El usuario '{user.username}' no tiene un modelo biométrico activo. Enrólalo primero."
        )

    # 2. Convertir y extraer características
    raw_dicts = [
        {"key": e.key, "keydown_ts": e.keydown_ts, "keyup_ts": e.keyup_ts}
        for e in request.raw_timestamps
    ]
    feature_result = extract_features(raw_dicts, request.phrase_typed)
    if not feature_result["valid"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Muestra biométrica inválida: {feature_result['error']}"
        )

    # 3. Predicción con el modelo del usuario
    try:
        pred = ml_service.predict_decision(db, user.id, feature_result["feature_vector"])
        score = float(pred["score"])
        decision = pred["decision"]  # 'allow', 'challenge', 'reject'
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error evaluando predicción biométrica: {e}"
        )

    # 4. Métricas dinámicas calculadas
    wpm = float(feature_result.get("wpm", 0.0))
    consistency_score = float(feature_result.get("consistency_score", 0.0))
    durations = [e.keyup_ts - e.keydown_ts for e in request.raw_timestamps]
    hold_mean = float(np.mean(durations)) if durations else 0.0
    total_dur = float(request.raw_timestamps[-1].keyup_ts - request.raw_timestamps[0].keydown_ts) if len(request.raw_timestamps) > 1 else 0.0
    latencies = [
        request.raw_timestamps[i + 1].keydown_ts - request.raw_timestamps[i].keyup_ts
        for i in range(len(request.raw_timestamps) - 1)
    ]
    latency_mean = float(np.mean(latencies)) if latencies else 0.0

    score_pct = round(score * 100, 1)
    is_recognized = decision in ["allow", "challenge"]

    # 5. Generar diagnóstico y veredicto adaptado al rol del intento
    is_legit = request.attempt_type == "legitimate"

    if is_legit:
        if decision == "allow":
            verdict_title = "Acceso Concedido (Dueño Reconocido)"
            verdict_detail = (
                f"Score biométrico de {score_pct}% (Zona ACCEPT). "
                "El ritmo rítmico y tiempos de pulsación coinciden con el perfil registrado; "
                "la variación humana natural fue tolerada exitosamente."
            )
            status_type = "success"
        elif decision == "challenge":
            verdict_title = "Zona CHALLENGE (Variación de Ritmo)"
            verdict_detail = (
                f"Score biométrico de {score_pct}% (Zona CHALLENGE). "
                "Se detectó variación en la velocidad o pausas (ej. cansancio o prisa). "
                "El sistema solicita un segundo factor (2FA) en vez de bloquear al dueño."
            )
            status_type = "warning"
        else:
            verdict_title = "Rechazo por Desviación Extrema"
            verdict_detail = (
                f"Score biométrico de {score_pct}% (Zona REJECT). "
                "El patrón temporal se alejó significativamente del perfil base."
            )
            status_type = "danger"
    else:  # Impostor / Intruso
        if decision == "reject":
            verdict_title = "Impostor Detectado y Bloqueado"
            verdict_detail = (
                f"Excelente discriminación (Score: {score_pct}%). "
                "El ritmo de pulsación y latencias de la otra persona difieren drásticamente del dueño. "
                "El acceso fue bloqueado en tiempo real."
            )
            status_type = "success_security"
        elif decision == "challenge":
            verdict_title = "Intruso Frenado en Desafío 2FA"
            verdict_detail = (
                f"Score ambiguo ({score_pct}%). Aunque el impostor conozca la contraseña, "
                "el acceso directo fue denegado y se exigiría autenticación de dos factores."
            )
            status_type = "warning"
        else:
            verdict_title = "Falsa Aceptación (Alerta de Similaridad)"
            verdict_detail = (
                f"Score inesperadamente alto ({score_pct}%). "
                "El patrón de tecleo imitó de cerca el perfil entrenado."
            )
            status_type = "danger"

    # Registrar el intento en la auditoría
    try:
        decision_enum = AuthDecision(decision) if decision in ['allow', 'challenge', 'reject'] else AuthDecision.reject
        attempt_record = AuthAttempt(
            user_id=user.id,
            sample_id=0,
            model_version_id=active_model.id,
            score=score,
            decision=decision_enum
        )
        db.add(attempt_record)
        db.commit()
    except Exception:
        db.rollback()

    return LiveTestResponse(
        username=user.username,
        user_id=user.id,
        attempt_type=request.attempt_type,
        score=score,
        score_pct=score_pct,
        decision=decision.upper(),
        is_recognized=is_recognized,
        model_version=active_model.id,
        metrics={
            "wpm": round(wpm, 1),
            "total_duration_ms": round(total_dur, 0),
            "hold_mean_ms": round(hold_mean, 1),
            "latency_mean_ms": round(latency_mean, 1),
            "consistency_score": round(consistency_score, 3)
        },
        verdict_title=verdict_title,
        verdict_detail=verdict_detail,
        status_type=status_type,
        timestamp=datetime.now().strftime("%H:%M:%S")
    )


@router.get("/samples/{user_id}", response_model=List[TypingSampleResponse])
def get_user_samples(
    user_id: int,
    db: Session = Depends(get_db)
):
    """
    Obtiene todas las muestras de un usuario.
    """
    return typing_service.get_user_samples(db, user_id)


@router.get("/multi-session-status/{user_id_or_name}", response_model=MultiSessionStatusResponse)
def get_multi_session_status(
    user_id_or_name: str,
    db: Session = Depends(get_db)
):
    """
    Retorna el estado de completitud del enrolamiento multi-sesión y multi-contexto.
    Requiere al menos 30-40 muestras en 3 o más sesiones diferenciadas.
    """
    from app.models import User
    if user_id_or_name.isdigit():
        user = db.query(User).filter(User.id == int(user_id_or_name)).first()
    else:
        user = db.query(User).filter(User.username == user_id_or_name).first()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")

    try:
        status_data = typing_service.get_user_multi_session_status(db, user.id)
        return status_data
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/train-user-profile")
def train_user_profile(
    payload: dict,
    db: Session = Depends(get_db)
):
    """
    Entrena el perfil biométrico con todas las muestras multi-sesión y multi-contexto del usuario.
    """
    from app.models import User
    from app.services.ml_service import ml_service

    username = payload.get("username")
    user_id = payload.get("user_id")

    user = None
    if user_id:
        user = db.query(User).filter(User.id == int(user_id)).first()
    elif username:
        user = db.query(User).filter(User.username == username).first()

    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    if getattr(user, "role", "user") == "admin":
        raise HTTPException(status_code=400, detail="Los usuarios administradores no tienen perfil biométrico entrenable.")

    try:
        train_result = ml_service.train_model(db, user.id)
        status_data = typing_service.get_user_multi_session_status(db, user.id)
        return {
            "success": True,
            "message": f"Modelo v{train_result.get('version', 1)} entrenado con {status_data['total_samples']} muestras en {status_data['sessions_count']} sesiones.",
            "metrics": train_result.get("metrics", {}),
            "multi_session_status": status_data
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error entrenando modelo: {e}")


@router.post("/seed-multisession-demo")
def seed_multisession_demo(
    payload: dict,
    db: Session = Depends(get_db)
):
    """
    Siembra 35 muestras sintéticas hiper-realistas para un usuario, distribuidas en:
    - Sesión 1 (Mañana 08:30): 12 muestras en estado 'normal'
    - Sesión 2 (Tarde 14:15): 12 muestras en estado 'con prisa' (más rápidas)
    - Sesión 3 (Noche/Día sig 21:40): 11 muestras en estado 'cansado' (pausadas/fatiga)
    Y reentrena inmediatamente el modelo del usuario.
    """
    from app.models import User, TypingSample, TypingFeature, SampleSource, SampleQuality
    from app.ml.features import extract_features
    from app.services.ml_service import ml_service
    import numpy as np

    username = payload.get("username", "demo_user")
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail=f"Usuario '{username}' no encontrado")

    # Limpiar muestras de enrolamiento previas de este usuario si se solicita reset
    if payload.get("reset_existing", True):
        prev_samples = db.query(TypingSample).filter(
            TypingSample.user_id == user.id,
            TypingSample.source == SampleSource.enrollment
        ).all()
        for s in prev_samples:
            db.query(TypingFeature).filter(TypingFeature.sample_id == s.id).delete()
            db.delete(s)
        db.commit()

    phrase = "La seguridad protege la información"
    n_chars = len(phrase)

    rng = np.random.default_rng(42 + user.id)

    # Patrón biométrico base individualizado por tecla para este usuario específico
    user_key_signature = {}
    for i, c in enumerate(phrase):
        key = "Space" if c == " " else c
        user_key_signature[i] = {
            "key": key,
            "base_hold": float(rng.uniform(72.0, 105.0)),
            "base_latency": float(rng.uniform(75.0, 140.0))
        }

    # Configuración de las 3 sesiones (Normal vs Con prisa vs Cansado)
    sessions_cfg = [
        {
            "session_id": "1",
            "time_label": "Sesión 1 - Mañana (08:45)",
            "count": 12,
            "context": "normal",
            "scale_factor": 1.0,
            "jitter": 0.05
        },
        {
            "session_id": "2",
            "time_label": "Sesión 2 - Tarde (14:30)",
            "count": 12,
            "context": "con prisa",
            "scale_factor": 0.82,  # ~18% más rápido
            "jitter": 0.06
        },
        {
            "session_id": "3",
            "time_label": "Sesión 3 - Noche (21:50)",
            "count": 11,
            "context": "cansado",
            "scale_factor": 1.25,  # ~25% más lento / pausas de fatiga
            "jitter": 0.08
        }
    ]

    total_created = 0

    for sess in sessions_cfg:
        scale = sess["scale_factor"]
        jitter = sess["jitter"]

        for rep in range(sess["count"]):
            events = []
            curr_ts = 1000.0 + rep * 120.0
            prev_ku = 0.0

            for i in range(n_chars):
                sig = user_key_signature[i]
                key = sig["key"]

                # Variación natural dentro de la sesión
                rep_var = float(rng.normal(1.0, jitter))
                hold = max(35.0, sig["base_hold"] * scale * rep_var)
                latency = max(20.0, sig["base_latency"] * scale * rep_var)

                if i == 0:
                    kd = curr_ts
                else:
                    kd = prev_ku + latency

                ku = kd + hold
                prev_ku = ku

                events.append({
                    "key": key,
                    "keydown_ts": round(kd, 2),
                    "keyup_ts": round(ku, 2)
                })

            feature_res = extract_features(events, phrase)
            if not feature_res["valid"]:
                continue

            sample = TypingSample(
                user_id=user.id,
                raw_timestamps=events,
                phrase_typed=phrase,
                source=SampleSource.enrollment,
                is_validated=True,
                consistency_score=feature_res["consistency_score"],
                sample_quality=SampleQuality.high,
                context_tag=sess["context"],
                session_id=sess["session_id"],
                capture_time_label=f"{sess['time_label']} - Rep {rep + 1}"
            )
            db.add(sample)
            db.flush()

            feature = TypingFeature(
                sample_id=sample.id,
                feature_vector=feature_res["feature_vector"],
                feature_names=feature_res["feature_names"]
            )
            db.add(feature)
            total_created += 1

    db.commit()

    # Re-entrenar modelo con el dataset multi-sesión
    train_res = ml_service.train_model(db, user.id)
    multi_status = typing_service.get_user_multi_session_status(db, user.id)

    return {
        "success": True,
        "message": f"Se sembraron {total_created} muestras distribuidas en 3 sesiones para '{username}' y se entrenó el modelo v{train_res.get('version', 1)}.",
        "samples_created": total_created,
        "model_version": train_res.get("version", 1),
        "multi_session_status": multi_status
    }
