# Syntra — AI Candidate Ranking Engine

Syntra is an AI-powered talent intelligence and candidate ranking platform that evaluates, profiles, and ranks candidate pools against job descriptions. Built with **FastAPI**, **React + TypeScript**, **PostgreSQL**, and **Google Gemini**, Syntra delivers transparent scoring, deep rationales, risk analysis, interview question generation, persistent run histories, resume parsing (PDF/DOCX), recruiter-customizable scoring weights, and real-time feedback loops.

---

## ⚡ Key Features

- **4-Phase Ranking Pipeline**: Combines deterministic multi-dimensional signal profiling with semantic scoring, custom dimension weights, and LLM holistic re-ranking.
- **Resume Upload & Automatic Extraction (PDF / DOCX)**: Upload candidate resumes up to 5MB to automatically extract candidate bio, experience, skills, and qualitative leadership/communication signals into the candidate pool.
- **Dynamic & Recruiter-Editable Scoring Weights**: AI suggests initial dimension weights with clear per-dimension explanations (`weight_rationale`). Recruiters can interactively adjust weights with proportional rebalancing sliders (always summing to 100%), with full persistence per run.
- **Candidate Assessment Tracking & Tier Capping**: Track technical assessment scores (`system_design_score`, `coding_score`, `communication_score`). Unassessed candidates (`needs_assessment = true`) have their "Top pick" tier capped to "Worth interviewing" with audit notes until assessments are completed.
- **Optimized Two-Step Pipeline**: Pre-parse JDs via `POST /jd/parse` to persist the job description and extract intent. Reusing `jd_id` in `POST /rank` bypasses redundant Gemini Phase 1 calls.
- **JD Intent Intelligence**: Uses Gemini AI to parse job descriptions into structured requirements (must-haves, nice-to-haves, seniority, domain, soft signals, dimension weights).
- **5-Dimensional Candidate Profiling**: Evaluates candidates across **Skills**, **Trajectory**, **Leadership**, **Domain Relevance**, and **Communication**.
- **Transparent & Explainable AI**: Generates comprehensive match rationales, identified risks/red flags (with special probing flags for unassessed candidates), and tailored technical interview questions.
- **Recruiter Feedback Loop**: Enables hiring teams to tag decisions (`accept`, `maybe`, `reject`), log review notes, and track historical recruiter sentiment across runs.
- **Ranking Run History & Audit Trail**: Full historical ranking records stored in PostgreSQL with filtering by status (`pending`, `running`, `complete`, `failed`), candidate count, latency metrics, weight snapshots (AI vs. Applied), assessment snapshots, and one-click JD + weight reuse in the live dashboard.
- **Modern Dark-Mode Dashboard**: Sleek React UI with tabbed navigation (Live Dashboard & History View), real-time pipeline status progression, dimension grids, signal badges, and scoring weight controls.

---

## 🏗️ Architecture & Pipeline

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                        React + TypeScript Dashboard                         │
│   (Live Dashboard, Scoring Weights Sliders, Run History, Feedback UI)       │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │  HTTP / REST
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                               FastAPI Backend                               │
├─────────────────────────────────────────────────────────────────────────────┤
│  Resume Parser (core/resume_parser.py)                                      │
│  - Extracts text from PDF / DOCX & extracts candidate profile via Gemini    │
│                                                                             │
│  Phase 1: JD Intelligence (core/jd_intelligence.py)                         │
│  - Extracts role intent, must/nice-to-haves, seniority, AI weights & reasons│
│                                                                             │
│  Phase 2: Candidate Profiling (core/candidate_profiler.py)                  │
│  - 5-dimension heuristic scoring (0-100), handles partial/zero assessments  │
│                                                                             │
│  Phase 3: Semantic Matcher (core/semantic_matcher.py)                       │
│  - Weighted composite match score, tier assignment & unassessed tier caps   │
│                                                                             │
│  Phase 4: Holistic LLM Ranker (core/llm_ranker.py)                          │
│  - Gemini LLM re-ranking, assessment risk flags, synthesis & questions      │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            PostgreSQL Database                              │
│                                                                             │
│  - candidates         : Profile metrics, assessment scores, needs_assessment│
│  - job_descriptions   : Raw text, parsed intent, must/nice-to-have skills   │
│  - ranking_runs       : Status, duration, ai_weights, applied_weights       │
│  - ranked_results     : Final ranks, composite scores, dimensional scores,  │
│                         rationales, risks, needs_assessment_at_rank snapshot│
│  - recruiter_feedback : Recruiter decision tags (accept/maybe/reject)       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📊 Ranking Dimensions

