#!/usr/bin/env python3
"""
seed_hypothesis_study.py
Script generador de datos sintéticos experimentales para validar los tres estados de veredicto
(CUMPLE, NO_CUMPLE, INCONCLUSO) en el módulo de Análisis de Hipótesis.

IMPORTANTE: Diseñado exclusivamente para bases de datos de prueba o demostración.
Por defecto crea una base de datos aislada en 'backend/test_hypothesis_study.db'.
"""

import argparse
import sys
import os
import random
import numpy as np
from datetime import datetime, timedelta, timezone

# Agregar directorio backend al path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base
from app.models.mobile_study import MobileParticipant, MobileStudySample


PHRASE = "La seguridad protege la información"
APPS = ["SYSTEM_LOCK", "WhatsApp", "BCP", "Galería", "Mensajes", "Ajustes"]
NETWORKS = ["WIFI", "CELLULAR"]


def get_random_timing_vector(mean_ht=110.0, std_ht=14.0, mean_lt=65.0, std_lt=18.0, n_chars=37):
    hts = [max(25.0, min(500.0, round(float(np.random.normal(mean_ht, std_ht)), 2))) for _ in range(n_chars)]
    lts = [max(-50.0, min(600.0, round(float(np.random.normal(mean_lt, std_lt)), 2))) for _ in range(n_chars - 1)]
    return hts, lts


