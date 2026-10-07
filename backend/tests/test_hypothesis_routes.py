"""
test_hypothesis_routes.py
Tests de integración para los endpoints REST de análisis de hipótesis (/api/mobile/study/hypotheses/...).
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import init_db


@pytest.fixture(autouse=True)
def setup_db():
    init_db()


@pytest.fixture
def client():
    return TestClient(app)


def test_get_hypotheses_summary(client):
    response = client.get("/api/mobile/study/hypotheses/summary?theta=0.75")
    assert response.status_code == 200
    data = response.json()
    assert "cards" in data
    assert len(data["cards"]) == 3
    card_ids = [c["hypothesis_id"] for c in data["cards"]]
    assert card_ids == ["H1", "H2", "H3"]
    assert "quality_report" in data
    assert "active_filters" in data


def test_get_h1_detailed(client):
    response = client.get("/api/mobile/study/hypotheses/h1?theta=0.75&impostor_source=ALL")
    assert response.status_code == 200
    data = response.json()
    assert data["hypothesis_id"] == "H1"
    assert "metrics" in data
    assert "curves" in data
    assert "confusion_matrix" in data
    assert "session_analysis" in data


def test_get_h2_detailed(client):
    response = client.get("/api/mobile/study/hypotheses/h2?theta=0.75")
    assert response.status_code == 200
    data = response.json()
    assert data["hypothesis_id"] == "H2"
    assert "comparison" in data
    assert "matrices" in data
    assert "statistical_tests" in data


def test_get_h3_detailed(client):
    response = client.get("/api/mobile/study/hypotheses/h3?theta=0.75")
    assert response.status_code == 200
    data = response.json()
    assert data["hypothesis_id"] == "H3"
    assert "latencies" in data
    assert "frr_analysis" in data
    assert "ecdf" in data


def test_export_summary_json_and_csv(client):
    # JSON
    res_json = client.get("/api/mobile/study/hypotheses/export/summary?format=json&theta=0.75")
    assert res_json.status_code == 200
    data_json = res_json.json()
    assert "hypotheses" in data_json

    # CSV
    res_csv = client.get("/api/mobile/study/hypotheses/export/summary?format=csv&theta=0.75")
    assert res_csv.status_code == 200
    assert "text/csv" in res_csv.headers["content-type"]
    assert "H1" in res_csv.text
    assert "H2" in res_csv.text
    assert "H3" in res_csv.text
