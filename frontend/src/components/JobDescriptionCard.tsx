import React from 'react';

interface Props {
  jdText: string;
  onChange: (value: string) => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
  isParsed: boolean;
}

export const JobDescriptionCard: React.FC<Props> = ({
  jdText,
  onChange,
  onAnalyze,
  isAnalyzing,
  isParsed
}) => {
  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <h3 style={{ margin: 0 }}>Job Description</h3>
        {isParsed && (
          <span style={{
            fontSize: '0.72rem',
            padding: '0.15rem 0.45rem',
            borderRadius: '999px',
            background: 'rgba(34, 197, 94, 0.15)',
            color: '#22c55e',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            fontWeight: 600
          }}>
            ✓ AI Intent Extracted
          </span>
        )}
      </div>

      <textarea
        style={{
          width: '100%',
          height: '160px',
          background: '#0f172a',
          color: 'var(--text-main)',
          border: '1px solid var(--border-color)',
          borderRadius: '6px',
          padding: '0.75rem',
          fontSize: '0.85rem',
          resize: 'vertical'
        }}
        value={jdText}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Paste job description here..."
      />

      <button
        className="btn"
        style={{ marginTop: '0.85rem', width: '100%' }}
        onClick={onAnalyze}
        disabled={isAnalyzing || !jdText.trim()}
      >
        {isAnalyzing
          ? 'Analyzing JD with Gemini...'
          : isParsed
          ? '↻ Re-analyze Job Description'
          : '⚡ Analyze JD & Configure Weights'}
      </button>
    </div>
  );
};