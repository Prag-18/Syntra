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

export type RunStatus = 'pending' | 'running' | 'complete' | 'failed';

export interface RankingRunSummary {
  run_id: string;
  jd_id: string;
  title: string;
  jd_snippet: string;
  status: RunStatus;
  created_at: string;
  duration_ms: number | null;
  candidate_count: number;
}

export interface RunsListResponse {
  runs: RankingRunSummary[];
  total: number;
  limit: number;
  offset: number;
}

export interface JobDescriptionDetail {
  id: string;
  title: string;
  raw_text: string;
  extracted_intent?: {
    must_have_skills?: string[];
    nice_to_have_skills?: string[];
    implicit_requirements?: string[];
    culture_signals?: string[];
    seniority_level?: string;
    leadership_required?: boolean;
    communication_bar?: string;
    weights?: ScoringWeights;
  } | null;
  must_have_skills?: string[];
  nice_to_have_skills?: string[];
  status?: string;
  created_at?: string;
}

export interface RankingRunDetail {
  id: string;
  status: RunStatus;
  duration_ms: number | null;
  created_at: string;
  job_description: JobDescriptionDetail | null;
  phase3_scores?: Record<string, any>;
  rankings: RankedCandidate[];
}

export type ActiveTab = 'dashboard' | 'history';