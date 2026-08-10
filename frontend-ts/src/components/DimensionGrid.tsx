import React from 'react';
import { DimScores } from '../types';

interface Props {
  dimScores: DimScores;
}

export const DimensionGrid: React.FC<Props> = ({ dimScores }) => {
  const dimensions = [
    { label: 'Skills', score: dimScores.skills },
    { label: 'Trajectory', score: dimScores.trajectory },
    { label: 'Leadership', score: dimScores.leadership },
    { label: 'Domain', score: dimScores.domain },
    { label: 'Comm.', score: dimScores.communication },
  ];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(5, 1fr)',
      gap: '0.5rem',
      margin: '1rem 0',
      background: '#0f172a',
      padding: '0.75rem',
      borderRadius: '6px'
    }}>
      {dimensions.map((d, i) => (
        <div key={i} style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>{d.label}</div>
          <div style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{Math.round(d.score)}</div>
          <div style={{ background: '#334155', height: '4px', borderRadius: '2px', overflow: 'hidden', marginTop: '0.2rem' }}>
            <div style={{
              background: d.score > 75 ? 'var(--accent-green)' : d.score > 55 ? 'var(--accent-yellow)' : 'var(--accent-red)',
              height: '100%',
              width: `${Math.min(d.score, 100)}%`
            }} />
          </div>
        </div>
      ))}
    </div>
  );
};