import React from 'react';
import { Candidate } from '../types';

interface Props {
  candidate: Candidate;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onRecordAssessment?: (candidate: Candidate) => void;
}

export const CandidateCard: React.FC<Props> = ({ candidate, isSelected, onSelect, onRecordAssessment }) => {
  return (
    <div
      onClick={() => onSelect(candidate.id)}
      className="card"
      style={{
        cursor: 'pointer',
        borderColor: isSelected ? 'var(--accent-blue)' : 'var(--border-color)',
        background: isSelected ? 'var(--bg-card-hover)' : 'var(--bg-card)'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <h4>{candidate.full_name}</h4>
        {candidate.needs_assessment && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{
              fontSize: '0.65rem',
              padding: '0.1rem 0.35rem',
              borderRadius: '3px',
              background: 'rgba(245, 158, 11, 0.15)',
              color: '#fcd34d',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              whiteSpace: 'nowrap'
            }}>
              ⚠ Pending Assessment
            </span>
            {onRecordAssessment && (
              <button
                type="button"
                className="btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onRecordAssessment(candidate);
                }}
                style={{
                  fontSize: '0.65rem',
                  padding: '0.1rem 0.4rem',
                  background: '#334155',
                  color: '#38bdf8',
                  border: '1px solid var(--border-color)',
                  borderRadius: '3px',
                  cursor: 'pointer'
                }}
              >
                Record assessment
              </button>
            )}
          </div>
        )}
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
        {candidate.current_role} • {candidate.company}
      </p>
      <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
        {candidate.skills.slice(0, 3).map((s, i) => (
          <span key={i} style={{ background: '#0f172a', fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: '3px' }}>
            {s}
          </span>
        ))}
      </div>
    </div>
  );
};