import React from 'react';
import { Candidate } from '../types';

interface Props {
  candidate: Candidate;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

export const CandidateCard: React.FC<Props> = ({ candidate, isSelected, onSelect }) => {
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
      <h4>{candidate.full_name}</h4>
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