def seed_scenario(session, scenario="cumple", n_participants=35):
    print(f"[*] Generando escenario sintético: {scenario.upper()} (N = {n_participants} sujetos)...")

    if scenario == "inconcluso":
        # Muestra insuficiente: solo 2 participantes, pocos intentos
        for i in range(1, 3):
            p = MobileParticipant(
                participant_code=f"PART-INC-{i:03d}",
                email=f"inconcluso_{i}@unt.edu.pe",
                full_name=f"Participante Inconcluso {i}",
                dominant_hand="diestro",
                age_range="18-25",
                device_model="Xiaomi Redmi Note 12",
                screen_refresh_rate=120,
                is_enrolled=True,
                enrolled_reps_count=30,
                enrollment_phrase=PHRASE,
                m0_profile={"centroid_ht": [115.0]*37, "std_ht": [12.0]*37, "centroid_lt": [70.0]*36, "std_lt": [15.0]*36},
                mt_profile={"centroid_ht": [115.0]*37, "std_ht": [12.0]*37, "centroid_lt": [70.0]*36, "std_lt": [15.0]*36},
                current_drift=0.012
            )
            session.add(p)
            session.flush()

            # Solo 2 muestras legítimas y 1 impostor (muy por debajo de los umbrales mínimos)
            s_leg = MobileStudySample(
                client_event_id=f"inc-leg-{i}",
                participant_id=p.id,
                sample_type="AUTH_SYSTEM",
                phrase=PHRASE,
                raw_timestamps=[],
                hold_times=[115.0]*37,
                latencies=[70.0]*36,
                features={"total_time_ms": 820.0, "wpm": 42.0},
                similarity_score=0.91,
                is_accepted=True,
                ground_truth="LEGITIMATE",
                target_app="SYSTEM_LOCK",
                auth_context="SYSTEM_LOCK",
                inference_time_ms=14.5,
                total_unlock_delay_ms=820.0,
                network_connection_type="WIFI"
            )
            session.add(s_leg)
        session.commit()
        print("    ✓ Escenario INCONCLUSO sembrado con éxito.")
        return

    # Escenarios 'cumple' y 'no_cumple'
    is_passing = (scenario == "cumple")

    for i in range(1, n_participants + 1):
        # Perfil base de cada participante
        base_ht = float(np.random.normal(110.0, 15.0))
        base_lt = float(np.random.normal(70.0, 20.0))
        centroid_ht, centroid_lt = get_random_timing_vector(mean_ht=base_ht, mean_lt=base_lt)
        std_ht = [round(max(6.0, float(np.random.normal(12.0, 2.0))), 2) for _ in range(37)]
        std_lt = [round(max(8.0, float(np.random.normal(16.0, 3.0))), 2) for _ in range(36)]

        profile = {
            "centroid_ht": centroid_ht,
            "std_ht": std_ht,
            "centroid_lt": centroid_lt,
            "std_lt": std_lt
        }

        part = MobileParticipant(
            participant_code=f"PART-{scenario[:3].upper()}-{i:03d}",
            email=f"sujeto_{i}_{scenario}@unt.edu.pe",
            full_name=f"Sujeto Experimental {i}",
            dominant_hand=random.choice(["diestro", "diestro", "diestro", "zurdo"]),
            age_range=random.choice(["18-25", "18-25", "26-35"]),
            device_model=random.choice(["Samsung Galaxy A54", "Xiaomi Redmi Note 13", "Motorola Edge 40"]),
            screen_refresh_rate=random.choice([60, 90, 120]),
            is_enrolled=True,
            enrolled_reps_count=30,
            enrollment_phrase=PHRASE,
            m0_profile=profile,
            mt_profile=profile,
            current_drift=round(float(np.random.uniform(0.01, 0.08)), 4)
        )
        session.add(part)
        session.flush()

        # Intentos legítimos (10 por participante)
        # Para cumplir H3 con rigor Clopper-Pearson al 95%, 35 participantes x 10 = 350 intentos legítimos (> 185)
        for rep in range(10):
            # En CUMPLE: Scores altos (0.87 a 0.98), 0 rechazos, latencia < 50ms, retardo < 1800ms
            # En NO_CUMPLE: Scores erráticos (0.60 a 0.74, provocando FRR alto > 10%), latencias lentas
            if is_passing:
                sim = round(float(np.random.uniform(0.86, 0.97)), 3)
                inf_ms = round(float(np.random.uniform(8.0, 28.0)), 2)
                delay_ms = round(float(np.random.uniform(550.0, 1150.0)), 1)
            else:
                sim = round(float(np.random.uniform(0.62, 0.76)), 3)
                inf_ms = round(float(np.random.uniform(55.0, 85.0)), 2)  # Falla > 50 ms
                delay_ms = round(float(np.random.uniform(1950.0, 2600.0)), 1)  # Falla > 1.8 s

            app_target = random.choice(APPS)
            ctx = "SYSTEM_LOCK" if app_target == "SYSTEM_LOCK" else "APPLOCKER"

            # En NO_CUMPLE: crear discrepancia forzada entre contextos para romper H2
            if not is_passing and ctx == "APPLOCKER":
                sim = max(0.40, sim - 0.20)

            sample_leg = MobileStudySample(
                client_event_id=f"seed-{scenario}-leg-{part.id}-{rep}",
                participant_id=part.id,
                sample_type="AUTH_SYSTEM" if ctx == "SYSTEM_LOCK" else "AUTH_APPLOCKER",
                phrase=PHRASE,
                raw_timestamps=[],
                hold_times=centroid_ht,
                latencies=centroid_lt,
                features={"total_time_ms": delay_ms, "wpm": 45.0},
                similarity_score=sim,
                is_accepted=bool(sim >= 0.75),
                ground_truth="LEGITIMATE",
                target_app=app_target,
                auth_context=ctx,
                inference_time_ms=inf_ms,
                total_unlock_delay_ms=delay_ms,
                network_connection_type=random.choice(NETWORKS),
                created_at=datetime.now(timezone.utc) - timedelta(hours=random.randint(1, 72))
            )
            session.add(sample_leg)

        # Intentos de impostores (5 por participante)
        for imp_idx in range(5):
            # En CUMPLE: Impostores rechazados con scores bajos (0.10 a 0.35, siempre < theta 0.75 -> FAR < 1%)
            # En NO_CUMPLE: Impostores logran scores altos (0.78 a 0.88 -> FAR > 15%)
            if is_passing:
                imp_sim = round(float(np.random.uniform(0.12, 0.38)), 3)
            else:
                imp_sim = round(float(np.random.uniform(0.76, 0.89)), 3)

            imp_app = random.choice(APPS)
            imp_ctx = "SYSTEM_LOCK" if imp_app == "SYSTEM_LOCK" else "APPLOCKER"

            sample_imp = MobileStudySample(
                client_event_id=f"seed-{scenario}-imp-{part.id}-{imp_idx}",
                participant_id=part.id,
                sample_type="IMPOSTOR_CHALLENGE",
                phrase=PHRASE,
                raw_timestamps=[],
                hold_times=[220.0]*37,
                latencies=[140.0]*36,
                features={"total_time_ms": 1100.0, "wpm": 28.0},
                similarity_score=imp_sim,
                is_accepted=bool(imp_sim >= 0.75),
                ground_truth="IMPOSTOR_KNOWN_CREDENTIAL",
                target_app=imp_app,
                auth_context=imp_ctx,
                inference_time_ms=16.0,
                total_unlock_delay_ms=920.0,
                network_connection_type=random.choice(NETWORKS),
                created_at=datetime.now(timezone.utc) - timedelta(hours=random.randint(1, 48))
            )
            session.add(sample_imp)

    session.commit()
    print(f"    ✓ Escenario {scenario.upper()} sembrado con éxito en base de datos.")


def main():
    parser = argparse.ArgumentParser(description="Sembrador de datos sintéticos para análisis de hipótesis.")
    parser.add_argument(
        "--scenario",
        choices=["cumple", "no_cumple", "inconcluso"],
        default="cumple",
        help="Escenario a simular (por defecto: 'cumple')"
    )
    parser.add_argument(
        "--db-path",
        default="backend/test_hypothesis_study.db",
        help="Ruta de la base de datos SQLite destino (por defecto: backend/test_hypothesis_study.db)"
    )
    args = parser.parse_args()

    db_url = f"sqlite:///{args.db_path}"
    print(f"[*] Conectando a base de datos de prueba: {db_url}")

    engine = create_engine(db_url, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)

    Session = sessionmaker(bind=engine)
    session = Session()

    try:
        seed_scenario(session, scenario=args.scenario)
        print(f"[*] Completado. Puedes iniciar FastAPI apuntando DATABASE_URL='{db_url}' para visualizar.")
    finally:
        session.close()


if __name__ == "__main__":
    main()
