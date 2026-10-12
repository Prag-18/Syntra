import React from 'react';
import { PipelinePhase } from '../types';

interface Props {
  phase: PipelinePhase;
  jdParsed?: boolean;
}

export const PhaseBar: React.FC<Props> = ({ phase, jdParsed }) => {
  const getProgress = (): number => {
    switch (phase) {
      case 'jd_analysis': return 25;
      case 'jd_parsed': return 25;
      case 'profiling': return 50;
      case 'matching': return 75;
      case 'llm_ranking': return 90;
      case 'complete': return 100;
      default: return jdParsed ? 25 : 0;
    }
  };

  const getLabel = (): string => {
    switch (phase) {
      case 'jd_analysis': return 'Phase 1: Analyzing Job Description & Suggesting Weights...';
      case 'jd_parsed': return 'Phase 1 Complete: Role intent extracted. Adjust weights below or run ranking.';
      case 'profiling': return 'Phase 2: Computing Candidate Dimension Scores...';
      case 'matching': return 'Phase 3: Calculating Weighted Composite Scores...';
      case 'llm_ranking': return 'Phase 4: Re-ranking Shortlist with LLM...';
      case 'complete': return 'Pipeline Complete';
      default: return jdParsed ? 'Phase 1 Complete — Ready to rank' : 'Ready to run pipeline';
    }
  };

  const pct = getProgress();

  const isP1Done = jdParsed || phase === 'jd_parsed' || phase === 'profiling' || phase === 'matching' || phase === 'llm_ranking' || phase === 'complete';
  const isP1Active = phase === 'jd_analysis';

  const isP2Done = phase === 'matching' || phase === 'llm_ranking' || phase === 'complete';
  const isP2Active = phase === 'profiling';

  const isP3Done = phase === 'llm_ranking' || phase === 'complete';
  const isP3Active = phase === 'matching';

  const isP4Done = phase === 'complete';
  const isP4Active = phase === 'llm_ranking';

  const renderBadge = (num: number, label: string, isDone: boolean, isActive: boolean) => {
    let bg = '#1e293b';
    let border = '#334155';
    let color = '#64748b';

    if (isDone) {
      bg = 'rgba(34, 197, 94, 0.15)';
      border = '#22c55e';
      color = '#22c55e';
    } else if (isActive) {
      bg = 'rgba(56, 189, 248, 0.2)';
      border = '#38bdf8';
      color = '#38bdf8';
    }

    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.35rem',
        padding: '0.2rem 0.5rem',
        borderRadius: '999px',
        background: bg,
        border: `1px solid ${border}`,
        fontSize: '0.72rem',
        fontWeight: isDone || isActive ? 600 : 400,
        color
      }}>
        <span>{isDone ? '✓' : isActive ? '●' : num}</span>
        <span>{label}</span>
      </div>
    );
  };

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
        <span style={{ color: 'var(--text-muted)' }}>{getLabel()}</span>
        <span style={{ fontWeight: 600 }}>{pct}%</span>
      </div>

      <div className="progress-bar-bg" style={{ marginBottom: '0.75rem' }}>
        <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {renderBadge(1, 'Phase 1: JD Analysis', isP1Done, isP1Active)}
        {renderBadge(2, 'Phase 2: Profiling', isP2Done, isP2Active)}
        {renderBadge(3, 'Phase 3: Matching', isP3Done, isP3Active)}
        {renderBadge(4, 'Phase 4: LLM Rank', isP4Done, isP4Active)}
      </div>
    </div>
  );
};