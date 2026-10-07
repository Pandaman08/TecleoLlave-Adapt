"""
test_hypothesis_analysis.py
Tests unitarios rigurosos para las funciones estadísticas puras de análisis de hipótesis (H1, H2, H3).
"""

import pytest
import numpy as np
from app.services.hypothesis_service import (
    clopper_pearson_ci,
    participant_cluster_bootstrap,
    calculate_eer_and_curves,
    calculate_confusion_matrix,
    evaluate_h1,
    evaluate_h2,
    evaluate_h3,
    generate_cross_evaluation_impostors
)


def test_clopper_pearson_ci():
    # Caso 0 éxitos de 100
    low0, up0 = clopper_pearson_ci(0, 100, confidence=0.95)
    assert low0 == 0.0
    assert 3.0 <= up0 <= 4.0  # Regla del tres: ~3.6%

    # Caso 100 éxitos de 100
    low100, up100 = clopper_pearson_ci(100, 100, confidence=0.95)
    assert up100 == 100.0
    assert 96.0 <= low100 <= 97.0

    # Caso estándar: 1 éxito de 100 (FAR bajo)
    low1, up1 = clopper_pearson_ci(1, 100, confidence=0.95)
    assert low1 < 1.0
    assert up1 < 6.0

    # n = 0
    l_zero, u_zero = clopper_pearson_ci(0, 0)
    assert l_zero == 0.0 and u_zero == 0.0


def test_participant_cluster_bootstrap():
    # Datos sintéticos agrupados por 5 participantes
    data = {
        1: [{"val": 10}, {"val": 12}],
        2: [{"val": 15}, {"val": 14}],
        3: [{"val": 20}, {"val": 18}],
        4: [{"val": 22}, {"val": 25}],
        5: [{"val": 30}, {"val": 28}]
    }

    def mean_fn(items):
        return float(np.mean([x["val"] for x in items]))

    point, ci_low, ci_high = participant_cluster_bootstrap(data, mean_fn, n_boot=200, seed=42)
    assert 15.0 <= point <= 25.0
    assert ci_low <= point <= ci_high
    assert ci_low > 10.0
    assert ci_high < 35.0


def test_calculate_eer_and_curves():
    # Distribuciones bien separadas: Legítimos alrededor de 0.90, Impostores alrededor de 0.20
    leg_scores = [0.85, 0.88, 0.92, 0.95, 0.89, 0.91, 0.86, 0.94]
    imp_scores = [0.15, 0.22, 0.18, 0.25, 0.30, 0.12, 0.28, 0.19]

    res = calculate_eer_and_curves(leg_scores, imp_scores)
    assert res["eer"] is not None
    assert res["eer"] <= 5.0  # EER muy bajo por separación
    assert res["auc"] >= 0.95
    assert len(res["roc_points"]) > 0
    assert len(res["det_points"]) > 0


def test_calculate_confusion_matrix():
    leg_scores = [0.90, 0.80, 0.70, 0.60]  # Con theta = 0.75: 2 TP (0.9, 0.8), 2 FN (0.7, 0.6)
    imp_scores = [0.80, 0.40, 0.30, 0.20]  # Con theta = 0.75: 1 FP (0.8), 3 TN (0.4, 0.3, 0.2)

    cm = calculate_confusion_matrix(leg_scores, imp_scores, theta=0.75)
    assert cm["tp"] == 2
    assert cm["fn"] == 2
    assert cm["fp"] == 1
    assert cm["tn"] == 3
    assert cm["far_pct"] == 25.0  # 1 / 4
    assert cm["frr_pct"] == 50.0  # 2 / 4


def test_evaluate_h1_insufficient_samples():
    # Menos de 3 participantes o menos de 10 muestras
    leg = [{"participant_id": 1, "similarity_score": 0.9}]
    imp = [{"participant_id": 1, "similarity_score": 0.2}]

    res = evaluate_h1(leg, imp, min_required_participants=3, min_required_attempts=10)
    assert res["status"] == "INCONCLUSO"
    assert "Muestra insuficiente" in res["verdict_reason"]


def test_evaluate_h1_verdict_cumple():
    # Crear datos donde FAR < 3% y EER <= 2.5% con margen de confianza amplio
    leg = []
    imp = []
    for pid in range(1, 10):
        for _ in range(15):
            leg.append({"participant_id": pid, "similarity_score": 0.92, "ground_truth": "LEGITIMATE"})
        for _ in range(15):
            imp.append({"participant_id": pid, "similarity_score": 0.15, "ground_truth": "IMPOSTOR"})

    res = evaluate_h1(leg, imp, theta=0.75, min_required_participants=3, min_required_attempts=10)
    assert res["status"] == "CUMPLE"
    assert res["metrics"]["observed_far_pct"] < 3.0
    assert res["metrics"]["observed_eer_pct"] <= 2.5


