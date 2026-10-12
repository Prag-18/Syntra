import React from 'react';
import { ScoringWeights, WeightRationale } from '../types';

interface Props {
  aiWeights: ScoringWeights;
  currentWeights: ScoringWeights;
  rationales?: WeightRationale;
  isModified: boolean;
  isLoading: boolean;
  onWeightsChange: (newWeights: ScoringWeights) => void;
  onResetToAI: () => void;
  onRunRanking: () => void;
}

const DIMENSIONS: { key: keyof ScoringWeights; label: string; icon: string }[] = [
  { key: 'skills', label: 'Technical Skills & Execution', icon: '⚡' },
  { key: 'trajectory', label: 'Career Trajectory & Velocity', icon: '📈' },
  { key: 'leadership', label: 'Leadership & Mentorship', icon: '👥' },
  { key: 'domain', label: 'Domain Depth & Industry Match', icon: '🎯' },
  { key: 'communication', label: 'Communication & Stakeholders', icon: '💬' }
];

export const ScoringWeightsPanel: React.FC<Props> = ({
  aiWeights,
  currentWeights,
  rationales,
  isModified,
  isLoading,
  onWeightsChange,
  onResetToAI,
  onRunRanking
}) => {
  // Convert 0..1 scale to 0..100 integer percentages
  const toPercent = (val: number) => Math.round(val * 100);

  const handleSliderChange = (changedKey: keyof ScoringWeights, newPercent: number) => {
    const clampedNew = Math.max(0, Math.min(100, newPercent));
    const targetRemaining = 100 - clampedNew;

    const otherKeys = DIMENSIONS.map((d) => d.key).filter((k) => k !== changedKey);
    const currentOtherPercents: Record<string, number> = {};
    let otherSum = 0;

    otherKeys.forEach((k) => {
      const p = toPercent(currentWeights[k]);
      currentOtherPercents[k] = p;
      otherSum += p;
    });

    const updatedPercents: Record<string, number> = {
      [changedKey]: clampedNew
    };

    if (otherSum > 0) {
      // Rebalance proportionally while preserving locked-at-zero sliders
      let distributedSum = 0;
      otherKeys.forEach((k) => {
        const proportional = Math.round((currentOtherPercents[k] / otherSum) * targetRemaining);
        updatedPercents[k] = proportional;
        distributedSum += proportional;
      });

      // Adjust rounding discrepancy on largest non-zero other slider
      const diff = targetRemaining - distributedSum;
      if (diff !== 0) {
        const eligible = otherKeys.filter((k) => updatedPercents[k] > 0);
        const adjustKey = eligible.length > 0
          ? eligible.reduce((maxK, k) => (updatedPercents[k] > updatedPercents[maxK] ? k : maxK), eligible[0])
          : otherKeys[0];
        updatedPercents[adjustKey] = Math.max(0, updatedPercents[adjustKey] + diff);
      }
    } else {
      // If all other sliders were 0, distribute equally among the other 4
      const each = Math.floor(targetRemaining / otherKeys.length);
      let rem = targetRemaining % otherKeys.length;
      otherKeys.forEach((k, idx) => {
        updatedPercents[k] = each + (idx < rem ? 1 : 0);
      });
    }

    // Convert back to 0..1 float weights summing to 1.0
    const newWeights: ScoringWeights = {
      skills: Number((updatedPercents.skills / 100).toFixed(4)),
      trajectory: Number((updatedPercents.trajectory / 100).toFixed(4)),
      leadership: Number((updatedPercents.leadership / 100).toFixed(4)),
      domain: Number((updatedPercents.domain / 100).toFixed(4)),
      communication: Number((updatedPercents.communication / 100).toFixed(4))
    };

    onWeightsChange(newWeights);
  };

  return (
    <div className="card" style={{ marginTop: '1rem', border: '1px solid #334155' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Scoring Weights & AI Rationale</h3>
          {isModified && (
            <span
              style={{
                fontSize: '0.7rem',
                padding: '0.15rem 0.45rem',
                borderRadius: '4px',
                background: 'rgba(245, 158, 11, 0.2)',
                color: '#f59e0b',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                fontWeight: 'bold'
              }}
            >
              Modified
            </span>
          )}
        </div>

        <button
          onClick={onResetToAI}
          disabled={!isModified || isLoading}
          style={{
            background: 'transparent',
            border: '1px solid #475569',
            color: isModified ? '#94a3b8' : '#475569',
            padding: '0.3rem 0.6rem',
            borderRadius: '4px',
            fontSize: '0.75rem',
            cursor: isModified ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s'
          }}
          title="Restore weights extracted by Phase 1 AI"
        >
          Reset to AI weights
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {DIMENSIONS.map(({ key, label, icon }) => {
          const currentPct = toPercent(currentWeights[key]);
          const aiPct = toPercent(aiWeights[key]);
          const rationaleText = rationales ? rationales[key] : '';

          return (
            <div key={key} style={{ background: '#0f172a', padding: '0.75rem', borderRadius: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f1f5f9' }}>
                  <span style={{ marginRight: '0.4rem' }}>{icon}</span>
                  {label}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {currentPct !== aiPct && (
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      (AI: {aiPct}%)
                    </span>
                  )}
                  <span style={{ fontWeight: 'bold', fontSize: '0.95rem', color: '#38bdf8', minWidth: '38px', textAlign: 'right' }}>
                    {currentPct}%
                  </span>
                </div>
              </div>

              <input
                type="range"
                min="0"
                max="100"
                value={currentPct}
                onChange={(e) => handleSliderChange(key, parseInt(e.target.value, 10))}
                disabled={isLoading}
                style={{
                  width: '100%',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  accentColor: '#38bdf8'
                }}
              />

              {rationaleText && (
                <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic', lineHeight: 1.3 }}>
                  "{rationaleText}"
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
          Total allocated: <strong style={{ color: '#22c55e' }}>100%</strong>
        </span>
        <button
          className="btn"
          style={{ padding: '0.55rem 1.25rem', fontSize: '0.9rem' }}
          onClick={onRunRanking}
          disabled={isLoading}
        >
          {isLoading ? 'Running Pipeline...' : 'Run Ranking with Weights'}
        </button>
      </div>
    </div>
  );
};
