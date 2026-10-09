import React, { useState, useEffect } from 'react';
import { Candidate, RankedCandidate, PipelinePhase, FeedbackDecision, CandidateFeedbackSummary, ActiveTab } from './types';
import { SAMPLE_CANDIDATES, DEFAULT_JD } from './data/candidates';
import { rankCandidates, submitFeedback, fetchFeedbackSummaries } from './lib/api';
import { Sidebar } from './components/Sidebar';
import { PhaseBar } from './components/PhaseBar';
import { JobDescriptionCard } from './components/JobDescriptionCard';
import { CandidatePool } from './components/CandidatePool';
import { ResultsList } from './components/ResultsList';
import { CustomCandidateForm } from './components/CustomCandidateForm';
import { HistoryView } from './components/HistoryView';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [jdText, setJdText] = useState(DEFAULT_JD);
  const [candidates, setCandidates] = useState<Candidate[]>(SAMPLE_CANDIDATES);
  const [selectedIds, setSelectedIds] = useState<string[]>(SAMPLE_CANDIDATES.map((c) => c.id));
  const [phase, setPhase] = useState<PipelinePhase>('idle');
  const [rankings, setRankings] = useState<RankedCandidate[]>([]);
  const [duration, setDuration] = useState<number | null>(null);
  const [currentRunId, setCurrentRunId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);
  const [feedbackSummaries, setFeedbackSummaries] = useState<Record<string, CandidateFeedbackSummary>>({});

  useEffect(() => {
    const loadSummaries = async () => {
      const summaries = await fetchFeedbackSummaries();
      const map: Record<string, CandidateFeedbackSummary> = {};
      for (const s of summaries) {
        if (s.candidate_id) map[s.candidate_id] = s;
        if (s.external_id) map[s.external_id] = s;
      }
      setFeedbackSummaries(map);
    };
    loadSummaries();
  }, []);

  const toggleCandidate = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleOpenRecordAssessment = (candOrResult: Candidate | RankedCandidate) => {
    const target = candidates.find((c) => c.id === candOrResult.id) || (candOrResult as Candidate);
    setEditingCandidate(target);
    setIsAddModalOpen(true);
  };

  const handleSaveCandidate = (savedCand: Candidate) => {
    setCandidates((prev) => {
      const exists = prev.some((c) => c.id === savedCand.id);
      if (exists) {
        return prev.map((c) => (c.id === savedCand.id ? savedCand : c));
      }
      return [savedCand, ...prev];
    });

    setSelectedIds((prev) => (prev.includes(savedCand.id) ? prev : [...prev, savedCand.id]));

    // Update rankings state so Pending Assessment badge disappears without page reload
    setRankings((prev) =>
      prev.map((r) =>
        r.id === savedCand.id || (r as any).candidate_id === savedCand.id
          ? {
              ...r,
              full_name: savedCand.full_name,
              needs_assessment: savedCand.needs_assessment
            }
          : r
      )
    );

    setEditingCandidate(null);
  };

  const handleRunPipeline = async () => {
    setPhase('jd_analysis');

    setTimeout(() => setPhase('profiling'), 300);
    setTimeout(() => setPhase('matching'), 600);
    setTimeout(() => setPhase('llm_ranking'), 900);

    const pool = candidates.filter((c) => selectedIds.includes(c.id));
    const result = await rankCandidates(jdText, pool);

    setRankings(result.rankings);
    setDuration(result.duration_ms);
    if (result.run_id) setCurrentRunId(result.run_id);
    setPhase('complete');
  };

  const handleFeedback = async (candidateId: string, decision: FeedbackDecision) => {
    const res = await submitFeedback(candidateId, decision, undefined, currentRunId || undefined);
    if (res && res.summary) {
      setFeedbackSummaries((prev) => ({
        ...prev,
        [candidateId]: res.summary,
        ...(res.summary.external_id ? { [res.summary.external_id]: res.summary } : {}),
        ...(res.summary.candidate_id ? { [res.summary.candidate_id]: res.summary } : {})
      }));
    }
  };

  const handleLoadJdToLive = (text: string) => {
    setJdText(text);
    setActiveTab('dashboard');
  };

  return (
    <div className="app-container">
      <Sidebar
        activePhase={phase}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <main className="main-content">
        {activeTab === 'dashboard' ? (
          <>
            <header style={{ marginBottom: '1.5rem' }}>
              <h1 style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>Candidate Ranking Dashboard</h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                Evaluate candidates against role intent using multi-dimension scoring and LLM analysis.
              </p>
            </header>

            <PhaseBar phase={phase} />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <JobDescriptionCard
                jdText={jdText}
                onChange={setJdText}
                onRun={handleRunPipeline}
                isLoading={phase !== 'idle' && phase !== 'complete'}
              />

              <CandidatePool
                candidates={candidates}
                selectedIds={selectedIds}
                feedbackSummaries={feedbackSummaries}
                onToggle={toggleCandidate}
                onOpenAddModal={() => {
                  setEditingCandidate(null);
                  setIsAddModalOpen(true);
                }}
                onRecordAssessment={handleOpenRecordAssessment}
              />
            </div>

            {phase === 'complete' && (
              <ResultsList
                rankings={rankings}
                durationMs={duration}
                feedbackSummaries={feedbackSummaries}
                onFeedback={handleFeedback}
                onRecordAssessment={handleOpenRecordAssessment}
              />
            )}

            {isAddModalOpen && (
              <CustomCandidateForm
                onAdd={handleSaveCandidate}
                editingCandidate={editingCandidate}
                onClose={() => {
                  setIsAddModalOpen(false);
                  setEditingCandidate(null);
                }}
              />
            )}
          </>
        ) : (
          <HistoryView onLoadJdToLive={handleLoadJdToLive} />
        )}
      </main>
    </div>
  );
};

export default App;