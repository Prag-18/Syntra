import React, { useState, useEffect } from 'react';
import { Candidate } from '../types';
import { uploadResume, updateCandidate } from '../lib/api';

interface Props {
  onAdd: (candidate: Candidate) => void;
  onClose: () => void;
  editingCandidate?: Candidate | null;
}

export const CustomCandidateForm: React.FC<Props> = ({ onAdd, onClose, editingCandidate = null }) => {
  const [mode, setMode] = useState<'manual' | 'upload'>('manual');
  
  // Candidate form fields
  const [fullName, setFullName] = useState(editingCandidate?.full_name || '');
  const [role, setRole] = useState(editingCandidate?.current_role || '');
  const [company, setCompany] = useState(editingCandidate?.company || '');
  const [yoe, setYoe] = useState<number>(editingCandidate?.years_experience ?? 3);
  const [skills, setSkills] = useState((editingCandidate?.skills || []).join(', '));
  const [bio, setBio] = useState(editingCandidate?.bio || '');
  const [mentoringSignals, setMentoringSignals] = useState(editingCandidate?.mentoring_signals || '');
  const [commSignals, setCommSignals] = useState(editingCandidate?.communication_signals || '');
  const [collabSignals, setCollabSignals] = useState(editingCandidate?.collaboration_signals || '');
  const [publicPresence, setPublicPresence] = useState(editingCandidate?.public_presence || '');
  const [referralNotes, setReferralNotes] = useState(editingCandidate?.referral_notes || '');
  
  // Score & Assessment state
  const [needsAssessment, setNeedsAssessment] = useState<boolean>(editingCandidate?.needs_assessment ?? false);
  const [sysDesignScore, setSysDesignScore] = useState<number | null>(editingCandidate?.system_design_score ?? null);
  const [codingScore, setCodingScore] = useState<number | null>(editingCandidate?.coding_score ?? null);
  const [commScore, setCommScore] = useState<number | null>(editingCandidate?.communication_score ?? null);

  // Resume upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedCandidateId, setUploadedCandidateId] = useState<string | null>(editingCandidate?.id || null);
  const [defaultedFields, setDefaultedFields] = useState<string[]>([]);

  useEffect(() => {
    if (editingCandidate) {
      setUploadedCandidateId(editingCandidate.id);
      setFullName(editingCandidate.full_name || '');
      setRole(editingCandidate.current_role || '');
      setCompany(editingCandidate.company || '');
      setYoe(editingCandidate.years_experience ?? 0);
      setSkills((editingCandidate.skills || []).join(', '));
      setBio(editingCandidate.bio || '');
      setMentoringSignals(editingCandidate.mentoring_signals || '');
      setCommSignals(editingCandidate.communication_signals || '');
      setCollabSignals(editingCandidate.collaboration_signals || '');
      setPublicPresence(editingCandidate.public_presence || '');
      setReferralNotes(editingCandidate.referral_notes || '');
      setNeedsAssessment(editingCandidate.needs_assessment ?? false);
      setSysDesignScore(editingCandidate.system_design_score ?? null);
      setCodingScore(editingCandidate.coding_score ?? null);
      setCommScore(editingCandidate.communication_score ?? null);
    }
  }, [editingCandidate]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setUploadError(null);
    }
  };

  const handleUploadResume = async () => {
    if (!selectedFile) {
      setUploadError('Please select a PDF or DOCX file to upload.');
      return;
    }

    const filename = selectedFile.name.toLowerCase();
    if (!filename.endsWith('.pdf') && !filename.endsWith('.docx')) {
      setUploadError('Invalid file type. Only PDF (.pdf) and Word (.docx) files are supported.');
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      setUploadError('File size exceeds the 5MB limit. Please select a smaller file.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const extractedCandidate = await uploadResume(selectedFile);
      
      // Pre-fill form fields with extracted candidate data
      setUploadedCandidateId(extractedCandidate.id);
      setFullName(extractedCandidate.full_name || '');
      setRole(extractedCandidate.current_role || '');
      setCompany(extractedCandidate.company || '');
      setYoe(extractedCandidate.years_experience || 0);
      setSkills((extractedCandidate.skills || []).join(', '));
      setBio(extractedCandidate.bio || '');
      setMentoringSignals(extractedCandidate.mentoring_signals || '');
      setCommSignals(extractedCandidate.communication_signals || '');
      setCollabSignals(extractedCandidate.collaboration_signals || '');
      setPublicPresence(extractedCandidate.public_presence || '');
      setReferralNotes(extractedCandidate.referral_notes || '');

      setNeedsAssessment(true);
      setSysDesignScore(null);
      setCodingScore(null);
      setCommScore(null);

      // Track missing/defaulted fields for UI highlighting
      const missing: string[] = [];
      if (!extractedCandidate.company || extractedCandidate.company === 'Independent') missing.push('company');
      if (!extractedCandidate.skills || extractedCandidate.skills.length === 0) missing.push('skills');
      if (!extractedCandidate.bio) missing.push('bio');
      if (!extractedCandidate.public_presence) missing.push('public_presence');
      setDefaultedFields(missing);

      // Switch to review mode tab
      setMode('manual');
    } catch (err: any) {
      setUploadError(err.message || 'Resume extraction failed. Please try again or fill the form manually.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !role) return;

    const skillsArray = skills.split(',').map((s) => s.trim()).filter(Boolean);

    if (uploadedCandidateId) {
      // Recruiter edited an uploaded / existing candidate -> Issue UPDATE request
      try {
        const updatedCandidate = await updateCandidate(uploadedCandidateId, {
          full_name: fullName,
          current_role: role,
          company: company || 'Independent',
          years_experience: Number(yoe),
          skills: skillsArray,
          bio,
          mentoring_signals: mentoringSignals,
          communication_signals: commSignals,
          collaboration_signals: collabSignals,
          public_presence: publicPresence,
          referral_notes: referralNotes,
          system_design_score: sysDesignScore,
          coding_score: codingScore,
          communication_score: commScore
        });

        onAdd(updatedCandidate);
        onClose();
      } catch (err: any) {
        setUploadError(err.message || 'Failed to save updated candidate.');
      }
    } else {
      // Manual creation without file upload
      const newCandidate: Candidate = {
        id: `custom-${Date.now()}`,
        full_name: fullName,
        current_role: role,
        company: company || 'Independent',
        years_experience: Number(yoe),
        skills: skillsArray,
        bio,
        mentoring_signals: mentoringSignals,
        communication_signals: commSignals,
        collaboration_signals: collabSignals,
        public_presence: publicPresence,
        referral_notes: referralNotes,
        system_design_score: sysDesignScore ?? 75,
        coding_score: codingScore ?? 75,
        communication_score: commScore ?? 80,
        needs_assessment: sysDesignScore == null || codingScore == null
      };

      onAdd(newCandidate);
      onClose();
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
    }}>
      <div className="card" style={{ width: '520px', background: '#1e293b', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0 }}>
            {editingCandidate ? `Record Assessment — ${editingCandidate.full_name}` : 'Add Candidate Profile'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.2rem' }}
          >
            ✕
          </button>
        </div>

        {/* Mode Selector Tabs */}
        {!editingCandidate && (
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid #334155', paddingBottom: '0.5rem' }}>
            <button
              type="button"
              className="btn"
              onClick={() => setMode('manual')}
              style={{
                flex: 1,
                background: mode === 'manual' ? 'var(--accent-blue)' : '#0f172a',
                color: mode === 'manual' ? '#fff' : '#94a3b8',
                border: '1px solid var(--border-color)',
                fontSize: '0.85rem'
              }}
            >
              {uploadedCandidateId ? '✏ Review & Edit Extracted Candidate' : '✏ Fill Manually'}
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => setMode('upload')}
              style={{
                flex: 1,
                background: mode === 'upload' ? 'var(--accent-blue)' : '#0f172a',
                color: mode === 'upload' ? '#fff' : '#94a3b8',
                border: '1px solid var(--border-color)',
                fontSize: '0.85rem'
              }}
            >
              📄 Upload Resume (PDF / DOCX)
            </button>
          </div>
        )}

        {uploadError && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#fca5a5',
            padding: '0.6rem 0.8rem',
            borderRadius: '4px',
            marginBottom: '1rem',
            fontSize: '0.85rem'
          }}>
            ⚠️ {uploadError}
          </div>
        )}

        {mode === 'upload' && !editingCandidate ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0.5rem 0' }}>
            <div style={{
              border: '2px dashed var(--border-color)',
              borderRadius: '6px',
              padding: '1.5rem',
              textAlign: 'center',
              background: '#0f172a'
            }}>
              <p style={{ color: '#cbd5e1', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                Select candidate resume (PDF or DOCX, max 5MB)
              </p>
              <input
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleFileChange}
                style={{ marginTop: '0.5rem', color: '#94a3b8', fontSize: '0.85rem' }}
              />
            </div>

            {selectedFile && (
              <p style={{ fontSize: '0.8rem', color: 'var(--accent-blue)', margin: 0 }}>
                Selected file: <strong>{selectedFile.name}</strong> ({(selectedFile.size / 1024).toFixed(1)} KB)
              </p>
            )}

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button type="button" className="btn" style={{ background: '#334155' }} onClick={onClose}>
                Cancel
              </button>
              <button
                type="button"
                className="btn"
                onClick={handleUploadResume}
                disabled={!selectedFile || isUploading}
                style={{ opacity: isUploading || !selectedFile ? 0.6 : 1 }}
              >
                {isUploading ? 'Extracting candidate data with Gemini...' : 'Extract & Parse Resume'}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {needsAssessment && (
              <div style={{
                background: 'rgba(245, 158, 11, 0.15)',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                color: '#fcd34d',
                padding: '0.6rem 0.8rem',
                borderRadius: '4px',
                fontSize: '0.85rem'
              }}>
                <strong>⚠️ Pending Assessment Flag Active:</strong> Fill both System Design and Coding Test scores below to clear the pending assessment flag.
              </div>
            )}

            {/* Assessment Score Fields */}
            <div style={{
              background: '#0f172a',
              border: `1px solid ${needsAssessment ? '#f59e0b' : 'var(--border-color)'}`,
              padding: '0.75rem',
              borderRadius: '4px',
              marginTop: '0.25rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: needsAssessment ? '#fcd34d' : '#fff' }}>
                  Record Assessment Scores {needsAssessment && '⚠️ (Requires Assessment)'}
                </span>
                {needsAssessment ? (
                  <span style={{ fontSize: '0.7rem', color: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)', padding: '0.1rem 0.4rem', borderRadius: '3px' }}>
                    Pending
                  </span>
                ) : (
                  <span style={{ fontSize: '0.7rem', color: '#4ade80', background: 'rgba(74, 222, 128, 0.1)', padding: '0.1rem 0.4rem', borderRadius: '3px' }}>
                    ✓ Verified
                  </span>
                )}
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label style={{ fontSize: '0.7rem', color: '#94a3b8' }}>System Design (0-100)</label>
                  <input
                    type="number"
                    placeholder="Not Set"
                    value={sysDesignScore ?? ''}
                    onChange={(e) => setSysDesignScore(e.target.value !== '' ? Number(e.target.value) : null)}
                    style={{ width: '100%', padding: '0.35rem', background: '#1e293b', border: '1px solid var(--border-color)', color: '#fff', borderRadius: '3px', fontSize: '0.8rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Coding Test (0-100)</label>
                  <input
                    type="number"
                    placeholder="Not Set"
                    value={codingScore ?? ''}
                    onChange={(e) => setCodingScore(e.target.value !== '' ? Number(e.target.value) : null)}
                    style={{ width: '100%', padding: '0.35rem', background: '#1e293b', border: '1px solid var(--border-color)', color: '#fff', borderRadius: '3px', fontSize: '0.8rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Communication (0-100)</label>
                  <input
                    type="number"
                    placeholder="Not Set"
                    value={commScore ?? ''}
                    onChange={(e) => setCommScore(e.target.value !== '' ? Number(e.target.value) : null)}
                    style={{ width: '100%', padding: '0.35rem', background: '#1e293b', border: '1px solid var(--border-color)', color: '#fff', borderRadius: '3px', fontSize: '0.8rem' }}
                  />
                </div>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.2rem', display: 'block' }}>
                Full Name *
              </label>
              <input
                placeholder="Full Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                style={{ width: '100%', padding: '0.5rem', background: '#0f172a', border: '1px solid var(--border-color)', color: '#fff', borderRadius: '4px' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.2rem', display: 'block' }}>
                  Current Role *
                </label>
                <input
                  placeholder="Current Role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  required
                  style={{ width: '100%', padding: '0.5rem', background: '#0f172a', border: '1px solid var(--border-color)', color: '#fff', borderRadius: '4px' }}
                />
              </div>

              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.2rem', display: 'block' }}>
                  Company {defaultedFields.includes('company') && <span style={{ color: '#f59e0b' }}>(Not found in resume)</span>}
                </label>
                <input
                  placeholder="Company"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    background: '#0f172a',
                    border: `1px solid ${defaultedFields.includes('company') ? '#f59e0b' : 'var(--border-color)'}`,
                    color: '#fff',
                    borderRadius: '4px'
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.2rem', display: 'block' }}>
                Years of Experience
              </label>
              <input
                type="number"
                placeholder="Years of Experience"
                value={yoe}
                onChange={(e) => setYoe(Number(e.target.value))}
                style={{ width: '100%', padding: '0.5rem', background: '#0f172a', border: '1px solid var(--border-color)', color: '#fff', borderRadius: '4px' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.2rem', display: 'block' }}>
                Skills (comma separated) {defaultedFields.includes('skills') && <span style={{ color: '#f59e0b' }}>(None detected)</span>}
              </label>
              <input
                placeholder="Comma separated skills (e.g. Python, React, AWS)"
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  background: '#0f172a',
                  border: `1px solid ${defaultedFields.includes('skills') ? '#f59e0b' : 'var(--border-color)'}`,
                  color: '#fff',
                  borderRadius: '4px'
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.2rem', display: 'block' }}>
                Bio / Summary Signals {defaultedFields.includes('bio') && <span style={{ color: '#f59e0b' }}>(Not found in resume)</span>}
              </label>
              <textarea
                placeholder="Bio / Summary signals..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  background: '#0f172a',
                  border: `1px solid ${defaultedFields.includes('bio') ? '#f59e0b' : 'var(--border-color)'}`,
                  color: '#fff',
                  borderRadius: '4px',
                  height: '70px'
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.2rem', display: 'block' }}>
                Public Presence (GitHub / LinkedIn)
              </label>
              <input
                placeholder="e.g. https://github.com/username"
                value={publicPresence}
                onChange={(e) => setPublicPresence(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', background: '#0f172a', border: '1px solid var(--border-color)', color: '#fff', borderRadius: '4px' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
              <button type="button" className="btn" style={{ background: '#334155' }} onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn">
                {editingCandidate ? 'Save Assessment' : uploadedCandidateId ? 'Confirm & Save Candidate' : 'Save Candidate'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};