import React from 'react';
import { PipelinePhase } from '../types';

interface Props {
  phase: PipelinePhase;
}

export const PhaseBar: React.FC<Props> = ({ phase }) => {
  const getProgress = (): number => {
    switch (phase) {
      case 'jd_analysis': return 25;
      case 'profiling': return 50;
      case 'matching': return 75;
      case 'llm_ranking': return 90;
      case 'complete': return 100;
      default: return 0;
    }
  };

  const getLabel = (): string => {
    switch (phase) {
      case 'jd_analysis': return 'Phase 1: Analyzing Job Description with Gemini...';
      case 'profiling': return 'Phase 2: Computing Candidate Dimension Scores...';
      case 'matching': return 'Phase 3: Calculating Weighted Composite Scores...';
      case 'llm_ranking': return 'Phase 4: Re-ranking Shortlist with LLM...';
      case 'complete': return 'Pipeline Complete';
      default: return 'Ready to run pipeline';
    }
  };

  const pct = getProgress();

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.4rem' }}>
        <span style={{ color: 'var(--text-muted)' }}>{getLabel()}</span>
        <span style={{ fontWeight: 600 }}>{pct}%</span>
      </div>
      <div className="progress-bar-bg">
        <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};