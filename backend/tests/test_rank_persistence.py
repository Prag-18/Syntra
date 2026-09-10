import sys
import os
import uuid
import pytest
from unittest.mock import patch

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

SAMPLE_JD = """
We are looking for a Senior Staff Backend Engineer to lead our Distributed Payments Platform.
Must have: Python, Go, Distributed Systems, High Throughput, Kafka, PostgreSQL.
Nice to have: Kubernetes, Redis, AWS.
Experience: 7+ years building resilient transaction engines.
"""

def test_health():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["database"] == "connected"

def test_rank_persistence_standard():
    payload = {
        "jd_text": SAMPLE_JD
    }
    response = client.post("/rank", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "run_id" in data
    assert len(data["rankings"]) > 0

    run_id = uuid.UUID(data["run_id"])
    with get_db_session() as db:
        run = db.query(RankingRunModel).filter_by(id=run_id).first()
        assert run is not None
        assert run.status == "complete"
        assert run.duration_ms is not None and run.duration_ms > 0
        assert "candidate_count" in run.phase3_scores
        
        jd = db.query(JobDescriptionModel).filter_by(id=run.jd_id).first()
        assert jd is not None
        assert jd.extracted_intent is not None
        assert len(jd.must_have_skills) > 0

        results = db.query(RankedResultModel).filter_by(run_id=run_id).order_by(RankedResultModel.final_rank).all()
        assert len(results) == len(data["rankings"])
        
        for r in results:
            assert r.final_rank >= 1
            assert r.composite_score is not None
            assert r.tier in ["Top pick", "Worth interviewing", "Not recommended"]
            assert r.dim_skills is not None
            assert r.dim_trajectory is not None
            assert r.dim_leadership is not None
            assert r.dim_domain is not None
            assert r.dim_communication is not None
            assert len(r.key_strengths) >= 0

def test_rank_persistence_small_pool():
    small_pool = [
        {
            "id": "small_cand_1",
            "full_name": "Alice Developer",
            "current_role": "Backend Lead",
            "company": "Stripe",
            "years_experience": 8,
            "skills": ["Python", "Go", "Distributed Systems", "Kafka"],
            "bio": "Payments architect with high scale transaction experience."
        },
        {
            "id": "small_cand_2",
            "full_name": "Bob Junior",
            "current_role": "Junior Engineer",
            "company": "Startup",
            "years_experience": 2,
            "skills": ["Python"],
            "bio": "Early career backend enthusiast."
        }
    ]
    payload = {
        "jd_text": "Looking for Go and Kafka Backend Lead",
        "candidates": small_pool
    }
    response = client.post("/rank", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert len(data["rankings"]) == 2
    
    run_id = uuid.UUID(data["run_id"])
    with get_db_session() as db:
        results = db.query(RankedResultModel).filter_by(run_id=run_id).all()
        assert len(results) == 2

def test_rank_persistence_pool_greater_than_10():
    large_pool = [
        {
            "id": f"pool_cand_{i}",
            "full_name": f"Candidate Number {i}",
            "current_role": "Software Engineer",
            "company": f"Tech Company {i}",
            "years_experience": 3 + (i % 8),
            "skills": ["Python", "Go"] if i < 5 else ["JavaScript", "HTML"],
            "bio": f"Engineer with experience in systems #{i}."
        }
        for i in range(1, 14)  # 13 candidates
    ]
    payload = {
        "jd_text": SAMPLE_JD,
        "candidates": large_pool
    }
    response = client.post("/rank", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert len(data["rankings"]) == 13

    run_id = uuid.UUID(data["run_id"])
    with get_db_session() as db:
        results = db.query(RankedResultModel).filter_by(run_id=run_id).order_by(RankedResultModel.final_rank).all()
        assert len(results) == 13
        # First 10 should be LLM re-ranked
        for r in results[:10]:
            assert r.final_rank <= 10
            assert r.rationale is not None
        # Candidates 11..13 should have Phase 3 fallback summaries
        for r in results[10:]:
            assert r.final_rank > 10
            assert "Phase 3 automated score" in r.rationale

def test_rank_failure_records_failed_status():
    payload = {
        "jd_text": "Non-empty JD text for failed test"
    }
    # Mock extract_role_intent to simulate Gemini API timeout / failure
    with patch("api.main.extract_role_intent", side_effect=Exception("Gemini quota exceeded")):
        response = client.post("/rank", json=payload)
        assert response.status_code == 500
        assert "Gemini quota exceeded" in response.json()["detail"]

    # Verify that a run was recorded with status='failed'
    with get_db_session() as db:
        failed_run = db.query(RankingRunModel).filter_by(status="failed").order_by(RankingRunModel.created_at.desc()).first()
        assert failed_run is not None
        assert failed_run.status == "failed"
        assert failed_run.duration_ms is not None
