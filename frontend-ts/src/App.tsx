import React, { useState } from 'react';
import { Candidate, RankedCandidate, PipelinePhase, FeedbackDecision } from './types';
import { SAMPLE_CANDIDATES, DEFAULT_JD } from './data/candidates';
import { rankCandidates } from './lib/api';
import { Sidebar } from './components/Sidebar';
import { PhaseBar } from './components/PhaseBar';
import { JobDescriptionCard } from './components/JobDescriptionCard';
import { CandidatePool } from './components/CandidatePool';
import { ResultsList } from './components/ResultsList';
import { CustomCandidateForm } from './components/CustomCandidateForm';

export const App: React.FC = () => {
  const [jdText, setJdText] = useState(DEFAULT_JD);
  const [candidates, setCandidates] = useState<Candidate[]>(SAMPLE_CANDIDATES);
  const [selectedIds, setSelectedIds] = useState<string[]>(SAMPLE_CANDIDATES.map((c) => c.id));
  const [phase, setPhase] = useState<PipelinePhase>('idle');
  const [rankings, setRankings] = useState<RankedCandidate[]>([]);
  const [duration, setDuration] = useState<number | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const toggleCandidate = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleAddCandidate = (newCand: Candidate) => {
    setCandidates((prev) => [newCand, ...prev]);
    setSelectedIds((prev) => [...prev, newCand.id]);
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
    setPhase('complete');
  };

  const handleFeedback = (candidateId: string, decision: FeedbackDecision) => {
    console.log(`Feedback saved: Candidate ${candidateId} -> ${decision}`);
  };

  return (
    <div className="app-container">
      <Sidebar activePhase={phase} />

      <main className="main-content">
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
            onToggle={toggleCandidate}
            onOpenAddModal={() => setIsAddModalOpen(true)}
          />
        </div>

        {phase === 'complete' && (
          <ResultsList rankings={rankings} durationMs={duration} onFeedback={handleFeedback} />
        )}

        {isAddModalOpen && (
          <CustomCandidateForm
            onAdd={handleAddCandidate}
            onClose={() => setIsAddModalOpen(false)}
          />
        )}
      </main>
    </div>
  );
};

export default App;