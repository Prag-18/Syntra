import { Candidate, EnrichedCandidate, DimScores, ScoringWeights, Tier } from '../types';

export function scoreTrajectory(role: string, yoe: number, bio: string): number {
  let score = Math.min(yoe * 10, 60);
  const r = role.toLowerCase();
  if (r.includes('staff') || r.includes('principal')) score += 30;
  else if (r.includes('lead') || r.includes('senior')) score += 20;
  else if (r.includes('head') || r.includes('vp')) score += 35;

  const b = bio.toLowerCase();
  if (b.includes('promoted') || b.includes('architected') || b.includes('designed')) score += 10;
  return Math.min(score, 100);
}

export function scoreLeadership(mentoring: string = '', bio: string = '', publicPresence: string = ''): number {
  let score = 40;
  const m = mentoring.match(/(\d+)\s*(juniors|engineers|mentees|teammates)/i);
  if (m) {
    score += Math.min(parseInt(m[1], 10) * 10, 30);
  } else if (/mentors|mentored/i.test(mentoring)) {
    score += 15;
  }

  if (/speaker|keynote/i.test(publicPresence)) score += 15;
  if (/led|lead/i.test(bio)) score += 15;

  return Math.min(score, 100);
}

// A1 FIX: explicit null/undefined check — score 0 is a real result, not "missing"
export function scoreCommunication(assessmentScore: number | null | undefined, signals: string = '', publicPresence: string = ''): number {
  const effective = assessmentScore == null ? 60 : assessmentScore;
  let score = effective * 0.5 + 25;
  const s = signals.toLowerCase();
  if (s.includes('dense') || s.includes('hard to parse') || s.includes('hard for non-technical')) score -= 20;
  if (s.includes('clear') || s.includes('strong') || s.includes('articulate')) score += 15;
  if (/blog|speaker/i.test(publicPresence)) score += 10;

  return Math.max(0, Math.min(score, 100));
}

export function scoreDomain(candidate: Candidate, keywords: string[] = ['payments', 'distributed', 'fintech', 'python', 'go', 'react']): number {
  const blob = `${candidate.skills.join(' ')} ${candidate.bio} ${candidate.company} ${candidate.current_role}`.toLowerCase();
  const matches = keywords.filter(kw => blob.includes(kw.toLowerCase())).length;
  const score = (matches / Math.max(keywords.length, 1)) * 100 + 30;
  return Math.min(score, 100);
}

/**
 * Partial-assessment rule (mirrors backend _compute_skills_score):
 *   both set                           → average (preserving explicit 0)
 *   exactly one set                    → use that score alone (no padding)
 *   neither (both null/undefined)      → domain proxy
 * Note: needs_assessment stays true until BOTH are non-null.
 */
export function computeSkillsScore(
  sysScore: number | null | undefined,
  codingScore: number | null | undefined,
  domainScore: number
): number {
  if (sysScore != null && codingScore != null) return (sysScore + codingScore) / 2;
  if (sysScore != null) return sysScore;
  if (codingScore != null) return codingScore;
  return domainScore;
}

/**
 * A3: tier cap — unassessed candidates cannot receive "Top pick".
 */
export function applyTierCap(tier: Tier, needsAssessment: boolean): { tier: Tier; capNote: string | null } {
  if (needsAssessment && tier === 'Top pick') {
    return { tier: 'Worth interviewing', capNote: 'Capped: pending assessment' };
  }
  return { tier, capNote: null };
}

export function enrichAndSort(
  candidates: Candidate[],
  weights: ScoringWeights = { skills: 0.3, trajectory: 0.2, leadership: 0.2, domain: 0.15, communication: 0.15 }
): EnrichedCandidate[] {
  const enriched = candidates.map(c => {
    const domainScore = scoreDomain(c);
    const needsAssessment = Boolean(c.needs_assessment);
    const skillsScore = computeSkillsScore(c.system_design_score, c.coding_score, domainScore);

    const dim_scores: DimScores = {
      skills: skillsScore,
      trajectory: scoreTrajectory(c.current_role, c.years_experience, c.bio),
      leadership: scoreLeadership(c.mentoring_signals, c.bio, c.public_presence),
      domain: domainScore,
      // A1 FIX: pass null-safe value
      communication: scoreCommunication(c.communication_score ?? null, c.communication_signals, c.public_presence)
    };

    const raw_score = Number((
      dim_scores.skills * weights.skills +
      dim_scores.trajectory * weights.trajectory +
      dim_scores.leadership * weights.leadership +
      dim_scores.domain * weights.domain +
      dim_scores.communication * weights.communication
    ).toFixed(2));

    // A3: tier cap
    let rawTier: Tier = 'Not recommended';
    if (raw_score >= 75) rawTier = 'Top pick';
    else if (raw_score >= 55) rawTier = 'Worth interviewing';

    const { tier, capNote } = applyTierCap(rawTier, needsAssessment);
    const composite_score = raw_score;

    return { ...c, dim_scores, composite_score, tier, ...(capNote ? { tier_cap_note: capNote } : {}) };
  });

  return enriched.sort((a, b) => b.composite_score - a.composite_score);
}