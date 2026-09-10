import json
import httpx
from dataclasses import dataclass, asdict
from core.config import GEMINI_API_KEY, GEMINI_API_URL, MAX_TOKENS

@dataclass
class ScoringWeights:
    skills: float
    trajectory: float
    leadership: float
    domain: float
    communication: float

@dataclass
class RoleIntent:
    must_have_skills: list
    nice_to_have_skills: list
    implicit_requirements: list
    culture_signals: list
    seniority_level: str
    leadership_required: bool
    communication_bar: str
    weights: ScoringWeights

async def extract_role_intent(jd_text: str) -> RoleIntent:
    prompt = f"""
    Analyze this Job Description and extract structured intent.
    Return ONLY a valid JSON object matching this schema (no markdown, no prose):
    {{
      "must_have_skills": ["string"],
      "nice_to_have_skills": ["string"],
      "implicit_requirements": ["string"],
      "culture_signals": ["string"],
      "seniority_level": "string",
      "leadership_required": boolean,
      "communication_bar": "string",
      "weights": {{
        "skills": float,
        "trajectory": float,
        "leadership": float,
        "domain": float,
        "communication": float
      }}
    }}
    IMPORTANT: The weights must sum to exactly 1.0. Adjust weights according to role seniority and focus.

    Job Description:
    {jd_text}
    """

    params = {"key": GEMINI_API_KEY}
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "maxOutputTokens": MAX_TOKENS,
            "responseMimeType": "application/json"
        }
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
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
        parsed = json.loads(raw_text.strip())
        
        weights = ScoringWeights(**parsed["weights"])
        return RoleIntent(
            must_have_skills=parsed.get("must_have_skills", []),
            nice_to_have_skills=parsed.get("nice_to_have_skills", []),
            implicit_requirements=parsed.get("implicit_requirements", []),
            culture_signals=parsed.get("culture_signals", []),
            seniority_level=parsed.get("seniority_level", "Senior"),
            leadership_required=parsed.get("leadership_required", False),
            communication_bar=parsed.get("communication_bar", "High"),
            weights=weights
        )
