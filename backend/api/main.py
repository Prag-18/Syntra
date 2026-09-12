import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import time
from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uuid
from typing import List, Optional, Literal
from sqlalchemy.orm import Session
from sqlalchemy import func

from database.connection import get_db, check_connection
from database.models import (
    CandidateModel,
    JobDescriptionModel,
    RankingRunModel,
    RankedResultModel,
    RecruiterFeedbackModel
)

from core.jd_intelligence import extract_role_intent
from core.candidate_profiler import profile_candidate
from core.semantic_matcher import process_phase3
from core.llm_ranker import run_llm_ranking

app = FastAPI(title="Syntra")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ParseJDRequest(BaseModel):
    jd_text: str

class RankRequest(BaseModel):
    jd_text: str
    candidates: Optional[List[dict]] = None

class FeedbackCreateRequest(BaseModel):
    candidate_id: str
    decision: Literal["accept", "maybe", "reject"]
    run_id: Optional[str] = None
    notes: Optional[str] = None

def get_candidate_feedback_summary(db: Session, candidate_id: uuid.UUID) -> dict:
    feedback_rows = db.query(RecruiterFeedbackModel).filter_by(candidate_id=candidate_id).all()
    accepts = sum(1 for f in feedback_rows if f.decision == "accept")
    maybes = sum(1 for f in feedback_rows if f.decision == "maybe")
    rejects = sum(1 for f in feedback_rows if f.decision == "reject")
    return {
        "candidate_id": str(candidate_id),
        "accepts": accepts,
        "maybes": maybes,
        "rejects": rejects
    }

@app.get("/")
def health_check():
    db_ok = check_connection()
    return {"status": "online", "database": "connected" if db_ok else "disconnected"}

@app.get("/candidates")
def get_candidates(db: Session = Depends(get_db)):
    cands = db.query(CandidateModel).filter_by(is_active=True).all()
    return [c.to_dict() for c in cands]

@app.post("/feedback")
def submit_feedback(req: FeedbackCreateRequest, db: Session = Depends(get_db)):
    cand = None
    try:
        cand_uuid = uuid.UUID(req.candidate_id)
        cand = db.query(CandidateModel).filter_by(id=cand_uuid).first()
    except (ValueError, TypeError):
        pass

    if not cand:
        cand = db.query(CandidateModel).filter_by(external_id=req.candidate_id).first()

    if not cand:
        raise HTTPException(
            status_code=404,
            detail=f"Candidate not found with identifier: '{req.candidate_id}'"
        )

    run_uuid = None
    if req.run_id:
        try:
            run_uuid = uuid.UUID(req.run_id)
            run_exists = db.query(RankingRunModel).filter_by(id=run_uuid).first()
            if not run_exists:
                raise HTTPException(
                    status_code=404,
                    detail=f"Ranking run not found with id: '{req.run_id}'"
                )
        except ValueError:
            raise HTTPException(
                status_code=422,
                detail=f"Invalid UUID format for run_id: '{req.run_id}'"
            )

    feedback = RecruiterFeedbackModel(
        candidate_id=cand.id,
        run_id=run_uuid,
        decision=req.decision,
        notes=req.notes
    )
    db.add(feedback)
    db.commit()
    db.refresh(feedback)

    summary = get_candidate_feedback_summary(db, cand.id)
    if cand.external_id:
        summary["external_id"] = cand.external_id

    return {
        "status": "success",
        "feedback": feedback.to_dict(),
        "summary": summary
    }

