import sys
import os
import uuid
import pytest
from unittest.mock import patch, AsyncMock

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
from core.jd_intelligence import RoleIntent, ScoringWeights

client = TestClient(app)

SAMPLE_JD = "We are seeking a Lead Backend Architect with Python, Distributed Systems, Kafka and GCP."

def make_test_role_intent(weights=None, rationales=None):
    w = weights or {"skills": 0.3, "trajectory": 0.2, "leadership": 0.2, "domain": 0.15, "communication": 0.15}
    r = rationales or {
        "skills": "Role requires core Python and systems engineering.",
        "trajectory": "Staff level seniority needed.",
        "leadership": "Mentorship signals required.",
        "domain": "Fintech distributed systems domain depth.",
        "communication": "Strong communication bar."
    }
    return RoleIntent(
        must_have_skills=["Python", "Distributed Systems", "Kafka"],
        nice_to_have_skills=["GCP"],
        implicit_requirements=["Scale"],
        culture_signals=["Ownership"],
        seniority_level="Staff",
        leadership_required=True,
        communication_bar="High",
        weights=ScoringWeights(**w),
        weight_rationale=r
    )

async def mock_run_llm_ranking(shortlist, jd_text):
    return [
        {
            "id": str(c.get("id")),
            "rank": idx,
            "full_name": c.get("full_name", ""),
            "composite_score": float(c.get("composite_score", 80.0)),
            "tier": c.get("tier", "Worth interviewing"),
            "headline": f"{c.get('current_role', '')} at {c.get('company', '')}",
            "rationale": "Evaluated candidate",
            "key_strengths": c.get("skills", [])[:3],
            "key_risks": ["Risk"],
            "interview_questions": ["Q1"],
            "dim_scores": c.get("dim_scores", {}),
            "needs_assessment": bool(c.get("needs_assessment", False))
        }
        for idx, c in enumerate(shortlist, start=1)
    ]

# 1. /jd/parse persists jd_id and returns RoleIntent with AI weights and rationale
@patch("api.main.extract_role_intent", side_effect=AsyncMock(return_value=make_test_role_intent()))
def test_jd_parse_persists_jd_and_returns_intent(mock_extract):
    res = client.post("/jd/parse", json={"jd_text": SAMPLE_JD})
    assert res.status_code == 200
    data = res.json()
    assert "jd_id" in data
    assert "weights" in data
    assert "weight_rationale" in data
    assert data["weight_rationale"]["skills"] == "Role requires core Python and systems engineering."

    jd_id = uuid.UUID(data["jd_id"])
    with get_db_session() as db:
        jd = db.query(JobDescriptionModel).filter_by(id=jd_id).first()
        assert jd is not None
        assert jd.extracted_intent is not None

# 2. /rank with jd_id skips Phase 1 Gemini call
@patch("api.main.run_llm_ranking", side_effect=mock_run_llm_ranking)
def test_rank_with_jd_id_skips_phase1(mock_llm):
    # Pre-seed JD in DB
    intent = make_test_role_intent()
    from dataclasses import asdict
    with get_db_session() as db:
        jd = JobDescriptionModel(
            title="Pre-seeded JD",
            raw_text="Unique pre-seeded JD text",
            extracted_intent=asdict(intent),
            must_have_skills=intent.must_have_skills,
            status="active"
        )
        db.add(jd)
        db.flush()
        jd_id = str(jd.id)

    # Call /rank with jd_id and mock extract_role_intent to fail if called
    with patch("api.main.extract_role_intent", side_effect=Exception("Should not be called!")) as mock_phase1:
        res = client.post("/rank", json={"jd_id": jd_id})
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "success"
        assert not mock_phase1.called

# 3. /rank without jd_id behaves as before
@patch("api.main.extract_role_intent", side_effect=AsyncMock(return_value=make_test_role_intent()))
@patch("api.main.run_llm_ranking", side_effect=mock_run_llm_ranking)
def test_rank_without_jd_id_runs_phase1(mock_llm, mock_extract):
    res = client.post("/rank", json={"jd_text": SAMPLE_JD})
    assert res.status_code == 200
    assert mock_extract.called

# 4. Valid override normalized to 1.0, preserving 0 weight
@patch("api.main.extract_role_intent", side_effect=AsyncMock(return_value=make_test_role_intent()))
@patch("api.main.run_llm_ranking", side_effect=mock_run_llm_ranking)
def test_weights_normalized_and_zero_preserved(mock_llm, mock_extract):
    # Pass unnormalized weights with leadership=0
    override = {
        "skills": 40,
        "trajectory": 20,
        "leadership": 0,
        "domain": 20,
        "communication": 20
    }
    res = client.post("/rank", json={"jd_text": SAMPLE_JD, "weights": override})
    assert res.status_code == 200
    data = res.json()
    applied = data["applied_weights"]
    assert applied["leadership"] == 0.0
    assert abs(sum(applied.values()) - 1.0) < 0.0001
    assert data["weights_overridden"] is True

# 5. Invalid weights return 422 (negative, NaN, missing key, extra key, all-zero)
def test_invalid_weights_return_422():
    # Negative weight
    res1 = client.post("/rank", json={"jd_text": SAMPLE_JD, "weights": {
        "skills": -0.1, "trajectory": 0.3, "leadership": 0.2, "domain": 0.3, "communication": 0.3
    }})
    assert res1.status_code == 422

    # Missing key
    res2 = client.post("/rank", json={"jd_text": SAMPLE_JD, "weights": {
        "skills": 0.5, "trajectory": 0.5
    }})
    assert res2.status_code == 422

    # Extra key
    res3 = client.post("/rank", json={"jd_text": SAMPLE_JD, "weights": {
        "skills": 0.2, "trajectory": 0.2, "leadership": 0.2, "domain": 0.2, "communication": 0.2, "extra": 0.1
    }})
    assert res3.status_code == 422

    # All-zero
    res4 = client.post("/rank", json={"jd_text": SAMPLE_JD, "weights": {
        "skills": 0, "trajectory": 0, "leadership": 0, "domain": 0, "communication": 0
    }})
    assert res4.status_code == 422

