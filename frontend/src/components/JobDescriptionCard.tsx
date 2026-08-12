import React from 'react';

interface Props {
  jdText: string;
  onChange: (value: string) => void;
  onRun: () => void;
  isLoading: boolean;
}

export const JobDescriptionCard: React.FC<Props> = ({ jdText, onChange, onRun, isLoading }) => {
  return (
    <div className="card">
      <h3 style={{ marginBottom: '0.5rem' }}>Job Description</h3>
      <textarea
        style={{
          width: '100%',
          height: '180px',
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
        style={{ marginTop: '1rem', width: '100%' }}
        onClick={onRun}
        disabled={isLoading}
      >
        {isLoading ? 'Processing Pipeline...' : 'Run 4-Phase AI Pipeline'}
      </button>
    </div>
  );
};