import sys
import os
import io
import uuid
import pytest
import docx
from unittest.mock import patch, AsyncMock

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from api.main import app
from database.connection import get_db_session
from database.models import CandidateModel
from core.resume_parser import (
    extract_text_from_pdf,
    extract_text_from_docx,
    extract_candidate_from_resume,
    ResumeParseError,
    GeminiServiceError
)
from core.candidate_profiler import profile_candidate

client = TestClient(app)

def create_sample_docx_bytes(text: str) -> bytes:
    doc = docx.Document()
    doc.add_paragraph(text)
    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()

def test_successful_pdf_upload():
    fake_resume_text = "Jane Doe\nSenior Backend Engineer at TechCorp\n7 years experience\nSkills: Python, Go, Distributed Systems"
    
    mock_extracted_cand = {
        "full_name": "Jane Doe",
        "current_role": "Senior Backend Engineer",
        "company": "TechCorp",
        "years_experience": 7,
        "skills": ["Python", "Go", "Distributed Systems"],
        "bio": "Senior Engineer with 7 years building high scale backend engines.",
        "mentoring_signals": "Mentored 4 junior engineers",
        "communication_signals": "Clear speaker",
        "collaboration_signals": "Cross team lead",
        "public_presence": "https://github.com/janedoe",
        "referral_notes": "",
        "system_design_score": None,
        "coding_score": None,
        "communication_score": None,
        "needs_assessment": True
    }

    with patch("api.main.extract_text_from_pdf", return_value=fake_resume_text), \
         patch("api.main.extract_candidate_from_resume", new_callable=AsyncMock, return_value=mock_extracted_cand):
        
        response = client.post(
            "/candidates/upload",
            files={"file": ("jane_resume.pdf", b"%PDF-1.4 test bytes", "application/pdf")}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["full_name"] == "Jane Doe"
        assert data["current_role"] == "Senior Backend Engineer"
        assert data["company"] == "TechCorp"
        assert data["years_experience"] == 7
        assert "Python" in data["skills"]
        assert data["needs_assessment"] is True
        assert data["system_design_score"] is None
        assert data["coding_score"] is None
        assert data["communication_score"] is None

        cand_id = uuid.UUID(data["id"])
        with get_db_session() as db:
            db_cand = db.query(CandidateModel).filter_by(id=cand_id).first()
            assert db_cand is not None
            assert db_cand.full_name == "Jane Doe"
            assert db_cand.needs_assessment is True
            assert db_cand.system_design_score is None

def test_successful_docx_upload():
    docx_bytes = create_sample_docx_bytes("Alex Smith\nLead Architect at Acme\n10 years experience\nSkills: Java, Rust")

    mock_extracted_cand = {
        "full_name": "Alex Smith",
        "current_role": "Lead Architect",
        "company": "Acme",
        "years_experience": 10,
        "skills": ["Java", "Rust"],
        "bio": "Lead Architect at Acme",
        "mentoring_signals": "",
        "communication_signals": "",
        "collaboration_signals": "",
        "public_presence": "",
        "referral_notes": "",
        "system_design_score": None,
        "coding_score": None,
        "communication_score": None,
        "needs_assessment": True
    }

    with patch("api.main.extract_candidate_from_resume", new_callable=AsyncMock, return_value=mock_extracted_cand):
        response = client.post(
            "/candidates/upload",
            files={"file": ("alex_resume.docx", docx_bytes, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["full_name"] == "Alex Smith"
        assert data["current_role"] == "Lead Architect"
        assert data["needs_assessment"] is True

def test_oversized_file_rejection():
    # 5MB + 100 bytes
    large_bytes = b"0" * (5 * 1024 * 1024 + 100)
    response = client.post(
        "/candidates/upload",
        files={"file": ("large_file.pdf", large_bytes, "application/pdf")}
    )

    assert response.status_code == 422
    assert "exceeds the 5mb limit" in response.json()["detail"].lower()

def test_wrong_file_type_rejection():
    response = client.post(
        "/candidates/upload",
        files={"file": ("resume.txt", b"plain text content", "text/plain")}
    )

    assert response.status_code == 422
    assert "invalid file format" in response.json()["detail"].lower()

def test_scanned_empty_pdf_rejection():
    with patch("api.main.extract_text_from_pdf", side_effect=ResumeParseError("Scanned or image-only PDF detected with no extractable text. Please fill the candidate form manually.", status_code=422)):
        response = client.post(
            "/candidates/upload",
            files={"file": ("scanned_image.pdf", b"%PDF-1.4 scanned", "application/pdf")}
        )

        assert response.status_code == 422
        assert "scanned or image-only pdf" in response.json()["detail"].lower()

def test_gemini_extraction_failure_handling():
    with get_db_session() as db:
        initial_count = db.query(CandidateModel).count()

    with patch("api.main.extract_text_from_pdf", return_value="Sample text"), \
         patch("api.main.extract_candidate_from_resume", side_effect=GeminiServiceError("Gemini service timeout", status_code=502)):

        response = client.post(
            "/candidates/upload",
            files={"file": ("candidate.pdf", b"%PDF-1.4 test", "application/pdf")}
        )

        assert response.status_code == 502
        assert "gemini service timeout" in response.json()["detail"].lower()

    # Ensure no candidate record was created in DB on failure
    with get_db_session() as db:
        final_count = db.query(CandidateModel).count()
        assert final_count == initial_count

def test_incomplete_resume_defaulting():
    fake_sparse_text = "John Resume"
    mock_sparse_cand = {
        "full_name": "John",
        "current_role": "Candidate",
        "company": "Independent",
        "years_experience": 0,
        "skills": [],
        "bio": "",
        "mentoring_signals": "",
        "communication_signals": "",
        "collaboration_signals": "",
        "public_presence": "",
        "referral_notes": "",
        "system_design_score": None,
        "coding_score": None,
        "communication_score": None,
        "needs_assessment": True
    }

    with patch("api.main.extract_text_from_pdf", return_value=fake_sparse_text), \
         patch("api.main.extract_candidate_from_resume", new_callable=AsyncMock, return_value=mock_sparse_cand):

        response = client.post(
            "/candidates/upload",
            files={"file": ("sparse.pdf", b"%PDF-1.4 test", "application/pdf")}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["full_name"] == "John"
        assert data["company"] == "Independent"
        assert data["years_experience"] == 0
        assert data["skills"] == []
        assert data["needs_assessment"] is True

def test_candidate_profiler_skills_dimension_fairness_guard():
    # Test candidate with needs_assessment=True and null scores
    unassessed_candidate = {
        "full_name": "Target Candidate",
        "current_role": "Senior Engineer",
        "company": "Stripe",
        "years_experience": 5,
        "skills": ["Python", "Go", "Distributed Systems"],
        "bio": "Backend lead",
        "system_design_score": None,
        "coding_score": None,
        "communication_score": None,
        "needs_assessment": True
    }

    profiled = profile_candidate(unassessed_candidate, target_keywords=["Python", "Go"])
    
    dim_scores = profiled["dim_scores"]
    # Skills dimension score must equal domain depth score (no arbitrary test score penalty)
    assert dim_scores["skills"] == dim_scores["domain"]
    assert dim_scores["skills"] > 0

    # Explicit score test: when coding_score=0 (failed test), confirm explicit score 0 is preserved
    assessed_candidate_zero = {
        "full_name": "Tested Candidate",
        "current_role": "Engineer",
        "company": "Startup",
        "years_experience": 3,
        "skills": ["Python"],
        "bio": "Developer",
        "system_design_score": 60,
        "coding_score": 0,
        "communication_score": 70,
        "needs_assessment": False
    }

    profiled_zero = profile_candidate(assessed_candidate_zero)
    # (60 + 0) / 2 = 30.0 (not falsey bumped to 70!)
    assert profiled_zero["dim_scores"]["skills"] == 30.0

def test_candidate_update_endpoint():
    # Create a candidate via upload mock first
    mock_extracted = {
        "full_name": "Editable Candidate",
        "current_role": "Junior Dev",
        "company": "Old Corp",
        "years_experience": 1,
        "skills": ["JavaScript"],
        "bio": "Early career",
        "mentoring_signals": "",
        "communication_signals": "",
        "collaboration_signals": "",
        "public_presence": "",
        "referral_notes": "",
        "system_design_score": None,
        "coding_score": None,
        "communication_score": None,
        "needs_assessment": True
    }

    with patch("api.main.extract_text_from_pdf", return_value="Editable Candidate"), \
         patch("api.main.extract_candidate_from_resume", new_callable=AsyncMock, return_value=mock_extracted):

        res_upload = client.post(
            "/candidates/upload",
            files={"file": ("edit_me.pdf", b"%PDF-1.4 test", "application/pdf")}
        )
        assert res_upload.status_code == 200
        uploaded_data = res_upload.json()
        cand_id = uploaded_data["id"]

    # Now issue PUT /candidates/{id} to edit candidate fields
    update_payload = {
        "company": "New Tech Leader Inc",
        "years_experience": 4,
        "skills": ["JavaScript", "TypeScript", "React"],
        "system_design_score": 85,
        "coding_score": 90,
        "needs_assessment": False
    }

    res_update = client.put(f"/candidates/{cand_id}", json=update_payload)
    assert res_update.status_code == 200
    updated_data = res_update.json()

    assert updated_data["id"] == cand_id
    assert updated_data["company"] == "New Tech Leader Inc"
    assert updated_data["years_experience"] == 4
    assert "TypeScript" in updated_data["skills"]
    assert updated_data["system_design_score"] == 85
    assert updated_data["coding_score"] == 90
    assert updated_data["needs_assessment"] is False
