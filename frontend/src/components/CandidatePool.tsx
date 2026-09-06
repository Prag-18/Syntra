import React from 'react';
import { Candidate, CandidateFeedbackSummary } from '../types';

interface Props {
  candidates: Candidate[];
  selectedIds: string[];
  feedbackSummaries?: Record<string, CandidateFeedbackSummary>;
  onToggle: (id: string) => void;
  onOpenAddModal: () => void;
}

export const CandidatePool: React.FC<Props> = ({ candidates, selectedIds, feedbackSummaries = {}, onToggle, onOpenAddModal }) => {
  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <h3>Candidate Pool ({selectedIds.length}/{candidates.length})</h3>
        <button
          className="btn"
          style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', background: '#334155' }}
          onClick={onOpenAddModal}
        >
          + Add Candidate
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '220px', overflowY: 'auto' }}>
        {candidates.map((c) => {
          const isSelected = selectedIds.includes(c.id);
          const summary = feedbackSummaries[c.id];

          return (
            <div
              key={c.id}
              onClick={() => onToggle(c.id)}
              style={{
                padding: '0.5rem 0.75rem',
                borderRadius: '6px',
                cursor: 'pointer',
                background: isSelected ? 'var(--bg-card-hover)' : '#0f172a',
                border: isSelected ? '1px solid var(--accent-blue)' : '1px solid var(--border-color)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <strong style={{ fontSize: '0.85rem' }}>{c.full_name}</strong>
                  {summary && (summary.accepts > 0 || summary.maybes > 0 || summary.rejects > 0) && (
                    <span style={{
                      fontSize: '0.65rem',
                      padding: '0.05rem 0.35rem',
                      borderRadius: '4px',
                      background: summary.accepts > 0 ? 'rgba(34, 197, 94, 0.15)' : summary.rejects > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                      color: summary.accepts > 0 ? 'var(--accent-green)' : summary.rejects > 0 ? 'var(--accent-red)' : 'var(--accent-yellow)',
                      border: `1px solid ${summary.accepts > 0 ? 'rgba(34, 197, 94, 0.3)' : summary.rejects > 0 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(234, 179, 8, 0.3)'}`
                    }}>
                      {summary.accepts > 0 ? `✓ ${summary.accepts} prior accept` : summary.rejects > 0 ? `✕ ${summary.rejects} rejected` : `? ${summary.maybes} maybe`}
                    </span>
                  )}
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {c.current_role} @ {c.company} ({c.years_experience} yrs)
                </p>
              </div>
              <input type="checkbox" checked={isSelected} readOnly />
            </div>
          );
        })}
      </div>
    </div>
  );
};