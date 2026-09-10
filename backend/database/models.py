import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Text, Boolean, DateTime, ForeignKey, Numeric, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID, ARRAY, JSONB
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

class CandidateModel(Base):
    __tablename__ = "candidates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    external_id = Column(String(64), unique=True, nullable=True)
    full_name = Column(String(255), nullable=False)
    current_role = Column(String(255), nullable=False)
    company = Column(String(255), nullable=False)
    years_experience = Column(Integer, default=0)
    skills = Column(ARRAY(Text), default=[])
    bio = Column(Text, nullable=True)
    mentoring_signals = Column(Text, nullable=True)
    communication_signals = Column(Text, nullable=True)
    collaboration_signals = Column(Text, nullable=True)
    public_presence = Column(Text, nullable=True)
    referral_notes = Column(Text, nullable=True)
    system_design_score = Column(Integer, nullable=True)
    coding_score = Column(Integer, nullable=True)
    communication_score = Column(Integer, nullable=True)
    github_stars = Column(Integer, default=0)
    linkedin_endorsements = Column(Integer, default=0)
    source = Column(String(100), default="direct")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": str(self.id),
            "external_id": self.external_id,
            "full_name": self.full_name,
            "current_role": self.current_role,
            "company": self.company,
            "years_experience": self.years_experience,
            "skills": self.skills or [],
            "bio": self.bio or "",
            "mentoring_signals": self.mentoring_signals or "",
            "communication_signals": self.communication_signals or "",
            "collaboration_signals": self.collaboration_signals or "",
            "public_presence": self.public_presence or "",
            "referral_notes": self.referral_notes or "",
            "system_design_score": self.system_design_score,
            "coding_score": self.coding_score,
            "communication_score": self.communication_score
        }

class JobDescriptionModel(Base):
    __tablename__ = "job_descriptions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(255), nullable=False)
    raw_text = Column(Text, nullable=False)
    extracted_intent = Column(JSONB, nullable=True)
    must_have_skills = Column(ARRAY(Text), default=[])
    nice_to_have_skills = Column(ARRAY(Text), default=[])
    status = Column(String(50), default="active")
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": str(self.id),
            "title": self.title,
            "raw_text": self.raw_text,
            "extracted_intent": self.extracted_intent,
            "must_have_skills": self.must_have_skills or [],
            "nice_to_have_skills": self.nice_to_have_skills or [],
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

class RankingRunModel(Base):
    __tablename__ = "ranking_runs"
    __table_args__ = (
        CheckConstraint("status IN ('pending', 'running', 'complete', 'failed')", name="check_ranking_run_status"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    jd_id = Column(UUID(as_uuid=True), ForeignKey("job_descriptions.id", ondelete="CASCADE"), nullable=False)
    phase3_scores = Column(JSONB, nullable=False, default=dict)
    status = Column(String(50), nullable=False, default="pending")
    duration_ms = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    job_description = relationship("JobDescriptionModel", backref="ranking_runs")

    def to_dict(self):
        return {
            "id": str(self.id),
            "jd_id": str(self.jd_id),
            "phase3_scores": self.phase3_scores,
            "status": self.status,
            "duration_ms": self.duration_ms,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

class RankedResultModel(Base):
    __tablename__ = "ranked_results"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    run_id = Column(UUID(as_uuid=True), ForeignKey("ranking_runs.id", ondelete="CASCADE"), nullable=False)
    candidate_id = Column(UUID(as_uuid=True), ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False)
    final_rank = Column(Integer, nullable=False)
    composite_score = Column(Numeric(5, 2), nullable=False)
    tier = Column(String(50), nullable=False)
    headline = Column(String(255), nullable=True)
    rationale = Column(Text, nullable=True)
    key_strengths = Column(ARRAY(Text), default=[])
    key_risks = Column(ARRAY(Text), default=[])
    interview_questions = Column(ARRAY(Text), default=[])
    dim_skills = Column(Numeric(5, 2), nullable=True)
    dim_trajectory = Column(Numeric(5, 2), nullable=True)
    dim_leadership = Column(Numeric(5, 2), nullable=True)
    dim_domain = Column(Numeric(5, 2), nullable=True)
    dim_communication = Column(Numeric(5, 2), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    run = relationship("RankingRunModel", backref="ranked_results")
    candidate = relationship("CandidateModel", backref="ranked_results")

    def to_dict(self):
        return {
            "id": str(self.id),
            "run_id": str(self.run_id),
            "candidate_id": str(self.candidate_id),
            "final_rank": self.final_rank,
            "composite_score": float(self.composite_score) if self.composite_score is not None else None,
            "tier": self.tier,
            "headline": self.headline,
            "rationale": self.rationale,
            "key_strengths": self.key_strengths or [],
            "key_risks": self.key_risks or [],
            "interview_questions": self.interview_questions or [],
            "dim_scores": {
                "skills": float(self.dim_skills) if self.dim_skills is not None else 0.0,
                "trajectory": float(self.dim_trajectory) if self.dim_trajectory is not None else 0.0,
                "leadership": float(self.dim_leadership) if self.dim_leadership is not None else 0.0,
                "domain": float(self.dim_domain) if self.dim_domain is not None else 0.0,
                "communication": float(self.dim_communication) if self.dim_communication is not None else 0.0,
            },
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

class RecruiterFeedbackModel(Base):
    __tablename__ = "recruiter_feedback"
    __table_args__ = (
        CheckConstraint("decision IN ('accept', 'maybe', 'reject')", name="check_recruiter_feedback_decision"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    run_id = Column(UUID(as_uuid=True), ForeignKey("ranking_runs.id", ondelete="CASCADE"), nullable=True)
    candidate_id = Column(UUID(as_uuid=True), ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False)
    decision = Column(String(20), nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    candidate = relationship("CandidateModel", backref="feedback_entries")
    ranking_run = relationship("RankingRunModel", backref="feedback_entries")

    def to_dict(self):
        return {
            "id": str(self.id),
            "run_id": str(self.run_id) if self.run_id else None,
            "candidate_id": str(self.candidate_id),
            "decision": self.decision,
            "notes": self.notes or "",
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
