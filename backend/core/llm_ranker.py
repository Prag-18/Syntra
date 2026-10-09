import json
import logging
import httpx
from core.config import GEMINI_API_KEY, GEMINI_API_URL, MAX_TOKENS

logger = logging.getLogger(__name__)

async def run_llm_ranking(shortlist: list, jd_text: str) -> list:
    # 1. Format outgoing candidate payloads to explicitly include needs_assessment and raw scores
    formatted_shortlist = []
    for cand in shortlist:
        formatted_shortlist.append({
            "id": str(cand.get("id", "")),
            "full_name": cand.get("full_name", ""),
            "current_role": cand.get("current_role", ""),
            "company": cand.get("company", ""),
            "years_experience": cand.get("years_experience", 0),
            "skills": cand.get("skills", []),
            "bio": cand.get("bio", ""),
            "mentoring_signals": cand.get("mentoring_signals", ""),
            "communication_signals": cand.get("communication_signals", ""),
            "collaboration_signals": cand.get("collaboration_signals", ""),
            "public_presence": cand.get("public_presence", ""),
            "system_design_score": cand.get("system_design_score"),
            "coding_score": cand.get("coding_score"),
            "communication_score": cand.get("communication_score"),
            "needs_assessment": bool(cand.get("needs_assessment", False)),
            "dim_scores": cand.get("dim_scores", {})
        })

    prompt = f"""
    You are a Senior Executive Technical Recruiter.
    Evaluate and re-rank these candidates against the provided Job Description.

    CRITICAL INSTRUCTION FOR UNASSESSED CANDIDATES (needs_assessment = true):
    - For candidates with needs_assessment=true (or null system_design_score / coding_score), their Skills dimension score is ESTIMATED from resume keyword matching, NOT from a verified technical assessment.
    - You MUST NOT describe their technical ability as verified, strong, or proven on the basis of that estimated score.
    - For candidates with needs_assessment=true:
      1. Exactly ONE of their 2 key_risks MUST explicitly state that technical skills are unverified pending formal assessment.
      2. At least ONE of their 3 interview_questions MUST directly probe technical execution / core engineering skills to verify unassessed abilities.
    - Candidates with needs_assessment=false (who have completed verified assessments) must have their standard evaluation applied without this risk constraint.

    Job Description:
    {jd_text}

    Candidates:
    {json.dumps(formatted_shortlist, indent=2)}

    Return ONLY a valid JSON array of objects with NO markdown formatting, matching this exact shape:
    [
      {{
        "id": "string",
        "rank": integer,
        "full_name": "string",
        "composite_score": float (0-100),
        "tier": "Top pick" | "Worth interviewing" | "Not recommended",
        "headline": "string (<12 words summary)",
        "rationale": "string (2-3 sentences citing concrete candidate signals)",
        "key_strengths": ["string", "string", "string"],
        "key_risks": ["string", "string"],
        "interview_questions": ["string", "string", "string"],
        "dim_scores": {{
          "skills": float,
          "trajectory": float,
          "leadership": float,
          "domain": float,
          "communication": float
        }}
      }}
    ]
    """

    params = {"key": GEMINI_API_KEY}
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "maxOutputTokens": MAX_TOKENS,
            "responseMimeType": "application/json"
        }
    }

    async with httpx.AsyncClient(timeout=45.0) as client:
        res = await client.post(GEMINI_API_URL, params=params, json=payload)
        res.raise_for_status()
        data = res.json()

        raw_text = data["candidates"][0]["content"]["parts"][0]["text"].strip()
        if raw_text.startswith("```json"):
            raw_text = raw_text[7:]
        elif raw_text.startswith("```"):
            raw_text = raw_text[3:]
        if raw_text.endswith("```"):
            raw_text = raw_text[:-3]

        parsed_rankings = json.loads(raw_text.strip())

        # Preserve needs_assessment flag on returned items
        needs_assessment_map = {str(c.get("id")): bool(c.get("needs_assessment", False)) for c in shortlist}
        for item in parsed_rankings:
            item_id = str(item.get("id", ""))
            if item_id in needs_assessment_map:
                item["needs_assessment"] = needs_assessment_map[item_id]

        return parsed_rankings
