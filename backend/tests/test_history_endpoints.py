import sys
import os
import uuid
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from api.main import app
from database.connection import get_db_session
from database.models import (
    CandidateModel,
    JobDescriptionModel,
    RankingRunModel,
    RankedResultModel
)

client = TestClient(app)

def test_list_runs():
    response = client.get("/runs")
    assert response.status_code == 200
    data = response.json()
    assert "runs" in data
    assert "total" in data
    assert "limit" in data
    assert "offset" in data
    assert isinstance(data["runs"], list)

def test_list_runs_filtering_and_pagination():
    # Filter by complete
    res_complete = client.get("/runs?status=complete&limit=5&offset=0")
    assert res_complete.status_code == 200
    data_complete = res_complete.json()
    for run in data_complete["runs"]:
        assert run["status"] == "complete"
        assert "run_id" in run
        assert "jd_id" in run
        assert "title" in run
        assert "jd_snippet" in run

    # Filter by failed
    res_failed = client.get("/runs?status=failed")
    assert res_failed.status_code == 200
    data_failed = res_failed.json()
    for run in data_failed["runs"]:
        assert run["status"] == "failed"

def test_get_run_detail_valid():
    # Fetch list first to get a completed run
    list_res = client.get("/runs?status=complete&limit=1")
    assert list_res.status_code == 200
    runs = list_res.json()["runs"]
    if not runs:
        pytest.skip("No completed runs found to test detail view")

    run_id = runs[0]["run_id"]
    detail_res = client.get(f"/runs/{run_id}")
    assert detail_res.status_code == 200
    detail = detail_res.json()["run"]
    assert detail["id"] == run_id
    assert detail["status"] == "complete"
    assert "job_description" in detail
    assert "rankings" in detail
    assert isinstance(detail["rankings"], list)
    if len(detail["rankings"]) > 0:
        first_ranked = detail["rankings"][0]
        assert "rank" in first_ranked
        assert "full_name" in first_ranked
        assert "composite_score" in first_ranked
        assert "tier" in first_ranked
        assert "dim_scores" in first_ranked
        assert "skills" in first_ranked["dim_scores"]

def test_get_run_detail_not_found():
    random_uuid = str(uuid.uuid4())
    res = client.get(f"/runs/{random_uuid}")
    assert res.status_code == 404
    assert "not found" in res.json()["detail"].lower()

def test_get_run_detail_invalid_uuid():
    res = client.get("/runs/invalid-uuid-1234")
    assert res.status_code == 422
