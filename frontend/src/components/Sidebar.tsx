import React from 'react';
import { PipelinePhase, ActiveTab } from '../types';

interface Props {
  activePhase: PipelinePhase;
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
}

export const Sidebar: React.FC<Props> = ({ activePhase, activeTab, onTabChange }) => {
  const steps: { key: PipelinePhase; label: string }[] = [
    { key: 'jd_analysis', label: '1. JD Intelligence' },
    { key: 'profiling', label: '2. Candidate Profiling' },
    { key: 'matching', label: '3. Semantic Matching' },
    { key: 'llm_ranking', label: '4. Holistic LLM Ranker' },
  ];

  return (
    <aside className="sidebar">
      <h2 style={{ color: 'var(--accent-blue)', marginBottom: '0.25rem' }}>Syntra</h2>
      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>AI Candidate Ranking Engine</p>

      {/* Main Navigation */}
      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>
        NAVIGATION
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '2rem' }}>
        <button
          onClick={() => onTabChange('dashboard')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            padding: '0.65rem 0.85rem',
            borderRadius: '6px',
            background: activeTab === 'dashboard' ? 'rgba(14, 165, 233, 0.15)' : 'transparent',
            color: activeTab === 'dashboard' ? 'var(--accent-blue)' : 'var(--text-main)',
            border: activeTab === 'dashboard' ? '1px solid rgba(14, 165, 233, 0.3)' : '1px solid transparent',
            fontSize: '0.9rem',
            fontWeight: activeTab === 'dashboard' ? 600 : 400,
            cursor: 'pointer',
            textAlign: 'left',
            width: '100%'
          }}
        >
          <span>⚡</span> Live Dashboard
        </button>

        <button
          onClick={() => onTabChange('history')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            padding: '0.65rem 0.85rem',
            borderRadius: '6px',
            background: activeTab === 'history' ? 'rgba(14, 165, 233, 0.15)' : 'transparent',
            color: activeTab === 'history' ? 'var(--accent-blue)' : 'var(--text-main)',
            border: activeTab === 'history' ? '1px solid rgba(14, 165, 233, 0.3)' : '1px solid transparent',
            fontSize: '0.9rem',
            fontWeight: activeTab === 'history' ? 600 : 400,
            cursor: 'pointer',
            textAlign: 'left',
            width: '100%'
          }}
        >
          <span>📜</span> Runs History
        </button>
      </div>

      {/* Pipeline Status (when in Dashboard tab) */}
      {activeTab === 'dashboard' && (
        <>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>
            PIPELINE STATUS
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {steps.map((step) => {
              const isActive = activePhase === step.key;
              return (
                <div
                  key={step.key}
                  style={{
                    padding: '0.55rem 0.75rem',
                    borderRadius: '6px',
                    background: isActive ? 'var(--bg-card-hover)' : 'transparent',
                    color: isActive ? 'var(--accent-blue)' : 'var(--text-muted)',
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
        </>
      )}

      {/* History Info (when in History tab) */}
      {activeTab === 'history' && (
        <div style={{
          background: '#090d16',
          padding: '0.85rem',
          borderRadius: '6px',
          border: '1px solid var(--border-color)',
          fontSize: '0.8rem',
          color: 'var(--text-muted)',
          lineHeight: '1.4'
        }}>
          <strong style={{ color: 'var(--text-main)', display: 'block', marginBottom: '0.25rem' }}>Audit Trail</strong>
          All ranking runs, extracted role intents, dimension scores, and recruiter feedback are persisted and searchable here.
        </div>
      )}
    </aside>
  );
};