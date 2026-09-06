export interface DimScores {
  skills: number;
  trajectory: number;
  leadership: number;
  domain: number;
  communication: number;
}

export interface Candidate {
  id: string;
  full_name: string;
  current_role: string;
  company: string;
  years_experience: number;
  skills: string[];
  bio: string;
  mentoring_signals?: string;
  communication_signals?: string;
  collaboration_signals?: string;
  public_presence?: string;
  referral_notes?: string;
  system_design_score?: number;
  coding_score?: number;
  communication_score?: number;
}

export interface EnrichedCandidate extends Candidate {
  dim_scores: DimScores;
  composite_score: number;
  tier: Tier;
}

export type Tier = 'Top pick' | 'Worth interviewing' | 'Not recommended';

export interface RankedCandidate {
  id: string;
  rank: number;
  full_name: string;
  composite_score: number;
  tier: Tier;
  headline: string;
  rationale: string;
  key_strengths: string[];
  key_risks: string[];
  interview_questions: string[];
  dim_scores: DimScores;
}

export type PipelinePhase = 'idle' | 'jd_analysis' | 'profiling' | 'matching' | 'llm_ranking' | 'complete';

export type FeedbackDecision = 'accept' | 'maybe' | 'reject';

export interface ScoringWeights {
  skills: number;
  trajectory: number;
  leadership: number;
  domain: number;
  communication: number;
}

export interface CandidateFeedbackSummary {
  candidate_id: string;
  external_id?: string;
  accepts: number;
  maybes: number;
  rejects: number;
}

export interface FeedbackResponse {
  status: string;
  feedback: {
    id: string;
    candidate_id: string;
    run_id?: string | null;
    decision: FeedbackDecision;
    notes?: string;
    created_at?: string;
  };
  summary: CandidateFeedbackSummary;
}