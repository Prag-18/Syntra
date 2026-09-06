import json
import os
from database.connection import get_db_session
from database.models import CandidateModel, JobDescriptionModel
# Import your Base model and engine alongside CandidateModel
from database.models import Base, CandidateModel  # adjust imports based on your file structure
from database.connection import engine  # adjust path to where your SQLAlchemy engine is defined

def seed_data():
    # Automatically create missing database tables
    Base.metadata.create_all(bind=engine)
    base_dir = os.path.dirname(os.path.abspath(__file__))
    candidates_path = os.path.join(base_dir, "candidates.json")
    
    if not os.path.exists(candidates_path):
        print("No seed file found.")
        return

    with open(candidates_path, "r") as f:
        data = json.load(f)

    candidates_list = data.get("candidates", [])
    sample_jd = data.get("sample_jd", "")

    with get_db_session() as session:
        # Seed candidates
        for c in candidates_list:
            ext_id = c.get("id")
            existing = session.query(CandidateModel).filter_by(external_id=ext_id).first()
            if not existing:
                cand = CandidateModel(
                    external_id=ext_id,
                    full_name=c["full_name"],
                    current_role=c["current_role"],
                    company=c["company"],
                    years_experience=c["years_experience"],
                    skills=c.get("skills", []),
                    bio=c.get("bio", ""),
                    mentoring_signals=c.get("mentoring_signals", ""),
                    communication_signals=c.get("communication_signals", ""),
                    collaboration_signals=c.get("collaboration_signals", ""),
                    public_presence=c.get("public_presence", ""),
                    referral_notes=c.get("referral_notes", ""),
                    system_design_score=c.get("system_design_score"),
                    coding_score=c.get("coding_score"),
                    communication_score=c.get("communication_score")
                )
                session.add(cand)

        # Seed sample JD
        existing_jd = session.query(JobDescriptionModel).filter_by(title="Senior Full-Stack Payments Lead").first()
        if not existing_jd and sample_jd:
            jd = JobDescriptionModel(
                title="Senior Full-Stack Payments Lead",
                raw_text=sample_jd,
                must_have_skills=["Python", "Go", "React", "Distributed Systems", "Payments"],
                nice_to_have_skills=["Kafka", "Redis", "Fintech"]
            )
            session.add(jd)

        print("Seeding completed successfully.")

if __name__ == "__main__":
    seed_data()