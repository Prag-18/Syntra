import json
import httpx
from core.config import GEMINI_API_KEY, GEMINI_API_URL, MAX_TOKENS

async def run_llm_ranking(shortlist: list, jd_text: str) -> list:
    prompt = f"""
    You are a Senior Executive Technical Recruiter.
    Evaluate and re-rank these candidates against the provided Job Description.

    Job Description:
    {jd_text}

    Candidates:
    {json.dumps(shortlist, indent=2)}

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
        return json.loads(raw_text.strip())