Candidates are evaluated across five core pillars before final LLM synthesis. Weights are dynamically initialized by Gemini based on the role and can be customized by recruiters:

| Dimension | Default / AI-Driven | Description |
| :--- | :---: | :--- |
| **Skills Match** | ~`30%` | Direct overlap of technical skills. If verified assessments exist (`system_design_score`, `coding_score`), they are evaluated directly; otherwise estimated via resume domain depth. |
| **Trajectory** | ~`20%` | Career progression velocity, promotions, seniority progression, and tier of experience. |
| **Leadership** | ~`20%` | Mentorship signals, team leadership, architecture ownership, and guild participation. |
| **Domain Fit** | ~`15%` | Industry background (e.g., Payments, Fintech, Distributed Systems, High-throughput). |
| **Communication** | ~`15%` | Technical writing, documentation, public speaking, OSS, and clarity signals (plus communication assessment if recorded). |

---

## 🗄️ Database Schema & Entities

The PostgreSQL schema is structured for full relational integrity, auditability, and historical accuracy:

```text
candidates (id, external_id, full_name, current_role, company, years_experience, skills,
            system_design_score, coding_score, communication_score, needs_assessment, ...)
    │
    ├─────────────┬─────────────────────────────────────────────────┐
    │             │                                                 │
    ▼             ▼                                                 ▼
job_descriptions ───► ranking_runs ───────────────► ranked_results ───► recruiter_feedback
(id, raw_text,        (id, jd_id, status,          (id, run_id,         (id, run_id,
 extracted_intent,     phase3_scores,               candidate_id,        candidate_id,
 must_have_skills,     duration_ms,                 final_rank,          decision,
 nice_to_have_skills)  ai_weights,                  composite_score,     notes,
                       applied_weights,             dim_scores,          created_at)
                       weights_overridden, ...)     needs_assessment_at_rank, ...)
```

- **`candidates`**: Master candidate pool with skill arrays, experience, qualitative signals, assessment scores (`0-100`), and `needs_assessment` flag.
- **`job_descriptions`**: Persisted job descriptions with extracted intent, weight rationales, and required skill taxonomies.
- **`ranking_runs`**: Tracks pipeline execution lifecycle (`pending` ➔ `running` ➔ `complete` / `failed`), duration, `ai_weights` (AI suggestions), `applied_weights` (actual weights used), and `weights_overridden` flag.
- **`ranked_results`**: Individual candidate scores per run, including final rank, composite score, tier (`Top pick`, `Worth interviewing`, `Not recommended`), 5D breakdown, strengths, risks, interview questions, and the `needs_assessment_at_rank` snapshot.
- **`recruiter_feedback`**: Decision logs (`accept`, `maybe`, `reject`) linked to candidates and runs with optional review notes.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite, CSS Variables & Design System
- **Backend**: Python 3.10+, FastAPI, Uvicorn, SQLAlchemy 2.0, Pydantic v2, HTTPX, PyPDF2, python-docx
- **Database**: PostgreSQL with `psycopg2-binary`
- **AI / LLM**: Google Gemini REST API (`gemini-3.6-flash` / `gemini-2.5-flash`)
- **Testing**: `pytest`, `pytest-asyncio`, `httpx` (40 automated tests)

---

## 📁 Repository Structure

