import React from 'react';

interface Props {
  questions: string[];
}

export const InterviewQuestions: React.FC<Props> = ({ questions }) => {
  return (
    <div style={{ marginTop: '0.85rem', background: '#0f172a', padding: '0.75rem', borderRadius: '6px' }}>
      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-blue)' }}>SUGGESTED INTERVIEW QUESTIONS</span>
      <ol style={{ paddingLeft: '1.1rem', marginTop: '0.3rem', fontSize: '0.8rem', color: '#cbd5e1' }}>
        {questions.map((q, i) => (
          <li key={i} style={{ marginBottom: '0.2rem' }}>{q}</li>
        ))}
      </ol>
    </div>
  );
};