import React from 'react';
import { Candidate } from '../types';

interface Props {
  candidates: Candidate[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onOpenAddModal: () => void;
}

export const CandidatePool: React.FC<Props> = ({ candidates, selectedIds, onToggle, onOpenAddModal }) => {
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
                <strong style={{ fontSize: '0.85rem' }}>{c.full_name}</strong>
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