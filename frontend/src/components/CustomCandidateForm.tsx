import React, { useState } from 'react';
import { Candidate } from '../types';

interface Props {
  onAdd: (candidate: Candidate) => void;
  onClose: () => void;
}

export const CustomCandidateForm: React.FC<Props> = ({ onAdd, onClose }) => {
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('');
  const [company, setCompany] = useState('');
  const [yoe, setYoe] = useState(3);
  const [skills, setSkills] = useState('');
  const [bio, setBio] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !role) return;

    const newCandidate: Candidate = {
      id: `custom-${Date.now()}`,
      full_name: fullName,
      current_role: role,
      company: company || 'Independent',
      years_experience: Number(yoe),
      skills: skills.split(',').map((s) => s.trim()).filter(Boolean),
      bio: bio,
      system_design_score: 75,
      coding_score: 75,
      communication_score: 80
    };

    onAdd(newCandidate);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
    }}>
      <div className="card" style={{ width: '450px', background: '#1e293b' }}>
        <h3>Add Candidate Profile</h3>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
          <input
            placeholder="Full Name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            style={{ padding: '0.5rem', background: '#0f172a', border: '1px solid var(--border-color)', color: '#fff', borderRadius: '4px' }}
          />
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              placeholder="Current Role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              required
              style={{ flex: 1, padding: '0.5rem', background: '#0f172a', border: '1px solid var(--border-color)', color: '#fff', borderRadius: '4px' }}
            />
            <input
              placeholder="Company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              style={{ flex: 1, padding: '0.5rem', background: '#0f172a', border: '1px solid var(--border-color)', color: '#fff', borderRadius: '4px' }}
            />
          </div>
          <input
            type="number"
            placeholder="Years of Experience"
            value={yoe}
            onChange={(e) => setYoe(Number(e.target.value))}
            style={{ padding: '0.5rem', background: '#0f172a', border: '1px solid var(--border-color)', color: '#fff', borderRadius: '4px' }}
          />
          <input
            placeholder="Comma separated skills (e.g. Python, React, AWS)"
            value={skills}
            onChange={(e) => setSkills(e.target.value)}
            style={{ padding: '0.5rem', background: '#0f172a', border: '1px solid var(--border-color)', color: '#fff', borderRadius: '4px' }}
          />
          <textarea
            placeholder="Bio / Summary signals..."
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            style={{ padding: '0.5rem', background: '#0f172a', border: '1px solid var(--border-color)', color: '#fff', borderRadius: '4px', height: '80px' }}
          />
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button type="button" className="btn" style={{ background: '#334155' }} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn">
              Save Candidate
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};