from core.jd_intelligence import RoleIntent

def compute_composite_score(dim_scores: dict, weights: dict) -> float:
    score = (
        dim_scores["skills"] * weights.get("skills", 0.25) +
        dim_scores["trajectory"] * weights.get("trajectory", 0.20) +
        dim_scores["leadership"] * weights.get("leadership", 0.20) +
        dim_scores["domain"] * weights.get("domain", 0.20) +
        dim_scores["communication"] * weights.get("communication", 0.15)
    )
    return round(score, 2)

def assign_tier(score: float) -> str:
    if score >= 75.0:
        return "Top pick"
    elif score >= 55.0:
        return "Worth interviewing"
    return "Not recommended"

def process_phase3(profiled_candidates: list, role_intent: RoleIntent) -> list:
    weights_dict = {
        "skills": role_intent.weights.skills,
        "trajectory": role_intent.weights.trajectory,
        "leadership": role_intent.weights.leadership,
        "domain": role_intent.weights.domain,
        "communication": role_intent.weights.communication
    }

    results = []
    for cand in profiled_candidates:
        comp_score = compute_composite_score(cand["dim_scores"], weights_dict)
        tier = assign_tier(comp_score)
        results.append({
            **cand,
            "composite_score": comp_score,
            "tier": tier
        })

    # Sort descending
    results.sort(key=lambda x: x["composite_score"], reverse=True)
    return results