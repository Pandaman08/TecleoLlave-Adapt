"""
Test Automatizado de Validación: Aislamiento Estricto por Usuario (Sección 5)
=============================================================================
Prueba técnica de seguridad y control de acceso biométrico:
1. Ningún usuario accede a otra cuenta aunque conozca la contraseña exacta del dueño.
   - Paso 1 (Password): Se supera exitosamente con las credenciales robadas.
   - Paso 2 (Biometría): El modelo cargado es EXCLUSIVAMENTE el del usuario autenticado
     en el Paso 1, y RECHAZA al atacante por incompatibilidad neuromuscular motora.
2. Aislamiento bidireccional:
   - Cada usuario solo puede ser admitido en su propia cuenta con su propio modelo.
3. Ausencia absoluta de modelo por defecto o fallback permisivo:
   - Si no hay modelo activo entrenado, la decisión es estrictamente REJECT (Score = 0.0).

Ejecución directa:
    python tests/test_user_isolation.py
"""

import os
import sys
import unittest
import numpy as np

# Asegurar backend en path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models import (
    User, TypingSample, TypingFeature, ModelVersion,
    SampleSource, SampleQuality, AuthAttempt, AuthDecision
)
from app.schemas import TimingEvent, TypingAuthRequest
from app.ml.features import extract_features
from app.ml.model_selector import model_selector
from app.services.auth_service import auth_service
from app.services.typing_service import typing_service
from app.services.ml_service import ml_service
from app.config import settings

PHRASE = "La seguridad protege la información"
TEST_DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "test_isolation_isolated.db"))


def generate_keystroke_timestamps(
    signature_map: dict,
    scale: float = 1.0,
    jitter: float = 0.025,
    rng: np.random.Generator = None
) -> list:
    """Genera timestamps de tecleo según el perfil motor del sujeto."""
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


