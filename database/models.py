import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Text, Boolean, DateTime, ForeignKey, Numeric
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