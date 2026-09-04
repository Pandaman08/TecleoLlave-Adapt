"""
Test de regresión: valida que el mecanismo de adaptación (TECLEOLLAVE-ADAPT)
realmente incorpora nuevas muestras de comportamiento (deriva) al entrenar
un modelo candidato, y que dicho candidato reconoce mejor la conducta
derivada que el modelo estático original -- sin romper el criterio de
"la seguridad nunca empeora" (FAR no debe degradarse).

Ejecutar con: python -m pytest backend/tests/test_adaptation_fix.py -v
"""
import os
import random
import shutil
import numpy as np
import pytest

TEST_DB = "/tmp/tecleollave_test_adapt.db"


@pytest.fixture(scope="module")
def db_session():
    if os.path.exists(TEST_DB):
        os.remove(TEST_DB)
    os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB}"

    from app.database import Base, engine, SessionLocal
    import app.models  # noqa: F401 - registers all tables on Base.metadata
    Base.metadata.create_all(bind=engine)
    session = SessionLocal()
    yield session
    session.close()
    if os.path.exists(TEST_DB):
        os.remove(TEST_DB)


PHRASE = "La seguridad protege la información"


def gen_pattern(drift=0.0):
    base_hold, base_latency = 85.0, 130.0
    return {
        ('Space' if ch == ' ' else ch): (base_hold * (1 + drift), base_latency * (1 + drift))
        for ch in PHRASE
    }


def gen_events(pattern, seed):
    random.seed(seed)
    np.random.seed(seed)
    events, t, prev_ku = [], 1000.0, 0
    for i, ch in enumerate(PHRASE):
        key = 'Space' if ch == ' ' else ch
        hold_mean, lat_mean = pattern.get(key, (80.0, 120.0))
        kd = t + i * lat_mean + random.uniform(-10, 10)
        if i > 0:
            kd = max(kd, prev_ku + 5)
        hold = max(30, np.random.normal(hold_mean, hold_mean * 0.1))
        ku = kd + hold
        events.append({'key': key, 'keydown_ts': kd, 'keyup_ts': ku})
        prev_ku, t = ku, kd
    return events


def _make_sample(db, TypingSample, TypingFeature, extract_features, user_id, source, pattern, seed):
    events = gen_events(pattern, seed)
    fr = extract_features(events, PHRASE)
    sample = TypingSample(
        user_id=user_id, raw_timestamps=events, phrase_typed=PHRASE,
        source=source, is_validated=True
    )
    db.add(sample)
    db.commit()
    db.refresh(sample)
    feat = TypingFeature(
        sample_id=sample.id, feature_vector=fr['feature_vector'],
        feature_names=fr.get('feature_names', [])
    )
    db.add(feat)
    db.commit()
    return sample, np.array(fr['feature_vector'])


def test_pool_is_used_and_improves_recognition_of_drift(db_session):
    """
    El punto central del proyecto: un modelo M1 entrenado con el pool de
    adaptación debe reconocer mejor una muestra de conducta derivada
    (held-out, nunca vista en entrenamiento) que un modelo M0 entrenado
    solo con el enrolamiento original.
    """
    from app.models import User, TypingSample, TypingFeature, SampleSource
    from app.ml.features import extract_features
    from app.ml.trainer import train_user_model
    from app.ml.predictor import BiometricPredictor

    db = db_session
    user = User(username="pytest_user", password_hash="x", phrase=PHRASE)
    db.add(user)
    db.commit()
    db.refresh(user)

    base_pattern = gen_pattern(drift=0.0)
    for i in range(30):
        _make_sample(db, TypingSample, TypingFeature, extract_features,
                     user.id, SampleSource.enrollment, base_pattern, seed=i)

    drifted_pattern = gen_pattern(drift=0.15)
    pool_ids = []
    for i in range(20):
        s, _ = _make_sample(db, TypingSample, TypingFeature, extract_features,
                             user.id, SampleSource.auth, drifted_pattern, seed=2000 + i)
        pool_ids.append(s.id)

    holdout_feats = []
    for i in range(10):
        _, f = _make_sample(db, TypingSample, TypingFeature, extract_features,
                             user.id, SampleSource.auth, drifted_pattern, seed=5000 + i)
        holdout_feats.append(f)
    holdout_feats = np.array(holdout_feats)

    os.makedirs("/tmp/test_models", exist_ok=True)

    m0_model, m0_metrics = train_user_model(db, user.id, "/tmp/test_models/m0", extra_sample_ids=None)
    m1_model, m1_metrics = train_user_model(db, user.id, "/tmp/test_models/m1", extra_sample_ids=pool_ids)

    pred0 = BiometricPredictor(m0_model)
    pred1 = BiometricPredictor(m1_model)

    scores0 = np.mean([pred0.predict_score(f) for f in holdout_feats])
    scores1 = np.mean([pred1.predict_score(f) for f in holdout_feats])

    shutil.rmtree("/tmp/test_models", ignore_errors=True)

    assert m1_metrics['n_samples_total'] > m0_metrics['n_samples_total'], (
        "El modelo candidato (M1) debe entrenarse con MÁS muestras que M0 "
        "porque debe incluir el pool de adaptación además del enrolamiento."
    )
    assert scores1 > scores0, (
        "El modelo adaptado (M1) debe reconocer la conducta derivada mejor "
        "que el modelo estático (M0): si esto falla, el pool de muestras "
        "ALLOW no está llegando al entrenamiento del candidato."
    )
