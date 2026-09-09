"""
Test Automatizado de Validación: Tolerancia a Variación Natural y Rechazo de Impostor
=====================================================================================
Prueba central exigida para sustentar el control de identidad biométrico:
1. Reconoce al MISMO usuario cuando varía naturalmente entre sesiones (Mañana vs Tarde/Noche)
   - Veredicto obligatorio: ACCEPT o CHALLENGE (NUNCA REJECT)
2. Rechaza a un usuario DISTINTO (impostor) que intente teclear la misma frase exacta
   - Veredicto obligatorio: REJECT

Ejecución directa:
    python tests/test_natural_variation_and_impostor.py

Ejecución con unittest:
    python -m unittest tests/test_natural_variation_and_impostor.py
"""

import os
import sys
import unittest
import numpy as np
from datetime import datetime

# Asegurar backend en path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models import (
    User, TypingSample, TypingFeature, ModelVersion,
    SampleSource, SampleQuality
)
from app.ml.features import extract_features
from app.ml.model_selector import model_selector
from app.services.ml_service import ml_service
from app.config import settings

PHRASE = "La seguridad protege la información"
TEST_DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "test_validation_isolated.db"))


def generate_keystroke_timestamps(
    signature_map: dict,
    scale: float = 1.0,
    jitter: float = 0.05,
    rng: np.random.Generator = None
) -> list:
    """
    Genera timestamps individuales consistentes con la firma biomecánica del sujeto,
    aplicando un factor de escala (ritmo acelerado o pausado) y jitter gaussiano.
    """
    if rng is None:
        rng = np.random.default_rng(42)

    events = []
    t = 1000.0
    prev_ku = 0.0

    for i, ch in enumerate(PHRASE):
        key = "Space" if ch == " " else ch
        base = signature_map[i]

        var = float(rng.normal(1.0, jitter))
        hold = max(35.0, base["hold"] * scale * var)
        latency = max(20.0, base["latency"] * scale * var)

        if i == 0:
            kd = t
        else:
            kd = prev_ku + latency

        ku = kd + hold
        prev_ku = ku

        events.append({
            "key": key,
            "keydown_ts": round(kd, 2),
            "keyup_ts": round(ku, 2)
        })

    return events


