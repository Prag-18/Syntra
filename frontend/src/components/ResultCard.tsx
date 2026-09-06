import React from 'react';
import { RankedCandidate, FeedbackDecision, CandidateFeedbackSummary } from '../types';
import { DimensionGrid } from './DimensionGrid';
import { SignalTags } from './SignalTags';
import { InterviewQuestions } from './InterviewQuestions';
import { FeedbackRow } from './FeedbackRow';

interface Props {
  result: RankedCandidate;
  summary?: CandidateFeedbackSummary;
  onFeedback?: (id: string, decision: FeedbackDecision) => Promise<void> | void;
}

export const ResultCard: React.FC<Props> = ({ result, summary, onFeedback }) => {
  const getBadgeClass = (tier: string) => {
    if (tier === 'Top pick') return 'badge-top';
    if (tier === 'Worth interviewing') return 'badge-mid';
    return 'badge-low';
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{
            width: '42px', height: '42px', borderRadius: '50%', background: '#0284c7',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.9rem'
          }}>
            {getInitials(result.full_name)}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>#{result.rank} {result.full_name}</span>
              {summary && (summary.accepts > 0 || summary.maybes > 0 || summary.rejects > 0) && (
                <span style={{
                  fontSize: '0.65rem',
                  padding: '0.05rem 0.35rem',
                  borderRadius: '4px',
                  background: summary.accepts > 0 ? 'rgba(34, 197, 94, 0.15)' : summary.rejects > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                  color: summary.accepts > 0 ? 'var(--accent-green)' : summary.rejects > 0 ? 'var(--accent-red)' : 'var(--accent-yellow)',
                  border: `1px solid ${summary.accepts > 0 ? 'rgba(34, 197, 94, 0.3)' : summary.rejects > 0 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(234, 179, 8, 0.3)'}`
                }}>
                  {summary.accepts > 0 ? `✓ ${summary.accepts} accepted` : summary.rejects > 0 ? `✕ ${summary.rejects} rejected` : `? ${summary.maybes} maybe`}
                </span>
              )}
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{result.headline}</p>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <span className={`badge ${getBadgeClass(result.tier)}`}>{result.tier}</span>
          <div style={{ fontSize: '1.2rem', fontWeight: 'bold', marginTop: '0.2rem' }}>
            {result.composite_score} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>/ 100</span>
          </div>
        </div>
      </div>

      <p style={{ marginTop: '0.75rem', fontSize: '0.9rem', color: '#cbd5e1', lineHeight: '1.4' }}>
        {result.rationale}
      </p>

      {/* 5-Column Dimension Metrics */}
      <DimensionGrid dimScores={result.dim_scores} />

      {/* Strengths & Risks */}
      <SignalTags strengths={result.key_strengths} risks={result.key_risks} />

      {/* Interview Questions */}
      <InterviewQuestions questions={result.interview_questions} />

      {/* Feedback Decision Buttons */}
      <FeedbackRow candidateId={result.id} onFeedback={onFeedback} />
    </div>
  );
};