import { Candidate, RankedCandidate, FeedbackDecision, FeedbackResponse, CandidateFeedbackSummary } from '../types';
import { enrichAndSort } from './scoring';

const API_BASE = 'http://localhost:8000';

export async function rankCandidates(
  jdText: string,
  candidates: Candidate[]
): Promise<{ rankings: RankedCandidate[]; duration_ms: number; run_id?: string }> {
  try {
    const res = await fetch(`${API_BASE}/rank`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jd_text: jdText, candidates })
    });

    if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
    const data = await res.json();
    return { rankings: data.rankings, duration_ms: data.duration_ms, run_id: data.run_id };
  } catch (err) {
    console.warn('Backend endpoint unavailable. Running client fallback calculation.', err);
    const start = performance.now();
    await new Promise((r) => setTimeout(r, 1200));
    
    const sorted = enrichAndSort(candidates);
    const duration_ms = Math.round(performance.now() - start);

    const rankings: RankedCandidate[] = sorted.map((c, idx) => ({
      id: c.id,
      rank: idx + 1,
      full_name: c.full_name,
      composite_score: c.composite_score,
      tier: c.tier,
      headline: `${c.current_role} at ${c.company} with ${c.years_experience} yrs experience`,
      rationale: `${c.full_name} scores ${c.composite_score}/100. Strong technical foundation in ${c.skills.slice(0, 3).join(', ')} aligned with role requirements.`,
      key_strengths: [c.skills[0] || 'Technical depth', 'Domain Experience', 'Problem Solving'],
      key_risks: ['Validate scalability exposure', 'Confirm communication clarity'],
      interview_questions: [
        `How have you structured systems at ${c.company}?`,
        `Describe a scenario where you made trade-offs between delivery speed and system debt.`,
        `How do you approach mentoring junior team members?`
      ],
      dim_scores: c.dim_scores
    }));

    return { rankings, duration_ms };
  }
}

export async function submitFeedback(
  candidateId: string,
  decision: FeedbackDecision,
  notes?: string,
  runId?: string
): Promise<FeedbackResponse> {
  try {
    const res = await fetch(`${API_BASE}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        candidate_id: candidateId,
        decision,
        notes,
        run_id: runId
      })
    });

    if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Backend feedback endpoint unavailable. Using client fallback state.', err);
    return {
      status: 'success_offline',
      feedback: {
        id: `offline-${Date.now()}`,
        candidate_id: candidateId,
        run_id: runId || null,
        decision,
        notes: notes || '',
        created_at: new Date().toISOString()
      },
      summary: {
        candidate_id: candidateId,
        external_id: candidateId,
        accepts: decision === 'accept' ? 1 : 0,
        maybes: decision === 'maybe' ? 1 : 0,
        rejects: decision === 'reject' ? 1 : 0
      }
    };
  }
}

export async function fetchFeedbackSummaries(runId?: string): Promise<CandidateFeedbackSummary[]> {
  try {
    const url = runId
      ? `${API_BASE}/feedback/summary?run_id=${encodeURIComponent(runId)}`
      : `${API_BASE}/feedback/summary`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Backend feedback summary endpoint unavailable.', err);
    return [];
  }
}

export async function fetchRuns(
  status?: string,
  limit: number = 20,
  offset: number = 0
): Promise<{ runs: import('../types').RankingRunSummary[]; total: number; limit: number; offset: number }> {
  try {
    const params = new URLSearchParams();
    if (status && status !== 'all') params.append('status', status);
    params.append('limit', String(limit));
    params.append('offset', String(offset));

    const res = await fetch(`${API_BASE}/runs?${params.toString()}`);
    if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Backend runs endpoint unavailable.', err);
    return { runs: [], total: 0, limit, offset };
  }
}

export async function fetchRunDetail(runId: string): Promise<import('../types').RankingRunDetail | null> {
  try {
    const res = await fetch(`${API_BASE}/runs/${encodeURIComponent(runId)}`);
    if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
    const data = await res.json();
    return data.run;
  } catch (err) {
    console.warn(`Backend run detail endpoint failed for run_id: ${runId}`, err);
    return null;
  }
}