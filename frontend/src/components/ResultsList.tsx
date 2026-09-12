import React from 'react';
import { RankedCandidate, FeedbackDecision, CandidateFeedbackSummary } from '../types';
import { ResultCard } from './ResultCard';

interface Props {
  rankings: RankedCandidate[];
  durationMs: number | null;
  feedbackSummaries?: Record<string, CandidateFeedbackSummary>;
  onFeedback?: (candidateId: string, decision: FeedbackDecision) => Promise<void> | void;
  title?: string;
}

export const ResultsList: React.FC<Props> = ({ rankings, durationMs, feedbackSummaries = {}, onFeedback, title = 'Candidate Rankings' }) => {
  const topPicks = rankings.filter((r) => r.tier === 'Top pick').length;
  const worthInterviewing = rankings.filter((r) => r.tier === 'Worth interviewing').length;

  return (
    <div style={{ marginTop: '2rem' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'var(--bg-card)',
        padding: '1rem',
        borderRadius: '8px',
        border: '1px solid var(--border-color)',
        marginBottom: '1rem'
      }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', margin: 0 }}>{title}</h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Evaluated: {rankings.length} | Top Picks: {topPicks} | Worth Interviewing: {worthInterviewing}
          </span>
        </div>
        {durationMs !== null && (
          <span style={{ fontSize: '0.8rem', color: 'var(--accent-blue)', background: '#0f172a', padding: '0.3rem 0.6rem', borderRadius: '4px' }}>
            Execution: {durationMs}ms
          </span>
        )}
      </div>

      {rankings.map((result) => (
        <ResultCard
          key={result.id}
          result={result}
          summary={feedbackSummaries[result.id]}
          onFeedback={onFeedback}
        />
      ))}
    </div>
  );
};