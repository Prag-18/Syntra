-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Candidates Table
CREATE TABLE candidates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id VARCHAR(64) UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    current_role VARCHAR(255) NOT NULL,
    company VARCHAR(255) NOT NULL,
    years_experience INT NOT NULL DEFAULT 0,
    skills TEXT[] NOT NULL DEFAULT '{}',
    bio TEXT,
    mentoring_signals TEXT,
    communication_signals TEXT,
    collaboration_signals TEXT,
    public_presence TEXT,
    referral_notes TEXT,
    system_design_score INT CHECK (system_design_score BETWEEN 0 AND 100),
    coding_score INT CHECK (coding_score BETWEEN 0 AND 100),
    communication_score INT CHECK (communication_score BETWEEN 0 AND 100),
    github_stars INT DEFAULT 0,
    linkedin_endorsements INT DEFAULT 0,
    source VARCHAR(100) DEFAULT 'direct',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- GIN index for rapid skill set filtering
CREATE INDEX idx_candidates_skills ON candidates USING GIN (skills);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_candidates_updated_at
BEFORE UPDATE ON candidates
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 2. Job Descriptions Table
CREATE TABLE job_descriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    raw_text TEXT NOT NULL,
    extracted_intent JSONB,
    must_have_skills TEXT[] DEFAULT '{}',
    nice_to_have_skills TEXT[] DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_jd_must_have ON job_descriptions USING GIN (must_have_skills);

-- 3. Scoring Weights Table
CREATE TABLE scoring_weights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    jd_id UUID NOT NULL REFERENCES job_descriptions(id) ON DELETE CASCADE,
    weight_skills NUMERIC(4,3) NOT NULL,
    weight_trajectory NUMERIC(4,3) NOT NULL,
    weight_leadership NUMERIC(4,3) NOT NULL,
    weight_domain NUMERIC(4,3) NOT NULL,
    weight_communication NUMERIC(4,3) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Ranking Runs Table
CREATE TABLE ranking_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    jd_id UUID NOT NULL REFERENCES job_descriptions(id) ON DELETE CASCADE,
    phase3_scores JSONB NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'running', 'complete', 'failed')),
    duration_ms INT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Ranked Results Table
CREATE TABLE ranked_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_id UUID NOT NULL REFERENCES ranking_runs(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    final_rank INT NOT NULL,
    composite_score NUMERIC(5,2) NOT NULL,
    tier VARCHAR(50) NOT NULL,
    headline VARCHAR(255),
    rationale TEXT,
    key_strengths TEXT[] DEFAULT '{}',
    key_risks TEXT[] DEFAULT '{}',
    interview_questions TEXT[] DEFAULT '{}',
    dim_skills NUMERIC(5,2),
    dim_trajectory NUMERIC(5,2),
    dim_leadership NUMERIC(5,2),
    dim_domain NUMERIC(5,2),
    dim_communication NUMERIC(5,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Recruiter Feedback Table
CREATE TABLE recruiter_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_id UUID NOT NULL REFERENCES ranking_runs(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    decision VARCHAR(20) NOT NULL CHECK (decision IN ('accept', 'maybe', 'reject')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Views
CREATE VIEW latest_rankings AS
SELECT DISTINCT ON (rr.candidate_id)
    rr.id AS result_id,
    rr.run_id,
    rr.candidate_id,
    c.full_name,
    c.current_role,
    rr.final_rank,
    rr.composite_score,
    rr.tier,
    rr.headline,
    rr.created_at
FROM ranked_results rr
JOIN candidates c ON rr.candidate_id = c.id
ORDER BY rr.candidate_id, rr.created_at DESC;

CREATE VIEW candidate_feedback_summary AS
SELECT 
    candidate_id,
    COUNT(*) FILTER (WHERE decision = 'accept') AS accepts,
    COUNT(*) FILTER (WHERE decision = 'maybe') AS maybes,
    COUNT(*) FILTER (WHERE decision = 'reject') AS rejects
FROM recruiter_feedback
GROUP BY candidate_id;