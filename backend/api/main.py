import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import time
from fastapi import FastAPI, Depends, HTTPException
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



@app.post("/jd/parse")
async def parse_jd(req: ParseJDRequest):
    try:
        intent = await extract_role_intent(req.jd_text)
        return intent
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/rank")
async def rank_candidates(req: RankRequest, db: Session = Depends(get_db)):
    start_time = time.time()
    
    # 1. Fetch Candidates if not provided
    input_candidates = req.candidates
    if not input_candidates:
        db_cands = db.query(CandidateModel).filter_by(is_active=True).all()
        input_candidates = [c.to_dict() for c in db_cands]

    if not input_candidates:
        raise HTTPException(status_code=400, detail="No candidates available to rank.")

    try:
        # Phase 1: Intent Extraction
        intent = await extract_role_intent(req.jd_text)

        # Phase 2: Candidate Profiling
        profiled = [profile_candidate(c, intent.must_have_skills) for c in input_candidates]

        # Phase 3: Semantic Matching
        phase3_ranked = process_phase3(profiled, intent)

        # Phase 4: Holistic LLM Re-Ranking
        llm_shortlist = phase3_ranked[:10]  # Take top 10 for LLM processing
        final_rankings = await run_llm_ranking(llm_shortlist, req.jd_text)

        duration_ms = int((time.time() - start_time) * 1000)

        return {
            "status": "success",
            "duration_ms": duration_ms,
            "intent": intent,
            "rankings": final_rankings
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Pipeline execution failed: {str(e)}")