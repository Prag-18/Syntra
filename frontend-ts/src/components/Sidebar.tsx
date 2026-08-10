import React from 'react';
import { PipelinePhase } from '../types';

interface Props {
  activePhase: PipelinePhase;
}

export const Sidebar: React.FC<Props> = ({ activePhase }) => {
  const steps: { key: PipelinePhase; label: string }[] = [
    { key: 'jd_analysis', label: '1. JD Intelligence' },
    { key: 'profiling', label: '2. Candidate Profiling' },
    { key: 'matching', label: '3. Semantic Matching' },
    { key: 'llm_ranking', label: '4. Holistic LLM Ranker' },
  ];

  return (
    <aside className="sidebar">
      <h2 style={{ color: 'var(--accent-blue)', marginBottom: '0.25rem' }}>TalentLens AI</h2>
      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '2rem' }}>Candidate Ranking Engine</p>

      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
        PIPELINE STATUS
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {steps.map((step) => {
          const isActive = activePhase === step.key;
          return (
            <div
              key={step.key}
              style={{
                padding: '0.6rem 0.8rem',
                borderRadius: '6px',
                background: isActive ? 'var(--bg-card-hover)' : 'transparent',
                color: isActive ? 'var(--accent-blue)' : 'var(--text-main)',
                borderLeft: isActive ? '3px solid var(--accent-blue)' : '3px solid transparent',
                fontSize: '0.85rem',
                fontWeight: isActive ? 600 : 400
              }}
            >
              {step.label}
            </div>
          );
        })}
      </div>
    </aside>
  );
};