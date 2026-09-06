import React, { useState } from 'react';
import { FeedbackDecision } from '../types';

interface Props {
  candidateId: string;
  onFeedback?: (candidateId: string, decision: FeedbackDecision) => Promise<void> | void;
}

export const FeedbackRow: React.FC<Props> = ({ candidateId, onFeedback }) => {
  const [selected, setSelected] = useState<FeedbackDecision | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleSelect = async (decision: FeedbackDecision) => {
    setSelected(decision);
    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      if (onFeedback) {
        await onFeedback(candidateId, decision);
      }
      setStatusMessage('Saved ✓');
      setTimeout(() => setStatusMessage(null), 2500);
    } catch (err) {
      console.error('Failed to save feedback:', err);
      setStatusMessage('Error saving');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Recruiter Decision:</span>
        {statusMessage && (
          <span style={{
            fontSize: '0.7rem',
            fontWeight: 600,
            color: statusMessage.includes('✓') ? 'var(--accent-green)' : 'var(--accent-red)',
            transition: 'opacity 0.2s ease'
          }}>
            {statusMessage}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
        <button
          className="btn"
          disabled={isSubmitting}
          style={{
            padding: '0.25rem 0.6rem', fontSize: '0.75rem',
            background: selected === 'accept' ? 'var(--accent-green)' : '#334155',
            color: selected === 'accept' ? '#000' : '#fff',
            opacity: isSubmitting ? 0.7 : 1,
            cursor: isSubmitting ? 'wait' : 'pointer'
          }}
          onClick={() => handleSelect('accept')}
        >
          Accept
        </button>
        <button
          className="btn"
          disabled={isSubmitting}
          style={{
            padding: '0.25rem 0.6rem', fontSize: '0.75rem',
            background: selected === 'maybe' ? 'var(--accent-yellow)' : '#334155',
            color: selected === 'maybe' ? '#000' : '#fff',
            opacity: isSubmitting ? 0.7 : 1,
            cursor: isSubmitting ? 'wait' : 'pointer'
          }}
          onClick={() => handleSelect('maybe')}
        >
          Maybe
        </button>
        <button
          className="btn"
          disabled={isSubmitting}
          style={{
            padding: '0.25rem 0.6rem', fontSize: '0.75rem',
            background: selected === 'reject' ? 'var(--accent-red)' : '#334155',
            color: '#fff',
            opacity: isSubmitting ? 0.7 : 1,
            cursor: isSubmitting ? 'wait' : 'pointer'
          }}
          onClick={() => handleSelect('reject')}
        >
          Reject
        </button>
      </div>
    </div>
  );
};