class TestUserIsolationAndCredentialTheft(unittest.TestCase):
    """
    Suite de pruebas que valida el principio fundamental de aislamiento por usuario:
    La contraseña por sí sola no permite el acceso; el segundo factor biométrico
    garantiza que cada cuenta está sellada a su dueño biomecánico.
    """

    @classmethod
    def setUpClass(cls):
        if os.path.exists(TEST_DB_PATH):
            try:
                os.remove(TEST_DB_PATH)
            except Exception:
                pass

        cls.engine = create_engine(
            f"sqlite:///{TEST_DB_PATH}",
            connect_args={"check_same_thread": False}
        )
        Base.metadata.create_all(bind=cls.engine)
        cls.Session = sessionmaker(bind=cls.engine)
        cls.db = cls.Session()

        cls.rng = np.random.default_rng(777)

        # 1. Registrar Usuario A (Víctima legítima)
        cls.victim_password = "VictimStrongPassword2026!"
        cls.victim = auth_service.register_user(
            cls.db,
            username="victim_account",
            password=cls.victim_password
        )

        # 2. Registrar Usuario B (Atacante / Impostor)
        cls.attacker_password = "AttackerPassword999!"
        cls.attacker = auth_service.register_user(
            cls.db,
            username="attacker_account",
            password=cls.attacker_password
        )

        # 3. Registrar Usuario C (Usuario fantasma sin enrolamiento)
        cls.ghost = auth_service.register_user(
            cls.db,
            username="ghost_user_no_model",
            password="GhostPassword123!"
        )

        # 4. Construir perfil motor para Usuario A (Víctima)
        cls.victim_sig = {}
        for i, ch in enumerate(PHRASE):
            key = "Space" if ch == " " else ch
            cls.victim_sig[i] = {
                "key": key,
                "hold": float(cls.rng.uniform(70.0, 100.0)),
                "latency": float(cls.rng.uniform(80.0, 130.0))
            }

        # 5. Construir perfil motor completamente DISTINTO para Usuario B (Atacante)
        cls.attacker_sig = {}
        for i, ch in enumerate(PHRASE):
            key = "Space" if ch == " " else ch
            cls.attacker_sig[i] = {
                "key": key,
                "hold": float(cls.rng.uniform(115.0, 165.0)),
                "latency": float(cls.rng.uniform(145.0, 235.0))
            }

        # 6. Enrolar a Usuario A (16 muestras legítimas)
        for rep in range(16):
            ev = generate_keystroke_timestamps(cls.victim_sig, scale=float(cls.rng.normal(1.0, 0.03)), jitter=0.025, rng=cls.rng)
            feat = extract_features(ev, PHRASE)
            sample = TypingSample(
                user_id=cls.victim.id,
                raw_timestamps=ev,
                phrase_typed=PHRASE,
                source=SampleSource.enrollment,
                is_validated=True,
                consistency_score=feat["consistency_score"],
                sample_quality=SampleQuality.high,
                session_id="1",
                context_tag="normal"
            )
            cls.db.add(sample)
            cls.db.flush()
            cls.db.add(TypingFeature(sample_id=sample.id, feature_vector=feat["feature_vector"], feature_names=feat["feature_names"]))

        # 7. Enrolar a Usuario B (16 muestras legítimas de atacante)
        for rep in range(16):
            ev = generate_keystroke_timestamps(cls.attacker_sig, scale=float(cls.rng.normal(1.0, 0.03)), jitter=0.025, rng=cls.rng)
            feat = extract_features(ev, PHRASE)
            sample = TypingSample(
                user_id=cls.attacker.id,
                raw_timestamps=ev,
                phrase_typed=PHRASE,
                source=SampleSource.enrollment,
                is_validated=True,
                consistency_score=feat["consistency_score"],
                sample_quality=SampleQuality.high,
                session_id="1",
                context_tag="normal"
            )
            cls.db.add(sample)
            cls.db.flush()
            cls.db.add(TypingFeature(sample_id=sample.id, feature_vector=feat["feature_vector"], feature_names=feat["feature_names"]))
        cls.db.commit()

        # 8. Entrenar modelo biométrico individual para Usuario A
        cls.models_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "models"))
        os.makedirs(cls.models_dir, exist_ok=True)
        m_path_a = os.path.join(cls.models_dir, f"test_victim_model")
        bm_a, metrics_a, comp_a, reason_a = model_selector.select_and_train_best_model(cls.db, cls.victim.id, m_path_a)
        
        mv_a = ModelVersion(
            user_id=cls.victim.id,
            model_path=m_path_a + ".joblib",
            training_samples_count=16,
            metrics=metrics_a,
            training_config={"algorithm": metrics_a.get("algorithm")},
            feature_schema={"version": "1.0"},
            is_active=True
        )
        cls.db.add(mv_a)

        # 9. Entrenar modelo biométrico individual para Usuario B
        m_path_b = os.path.join(cls.models_dir, f"test_attacker_model")
        bm_b, metrics_b, comp_b, reason_b = model_selector.select_and_train_best_model(cls.db, cls.attacker.id, m_path_b)
        
        mv_b = ModelVersion(
            user_id=cls.attacker.id,
            model_path=m_path_b + ".joblib",
            training_samples_count=16,
            metrics=metrics_b,
            training_config={"algorithm": metrics_b.get("algorithm")},
            feature_schema={"version": "1.0"},
            is_active=True
        )
        cls.db.add(mv_b)
        cls.db.commit()

        cls.victim_model_id = mv_a.id
        cls.attacker_model_id = mv_b.id

        print("\n[SETUP AISLAMIENTO] Entornos biométricos aislados creados exitosamente:")
        print(f"  * Usuario Víctima:  ID={cls.victim.id}, Username='{cls.victim.username}', Modelo Activo ID={cls.victim_model_id}")
        print(f"  * Usuario Atacante: ID={cls.attacker.id}, Username='{cls.attacker.username}', Modelo Activo ID={cls.attacker_model_id}")
        print(f"  * Usuario Fantasma: ID={cls.ghost.id}, Username='{cls.ghost.username}', Sin Modelo Activo")

    @classmethod
    def tearDownClass(cls):
        cls.db.close()
        if os.path.exists(TEST_DB_PATH):
            try:
                os.remove(TEST_DB_PATH)
            except Exception:
                pass

    def test_01_credential_theft_with_impostor_keystroke_is_strictly_rejected(self):
        """
        ESCENARIO CRÍTICO DE AISLAMIENTO:
        El atacante ha robado o conoce la contraseña exacta de 'victim_account'.
        - Paso 1 (Password): Pasa exitosamente porque la contraseña es correcta.
        - Paso 2 (Biometría): El atacante teclea con sus propias manos.
          El sistema DEBE cargar el modelo de la víctima y RECHAZAR tajantemente al atacante.
        """
        print("\n" + "="*80)
        print("TEST 5.1: Ataque de Credencial Comprometida (Password Robada + Biometría Ajena)")
        print("="*80)

        # Paso 1: Atacante intenta autenticarse con la contraseña de la víctima
        authenticated_user = auth_service.authenticate_user(
            self.db,
            username=self.victim.username,
            password=self.victim_password  # Contraseña correcta robada
        )
        self.assertIsNotNone(authenticated_user, "Paso 1: La contraseña es correcta, debe autenticar usuario")
        self.assertEqual(authenticated_user.id, self.victim.id)
        print(f"  [PASO 1] Autenticación por contraseña: ÉXITO (Simulando contraseña comprometida)")

        # Paso 2: El atacante procede al tecleo de la frase con su propio ritmo biomecánico
        attacker_events = generate_keystroke_timestamps(
            self.attacker_sig,
            scale=1.0,
            jitter=0.025,
            rng=self.rng
        )
        timing_events = [TimingEvent(**e) for e in attacker_events]

        auth_req = TypingAuthRequest(
            raw_timestamps=timing_events,
            phrase_typed=PHRASE,
            username=self.victim.username
        )

        # Autenticación biométrica evaluada bajo el contexto de la víctima (user_id=self.victim.id)
        auth_result = typing_service.authenticate_sample(
            self.db,
            request=auth_req,
            user_id=authenticated_user.id
        )

        decision = auth_result["decision"]
        score = auth_result["score"]
        model_used_id = auth_result["model_version_id"]

        print(f"  [PASO 2] Validación Biométrica del Atacante tecleando en la cuenta de la Víctima:")
        print(f"           - Modelo Cargado:         Versión ID={model_used_id} (Perteneciente a User ID {authenticated_user.id})")
        print(f"           - Puntaje Obtenido:       {score*100:.1f}%")
        print(f"           - Decisión Resultante:    {decision.upper()}")

        # VERIFICACIÓN DE SEGURIDAD ESTRICTA:
        # 1. El modelo usado DEBE ser exactamente el de la víctima, no un fallback ni el del atacante
        self.assertEqual(
            model_used_id, self.victim_model_id,
            f"El modelo cargado en Paso 2 debe ser el específico del usuario autenticado ({self.victim_model_id}), se usó: {model_used_id}"
        )
        # 2. La decisión DEBE ser REJECT
        self.assertEqual(
            decision, "reject",
            f"FALLA CRÍTICA DE AISLAMIENTO: Se permitió acceso a un atacante con contraseña robada. Decisión={decision}"
        )
        # 3. El puntaje debe ser seguro (<0.60)
        self.assertLess(
            score, 0.60,
            f"El score del atacante debe ser bajo (<60%), fue: {score*100:.1f}%"
        )

        print(f"  [VEREDICTO] ACCESO DENEGADO (REJECT). La biometría impidió la intrusión a pesar de la contraseña robada. [PASÓ]")

    def test_02_bidirectional_account_isolation(self):
        """
        Verifica el aislamiento bidireccional entre cuentas:
        - Dueño legítimo entra a su propia cuenta con su propio tecleo -> ALLOW (100%)
        - Dueño legítimo intenta entrar a la cuenta de otro -> REJECT
        - Atacante entra a su propia cuenta con su propio tecleo -> ALLOW (100%)
        - Atacante intenta entrar a la cuenta de la víctima -> REJECT
        """
        print("\n" + "="*80)
        print("TEST 5.2: Aislamiento Bidireccional Estricto entre Usuarios")
        print("="*80)

        # A) Víctima en su propia cuenta
        ev_victim = generate_keystroke_timestamps(self.victim_sig, scale=1.0, jitter=0.025, rng=self.rng)
        req_victim_self = TypingAuthRequest(raw_timestamps=[TimingEvent(**e) for e in ev_victim], phrase_typed=PHRASE)
        res_victim_self = typing_service.authenticate_sample(self.db, req_victim_self, user_id=self.victim.id)

        print(f"  1. Víctima en Cuenta Propia:    Score={res_victim_self['score']*100:5.1f}% | Decisión={res_victim_self['decision'].upper()} (Modelo ID {res_victim_self['model_version_id']})")
        self.assertIn(res_victim_self["decision"], ["allow", "challenge"])
        self.assertEqual(res_victim_self["model_version_id"], self.victim_model_id)

        # B) Atacante en su propia cuenta
        ev_attacker = generate_keystroke_timestamps(self.attacker_sig, scale=1.0, jitter=0.025, rng=self.rng)
        req_attacker_self = TypingAuthRequest(raw_timestamps=[TimingEvent(**e) for e in ev_attacker], phrase_typed=PHRASE)
        res_attacker_self = typing_service.authenticate_sample(self.db, req_attacker_self, user_id=self.attacker.id)

        print(f"  2. Atacante en Cuenta Propia:   Score={res_attacker_self['score']*100:5.1f}% | Decisión={res_attacker_self['decision'].upper()} (Modelo ID {res_attacker_self['model_version_id']})")
        self.assertIn(res_attacker_self["decision"], ["allow", "challenge"])
        self.assertEqual(res_attacker_self["model_version_id"], self.attacker_model_id)

        # C) Cruce: Víctima teclea en cuenta del Atacante
        res_cross_v_to_a = typing_service.authenticate_sample(self.db, req_victim_self, user_id=self.attacker.id)
        print(f"  3. Víctima teclea en Atacante:  Score={res_cross_v_to_a['score']*100:5.1f}% | Decisión={res_cross_v_to_a['decision'].upper()} (Modelo ID {res_cross_v_to_a['model_version_id']})")
        self.assertEqual(res_cross_v_to_a["decision"], "reject", "La víctima no debe poder entrar a la cuenta del atacante")
        self.assertEqual(res_cross_v_to_a["model_version_id"], self.attacker_model_id)

        # D) Cruce: Atacante teclea en cuenta de la Víctima
        res_cross_a_to_v = typing_service.authenticate_sample(self.db, req_attacker_self, user_id=self.victim.id)
        print(f"  4. Atacante teclea en Víctima:  Score={res_cross_a_to_v['score']*100:5.1f}% | Decisión={res_cross_a_to_v['decision'].upper()} (Modelo ID {res_cross_a_to_v['model_version_id']})")
        self.assertEqual(res_cross_a_to_v["decision"], "reject", "El atacante no debe poder entrar a la cuenta de la víctima")
        self.assertEqual(res_cross_a_to_v["model_version_id"], self.victim_model_id)

        print(f"\n>> Veredicto: El aislamiento entre cuentas es 100% simétrico y hermético. [PASÓ]")

    def test_03_no_default_model_and_no_permissive_fallback(self):
        """
        Verifica que NO EXISTE modelo por defecto ni fallback que acepte a cualquiera.
        Si un usuario no tiene modelo activo (ej. registro sin completar enrolamiento),
        el sistema NUNCA recurre a un modelo genérico predeterminado; la decisión
        es obligatoriamente REJECT (Score = 0.0).
        """
        print("\n" + "="*80)
        print("TEST 5.3: Ausencia de Modelo por Defecto / Rechazo Seguro sin Modelo")
        print("="*80)

        # 1. Confirmar que el usuario fantasma no tiene modelo activo
        active_model = ml_service.get_active_model(self.db, self.ghost.id)
        self.assertIsNone(active_model, "El usuario fantasma no debe tener ningún modelo activo en BD")
        print(f"  * Modelo activo de '{self.ghost.username}': None (Verificado)")

        # 2. Intentar predicción directa vía ml_service
        sample_vector = [100.0] * 100
        with self.assertRaises(ValueError) as ctx:
            ml_service.predict_decision(self.db, self.ghost.id, sample_vector)
        self.assertIn("No active model for user", str(ctx.exception))
        print(f"  * Excepción en ml_service: {ctx.exception} (Comportamiento correcto)")

        # 3. Intentar autenticación vía typing_service (flujo operativo)
        dummy_events = generate_keystroke_timestamps(self.victim_sig, scale=1.0, jitter=0.02, rng=self.rng)
        auth_req = TypingAuthRequest(
            raw_timestamps=[TimingEvent(**e) for e in dummy_events],
            phrase_typed=PHRASE
        )
        res = typing_service.authenticate_sample(self.db, auth_req, user_id=self.ghost.id)

        print(f"  * Resultado en typing_service para usuario sin modelo:")
        print(f"    - Decisión: {res['decision'].upper()}")
        print(f"    - Score:    {res['score']}")
        print(f"    - Modelo:   {res['model_version_id']}")

        self.assertEqual(res["decision"], "reject", "Un usuario sin modelo debe ser rechazado inmediatamente")
        self.assertEqual(res["score"], 0.0, "El score sin modelo debe ser exactamente 0.0")
        self.assertIn(res["model_version_id"], [None, 0], "No debe asignarse ningún ID de modelo activo real")

        print(f"\n>> Veredicto: No existe modelo por defecto; ningún usuario pasa sin su propio modelo entrenado. [PASÓ]")


if __name__ == "__main__":
    unittest.main(verbosity=2)