# 6. Persistence of ai_weights, applied_weights, and weights_overridden in both cases
@patch("api.main.extract_role_intent", side_effect=AsyncMock(return_value=make_test_role_intent()))
@patch("api.main.run_llm_ranking", side_effect=mock_run_llm_ranking)
def test_persistence_untouched_and_overridden(mock_llm, mock_extract):
    # Untouched case
    res_untouched = client.post("/rank", json={"jd_text": SAMPLE_JD})
    assert res_untouched.status_code == 200
    run_id_untouched = uuid.UUID(res_untouched.json()["run_id"])

    with get_db_session() as db:
        run = db.query(RankingRunModel).filter_by(id=run_id_untouched).first()
        assert run.weights_overridden is False
        assert run.ai_weights == run.applied_weights

    # Overridden case
    custom_w = {"skills": 0.5, "trajectory": 0.1, "leadership": 0.1, "domain": 0.15, "communication": 0.15}
    res_overridden = client.post("/rank", json={"jd_text": SAMPLE_JD, "weights": custom_w})
    assert res_overridden.status_code == 200
    run_id_overridden = uuid.UUID(res_overridden.json()["run_id"])

    with get_db_session() as db:
        run2 = db.query(RankingRunModel).filter_by(id=run_id_overridden).first()
        assert run2.weights_overridden is True
        assert run2.applied_weights["skills"] == 0.5

# 7. GET /runs/{id} returns both weight sets and weights_overridden
@patch("api.main.extract_role_intent", side_effect=AsyncMock(return_value=make_test_role_intent()))
@patch("api.main.run_llm_ranking", side_effect=mock_run_llm_ranking)
def test_get_run_detail_returns_both_weights(mock_llm, mock_extract):
    custom_w = {"skills": 0.5, "trajectory": 0.1, "leadership": 0.1, "domain": 0.15, "communication": 0.15}
    res = client.post("/rank", json={"jd_text": SAMPLE_JD, "weights": custom_w})
    run_id = res.json()["run_id"]

    detail_res = client.get(f"/runs/{run_id}")
    assert detail_res.status_code == 200
    run_data = detail_res.json()["run"]
    assert "ai_weights" in run_data
    assert "applied_weights" in run_data
    assert run_data["weights_overridden"] is True
    assert run_data["applied_weights"]["skills"] == 0.5

# 8. Old intents without weight_rationale do not crash
@patch("api.main.run_llm_ranking", side_effect=mock_run_llm_ranking)
def test_old_intent_without_weight_rationale_does_not_crash(mock_llm):
    # Stored intent with no weight_rationale
    old_intent = {
        "must_have_skills": ["Python"],
        "nice_to_have_skills": [],
        "implicit_requirements": [],
        "culture_signals": [],
        "seniority_level": "Senior",
        "leadership_required": False,
        "communication_bar": "High",
        "weights": {"skills": 0.3, "trajectory": 0.2, "leadership": 0.2, "domain": 0.15, "communication": 0.15}
    }
    with get_db_session() as db:
        jd = JobDescriptionModel(
            title="Old JD",
            raw_text="Old JD text",
            extracted_intent=old_intent,
            status="active"
        )
        db.add(jd)
        db.flush()
        jd_id = str(jd.id)

    res = client.post("/rank", json={"jd_id": jd_id})
    assert res.status_code == 200
    assert res.json()["status"] == "success"

# 9. Different weights produce different composite scores and ranking order
def test_different_weights_produce_different_rankings():
    from core.candidate_profiler import profile_candidate
    from core.semantic_matcher import process_phase3

    c1 = {
        "id": "c1",
        "full_name": "High Skills Low Leadership",
        "current_role": "Engineer",
        "years_experience": 3,
        "skills": ["Python"],
        "bio": "Dev",
        "system_design_score": 95,
        "coding_score": 95,
        "communication_score": 50,
        "mentoring_signals": "",
        "public_presence": "",
        "needs_assessment": False
    }
    c2 = {
        "id": "c2",
        "full_name": "High Leadership Low Skills",
        "current_role": "Engineering VP",
        "years_experience": 12,
        "skills": ["Management"],
        "bio": "Led 50 engineers",
        "system_design_score": 50,
        "coding_score": 50,
        "communication_score": 90,
        "mentoring_signals": "mentors 10 engineers",
        "public_presence": "keynote speaker",
        "needs_assessment": False
    }

    profiled = [profile_candidate(c1), profile_candidate(c2)]

    # Run 1: High Skills weight (skills: 0.6, leadership: 0.05)
    intent1 = make_test_role_intent(weights={"skills": 0.6, "trajectory": 0.1, "leadership": 0.05, "domain": 0.15, "communication": 0.1})
    res1 = process_phase3(profiled, intent1)
    assert res1[0]["id"] == "c1"

    # Run 2: High Leadership weight (skills: 0.05, leadership: 0.6)
    intent2 = make_test_role_intent(weights={"skills": 0.05, "trajectory": 0.1, "leadership": 0.6, "domain": 0.15, "communication": 0.1})
    res2 = process_phase3(profiled, intent2)
    assert res2[0]["id"] == "c2"
