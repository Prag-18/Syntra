import React from 'react';

interface Props {
  strengths: string[];
  risks: string[];
}

export const SignalTags: React.FC<Props> = ({ strengths, risks }) => {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.75rem' }}>
      <div>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-green)' }}>KEY STRENGTHS</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.25rem' }}>
          {strengths.map((s, i) => (
            <span key={i} style={{ fontSize: '0.8rem', background: 'rgba(34, 197, 94, 0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px', color: '#86efac' }}>
              ✓ {s}
            </span>
          ))}
        </div>
      </div>

      <div>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-red)' }}>KEY RISKS / GAPS</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.25rem' }}>
          {risks.map((r, i) => (
            <span key={i} style={{ fontSize: '0.8rem', background: 'rgba(239, 68, 68, 0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px', color: '#fca5a5' }}>
              ⚠ {r}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};