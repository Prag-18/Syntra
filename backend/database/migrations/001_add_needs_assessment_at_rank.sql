-- Migration: add needs_assessment_at_rank snapshot column to ranked_results
-- Run this once against the live database.
ALTER TABLE ranked_results
    ADD COLUMN IF NOT EXISTS needs_assessment_at_rank BOOLEAN DEFAULT FALSE;

-- Backfill existing rows from the candidate's current value
UPDATE ranked_results
SET needs_assessment_at_rank = COALESCE(candidates.needs_assessment, FALSE)
FROM candidates
WHERE ranked_results.candidate_id = candidates.id;