```text
Syntra/
├── backend/
│   ├── api/                       # FastAPI application routes and server
│   │   ├── __init__.py
│   │   └── main.py                # API endpoints, request models, validation & CORS
│   ├── core/                      # 4-Phase AI ranking engine & parsers
│   │   ├── __init__.py
│   │   ├── config.py              # Gemini API keys & model settings
│   │   ├── jd_intelligence.py     # Phase 1: JD intent extraction & weight rationales
│   │   ├── candidate_profiler.py  # Phase 2: 5-dimension scoring & tier cap
│   │   ├── semantic_matcher.py    # Phase 3: Composite ranking & shortlisting
│   │   ├── llm_ranker.py          # Phase 4: Gemini LLM re-ranking & questions
│   │   └── resume_parser.py       # PDF/DOCX resume extraction via Gemini
│   ├── database/                  # SQLAlchemy ORM layer, schema & migrations
│   │   ├── __init__.py
│   │   ├── connection.py          # Database engine and session handlers
│   │   ├── models.py              # Schema models (Candidates, Runs, Results, Feedback)
│   │   ├── schema.sql             # Raw PostgreSQL schema definition
│   │   ├── migrations/            # Incremental SQL migration scripts
│   │   │   ├── 001_add_needs_assessment_at_rank.sql
│   │   │   └── 002_add_weight_persistence.sql
│   │   └── seeds/                 # Seed data and population script
│   │       ├── candidates.json    # Default candidate dataset & sample JD
│   │       └── seed.py            # Database seeder
│   └── tests/                     # Comprehensive automated backend test suite
│       ├── test_assessment_followup.py  # Zero-scores, partial assessments, tier cap & snapshots
│       ├── test_weights_persistence.py  # Weight overrides, validation, normalization & persistence
│       ├── test_resume_upload.py        # PDF/DOCX resume parsing and profile creation
│       ├── test_rank_persistence.py     # Pipeline execution, persistence & fallback tests
│       └── test_history_endpoints.py    # Run history, filtering & feedback tests
├── frontend/                      # React + TypeScript web application
│   ├── src/
│   │   ├── components/            # UI components (ResultCard, ScoringWeightsPanel, etc.)
│   │   ├── data/                  # Default fallback candidates & JDs
│   │   ├── lib/                   # API client helper functions & client scoring mirror
│   │   ├── types/                 # TypeScript interfaces
│   │   ├── App.tsx                # Main application view (Tabs & State)
│   │   ├── index.css              # Global styles & design tokens
│   │   └── main.tsx               # App entry point
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── .env.example                   # Environment variable template
├── requirements.txt               # Python package dependencies
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- **Python 3.10+**
- **Node.js 18+** & **npm**
- **PostgreSQL** instance running locally or hosted
- **Google Gemini API Key** ([Get a key from Google AI Studio](https://aistudio.google.com/app/apikey))

---

### 1. Environment Setup

Copy `.env.example` to `.env` in the root directory:

```bash
cp .env.example .env
```

Configure the environment variables in `.env`:

```env
# Google Gemini API Key
GEMINI_API_KEY=your_gemini_api_key_here

# Gemini Model (optional, defaults to gemini-3.6-flash)
GEMINI_MODEL=gemini-3.6-flash

# PostgreSQL connection string
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/syntra
```

---

### 2. Backend Setup

1. **Install Python dependencies:**

   ```bash
   pip install -r requirements.txt
   ```

2. **Initialize and seed the PostgreSQL database:**

   Make sure your PostgreSQL server is running and the database specified in `DATABASE_URL` (e.g., `syntra`) exists, then execute the seeder:

   ```bash
   python -m backend.database.seeds.seed
   ```
   *(or run `cd backend && python -m database.seeds.seed`)*

3. **Start the FastAPI backend server:**

   From the root directory:
   ```bash
   uvicorn backend.api.main:app --reload --port 8000
   ```

   - API Base URL: `http://localhost:8000`
   - Interactive Swagger Docs: `http://localhost:8000/docs`

---

### 3. Frontend Setup

1. **Install frontend dependencies:**

   ```bash
   cd frontend
   npm install
   ```

2. **Run the Vite development server:**

   ```bash
   npm run dev
   ```

3. **Open the web dashboard:**

   Navigate to `http://localhost:5173` in your browser.

---

## 🔌 API Reference

### Health Check
- **`GET /`**
  - Verifies service status and database connection.
  - **Response**:
    ```json
    {
      "status": "online",
      "database": "connected"
    }
    ```

---

### Candidates & Resume Upload
- **`GET /candidates`**
  - Retrieves all active candidate profiles stored in PostgreSQL.

- **`POST /candidates/upload`**
  - Accepts a `.pdf` or `.docx` resume file (up to 5MB) via `multipart/form-data`.
  - Automatically parses text, extracts profile attributes via Gemini, sets `needs_assessment=true`, and saves the candidate to PostgreSQL.

- **`PUT /candidates/{candidate_id}`**
  - Updates candidate details and records assessment scores.
  - **Payload**:
    ```json
    {
      "system_design_score": 88,
      "coding_score": 92,
      "communication_score": 85
    }
    ```
  - *Rule*: Scores must be numbers between `0` and `100` (or `null`). Setting both `system_design_score` and `coding_score` automatically clears `needs_assessment` to `false`. Setting either back to `null` resets `needs_assessment` to `true`.

---