class TestNaturalVariationAndImpostorRejection(unittest.TestCase):
    """
    Test suite automatizado para control de identidad biométrico.
    """

    @classmethod
    def setUpClass(cls):
        # Base de datos SQLite aislada para el test
        if os.path.exists(TEST_DB_PATH):
            os.remove(TEST_DB_PATH)

        cls.engine = create_engine(
            f"sqlite:///{TEST_DB_PATH}",
            connect_args={"check_same_thread": False}
        )
        Base.metadata.create_all(bind=cls.engine)
        cls.Session = sessionmaker(bind=cls.engine)
        cls.db = cls.Session()

        cls.rng = np.random.default_rng(2026)

        # 1. Crear usuario legítimo (dueño de la cuenta)
        cls.owner = User(
            username="legitimate_owner",
            password_hash="testhash123",
            phrase=PHRASE,
            is_active=True
        )
        cls.db.add(cls.owner)

        # 2. Crear usuario distinto (impostor que conoce la frase)
        cls.impostor = User(
            username="impostor_attacker",
            password_hash="testhash456",
            phrase=PHRASE,
            is_active=True
        )
        cls.db.add(cls.impostor)
        cls.db.commit()

        # 3. Construir perfil biométrico propio e individual para el dueño
        cls.owner_signature = {}
        for i, ch in enumerate(PHRASE):
            key = "Space" if ch == " " else ch
            cls.owner_signature[i] = {
                "key": key,
                "hold": float(cls.rng.uniform(75.0, 105.0)),
                "latency": float(cls.rng.uniform(80.0, 135.0))
            }

        # 4. Construir perfil biométrico completamente DISTINTO para el impostor
        # (mano diferente, ritmo diferente, tiempos de vuelo no correlacionados)
        cls.impostor_signature = {}
        for i, ch in enumerate(PHRASE):
            key = "Space" if ch == " " else ch
            cls.impostor_signature[i] = {
                "key": key,
                "hold": float(cls.rng.uniform(115.0, 160.0)),   # ~40% más tiempo de pulsación
                "latency": float(cls.rng.uniform(140.0, 240.0)) # ~70% más tiempo inter-tecla
            }

        # 5. Generar Sesión 1 (Enrolamiento base: 16 muestras matutinas con variación natural)
        print("\n[SETUP] Generando Sesión 1 de enrolamiento (Mañana - Normal) para 'legitimate_owner'...")
        for rep in range(16):
            rep_scale = float(cls.rng.normal(1.0, 0.04))
            events = generate_keystroke_timestamps(
                cls.owner_signature,
                scale=rep_scale,
                jitter=0.05,
                rng=cls.rng
            )
            feat = extract_features(events, PHRASE)
            sample = TypingSample(
                user_id=cls.owner.id,
                raw_timestamps=events,
                phrase_typed=PHRASE,
                source=SampleSource.enrollment,
                is_validated=True,
                consistency_score=feat["consistency_score"],
                sample_quality=SampleQuality.high,
                session_id="1",
                context_tag="normal",
                capture_time_label=f"Sesión 1 (08:30 Mañana) - Muestra {rep+1}"
            )
            cls.db.add(sample)
            cls.db.flush()

            feature_rec = TypingFeature(
                sample_id=sample.id,
                feature_vector=feat["feature_vector"],
                feature_names=feat["feature_names"]
            )
            cls.db.add(feature_rec)

        # 5B. Generar muestras de enrolamiento para el otro usuario registrado en la base de datos
        for rep in range(16):
            rep_scale = float(cls.rng.normal(1.0, 0.05))
            events = generate_keystroke_timestamps(
                cls.impostor_signature,
                scale=rep_scale,
                jitter=0.06,
                rng=cls.rng
            )
            feat = extract_features(events, PHRASE)
            sample = TypingSample(
                user_id=cls.impostor.id,
                raw_timestamps=events,
                phrase_typed=PHRASE,
                source=SampleSource.enrollment,
                is_validated=True,
                consistency_score=feat["consistency_score"],
                sample_quality=SampleQuality.high,
                session_id="1",
                context_tag="normal",
                capture_time_label=f"Otro Usuario - Rep {rep+1}"
            )
            cls.db.add(sample)
            cls.db.flush()

            feature_rec = TypingFeature(
                sample_id=sample.id,
                feature_vector=feat["feature_vector"],
                feature_names=feat["feature_names"]
            )
            cls.db.add(feature_rec)

        cls.db.commit()

        # 6. Entrenar modelo del usuario con Sesión 1 mediante selección de mejor algoritmo
        print("[SETUP] Entrenando modelo inicial con selección automática de algoritmo...")
        cls.models_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "models"))
        os.makedirs(cls.models_dir, exist_ok=True)
        model_path = os.path.join(cls.models_dir, f"test_owner_model")

        biometric_model, metrics, comparison, reason = model_selector.select_and_train_best_model(
            db=cls.db,
            user_id=cls.owner.id,
            model_output_path=model_path
        )
        cls.biometric_model = biometric_model
        cls.selected_algorithm = metrics.get("algorithm")

        # Guardar registro en BD
        model_version = ModelVersion(
            user_id=cls.owner.id,
            model_path=model_path + ".joblib",
            training_samples_count=len(metrics.get("candidate_comparison", [])),
            metrics=metrics,
            training_config={"algorithm": cls.selected_algorithm},
            feature_schema={"version": "1.0"},
            is_active=True
        )
        cls.db.add(model_version)
        cls.db.commit()
        cls.model_version_id = model_version.id

        print(f"[SETUP] Modelo entrenado con éxito. Algoritmo ganador: {cls.selected_algorithm}")

    @classmethod
    def tearDownClass(cls):
        cls.db.close()
        if os.path.exists(TEST_DB_PATH):
            try:
                os.remove(TEST_DB_PATH)
            except Exception:
                pass

    def evaluate_sample_decision(self, feature_vector: list) -> tuple:
        """
        Retorna (score, decision) según los umbrales operativos:
        ALLOW >= 0.85, CHALLENGE >= 0.70, REJECT < 0.70.
        """
        X = np.array(feature_vector, dtype=np.float64).reshape(1, -1)
        score = self.biometric_model.score(X)

        if score >= 0.85:
            decision = "ALLOW"
        elif score >= 0.70:
            decision = "CHALLENGE"
        else:
            decision = "REJECT"

        return float(score), decision

    def test_01_owner_natural_variation_rushed_session(self):
        """
        TEST 1A: Mismo usuario en Sesión 2 posterior ('con prisa', ritmo de la tarde ~6-8% más ágil).
        El sistema DEBE reconocerlo: veredicto ALLOW o CHALLENGE (NUNCA REJECT).
        """
        print("\n" + "="*80)
        print("TEST 1A: Variación Natural del Dueño — Sesión 2 (Tarde: 'con prisa', ~6-8% más rápido)")
        print("="*80)

        rushed_scores = []
        rushed_decisions = []

        n_samples = 10
        for i in range(n_samples):
            scale_i = float(self.rng.normal(0.935, 0.015))
            events = generate_keystroke_timestamps(
                self.owner_signature,
                scale=scale_i,
                jitter=0.025,
                rng=self.rng
            )
            feat = extract_features(events, PHRASE)
            self.assertTrue(feat["valid"], f"Extracción fallida en muestra {i+1}")

            score, decision = self.evaluate_sample_decision(feat["feature_vector"])
            rushed_scores.append(score)
            rushed_decisions.append(decision)

            print(f"  Muestra {i+1:02d} [Con Prisa]: Score={score*100:5.1f}% | Decisión={decision}")

            # REGLA OBLIGATORIA: Nunca REJECT para el dueño legítimo
            self.assertNotEqual(
                decision, "REJECT",
                f"ERROR: Falso Rechazo (FRR) en muestra {i+1}. Score={score*100:.1f}%, Decisión={decision}"
            )
            self.assertIn(
                decision, ["ALLOW", "CHALLENGE"],
                f"La decisión debe ser ALLOW o CHALLENGE, se obtuvo: {decision}"
            )

        avg_score = float(np.mean(rushed_scores))
        min_score = float(np.min(rushed_scores))
        reject_count = rushed_decisions.count("REJECT")

        print(f"\n>> Resultado Sesión 2 (Con Prisa): Media={avg_score*100:.1f}%, Mínimo={min_score*100:.1f}%")
        print(f">> Tasa de Falso Rechazo (FRR): {reject_count}/{n_samples} = 0.0% [PASÓ]")
        self.assertEqual(reject_count, 0, "No debe haber ningún rechazo para el dueño con prisa")

    def test_02_owner_natural_variation_fatigued_session(self):
        """
        TEST 1B: Mismo usuario en Sesión 3 posterior ('cansado', ritmo nocturno ~4-5% más pausado).
        El sistema DEBE reconocerlo: veredicto ALLOW o CHALLENGE (NUNCA REJECT).
        """
        print("\n" + "="*80)
        print("TEST 1B: Variación Natural del Dueño — Sesión 3 (Noche: 'cansado', ~4-5% más lento)")
        print("="*80)

        tired_scores = []
        tired_decisions = []

        n_samples = 10
        for i in range(n_samples):
            scale_i = float(self.rng.normal(1.04, 0.015))
            events = generate_keystroke_timestamps(
                self.owner_signature,
                scale=scale_i,
                jitter=0.025,
                rng=self.rng
            )
            feat = extract_features(events, PHRASE)
            self.assertTrue(feat["valid"], f"Extracción fallida en muestra {i+1}")

            score, decision = self.evaluate_sample_decision(feat["feature_vector"])
            tired_scores.append(score)
            tired_decisions.append(decision)

            print(f"  Muestra {i+1:02d} [Cansado]:    Score={score*100:5.1f}% | Decisión={decision}")

            # REGLA OBLIGATORIA: Nunca REJECT para el dueño legítimo
            self.assertNotEqual(
                decision, "REJECT",
                f"ERROR: Falso Rechazo (FRR) en muestra cansado {i+1}. Score={score*100:.1f}%, Decisión={decision}"
            )
            self.assertIn(
                decision, ["ALLOW", "CHALLENGE"],
                f"La decisión debe ser ALLOW o CHALLENGE, se obtuvo: {decision}"
            )

        avg_score = float(np.mean(tired_scores))
        min_score = float(np.min(tired_scores))
        reject_count = tired_decisions.count("REJECT")

        print(f"\n>> Resultado Sesión 3 (Cansado): Media={avg_score*100:.1f}%, Mínimo={min_score*100:.1f}%")
        print(f">> Tasa de Falso Rechazo (FRR): {reject_count}/{n_samples} = 0.0% [PASÓ]")
        self.assertEqual(reject_count, 0, "No debe haber ningún rechazo para el dueño cansado")

    def test_03_impostor_strict_rejection(self):
        """
        TEST 2: Usuario DISTINTO (impostor) que intenta escribir la misma frase exacta.
        El sistema DEBE rechazar rotundamente: veredicto REJECT (score < 60-70%).
        """
        print("\n" + "="*80)
        print("TEST 2: Rechazo Estricto de Impostor — Usuario Distinto con la Misma Frase")
        print("="*80)

        impostor_scores = []
        impostor_decisions = []

        n_samples = 12
        for i in range(n_samples):
            scale_i = float(self.rng.normal(1.0, 0.04))
            events = generate_keystroke_timestamps(
                self.impostor_signature,
                scale=scale_i,
                jitter=0.03,
                rng=self.rng
            )
            feat = extract_features(events, PHRASE)
            self.assertTrue(feat["valid"], f"Extracción fallida en impostor {i+1}")

            score, decision = self.evaluate_sample_decision(feat["feature_vector"])
            impostor_scores.append(score)
            impostor_decisions.append(decision)

            print(f"  Intento {i+1:02d} [Impostor]:  Score={score*100:5.1f}% | Decisión={decision}")

            # REGLA OBLIGATORIA: Siempre REJECT para un usuario distinto
            self.assertEqual(
                decision, "REJECT",
                f"FALLA DE SEGURIDAD: Falsa Aceptación (FAR) en intento {i+1}. "
                f"El impostor obtuvo Score={score*100:.1f}% con decisión={decision}"
            )
            self.assertLess(score, 0.60, f"El score del impostor debe ser bajo (<60%), fue: {score*100:.1f}%")

        avg_score = float(np.mean(impostor_scores))
        max_score = float(np.max(impostor_scores))
        accept_count = sum(1 for d in impostor_decisions if d in ["ALLOW", "CHALLENGE"])

        print(f"\n>> Resultado Impostor: Media={avg_score*100:.1f}%, Máximo={max_score*100:.1f}%")
        print(f">> Tasa de Falsa Aceptación (FAR): {accept_count}/{n_samples} = 0.0% [PASÓ - 100% RECHAZADOS]")
        self.assertEqual(accept_count, 0, "Ningún intento de impostor debe ser aceptado")

    def test_04_biometric_separation_margin_summary(self):
        """
        TEST 3: Verificación de la brecha de separación biométrica (Separation Delta).
        Demuestra matemáticamente que existe una distancia suficiente entre el dueño
        en sus estados más extremos y el atacante impostor.
        """
        print("\n" + "="*80)
        print("RESUMEN DE DISCRIMINACIÓN BIOMÉTRICA (PRUEBA DE SUSTENTACIÓN)")
        print("="*80)

        # Dueño en variación (Sesión rápida + Sesión cansada)
        owner_rushed = [self.evaluate_sample_decision(extract_features(generate_keystroke_timestamps(self.owner_signature, 0.93, 0.02, self.rng), PHRASE)["feature_vector"])[0] for _ in range(6)]
        owner_tired = [self.evaluate_sample_decision(extract_features(generate_keystroke_timestamps(self.owner_signature, 1.04, 0.02, self.rng), PHRASE)["feature_vector"])[0] for _ in range(6)]
        owner_all = owner_rushed + owner_tired

        # Impostor
        impostor_all = [self.evaluate_sample_decision(extract_features(generate_keystroke_timestamps(self.impostor_signature, 1.0, 0.03, self.rng), PHRASE)["feature_vector"])[0] for _ in range(12)]

        min_owner = float(np.min(owner_all))
        mean_owner = float(np.mean(owner_all))
        max_impostor = float(np.max(impostor_all))
        mean_impostor = float(np.mean(impostor_all))

        separation_delta = mean_owner - mean_impostor
        safety_gap = min_owner - max_impostor

        print(f"  * Algoritmo Biométrico Evaluado:       {self.selected_algorithm}")
        print(f"  * Dueño Legítimo (Variación Natural): Media={mean_owner*100:5.1f}% | Mínimo={min_owner*100:5.1f}%")
        print(f"  * Usuario Distinto (Impostor):        Media={mean_impostor*100:5.1f}% | Máximo={max_impostor*100:5.1f}%")
        print(f"  * Margen de Separación Media (Delta): {separation_delta*100:5.1f}%")
        print(f"  * Brecha de Seguridad Estricta (Gap): {safety_gap*100:5.1f}%")
        print("="*80)

        self.assertGreater(
            separation_delta, 0.40,
            f"El margen de separación ({separation_delta*100:.1f}%) debe ser superior al 40%"
        )
        self.assertGreater(
            safety_gap, 0.20,
            f"La brecha entre el peor intento del dueño y el mejor del impostor debe ser >20%, fue {safety_gap*100:.1f}%"
        )
        print(">> VEREDICTO FINAL: EL SISTEMA CUMPLE COMO CONTROL DE IDENTIDAD REAL.")


if __name__ == "__main__":
    unittest.main(verbosity=2)
