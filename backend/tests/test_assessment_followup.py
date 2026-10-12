import sys
import os
import uuid
import pytest
from unittest.mock import patch, AsyncMock, MagicMock

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from api.main import app
from database.connection import get_db_session
from database.models import CandidateModel
from core.llm_ranker import run_llm_ranking
from core.candidate_profiler import profile_candidate

client = TestClient(app)

@pytest.mark.asyncio
async def test_llm_ranker_needs_assessment_awareness():
    shortlist = [
        {
            "id": "cand_unassessed_1",
            "full_name": "Alice Unassessed",
            "current_role": "Backend Lead",
            "company": "Independent",
            "years_experience": 5,
            "skills": ["Python", "Go"],
            "bio": "Extracted from resume",
            "system_design_score": None,
            "coding_score": None,
            "communication_score": None,
            "needs_assessment": True,
            "dim_scores": {"skills": 70, "trajectory": 70, "leadership": 70, "domain": 70, "communication": 70}
        },
        {
            "id": "cand_assessed_2",
            "full_name": "Bob Assessed",
            "current_role": "Staff Engineer",
            "company": "Google",
            "years_experience": 8,
            "skills": ["C++", "Distributed Systems"],
            "bio": "Assessed developer",
            "system_design_score": 90,
            "coding_score": 95,
            "communication_score": 85,
            "needs_assessment": False,
            "dim_scores": {"skills": 92.5, "trajectory": 80, "leadership": 75, "domain": 85, "communication": 85}
        }
    ]

    mock_gemini_response = {
        "candidates": [{
            "content": {
                "parts": [{
                    "text": """[
                        {
                            "id": "cand_unassessed_1",
                            "rank": 1,
                            "full_name": "Alice Unassessed",
                            "composite_score": 78.5,
                            "tier": "Top pick",
                            "headline": "Backend Lead with strong potential",
                            "rationale": "Strong candidate experience.",
                            "key_strengths": ["Python", "Go", "Leadership"],
                            "key_risks": ["Technical skills unverified pending formal assessment", "Short tenure"],
                            "interview_questions": ["Probe core Python system architecture", "Question 2", "Question 3"],
                            "dim_scores": {"skills": 70, "trajectory": 70, "leadership": 70, "domain": 70, "communication": 70}
                        },
                        {
                            "id": "cand_assessed_2",
                            "rank": 2,
                            "full_name": "Bob Assessed",
                            "composite_score": 88.0,
                            "tier": "Top pick",
                            "headline": "Staff Engineer with proven track record",
                            "rationale": "High verified technical score.",
                            "key_strengths": ["C++", "Distributed Systems", "Scale"],
                            "key_risks": ["Risk 1", "Risk 2"],
                            "interview_questions": ["Q1", "Q2", "Q3"],
                            "dim_scores": {"skills": 92.5, "trajectory": 80, "leadership": 75, "domain": 85, "communication": 85}
                        }
                    ]"""
                }]
            }
        }]
    }

    mock_res = MagicMock()
    mock_res.raise_for_status = lambda: None
    mock_res.json = lambda: mock_gemini_response

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=mock_res) as mock_post:
        rankings = await run_llm_ranking(shortlist, "Senior Backend Lead Role")

        # 1. Assert outgoing request payload contains needs_assessment and unverified-skills instruction
        assert mock_post.called
        call_args = mock_post.call_args
        request_payload = call_args.kwargs.get("json") or call_args[1].get("json")
        prompt_text = request_payload["contents"][0]["parts"][0]["text"]

        assert "needs_assessment = true" in prompt_text
        assert "unverified pending formal assessment" in prompt_text
        assert "cand_unassessed_1" in prompt_text

        # 2. Assert output shape is unchanged and needs_assessment flag is preserved
        assert len(rankings) == 2
        unassessed_item = next(r for r in rankings if r["id"] == "cand_unassessed_1")
        assessed_item = next(r for r in rankings if r["id"] == "cand_assessed_2")

        assert unassessed_item["needs_assessment"] is True
        assert assessed_item["needs_assessment"] is False
        assert "key_strengths" in unassessed_item
        assert "key_risks" in unassessed_item
        assert "interview_questions" in unassessed_item