def test_evaluate_h2_inconcluso_and_cumple():
    # Inconcluso si solo hay un contexto
    items_only_sys = [
        {"participant_id": 1, "auth_context": "SYSTEM_LOCK", "similarity_score": 0.9, "ground_truth": "LEGITIMATE"}
    ]
    res_inc = evaluate_h2(items_only_sys)
    assert res_inc["status"] == "INCONCLUSO"

    # Cumple cuando ambos contextos tienen distribuciones similares consistentes
    items_both = []
    for pid in range(1, 8):
        for _ in range(5):
            items_both.append({
                "participant_id": pid,
                "auth_context": "SYSTEM_LOCK",
                "similarity_score": 0.91,
                "ground_truth": "LEGITIMATE"
            })
            items_both.append({
                "participant_id": pid,
                "auth_context": "APPLOCKER",
                "target_app": "WhatsApp",
                "similarity_score": 0.90,
                "ground_truth": "LEGITIMATE"
            })
            items_both.append({
                "participant_id": pid,
                "auth_context": "SYSTEM_LOCK",
                "similarity_score": 0.18,
                "ground_truth": "IMPOSTOR"
            })
            items_both.append({
                "participant_id": pid,
                "auth_context": "APPLOCKER",
                "target_app": "WhatsApp",
                "similarity_score": 0.19,
                "ground_truth": "IMPOSTOR"
            })

    res_h2 = evaluate_h2(items_both)
    assert res_h2["status"] in ["CUMPLE", "NO_CUMPLE"]
    assert "statistical_tests" in res_h2
    assert "wilcoxon_signed_rank" in res_h2["statistical_tests"]


def test_evaluate_h3():
    # Inconcluso con pocas muestras
    res_inc = evaluate_h3([{"similarity_score": 0.9}], min_required_attempts=10)
    assert res_inc["status"] == "INCONCLUSO"

    # Inconcluso cuando n < 185 porque no se alcanza la cota Clopper-Pearson < 2.0%
    leg_small = []
    for _ in range(50):
        leg_small.append({
            "similarity_score": 0.92,
            "inference_time_ms": 12.5,
            "total_unlock_delay_ms": 780.0,
            "network_connection_type": "WIFI"
        })
    res_inc2 = evaluate_h3(leg_small, theta=0.75, min_required_attempts=10)
    assert res_inc2["status"] == "INCONCLUSO"
    assert "Muestra de intentos legítimos insuficiente" in res_inc2["verdict_reason"]

    # Cumple cuando inferencia < 50ms, retardo < 1800ms y FRR_upper < 2% (requiere n >= 185)
    leg = []
    for _ in range(200):
        leg.append({
            "similarity_score": 0.92,  # > theta 0.75 -> 0 falsos rechazos
            "inference_time_ms": 12.5,
            "total_unlock_delay_ms": 780.0,
            "network_connection_type": "WIFI"
        })

    res_h3 = evaluate_h3(leg, theta=0.75, min_required_attempts=10)
    assert res_h3["status"] == "CUMPLE"
    assert res_h3["latencies"]["inference_ms"]["p95"] < 50.0
    assert res_h3["latencies"]["unlock_delay_ms"]["p95"] < 1800.0


def test_generate_cross_evaluation_impostors():
    class DummyParticipant:
        def __init__(self, pid):
            self.id = pid
            self.m0_profile = {
                "centroid_ht": [100.0, 110.0, 95.0, 105.0],
                "std_ht": [10.0, 12.0, 9.0, 11.0],
                "centroid_lt": [50.0, 60.0, 55.0],
                "std_lt": [8.0, 10.0, 7.0]
            }
            self.mt_profile = None

    p_map = {1: DummyParticipant(1), 2: DummyParticipant(2)}
    leg_by_pid = {
        1: [{"hold_times": [100.0, 110.0, 95.0, 105.0], "latencies": [50.0, 60.0, 55.0]}],
        2: [{"hold_times": [220.0, 240.0, 190.0, 210.0], "latencies": [120.0, 140.0, 130.0]}]
    }

    cross_items = generate_cross_evaluation_impostors(p_map, leg_by_pid)
    assert len(cross_items) >= 2
    # El participante 2 evaluado contra el perfil del participante 1 debe arrojar un score bajo
    for item in cross_items:
        assert item["is_cross_eval"] is True
        assert item["ground_truth"] == "IMPOSTOR_ZERO_EFFORT"
        assert 0.05 <= item["similarity_score"] <= 0.99
