import React, { useState, useEffect } from 'react';
import {
  Candidate,
  RankedCandidate,
  PipelinePhase,
  FeedbackDecision,
  CandidateFeedbackSummary,
  ActiveTab,
  ScoringWeights,
  WeightRationale
} from './types';
import { SAMPLE_CANDIDATES, DEFAULT_JD } from './data/candidates';
import { rankCandidates, submitFeedback, fetchFeedbackSummaries, parseJD } from './lib/api';
import { Sidebar } from './components/Sidebar';
import { PhaseBar } from './components/PhaseBar';
import { JobDescriptionCard } from './components/JobDescriptionCard';
import { ScoringWeightsPanel } from './components/ScoringWeightsPanel';
import { CandidatePool } from './components/CandidatePool';
import { ResultsList } from './components/ResultsList';
import { CustomCandidateForm } from './components/CustomCandidateForm';
import { HistoryView } from './components/HistoryView';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [jdText, setJdText] = useState(DEFAULT_JD);
  const [jdId, setJdId] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>(SAMPLE_CANDIDATES);
  const [selectedIds, setSelectedIds] = useState<string[]>(SAMPLE_CANDIDATES.map((c) => c.id));
  const [phase, setPhase] = useState<PipelinePhase>('idle');
  const [rankings, setRankings] = useState<RankedCandidate[]>([]);
  const [duration, setDuration] = useState<number | null>(null);
  const [currentRunId, setCurrentRunId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);
  const [feedbackSummaries, setFeedbackSummaries] = useState<Record<string, CandidateFeedbackSummary>>({});

  // Part B state: Scoring Weights & Rationales
  const [aiWeights, setAiWeights] = useState<ScoringWeights | null>(null);
  const [currentWeights, setCurrentWeights] = useState<ScoringWeights | null>(null);
  const [rationales, setRationales] = useState<WeightRationale | undefined>(undefined);
  const [isJdParsed, setIsJdParsed] = useState(false);
  const [isAnalyzingJd, setIsAnalyzingJd] = useState(false);

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

  const handleJdTextChange = (newText: string) => {
    setJdText(newText);
    setIsJdParsed(false);
    setJdId(null);
  };

  const handleAnalyzeJD = async () => {
    if (!jdText.trim()) return;
    setIsAnalyzingJd(true);
    setPhase('jd_analysis');
    try {
      const intent = await parseJD(jdText);
      if (intent.jd_id) setJdId(intent.jd_id);
      setAiWeights(intent.weights);
      setCurrentWeights(intent.weights);
      setRationales(intent.weight_rationale);
      setIsJdParsed(true);
      setPhase('jd_parsed');
    } catch (err) {
      console.error('JD analysis failed:', err);
      const fallbackWeights: ScoringWeights = {
        skills: 0.3,
        trajectory: 0.2,
        leadership: 0.2,
        domain: 0.15,
        communication: 0.15
      };
      setAiWeights(fallbackWeights);
      setCurrentWeights(fallbackWeights);
      setIsJdParsed(true);
      setPhase('jd_parsed');
    } finally {
      setIsAnalyzingJd(false);
    }
  };

  const handleRunPipeline = async () => {
    let activeJdId = jdId;
    let activeWeights = currentWeights;

    if (!isJdParsed || !activeWeights) {
      setIsAnalyzingJd(true);
      setPhase('jd_analysis');
      try {
        const intent = await parseJD(jdText);
        activeJdId = intent.jd_id || null;
        setJdId(activeJdId);
        setAiWeights(intent.weights);
        activeWeights = intent.weights;
        setCurrentWeights(intent.weights);
        setRationales(intent.weight_rationale);
        setIsJdParsed(true);
      } catch (err) {
        console.warn('Fallback on auto-parse:', err);
      } finally {
        setIsAnalyzingJd(false);
      }
    }

    // Step into Phase 2, 3, 4 without re-animating Phase 1 as running
    setPhase('profiling');
    setTimeout(() => setPhase('matching'), 300);
    setTimeout(() => setPhase('llm_ranking'), 600);

    const pool = candidates.filter((c) => selectedIds.includes(c.id));
    const result = await rankCandidates(
      jdText,
      pool,
      activeJdId || undefined,
      activeWeights || undefined
    );

    setRankings(result.rankings);
    setDuration(result.duration_ms);
    if (result.run_id) setCurrentRunId(result.run_id);
    if (result.applied_weights) setCurrentWeights(result.applied_weights);
    if (result.ai_weights && !aiWeights) setAiWeights(result.ai_weights);
    setPhase('complete');
  };

  const handleResetToAI = () => {
    if (aiWeights) {
      setCurrentWeights({ ...aiWeights });
    }
  };

  const isWeightsModified = Boolean(
    aiWeights &&
    currentWeights &&
    (
      Math.abs(currentWeights.skills - aiWeights.skills) > 0.005 ||
      Math.abs(currentWeights.trajectory - aiWeights.trajectory) > 0.005 ||
      Math.abs(currentWeights.leadership - aiWeights.leadership) > 0.005 ||
      Math.abs(currentWeights.domain - aiWeights.domain) > 0.005 ||
      Math.abs(currentWeights.communication - aiWeights.communication) > 0.005
    )
  );

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

  const handleLoadJdToLive = (
    text: string,
    historyJdId?: string,
    appliedWeights?: ScoringWeights,
    historyAiWeights?: ScoringWeights
  ) => {
    setJdText(text);
    if (historyJdId) setJdId(historyJdId);
    if (appliedWeights) setCurrentWeights(appliedWeights);
    if (historyAiWeights) setAiWeights(historyAiWeights);
    else if (appliedWeights) setAiWeights(appliedWeights);
    setIsJdParsed(true);
    setPhase('jd_parsed');
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

            <PhaseBar phase={phase} jdParsed={isJdParsed} />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <JobDescriptionCard
                  jdText={jdText}
                  onChange={handleJdTextChange}
                  onAnalyze={handleAnalyzeJD}
                  isAnalyzing={isAnalyzingJd}
                  isParsed={isJdParsed}
                />

                {isJdParsed && currentWeights && aiWeights && (
                  <ScoringWeightsPanel
                    aiWeights={aiWeights}
                    currentWeights={currentWeights}
                    rationales={rationales}
                    isModified={isWeightsModified}
                    isLoading={isAnalyzingJd || (phase !== 'idle' && phase !== 'jd_parsed' && phase !== 'complete')}
                    onWeightsChange={setCurrentWeights}
                    onResetToAI={handleResetToAI}
                    onRunRanking={handleRunPipeline}
                  />
                )}
              </div>

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