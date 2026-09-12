import React, { useState, useEffect } from 'react';
import {
  RankingRunSummary,
  RankingRunDetail,
  CandidateFeedbackSummary,
  FeedbackDecision,
  RunStatus
} from '../types';
import { fetchRuns, fetchRunDetail, fetchFeedbackSummaries, submitFeedback } from '../lib/api';
import { ResultsList } from './ResultsList';

interface Props {
  onLoadJdToLive: (jdText: string) => void;
}

export const HistoryView: React.FC<Props> = ({ onLoadJdToLive }) => {
  const [runs, setRuns] = useState<RankingRunSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<'all' | RunStatus>('all');
  const [isLoadingList, setIsLoadingList] = useState(false);

  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [runDetail, setRunDetail] = useState<RankingRunDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [runFeedbackSummaries, setRunFeedbackSummaries] = useState<Record<string, CandidateFeedbackSummary>>({});
  const [isJdExpanded, setIsJdExpanded] = useState(false);

  const limit = 10;

  // Load runs list
  const loadRunsList = async () => {
    setIsLoadingList(true);
    try {
      const res = await fetchRuns(statusFilter === 'all' ? undefined : statusFilter, limit, page * limit);
      setRuns(res.runs);
      setTotal(res.total);
    } catch (err) {
      console.error('Failed to load runs:', err);
    } finally {
      setIsLoadingList(false);
    }
  };

  useEffect(() => {
    if (!selectedRunId) {
      loadRunsList();
    }
  }, [statusFilter, page, selectedRunId]);

  // Load run detail when a run is selected
  useEffect(() => {
    if (!selectedRunId) {
      setRunDetail(null);
      setRunFeedbackSummaries({});
      return;
    }

    const loadDetail = async () => {
      setIsLoadingDetail(true);
      try {
        const [detail, summaries] = await Promise.all([
          fetchRunDetail(selectedRunId),
          fetchFeedbackSummaries(selectedRunId)
        ]);
        setRunDetail(detail);

        const map: Record<string, CandidateFeedbackSummary> = {};
        for (const s of summaries) {
          if (s.candidate_id) map[s.candidate_id] = s;
          if (s.external_id) map[s.external_id] = s;
        }
        setRunFeedbackSummaries(map);
      } catch (err) {
        console.error('Failed to load run detail:', err);
      } finally {
        setIsLoadingDetail(false);
      }
    };

    loadDetail();
  }, [selectedRunId]);

  const handleFeedback = async (candidateId: string, decision: FeedbackDecision) => {
    if (!selectedRunId) return;
    const res = await submitFeedback(candidateId, decision, undefined, selectedRunId);
    if (res && res.summary) {
      setRunFeedbackSummaries((prev) => ({
        ...prev,
        [candidateId]: res.summary,
        ...(res.summary.external_id ? { [res.summary.external_id]: res.summary } : {}),
        ...(res.summary.candidate_id ? { [res.summary.candidate_id]: res.summary } : {})
      }));
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  const getStatusBadge = (status: RunStatus) => {
    if (status === 'complete') {
      return (
        <span style={{
          fontSize: '0.75rem',
          fontWeight: 600,
          padding: '0.2rem 0.55rem',
          borderRadius: '9999px',
          background: 'rgba(34, 197, 94, 0.15)',
          color: 'var(--accent-green)',
          border: '1px solid rgba(34, 197, 94, 0.3)'
        }}>
          ✓ Completed
        </span>
      );
    }
    if (status === 'failed') {
      return (
        <span style={{
          fontSize: '0.75rem',
          fontWeight: 600,
          padding: '0.2rem 0.55rem',
          borderRadius: '9999px',
          background: 'rgba(239, 68, 68, 0.15)',
          color: 'var(--accent-red)',
          border: '1px solid rgba(239, 68, 68, 0.3)'
        }}>
          ✕ Failed
        </span>
      );
    }
    return (
      <span style={{
        fontSize: '0.75rem',
        fontWeight: 600,
        padding: '0.2rem 0.55rem',
        borderRadius: '9999px',
        background: 'rgba(14, 165, 233, 0.15)',
        color: 'var(--accent-blue)',
        border: '1px solid rgba(14, 165, 233, 0.3)'
      }}>
        ● Running
      </span>
    );
  };

  // Detail View
  if (selectedRunId) {
    if (isLoadingDetail) {
      return (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Loading Historical Run Detail...</div>
          <div style={{ fontSize: '0.85rem' }}>Fetching candidate scores, rationales, and recruiter feedback.</div>
        </div>
      );
    }

    if (!runDetail) {
      return (
        <div style={{ background: 'var(--bg-card)', padding: '2rem', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
          <h3 style={{ color: 'var(--accent-red)' }}>Run Not Found</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>The requested ranking run could not be loaded.</p>
          <button className="btn btn-primary" onClick={() => setSelectedRunId(null)}>
            ← Back to History List
          </button>
        </div>
      );
    }

    const jd = runDetail.job_description;
    const isCompleted = runDetail.status === 'complete';

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Navigation & Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--bg-card)',
          padding: '1rem 1.25rem',
          borderRadius: '8px',
          border: '1px solid var(--border-color)',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              onClick={() => setSelectedRunId(null)}
              style={{
                background: 'transparent',
                border: '1px solid var(--border-color)',
                color: 'var(--text-main)',
                padding: '0.45rem 0.85rem',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: 500
              }}
            >
              ← Back to History
            </button>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <h2 style={{ fontSize: '1.3rem', margin: 0, fontWeight: 'bold' }}>
                  {jd?.title || 'Historical Run'}
                </h2>
                {getStatusBadge(runDetail.status)}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                Run ID: <code style={{ fontSize: '0.75rem', color: 'var(--accent-blue)' }}>{runDetail.id}</code> | Executed on {formatDate(runDetail.created_at)}
                {runDetail.duration_ms !== null && ` (${runDetail.duration_ms}ms)`}
              </div>
            </div>
          </div>

          {jd?.raw_text && (
            <button
              className="btn btn-primary"
              onClick={() => onLoadJdToLive(jd.raw_text)}
              style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              ⚡ Load in Live Dashboard
            </button>
          )}
        </div>

        {/* Failed Run Alert */}
        {!isCompleted && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            padding: '1rem 1.25rem',
            color: '#fca5a5',
            fontSize: '0.9rem'
          }}>
            <strong>Pipeline Execution Halted:</strong> This run encountered an error or was aborted before completion.
            {runDetail.duration_ms && ` (Duration: ${runDetail.duration_ms}ms)`}
          </div>
        )}

        {/* Job Description Card */}
        {jd && (
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1rem', margin: 0, color: 'var(--accent-blue)' }}>Role Requirements & Extracted Intent</h3>
              <button
                onClick={() => setIsJdExpanded(!isJdExpanded)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '0.8rem'
                }}
              >
                {isJdExpanded ? 'Hide Raw JD ▲' : 'View Raw JD ▼'}
              </button>
            </div>

            {/* Extracted Skills & Metadata */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
              {jd.must_have_skills && jd.must_have_skills.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Must-haves:</span>
                  {jd.must_have_skills.map((s, idx) => (
                    <span key={idx} className="skill-tag" style={{ background: 'rgba(14, 165, 233, 0.15)', color: 'var(--accent-blue)' }}>
                      {s}
                    </span>
                  ))}
                </div>
              )}
              {jd.nice_to_have_skills && jd.nice_to_have_skills.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginLeft: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Nice-to-have:</span>
                  {jd.nice_to_have_skills.map((s, idx) => (
                    <span key={idx} className="skill-tag">
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {isJdExpanded && (
              <pre style={{
                background: '#090d16',
                padding: '1rem',
                borderRadius: '6px',
                fontSize: '0.8rem',
                whiteSpace: 'pre-wrap',
                border: '1px solid var(--border-color)',
                maxHeight: '240px',
                overflowY: 'auto',
                color: '#94a3b8'
              }}>
                {jd.raw_text}
              </pre>
            )}
          </div>
        )}

        {/* Results List */}
        {isCompleted && (
          <ResultsList
            title="Historical Ranking Results"
            rankings={runDetail.rankings}
            durationMs={runDetail.duration_ms}
            feedbackSummaries={runFeedbackSummaries}
            onFeedback={handleFeedback}
          />
        )}
      </div>
    );
  }

  // Runs List View
  const totalPages = Math.ceil(total / limit);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header & Filter Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'var(--bg-card)',
        padding: '1rem 1.25rem',
        borderRadius: '8px',
        border: '1px solid var(--border-color)',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', margin: 0, fontWeight: 'bold' }}>Ranking History</h2>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Total Runs Recorded: {total}
          </span>
        </div>

        {/* Status Filter Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', background: '#090d16', padding: '0.25rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
          {(['all', 'complete', 'failed'] as const).map((tab) => {
            const isActive = statusFilter === tab;
            const label = tab === 'all' ? 'All Runs' : tab === 'complete' ? 'Completed' : 'Failed';
            return (
              <button
                key={tab}
                onClick={() => {
                  setStatusFilter(tab);
                  setPage(0);
                }}
                style={{
                  background: isActive ? 'var(--accent-blue)' : 'transparent',
                  color: isActive ? '#fff' : 'var(--text-muted)',
                  border: 'none',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '4px',
                  fontSize: '0.8rem',
                  fontWeight: isActive ? 600 : 400,
                  cursor: 'pointer'
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Runs Table / Cards */}
      {isLoadingList ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
          Loading ranking history...
        </div>
      ) : runs.length === 0 ? (
        <div style={{
          background: 'var(--bg-card)',
          padding: '3rem 1.5rem',
          borderRadius: '8px',
          border: '1px solid var(--border-color)',
          textAlign: 'center'
        }}>
          <h3 style={{ color: 'var(--text-main)', marginBottom: '0.5rem' }}>No Runs Found</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {statusFilter === 'all'
              ? 'You have not run any candidate evaluations yet. Run a pipeline from the Dashboard.'
              : `No runs matching the filter "${statusFilter}".`}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {runs.map((r) => (
            <div
              key={r.run_id}
              className="card"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1rem 1.25rem',
                margin: 0,
                transition: 'border-color 0.2s',
                cursor: 'pointer'
              }}
              onClick={() => setSelectedRunId(r.run_id)}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1, paddingRight: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '1.05rem', color: 'var(--text-main)' }}>
                    {r.title}
                  </span>
                  {getStatusBadge(r.status)}
                  <span style={{
                    fontSize: '0.75rem',
                    background: '#0f172a',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '4px',
                    color: 'var(--text-muted)'
                  }}>
                    {r.candidate_count} candidates
                  </span>
                  {r.duration_ms !== null && (
                    <span style={{
                      fontSize: '0.75rem',
                      background: '#0f172a',
                      padding: '0.15rem 0.5rem',
                      borderRadius: '4px',
                      color: 'var(--accent-blue)'
                    }}>
                      {r.duration_ms}ms
                    </span>
                  )}
                </div>

                <p style={{
                  color: 'var(--text-muted)',
                  fontSize: '0.85rem',
                  margin: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical'
                }}>
                  {r.jd_snippet}
                </p>

                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Executed on {formatDate(r.created_at)}
                </div>
              </div>

              <div>
                <button
                  className="btn btn-primary"
                  style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem', whiteSpace: 'nowrap' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedRunId(r.run_id);
                  }}
                >
                  View Run →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.5rem 0'
        }}>
          <button
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              color: page === 0 ? 'var(--text-muted)' : 'var(--text-main)',
              padding: '0.4rem 0.8rem',
              borderRadius: '6px',
              cursor: page === 0 ? 'not-allowed' : 'pointer',
              fontSize: '0.85rem'
            }}
            disabled={page === 0}
            onClick={() => setPage(page - 1)}
          >
            ← Previous
          </button>

          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Page {page + 1} of {totalPages}
          </span>

          <button
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              color: page >= totalPages - 1 ? 'var(--text-muted)' : 'var(--text-main)',
              padding: '0.4rem 0.8rem',
              borderRadius: '6px',
              cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer',
              fontSize: '0.85rem'
            }}
            disabled={page >= totalPages - 1}
            onClick={() => setPage(page + 1)}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
};
