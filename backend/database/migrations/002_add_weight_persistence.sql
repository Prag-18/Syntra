-- Migration: add weight persistence columns to ranking_runs
-- Run this once against the live database.
ALTER TABLE ranking_runs
    ADD COLUMN IF NOT EXISTS ai_weights JSONB,
    ADD COLUMN IF NOT EXISTS applied_weights JSONB,
    ADD COLUMN IF NOT EXISTS weights_overridden BOOLEAN DEFAULT FALSE;

-- Backfill existing runs with their extracted intent weights
UPDATE ranking_runs
SET ai_weights = COALESCE(job_descriptions.extracted_intent->'weights', '{"skills": 0.3, "trajectory": 0.2, "leadership": 0.2, "domain": 0.15, "communication": 0.15}'::jsonb),
    applied_weights = COALESCE(job_descriptions.extracted_intent->'weights', '{"skills": 0.3, "trajectory": 0.2, "leadership": 0.2, "domain": 0.15, "communication": 0.15}'::jsonb),
    weights_overridden = FALSE
FROM job_descriptions
WHERE ranking_runs.jd_id = job_descriptions.id
  AND ranking_runs.ai_weights IS NULL;
