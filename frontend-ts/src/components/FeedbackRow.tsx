import React, { useState } from 'react';
import { FeedbackDecision } from '../types';

interface Props {
  candidateId: string;
  onFeedback?: (candidateId: string, decision: FeedbackDecision) => void;
}

export const FeedbackRow: React.FC<Props> = ({ candidateId, onFeedback }) => {
  const [selected, setSelected] = useState<FeedbackDecision | null>(null);

  const handleSelect = (decision: FeedbackDecision) => {
    setSelected(decision);
    if (onFeedback) onFeedback(candidateId, decision);
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Recruiter Decision:</span>
      <div style={{ display: 'flex', gap: '0.4rem' }}>
        <button
          className="btn"
          style={{
            padding: '0.25rem 0.6rem', fontSize: '0.75rem',
            background: selected === 'accept' ? 'var(--accent-green)' : '#334155',
            color: selected === 'accept' ? '#000' : '#fff'
          }}
          onClick={() => handleSelect('accept')}
        >
          Accept
        </button>
        <button
          className="btn"
          style={{
            padding: '0.25rem 0.6rem', fontSize: '0.75rem',
            background: selected === 'maybe' ? 'var(--accent-yellow)' : '#334155',
            color: selected === 'maybe' ? '#000' : '#fff'
          }}
          onClick={() => handleSelect('maybe')}
        >
          Maybe
        </button>
        <button
          className="btn"
          style={{
            padding: '0.25rem 0.6rem', fontSize: '0.75rem',
            background: selected === 'reject' ? 'var(--accent-red)' : '#334155',
            color: selected === 'reject' ? '#fff' : '#fff'
          }}
          onClick={() => handleSelect('reject')}
        >
          Reject
        </button>
      </div>
    </div>
  );
};