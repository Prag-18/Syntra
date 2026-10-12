import re


def calculate_trajectory(title: str, yoe: int, bio: str) -> float:
    base = min(yoe * 10, 60)
    title_lower = title.lower()
    if "staff" in title_lower or "principal" in title_lower:
        base += 30
    elif "lead" in title_lower or "senior" in title_lower:
        base += 20
    elif "head" in title_lower or "vp" in title_lower:
        base += 35

    bio_lower = bio.lower()
    if "promoted" in bio_lower or "architected" in bio_lower or "designed" in bio_lower:
        base += 10
    return float(min(base, 100))


def calculate_leadership(mentoring_signals: str, bio: str, public_presence: str) -> float:
    score = 40.0
    m = re.search(r'(\d+)\s*(juniors|engineers|mentees|teammates)', mentoring_signals.lower())
    if m:
        score += min(int(m.group(1)) * 10, 30)
    elif "mentors" in mentoring_signals.lower() or "mentored" in mentoring_signals.lower():
        score += 15

    if "speaker" in public_presence.lower() or "keynote" in public_presence.lower():
        score += 15
    if "led" in bio.lower() or "lead" in bio.lower():
        score += 15

    return float(min(score, 100))


def calculate_communication(assessment_comm, comm_signals: str, public_presence: str) -> float:
    # A1 FIX: explicit None check — score 0 is a real result, not "missing"
    effective_comm = 60.0 if assessment_comm is None else float(assessment_comm)
    score = effective_comm * 0.50 + 25

    signals_lower = comm_signals.lower()
    if "dense" in signals_lower or "hard to parse" in signals_lower or "hard for non-technical" in signals_lower:
        score -= 20
    if "clear" in signals_lower or "strong" in signals_lower or "articulate" in signals_lower:
        score += 15
    if "blog" in public_presence.lower() or "speaker" in public_presence.lower():
        score += 10

    return float(max(min(score, 100), 0))


def calculate_domain_depth(skills: list, bio: str, company: str, role: str, target_keywords: list) -> float:
    if not target_keywords:
        target_keywords = ["payments", "distributed", "fintech", "system design", "react", "python", "go"]

    blob = f"{' '.join(skills)} {bio} {company} {role}".lower()
    matches = sum(1 for kw in target_keywords if kw.lower() in blob)
    score = (matches / max(len(target_keywords), 1)) * 100 + 30
    return float(min(score, 100))


def _compute_skills_score(sys_score, coding_score, d_score: float) -> float:
    """
    Partial assessment rule:
    - Both non-null -> average them (preserving explicit 0).
    - Exactly one non-null -> use that one score alone.
    - Neither (both None) -> fall back to domain depth proxy.
    Note: needs_assessment stays True until BOTH are non-null.
    """
    if sys_score is not None and coding_score is not None:
        return (float(sys_score) + float(coding_score)) / 2.0
    if sys_score is not None:
        return float(sys_score)
    if coding_score is not None:
        return float(coding_score)
    return d_score


def apply_tier_cap(tier: str, needs_assessment: bool) -> tuple:
    """
    A3 — Tier cap: unassessed candidates cannot receive 'Top pick'.
    Returns (capped_tier, cap_note | None).
    """
    if needs_assessment and tier == "Top pick":
        return "Worth interviewing", "Capped: pending assessment"
    return tier, None


def profile_candidate(cand_dict: dict, target_keywords: list = None) -> dict:
    t_score = calculate_trajectory(
        cand_dict.get("current_role", ""),
        cand_dict.get("years_experience", 0),
        cand_dict.get("bio", "")
    )
    l_score = calculate_leadership(
        cand_dict.get("mentoring_signals", ""),
        cand_dict.get("bio", ""),
        cand_dict.get("public_presence", "")
    )
    # A1 FIX: pass raw value (None or int) — never use `or 70`
    c_score = calculate_communication(
        cand_dict.get("communication_score"),
        cand_dict.get("communication_signals", ""),
        cand_dict.get("public_presence", "")
    )
    d_score = calculate_domain_depth(
        cand_dict.get("skills", []),
        cand_dict.get("bio", ""),
        cand_dict.get("company", ""),
        cand_dict.get("current_role", ""),
        target_keywords
    )

    sys_score = cand_dict.get("system_design_score")
    coding_score = cand_dict.get("coding_score")

    s_score = _compute_skills_score(sys_score, coding_score, d_score)

    return {
        **cand_dict,
        "dim_scores": {
            "skills": s_score,
            "trajectory": t_score,
            "leadership": l_score,
            "domain": d_score,
            "communication": c_score
        }
    }