@app.get("/feedback/summary")
def get_all_feedback_summaries(run_id: Optional[str] = None, db: Session = Depends(get_db)):
    try:
        query = (
            db.query(
                RecruiterFeedbackModel.candidate_id,
                CandidateModel.external_id,
                func.count(RecruiterFeedbackModel.id).filter(RecruiterFeedbackModel.decision == "accept").label("accepts"),
                func.count(RecruiterFeedbackModel.id).filter(RecruiterFeedbackModel.decision == "maybe").label("maybes"),
                func.count(RecruiterFeedbackModel.id).filter(RecruiterFeedbackModel.decision == "reject").label("rejects")
            )
            .join(CandidateModel, RecruiterFeedbackModel.candidate_id == CandidateModel.id)
        )

        if run_id:
            try:
                run_uuid = uuid.UUID(run_id)
                query = query.filter(RecruiterFeedbackModel.run_id == run_uuid)
            except ValueError:
                raise HTTPException(status_code=422, detail=f"Invalid UUID format for run_id: '{run_id}'")

        results = query.group_by(RecruiterFeedbackModel.candidate_id, CandidateModel.external_id).all()

        summaries = []
        for r in results:
            summaries.append({
                "candidate_id": str(r.candidate_id),
                "external_id": r.external_id,
                "accepts": int(r.accepts or 0),
                "maybes": int(r.maybes or 0),
                "rejects": int(r.rejects or 0)
            })
        return summaries
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch feedback summary: {str(e)}")