### Parse Job Description
- **`POST /jd/parse`**
  - Parses the job description, persists it in `job_descriptions`, extracts structured intent, suggests AI weights, and generates a `weight_rationale` per dimension.
  - **Payload**:
    ```json
    {
      "jd_text": "We are seeking a Senior Backend Engineer with Go, Kafka, and Kubernetes experience..."
    }
    ```
  - **Response**:
    ```json
    {
      "jd_id": "c8f23b20-67c4-4b53-832f-a9b0c20efb1a",
      "must_have_skills": ["Go", "Kafka", "Kubernetes"],
      "nice_to_have_skills": ["AWS", "gRPC"],
      "seniority_level": "Senior",
      "weights": {
        "skills": 0.35,
        "trajectory": 0.20,
        "leadership": 0.15,
        "domain": 0.15,
        "communication": 0.15
      },
      "weight_rationale": {
        "skills": "Core Go and distributed streaming systems execution required.",
        "trajectory": "Senior level engineering velocity and tenure expected.",
        "leadership": "Cross-team collaboration and mentorship needed.",
        "domain": "High-throughput messaging and cloud infrastructure focus.",
        "communication": "Strong technical documentation and RFC authoring bar."
      }
    }
    ```

---

### Run Candidate Ranking
- **`POST /rank`**
  - Executes the ranking pipeline, records a `RankingRun`, persists `RankedResult` records, and stores applied weights.
  - **Payload Options**:
    - **With `jd_id` (Two-Step Flow - skips redundant Phase 1 Gemini call):**
      ```json
      {
        "jd_id": "c8f23b20-67c4-4b53-832f-a9b0c20efb1a",
        "weights": {
          "skills": 0.40,
          "trajectory": 0.20,
          "leadership": 0.10,
          "domain": 0.15,
          "communication": 0.15
        }
      }
      ```
    - **Direct with `jd_text` (Backward Compatible):**
      ```json
      {
        "jd_text": "Looking for a Staff Payments Engineer...",
        "candidates": []
      }
      ```
  - **Response**:
    ```json
    {
      "status": "success",
      "run_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      "duration_ms": 2450,
      "ai_weights": { "skills": 0.35, "trajectory": 0.20, ... },
      "applied_weights": { "skills": 0.40, "trajectory": 0.20, ... },
      "weights_overridden": true,
      "rankings": [
        {
          "id": "cand_001",
          "rank": 1,
          "full_name": "Sarah Chen",
          "composite_score": 94.5,
          "tier": "Top pick",
          "headline": "Lead Systems Engineer at Stripe",
          "rationale": "Exceptional match for high-throughput distributed transaction engines...",
          "key_strengths": ["Distributed Systems", "Kafka", "High Throughput"],
          "key_risks": [],
          "interview_questions": [
            "How did you design partition rebalancing in your Kafka pipeline?"
          ],
          "dim_scores": {
            "skills": 95,
            "trajectory": 92,
            "leadership": 90,
            "domain": 98,
            "communication": 92
          },
          "needs_assessment": false
        }
      ]
    }
    ```

---

### Ranking Run History
- **`GET /runs`**
  - Returns paginated ranking runs with optional status filtering.
  - **Query Parameters**:
    - `status` (*optional*): `pending` | `running` | `complete` | `failed`
    - `limit` (*default: 20, max: 100*)
    - `offset` (*default: 0*)

- **`GET /runs/{run_id}`**
  - Returns complete ranking run details including job description metadata, `ai_weights`, `applied_weights`, `weights_overridden`, and ranked candidates preserving the `needs_assessment_at_rank` historical snapshot.

---

### Recruiter Feedback
- **`POST /feedback`**
  - Records recruiter evaluation tags (`accept`, `maybe`, `reject`) and review notes.
  - **Payload**:
    ```json
    {
      "candidate_id": "cand_001",
      "decision": "accept",
      "run_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      "notes": "Strong distributed systems background, recommended for technical screen."
    }
    ```

- **`GET /feedback/summary`**
  - Fetches aggregated recruiter sentiment metrics across candidates (with optional `run_id` query parameter).

---

## 🧪 Testing & Quality Assurance

### Running Backend Tests

Run all 40 automated tests with `pytest`:

```bash
pytest backend/tests
```

Or run individual test suites:

```bash
# Assessment follow-up, zero-scores, tier caps & snapshot tests (12 tests)
pytest backend/tests/test_assessment_followup.py

# Recruiter scoring weights, overrides, normalization & persistence tests (9 tests)
pytest backend/tests/test_weights_persistence.py

# Resume upload (PDF/DOCX) extraction tests (9 tests)
pytest backend/tests/test_resume_upload.py

# Ranking persistence, small/large pools & error handling tests (5 tests)
pytest backend/tests/test_rank_persistence.py

# Run history pagination, inspection & feedback tests (5 tests)
pytest backend/tests/test_history_endpoints.py
```

### Frontend Typechecking & Production Build

```bash
cd frontend
npx tsc --noEmit
npm run build
```

---

## 📄 License

This project is licensed under the MIT License — see the repository files for full terms.