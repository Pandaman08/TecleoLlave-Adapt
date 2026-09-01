#!/usr/bin/env python3
"""
Demo Data Generator for TECLEOLLAVE-ADAPT
Generates realistic demo data for presentation/demonstration.
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

import random
import numpy as np
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.services.auth_service import auth_service
from app.services.typing_service import typing_service
from app.services.ml_service import ml_service
from app.services.adaptive_service import adaptive_service
from app.schemas import TypingEnrollRequest, TypingAuthRequest, TimingEvent
from app.models import User, ModelVersion, AuthAttempt, AdaptationEvent, CandidateModel


PHRASE = "La seguridad protege la información"
PHRASE_LENGTH = len(PHRASE)  # 35 chars


def create_base_pattern() -> dict:
    """Create a realistic base typing pattern for demo user."""
    base_hold = 85.0
    base_latency = 130.0
    pattern = {}
    
    for i, char in enumerate(PHRASE):
        key = 'Space' if char == ' ' else char
        variation = np.random.normal(1.0, 0.03)
        pattern[key] = (base_hold * variation, base_latency * variation)
    
    return pattern


def generate_timestamps(
    phrase: str,
    base_pattern: dict,
    drift: float = 0.0,
    session: int = 0,
    seed: int = 42
) -> list:
    """Generate synthetic keystroke timestamps."""
    random.seed(seed + session)
    np.random.seed(seed + session)
    
    events = []
    base_time = 1000.0
    prev_ku = 0
    
    for i, char in enumerate(phrase):
        key = 'Space' if char == ' ' else char
        
        drift_factor = 1.0 + (drift * session)
        
        if key in base_pattern:
            hold_mean, latency_mean = base_pattern[key]
        else:
            hold_mean, latency_mean = 85.0, 130.0
        
        hold_mean *= drift_factor
        latency_mean *= drift_factor
        
        kd = base_time + i * latency_mean + random.uniform(-8, 8)
        if i > 0:
            kd = max(kd, prev_ku + 5)
        
        hold_time = max(35, np.random.normal(hold_mean, hold_mean * 0.08))
        ku = kd + hold_time
        
        events.append({
            'key': key,
            'keydown_ts': round(kd, 2),
            'keyup_ts': round(ku, 2)
        })
        prev_ku = ku
        base_time = kd
    
    return events


def run_demo_setup(
    username: str = "demo_user",
    password: str = "demo123456",
    n_enroll: int = 10,
    n_auth_sessions: int = 15,
    drift_profile: str = "gradual"
):
    """
    Create a complete demo user with:
    - Registration
    - Enrollment samples
    - Trained model
    - Authentication history with adaptations
    """
    db = SessionLocal()
    
    print(f"\n{'='*60}")
    print(f"TECLEOLLAVE-ADAPT - Demo Data Generator")
    print(f"{'='*60}")
    print(f"Usuario: {username}")
    print(f"Muestras enrolamiento: {n_enroll}")
    print(f"Sesiones autenticación: {n_auth_sessions}")
    print(f"Perfil deriva: {drift_profile}")
    print(f"{'='*60}\n")
    
    # 1. Register user
    print("1. Registrando usuario...")
    user = db.query(User).filter(User.username == username).first()
    if user:
        print(f"   ℹ️  Usuario ya existe: ID={user.id}, username={user.username}")
    else:
        try:
            user = auth_service.register_user(db, username, password)
            print(f"   ✅ Usuario creado: ID={user.id}, username={user.username}")
        except Exception as e:
            print(f"   ❌ Error registrando usuario: {e}")
            db.close()
            return False
    
    user_id = user.id
    base_pattern = create_base_pattern()
    
    # Drift mapping
    drift_map = {'none': 0.0, 'gradual': 0.015, 'abrupt': 0.08}
    drift = drift_map.get(drift_profile, 0.015)
    
    # 2. Enrollment samples
    print(f"\n2. Generando {n_enroll} muestras de enrolamiento...")
    for i in range(n_enroll):
        events = generate_timestamps(
            PHRASE, base_pattern, drift=0.0, session=0, seed=100 + i
        )
        
        request = TypingEnrollRequest(
            raw_timestamps=[TimingEvent(**e) for e in events],
            phrase_typed=PHRASE,
            source='enrollment'
        )
        
        try:
            result = typing_service.enroll_sample(db, request, user_id=user_id)
            if i == 0 or i == n_enroll - 1:
                print(f"   Muestra {i+1}/{n_enroll}: quality={result.sample_quality}, consistency={result.consistency_score:.3f}")
        except Exception as e:
            print(f"   ❌ Error en muestra {i+1}: {e}")
    
    # 3. Train initial model
    print("\n3. Entrenando modelo inicial...")
    try:
        result = ml_service.train_model(db, user_id)
        print(f"   ✅ Modelo v{result['version']} entrenado")
        print(f"   Métricas: accuracy={result['metrics'].get('accuracy', 0):.2f}")
    except Exception as e:
        print(f"   ❌ Error entrenando: {e}")
        db.close()
        return False
    
    # 4. Authentication sessions with drift
    print(f"\n4. Simulando {n_auth_sessions} sesiones de autenticación...")
    
    drift_map_sessions = {
        'none': lambda s: 0.0,
        'gradual': lambda s: 0.015 * s,
        'abrupt': lambda s: 0.0 if s < 8 else 0.12
    }
    get_drift = drift_map_sessions.get(drift_profile, lambda s: 0.015 * s)
    
    adaptation_count = 0
    
    for session in range(n_auth_sessions):
        session_drift = get_drift(session)
        
        # Generate auth sample
        events = generate_timestamps(
            PHRASE, base_pattern, drift=session_drift, 
            session=session, seed=1000 + session
        )
        
        auth_request = TypingAuthRequest(
            raw_timestamps=[TimingEvent(**e) for e in events],
            phrase_typed=PHRASE,
            source='auth'
        )
        
        try:
            auth_result = typing_service.authenticate_sample(db, auth_request, user_id=user_id)
            
            decision = auth_result['decision']
            score = auth_result['score']
            adaptive_action = auth_result['adaptive_action']
            
            # Track adaptations
            if adaptive_action == 'candidate_accepted':
                adaptation_count += 1
                print(f"   Sesión {session+1:2d}: {decision.upper()} (score={score:.3f}) "
                      f"→ 🎯 ADAPTACIÓN #{adaptation_count}")
            elif adaptive_action == 'candidate_created':
                print(f"   Sesión {session+1:2d}: {decision.upper()} (score={score:.3f}) "
                      f"→ 📝 Candidato creado")
            elif adaptive_action == 'candidate_rejected':
                print(f"   Sesión {session+1:2d}: {decision.upper()} (score={score:.3f}) "
                      f"→ ❌ Candidato rechazado")
            elif session < 3 or session >= n_auth_sessions - 2:
                print(f"   Sesión {session+1:2d}: {decision.upper()} (score={score:.3f})")
                
        except Exception as e:
            print(f"   ❌ Error en sesión {session+1}: {e}")
    
    # 5. Summary
    print(f"\n{'='*60}")
    print("RESUMEN DEMO")
    print(f"{'='*60}")
    
    # Get final stats
    user = db.query(User).filter(User.id == user_id).first()
    models = db.query(ModelVersion).filter(ModelVersion.user_id == user_id).all()
    auth_attempts = db.query(AuthAttempt).filter(AuthAttempt.user_id == user_id).count()
    adaptations = db.query(AdaptationEvent).filter(AdaptationEvent.user_id == user_id).count()
    candidates = db.query(CandidateModel).filter(CandidateModel.user_id == user_id).count()
    
    active_model = db.query(ModelVersion).filter(
        ModelVersion.user_id == user_id,
        ModelVersion.is_active == True
    ).first()
    
    print(f"Usuario: {user.username} (ID: {user_id})")
    print(f"Modelo activo: v{active_model.id if active_model else 'N/A'}")
    print(f"Total versiones de modelo: {len(models)}")
    print(f"Intentos de autenticación: {auth_attempts}")
    print(f"Eventos de adaptación: {adaptations}")
    print(f"Modelos candidatos creados: {candidates}")
    print(f"Adaptaciones exitosas: {adaptation_count}")
    
    if models:
        print("\nHistorial de modelos:")
        for m in models:
            status = "🟢 ACTIVO" if m.is_active else "⚪ archivado"
            print(f"  v{m.id}: {m.training_samples_count} muestras, "
                  f"creado {m.created_at.strftime('%H:%M:%S')} {status}")
    
    db.close()
    print(f"\n✅ Demo data generada exitosamente para usuario '{username}'")
    return True


def create_impostor_demo():
    """Create a demo showing impostor rejection."""
    db = SessionLocal()
    
    print("\n" + "="*60)
    print("DEMO: DETECCIÓN DE IMPOSTOR")
    print("="*60)
    
    # Create impostor user
    username = "impostor_demo"
    try:
        user = auth_service.register_user(db, username, "impostor123")
        user_id = user.id
    except:
        user = db.query(User).filter(User.username == username).first()
        if not user:
            db.close()
            return
        user_id = user.id
    
    # Enroll legitimate user first
    legit_user = db.query(User).filter(User.username == "demo_user").first()
    if not legit_user:
        print("⚠️  Ejecuta primero run_demo_setup() para crear usuario legítimo")
        db.close()
        return
    
    # Get legitimate user's base pattern
    base_pattern = create_base_pattern()
    
    print(f"\nIntentando autenticar como '{legit_user.username}' pero con patrones de impostor...")
    
    impostor_rejected = 0
    for i in range(5):
        # Generate impostor timestamps (different pattern + noise)
        events = generate_timestamps(
            PHRASE, base_pattern, drift=0.5, session=0, seed=9999 + i
        )
        
        auth_request = TypingAuthRequest(
            raw_timestamps=[TimingEvent(**e) for e in events],
            phrase_typed=PHRASE,
            source='auth'
        )
        
        try:
            # Try to authenticate as legitimate user with impostor data
            auth_result = typing_service.authenticate_sample(db, auth_request, user_id=legit_user.id)
            decision = auth_result['decision']
            score = auth_result['score']
            
            if decision == 'reject':
                impostor_rejected += 1
                print(f"  Intento {i+1}: ❌ RECHAZADO (score={score:.3f}) - IMPOSTOR DETECTADO")
            elif decision == 'challenge':
                print(f"  Intento {i+1}: ⚠️ CHALLENGE (score={score:.3f}) - SOSPECHOSO")
            else:
                print(f"  Intento {i+1}: ✅ PERMITIDO (score={score:.3f}) - FALSO POSITIVO")
        except Exception as e:
            print(f"  Error: {e}")
    
    print(f"\nResultado: {impostor_rejected}/5 impostores rechazados correctamente")
    db.close()


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="TECLEOLLAVE-ADAPT Demo Data Generator")
    parser.add_argument("--username", default="demo_user", help="Demo username")
    parser.add_argument("--password", default="demo123456", help="Demo password")
    parser.add_argument("--enroll", type=int, default=10, help="Enrollment samples")
    parser.add_argument("--sessions", type=int, default=15, help="Auth sessions")
    parser.add_argument("--drift", choices=["none", "gradual", "abrupt"], default="gradual", help="Drift profile")
    parser.add_argument("--impostor", action="store_true", help="Run impostor detection demo")
    
    args = parser.parse_args()
    
    if args.impostor:
        create_impostor_demo()
    else:
        run_demo_setup(
            username=args.username,
            password=args.password,
            n_enroll=args.enroll,
            n_auth_sessions=args.sessions,
            drift_profile=args.drift
        )