@app.get("/runs")
def list_ranking_runs(
    status: Optional[str] = Query(None, pattern="^(pending|running|complete|failed)$"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    try:
        query = db.query(RankingRunModel).join(JobDescriptionModel, RankingRunModel.jd_id == JobDescriptionModel.id)
        if status:
            query = query.filter(RankingRunModel.status == status)

        total = query.count()
        runs_db = query.order_by(RankingRunModel.created_at.desc()).offset(offset).limit(limit).all()

        runs_list = []
        for r in runs_db:
            jd = r.job_description
            cand_count = 0
            if r.phase3_scores and isinstance(r.phase3_scores, dict) and "candidate_count" in r.phase3_scores:
                cand_count = r.phase3_scores["candidate_count"]
            else:
                cand_count = db.query(RankedResultModel).filter_by(run_id=r.id).count()

            snippet = jd.raw_text[:120].strip() if jd and jd.raw_text else ""
            if jd and jd.raw_text and len(jd.raw_text) > 120:
                snippet += "..."

            runs_list.append({
                "run_id": str(r.id),
                "jd_id": str(r.jd_id),
                "title": jd.title if jd else "Untitled Role",
                "jd_snippet": snippet,
                "status": r.status,
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "duration_ms": r.duration_ms,
                "candidate_count": cand_count
            })

        return {
            "runs": runs_list,
            "total": total,
            "limit": limit,
            "offset": offset
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch runs: {str(e)}")

@app.get("/runs/{run_id}")
def get_ranking_run_detail(run_id: str, db: Session = Depends(get_db)):
    try:
        run_uuid = uuid.UUID(run_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=422, detail=f"Invalid UUID format for run_id: '{run_id}'")

    run = db.query(RankingRunModel).filter_by(id=run_uuid).first()
    if not run:
        raise HTTPException(status_code=404, detail=f"Ranking run not found with id: '{run_id}'")

    jd = run.job_description
    results_db = (
        db.query(RankedResultModel, CandidateModel)
        .join(CandidateModel, RankedResultModel.candidate_id == CandidateModel.id)
        .filter(RankedResultModel.run_id == run_uuid)
        .order_by(RankedResultModel.final_rank.asc())
        .all()
    )

    rankings = []
    for res_row, cand in results_db:
        dim_scores = {
            "skills": float(res_row.dim_skills) if res_row.dim_skills is not None else 0.0,
            "trajectory": float(res_row.dim_trajectory) if res_row.dim_trajectory is not None else 0.0,
            "leadership": float(res_row.dim_leadership) if res_row.dim_leadership is not None else 0.0,
            "domain": float(res_row.dim_domain) if res_row.dim_domain is not None else 0.0,
            "communication": float(res_row.dim_communication) if res_row.dim_communication is not None else 0.0,
        }

        rankings.append({
            "id": cand.external_id or str(cand.id),
            "candidate_id": str(cand.id),
            "external_id": cand.external_id,
            "rank": res_row.final_rank,
            "full_name": cand.full_name,
            "composite_score": float(res_row.composite_score) if res_row.composite_score is not None else 0.0,
            "tier": res_row.tier,
            "headline": res_row.headline or f"{cand.current_role} at {cand.company}",
            "rationale": res_row.rationale or "",
            "key_strengths": res_row.key_strengths or [],
            "key_risks": res_row.key_risks or [],
            "interview_questions": res_row.interview_questions or [],
            "dim_scores": dim_scores
        })

    return {
        "run": {
            "id": str(run.id),
            "status": run.status,
            "duration_ms": run.duration_ms,
            "created_at": run.created_at.isoformat() if run.created_at else None,
            "job_description": jd.to_dict() if jd else None,
            "phase3_scores": run.phase3_scores,
            "rankings": rankings
        }
    }

from dataclasses import asdict

@app.post("/jd/parse")
async def parse_jd(req: ParseJDRequest):
    try:
        intent = await extract_role_intent(req.jd_text)
        return intent
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def _resolve_or_create_candidate(db: Session, c_data: dict) -> CandidateModel:
    cand_id_raw = str(c_data.get("id", ""))
    cand = None
    
    # Try finding by UUID
    try:
        cand_uuid = uuid.UUID(cand_id_raw)
        cand = db.query(CandidateModel).filter_by(id=cand_uuid).first()
    except (ValueError, TypeError):
        pass

    # Try finding by external_id
    if not cand and cand_id_raw:
        cand = db.query(CandidateModel).filter_by(external_id=cand_id_raw).first()

    # Try finding by full_name and company
    if not cand and c_data.get("full_name") and c_data.get("company"):
        cand = db.query(CandidateModel).filter_by(
            full_name=c_data.get("full_name"),
            company=c_data.get("company")
        ).first()

    # If still not found, create new candidate to guarantee FK integrity
    if not cand:
        cand = CandidateModel(
            external_id=cand_id_raw if cand_id_raw else None,
            full_name=c_data.get("full_name", "Unknown Candidate"),
            current_role=c_data.get("current_role", "Engineer"),
            company=c_data.get("company", "Independent"),
            years_experience=c_data.get("years_experience", 0),
            skills=c_data.get("skills", []),
            bio=c_data.get("bio", ""),
            mentoring_signals=c_data.get("mentoring_signals", ""),
            communication_signals=c_data.get("communication_signals", ""),
            collaboration_signals=c_data.get("collaboration_signals", ""),
            public_presence=c_data.get("public_presence", ""),
            referral_notes=c_data.get("referral_notes", ""),
            system_design_score=c_data.get("system_design_score"),
            coding_score=c_data.get("coding_score"),
            communication_score=c_data.get("communication_score")
        )
        db.add(cand)
        db.flush()

    return cand

@app.post("/rank")
async def rank_candidates(req: RankRequest, db: Session = Depends(get_db)):
    start_time = time.time()

    # 1. Fetch Candidates if not provided in payload
    input_candidates = req.candidates
    if not input_candidates:
        db_cands = db.query(CandidateModel).filter_by(is_active=True).all()
        input_candidates = [c.to_dict() for c in db_cands]

    if not input_candidates:
        raise HTTPException(status_code=400, detail="No candidates available to rank.")

    # 2. Resolve or upsert all candidates in DB and build lookup map
    candidate_db_map: dict[str, CandidateModel] = {}
    for c in input_candidates:
        cand_model = _resolve_or_create_candidate(db, c)
        candidate_db_map[str(cand_model.id)] = cand_model
        if cand_model.external_id:
            candidate_db_map[cand_model.external_id] = cand_model
        if c.get("id"):
            candidate_db_map[str(c["id"])] = cand_model

    # 3. Find or create Job Description record
    clean_jd_text = req.jd_text.strip()
    jd = db.query(JobDescriptionModel).filter_by(raw_text=clean_jd_text).first()
    if not jd:
        first_line = clean_jd_text.split("\n")[0][:80].strip() or "Untitled Role"
        jd = JobDescriptionModel(
            title=first_line,
            raw_text=clean_jd_text,
            status="active"
        )
        db.add(jd)
        db.flush()

    # 4. Initialize RankingRunModel (Option 1: status='running' committed immediately)
    run = RankingRunModel(
        jd_id=jd.id,
        status="running",
        phase3_scores={}
    )
    db.add(run)
    db.commit()
    db.refresh(run)

    try:
        # Phase 1: Intent Extraction
        intent = await extract_role_intent(req.jd_text)
        intent_dict = asdict(intent)

        # Update Job Description metadata with extracted intent
        jd.extracted_intent = intent_dict
        jd.must_have_skills = intent.must_have_skills
        jd.nice_to_have_skills = intent.nice_to_have_skills
        if not jd.title or jd.title == "Untitled Role":
            skill_prefix = intent.must_have_skills[0] if intent.must_have_skills else "Software"
            jd.title = f"{intent.seniority_level} {skill_prefix} Engineer"
        db.add(jd)

        # Phase 2: Candidate Profiling
        profiled = [profile_candidate(c, intent.must_have_skills) for c in input_candidates]

        # Phase 3: Semantic Matching
        phase3_ranked = process_phase3(profiled, intent)

        # Store Phase 3 snapshot on the run
        phase3_snapshot = {
            "candidate_count": len(phase3_ranked),
            "candidate_ids": [str(c.get("id")) for c in phase3_ranked],
            "scores": [
                {
                    "candidate_id": str(c.get("id")),
                    "composite_score": c.get("composite_score"),
                    "tier": c.get("tier"),
                    "dim_scores": c.get("dim_scores")
                }
                for c in phase3_ranked
            ]
        }
        run.phase3_scores = phase3_snapshot

        # Phase 4: Holistic LLM Re-Ranking (top 10 shortlist)
        llm_shortlist = phase3_ranked[:10]
        llm_rankings = await run_llm_ranking(llm_shortlist, req.jd_text)

        # Handle candidates beyond top 10 (Decision D: preserve in ranked_results with Phase 3 scores)
        final_rankings = list(llm_rankings)
        if len(phase3_ranked) > 10:
            for idx, c in enumerate(phase3_ranked[10:], start=len(llm_rankings) + 1):
                non_shortlist_item = {
                    "id": str(c.get("id")),
                    "rank": idx,
                    "full_name": c.get("full_name", ""),
                    "composite_score": float(c.get("composite_score", 0.0)),
                    "tier": c.get("tier", "Not recommended"),
                    "headline": f"{c.get('current_role', '')} at {c.get('company', '')}",
                    "rationale": f"Phase 3 automated score of {c.get('composite_score', 0)}/100. Candidate was not included in the top 10 deep LLM evaluation shortlist.",
                    "key_strengths": c.get("skills", [])[:3],
                    "key_risks": ["Not shortlisted in top 10"],
                    "interview_questions": [],
                    "dim_scores": c.get("dim_scores", {})
                }
                final_rankings.append(non_shortlist_item)

        # Persist ranked_results rows for each candidate
        for item in final_rankings:
            item_id = str(item.get("id", ""))
            cand_model = candidate_db_map.get(item_id)
            if not cand_model:
                cand_model = _resolve_or_create_candidate(db, item)
                candidate_db_map[item_id] = cand_model

            dim_scores = item.get("dim_scores") or {}
            result_row = RankedResultModel(
                run_id=run.id,
                candidate_id=cand_model.id,
                final_rank=int(item.get("rank", 1)),
                composite_score=float(item.get("composite_score", 0.0)),
                tier=str(item.get("tier", "Not recommended")),
                headline=item.get("headline"),
                rationale=item.get("rationale"),
                key_strengths=item.get("key_strengths", []),
                key_risks=item.get("key_risks", []),
                interview_questions=item.get("interview_questions", []),
                dim_skills=dim_scores.get("skills"),
                dim_trajectory=dim_scores.get("trajectory"),
                dim_leadership=dim_scores.get("leadership"),
                dim_domain=dim_scores.get("domain"),
                dim_communication=dim_scores.get("communication")
            )
            db.add(result_row)

        duration_ms = int((time.time() - start_time) * 1000)
        run.status = "complete"
        run.duration_ms = duration_ms

        db.commit()

        return {
            "status": "success",
            "run_id": str(run.id),
            "duration_ms": duration_ms,
            "intent": intent,
            "rankings": final_rankings
        }

    except Exception as e:
        db.rollback()
        duration_ms = int((time.time() - start_time) * 1000)
        try:
            # Record failure status in database
            run.status = "failed"
            run.duration_ms = duration_ms
            db.add(run)
            db.commit()
        except Exception:
            db.rollback()

        raise HTTPException(status_code=500, detail=f"Pipeline execution failed: {str(e)}")