def test_put_scores_both_set_flips_flag_false():
    cand = CandidateModel(
        full_name="Flip Candidate Both Set",
        current_role="Engineer",
        company="Startup",
        system_design_score=None,
        coding_score=None,
        needs_assessment=True
    )
    with get_db_session() as db:
        db.add(cand)
        db.flush()
        cand_id = str(cand.id)

    payload = {
        "system_design_score": 85,
        "coding_score": 90
    }
    response = client.put(f"/candidates/{cand_id}", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["system_design_score"] == 85
    assert data["coding_score"] == 90
    assert data["needs_assessment"] is False

def test_put_scores_only_one_set_leaves_flag_true():
    cand = CandidateModel(
        full_name="Flip Candidate One Set",
        current_role="Engineer",
        company="Startup",
        system_design_score=None,
        coding_score=None,
        needs_assessment=True
    )
    with get_db_session() as db:
        db.add(cand)
        db.flush()
        cand_id = str(cand.id)

    payload = {
        "system_design_score": 85,
        "coding_score": None
    }
    response = client.put(f"/candidates/{cand_id}", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["system_design_score"] == 85
    assert data["coding_score"] is None
    assert data["needs_assessment"] is True

def test_put_scores_zero_flips_flag_false():
    cand = CandidateModel(
        full_name="Flip Candidate Zero Scores",
        current_role="Engineer",
        company="Startup",
        system_design_score=None,
        coding_score=None,
        needs_assessment=True
    )
    with get_db_session() as db:
        db.add(cand)
        db.flush()
        cand_id = str(cand.id)

    payload = {
        "system_design_score": 0,
        "coding_score": 0
    }
    response = client.put(f"/candidates/{cand_id}", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["system_design_score"] == 0
    assert data["coding_score"] == 0
    assert data["needs_assessment"] is False

def test_put_scores_out_of_range_or_non_numeric_returns_422():
    cand = CandidateModel(
        full_name="Invalid Score Candidate",
        current_role="Engineer",
        company="Startup",
        needs_assessment=True
    )
    with get_db_session() as db:
        db.add(cand)
        db.flush()
        cand_id = str(cand.id)

    # Test out of range > 100
    res_high = client.put(f"/candidates/{cand_id}", json={"system_design_score": 150})
    assert res_high.status_code == 422

    # Test out of range < 0
    res_low = client.put(f"/candidates/{cand_id}", json={"coding_score": -10})
    assert res_low.status_code == 422

    # Test non-numeric string
    res_string = client.put(f"/candidates/{cand_id}", json={"system_design_score": "abc"})
    assert res_string.status_code == 422

def test_put_cannot_set_needs_assessment_directly():
    cand = CandidateModel(
        full_name="Client Override Candidate",
        current_role="Engineer",
        company="Startup",
        system_design_score=None,
        coding_score=None,
        needs_assessment=True
    )
    with get_db_session() as db:
        db.add(cand)
        db.flush()
        cand_id = str(cand.id)

    # Client tries to set needs_assessment=False while scores remain null
    payload = {
        "needs_assessment": False
    }
    response = client.put(f"/candidates/{cand_id}", json=payload)
    assert response.status_code == 200
    data = response.json()
    # Server must ignore client input and enforce needs_assessment=True
    assert data["needs_assessment"] is True

def test_profiler_uses_real_scores_after_flag_flip():
    # Before flip (unassessed, null scores)
    cand_unassessed = {
        "full_name": "Before Flip",
        "current_role": "Senior Engineer",
        "company": "Stripe",
        "years_experience": 5,
        "skills": ["Python", "Go"],
        "bio": "Developer",
        "system_design_score": None,
        "coding_score": None,
        "needs_assessment": True
    }
    profiled_unassessed = profile_candidate(cand_unassessed, target_keywords=["Python", "Go"])
    domain_score = profiled_unassessed["dim_scores"]["domain"]
    assert profiled_unassessed["dim_scores"]["skills"] == domain_score

    # After flip (both scores recorded: 90 and 80, needs_assessment=False)
    cand_assessed = {
        **cand_unassessed,
        "system_design_score": 90,
        "coding_score": 80,
        "needs_assessment": False
    }
    profiled_assessed = profile_candidate(cand_assessed, target_keywords=["Python", "Go"])
    # (90 + 80) / 2 = 85.0 (no longer falls back to domain_score)
    assert profiled_assessed["dim_scores"]["skills"] == 85.0
    assert profiled_assessed["dim_scores"]["skills"] != domain_score


def test_zero_scores_preserved_in_profiler():
    from core.candidate_profiler import calculate_communication, _compute_skills_score
    # communication score 0 should be 0 * 0.5 + 25 = 25.0, NOT 60 * 0.5 + 25 = 55.0
    assert calculate_communication(0, "", "") == 25.0
    # None communication score defaults to 60.0 * 0.5 + 25 = 55.0
    assert calculate_communication(None, "", "") == 55.0

    # Skills dimension with zeros: (0 + 0) / 2 = 0.0
    assert _compute_skills_score(0, 0, 80.0) == 0.0
    # Single zero score preserved
    assert _compute_skills_score(0, None, 80.0) == 0.0
    assert _compute_skills_score(None, 0, 80.0) == 0.0


def test_partial_assessment_skills_behavior():
    from core.candidate_profiler import _compute_skills_score
    # Two scores: average
    assert _compute_skills_score(80, 90, 50.0) == 85.0
    # Exactly one score: use that one score
    assert _compute_skills_score(80, None, 50.0) == 80.0
    assert _compute_skills_score(None, 95, 50.0) == 95.0
    # Neither score: fall back to domain depth proxy
    assert _compute_skills_score(None, None, 50.0) == 50.0


def test_tier_cap_and_order_unchanged():
    from core.candidate_profiler import apply_tier_cap
    from core.semantic_matcher import process_phase3
    from core.jd_intelligence import RoleIntent, ScoringWeights

    # Tier cap direct function
    assert apply_tier_cap("Top pick", True) == ("Worth interviewing", "Capped: pending assessment")
    assert apply_tier_cap("Top pick", False) == ("Top pick", None)
    assert apply_tier_cap("Worth interviewing", True) == ("Worth interviewing", None)

    # In process_phase3: ensure composite score and order are unchanged
    weights = ScoringWeights(skills=0.3, trajectory=0.2, leadership=0.2, domain=0.15, communication=0.15)
    intent = RoleIntent(
        must_have_skills=["Python"],
        nice_to_have_skills=[],
        implicit_requirements=[],
        culture_signals=[],
        seniority_level="Senior",
        leadership_required=False,
        communication_bar="High",
        weights=weights
    )

    c1 = {
        "id": "c1",
        "full_name": "High Unassessed",
        "dim_scores": {"skills": 95, "trajectory": 95, "leadership": 95, "domain": 95, "communication": 95},
        "needs_assessment": True
    }
    c2 = {
        "id": "c2",
        "full_name": "Medium Assessed",
        "dim_scores": {"skills": 70, "trajectory": 70, "leadership": 70, "domain": 70, "communication": 70},
        "needs_assessment": False
    }

    results = process_phase3([c1, c2], intent)
    assert len(results) == 2
    # c1 still ranks first because composite_score is higher (95 vs 70)
    assert results[0]["id"] == "c1"
    assert results[0]["composite_score"] == 95.0
    # but c1 is capped from 'Top pick' to 'Worth interviewing'
    assert results[0]["tier"] == "Worth interviewing"
    assert results[0]["tier_cap_note"] == "Capped: pending assessment"

    # c2 is 'Worth interviewing' without note
    assert results[1]["id"] == "c2"
    assert results[1]["tier"] == "Worth interviewing"
    assert "tier_cap_note" not in results[1]


def test_clearing_score_flips_flag_to_true():
    cand = CandidateModel(
        full_name="Clearing Score Candidate",
        current_role="Staff Engineer",
        company="Stripe",
        system_design_score=90,
        coding_score=90,
        needs_assessment=False
    )
    with get_db_session() as db:
        db.add(cand)
        db.flush()
        cand_id = str(cand.id)

    # Clear one of the scores
    res = client.put(f"/candidates/{cand_id}", json={"coding_score": None})
    assert res.status_code == 200
    data = res.json()
    assert data["coding_score"] is None
    assert data["system_design_score"] == 90
    assert data["needs_assessment"] is True


def test_history_uses_snapshot_after_candidate_assessed_later():
    # 1. Create a candidate with needs_assessment=True
    cand = CandidateModel(
        full_name="Snapshot History Candidate",
        current_role="Senior Backend",
        company="Uber",
        needs_assessment=True
    )
    with get_db_session() as db:
        db.add(cand)
        db.flush()
        cand_id = str(cand.id)

    # 2. Mock ranking run storing candidate in ranked_results with snapshot
    from database.models import RankingRunModel, RankedResultModel, JobDescriptionModel
    with get_db_session() as db:
        jd = JobDescriptionModel(
            title="Backend Engineer",
            raw_text="Test JD",
            must_have_skills=["Go"],
            extracted_intent={}
        )
        db.add(jd)
        db.flush()

        run = RankingRunModel(
            jd_id=jd.id,
            phase3_scores={},
            status="complete"
        )
        db.add(run)
        db.flush()

        result_row = RankedResultModel(
            run_id=run.id,
            candidate_id=uuid.UUID(cand_id),
            final_rank=1,
            composite_score=80.0,
            tier="Worth interviewing",
            headline="Backend Lead",
            rationale="Strong background",
            needs_assessment_at_rank=True
        )
        db.add(result_row)
        db.flush()
        run_id = str(run.id)

    # 3. Candidate later completes assessment and sets scores
    put_res = client.put(f"/candidates/{cand_id}", json={"system_design_score": 90, "coding_score": 90})
    assert put_res.status_code == 200
    assert put_res.json()["needs_assessment"] is False

    # 4. GET /runs/{run_id} MUST still report needs_assessment=True because of snapshot!
    get_run_res = client.get(f"/runs/{run_id}")
    assert get_run_res.status_code == 200
    run_data = get_run_res.json()
    assert len(run_data["run"]["rankings"]) == 1
    # Snapshot value preserved
    assert run_data["run"]["rankings"][0]["needs_assessment"] is True
