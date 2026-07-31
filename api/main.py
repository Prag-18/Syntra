import time
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy.orm import Session

from database.connection import get_db, check_connection
from database.models import CandidateModel, JobDescriptionModel
from core.jd_intelligence import extract_role_intent
from core.candidate_profiler import profile_candidate
from core.semantic_matcher import process_phase3
from core.llm_ranker import run_llm_ranking

app = FastAPI(title="TalentLens AI Engine")

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

class FeedbackRequest(BaseModel):
    run_id: str
    candidate_id: str
    decision: str  # accept, maybe, reject
    notes: Optional[str] = None

@app.get("/")
def health_check():
    db_ok = check_connection()
    return {"status": "online", "database": "connected" if db_ok else "disconnected"}

@app.get("/candidates")
def get_candidates(db: Session = Depends(get_db)):
    cands = db.query(CandidateModel).filter_by(is_active=True).all()
    return [c.to_dict() for c in cands]

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