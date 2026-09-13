# Syntra — AI Candidate Ranking Engine

Syntra is an AI-powered talent intelligence and candidate ranking platform that evaluates, profiles, and ranks candidate pools against job descriptions. Built with **FastAPI**, **React + TypeScript**, **PostgreSQL**, and **Google Gemini**, Syntra delivers transparent scoring, deep rationales, risk analysis, interview question generation, persistent run histories, and real-time recruiter feedback loops.

---

## ⚡ Key Features

- **4-Phase Ranking Pipeline**: Combines deterministic multi-dimensional signal profiling with semantic scoring and LLM holistic re-ranking.
- **JD Intent Intelligence**: Uses Gemini AI to parse job descriptions into structured requirements (must-haves, nice-to-haves, seniority, domain, soft signals).
- **5-Dimensional Candidate Profiling**: Evaluates candidates across **Skills**, **Trajectory**, **Leadership**, **Domain Relevance**, and **Communication**.
- **Transparent & Explainable AI**: Generates comprehensive match rationales, identified risks/red flags, and tailored technical interview questions.
- **Recruiter Feedback Loop**: Enables hiring teams to tag decisions (`accept`, `maybe`, `reject`), log review notes, and track historical recruiter sentiment across runs.
- **Ranking Run History & Audit Trail**: Full historical ranking records stored in PostgreSQL with filtering by status (`pending`, `running`, `complete`, `failed`), candidate count, latency metrics, and one-click JD reuse in the live dashboard.
- **Custom Candidate Simulation**: Add and test custom candidate profiles dynamically directly from the interactive frontend dashboard.
- **Modern Dark-Mode Dashboard**: Sleek React UI with tabbed navigation (Live Dashboard & History View), real-time pipeline status progression, dimension grids, and signal badges.

---

## 🏗️ Architecture & Pipeline

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                        React + TypeScript Dashboard                         │
│             (Live Dashboard, Run History Inspector, Feedback UI)            │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │  HTTP / REST
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                               FastAPI Backend                               │
├─────────────────────────────────────────────────────────────────────────────┤
│  Phase 1: JD Intelligence (core/jd_intelligence.py)                         │
│  - Extracts role intent, must-haves, nice-to-haves, seniority & signals     │
│                                                                             │
│  Phase 2: Candidate Profiling (core/candidate_profiler.py)                  │
│  - Heuristic scoring across 5 key dimensions (0-100)                        │
│                                                                             │
│  Phase 3: Semantic Matcher (core/semantic_matcher.py)                       │
│  - Weighted composite match score & top-10 candidate shortlisting          │
│                                                                             │
│  Phase 4: Holistic LLM Ranker (core/llm_ranker.py)                          │
│  - Gemini LLM re-ranking, risk flags, synthesis & interview questions       │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            PostgreSQL Database                              │
│                                                                             │
│  - candidates         : Candidate profiles, signals & background metrics    │
│  - job_descriptions   : Raw text, parsed intent, must/nice-to-have skills   │
│  - ranking_runs       : Execution status, phase 3 snapshots, duration (ms)  │
│  - ranked_results     : Final ranks, composite scores, dimensional scores,  │
│                         rationales, risks, and interview questions          │
│  - recruiter_feedback : Recruiter decision tags (accept/maybe/reject)       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📊 Ranking Dimensions

Candidates are evaluated across five core pillars before final LLM synthesis:

| Dimension | Weight | Description |
| :--- | :---: | :--- |
| **Skills Match** | `35%` | Direct overlap and depth of must-have & nice-to-have technical skills. |
| **Trajectory** | `20%` | Career progression velocity, promotions, seniority progression, and tier of experience. |
| **Leadership** | `15%` | Mentorship signals, team leadership, architecture ownership, and guild participation. |
| **Domain Fit** | `15%` | Industry background (e.g., Payments, Fintech, Distributed Systems, High-throughput). |
| **Communication** | `15%` | Technical writing, documentation, public speaking, OSS, and clarity signals. |

---

## 🗄️ Database Schema & Entities

The PostgreSQL schema is structured for full relational integrity and auditability:

```text
candidates (id, external_id, full_name, current_role, company, years_experience, skills, ...)
    │
    ├─────────────┬─────────────────────────────────────────────────┐
    │             │                                                 │
    ▼             ▼                                                 ▼
job_descriptions ───► ranking_runs ───────────────► ranked_results ───► recruiter_feedback
(id, raw_text,        (id, jd_id, status,          (id, run_id,         (id, run_id,
 extracted_intent,     phase3_scores,               candidate_id,        candidate_id,
 must_have_skills,     duration_ms,                 final_rank,          decision,
 nice_to_have_skills)  created_at)                  composite_score,     notes,
                                                    dim_scores, ...)     created_at)
```

- **`candidates`**: Master candidate pool with skill arrays, experience, and qualitative signal attributes.
- **`job_descriptions`**: Persisted job descriptions with extracted intent and required skill taxonomies.
- **`ranking_runs`**: Tracks pipeline execution lifecycle (`pending` ➔ `running` ➔ `complete` / `failed`), duration, and phase 3 score snapshots.
- **`ranked_results`**: Individual candidate scores per run, including final rank, composite score, tier (`Top pick`, `Worth interviewing`, `Not recommended`), 5D breakdown, strengths, risks, and interview questions.
- **`recruiter_feedback`**: Decision logs (`accept`, `maybe`, `reject`) linked to candidates and runs with optional notes.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite, CSS Variables & Design System
- **Backend**: Python 3.10+, FastAPI, Uvicorn, SQLAlchemy 2.0, Pydantic v2, HTTPX
- **Database**: PostgreSQL with `psycopg2-binary`
- **AI / LLM**: Google Gemini REST API (`gemini-3.6-flash` / `gemini-2.5-flash`)
- **Testing**: `pytest`, `httpx`, `pytest-asyncio`

---

## 📁 Repository Structure

```text
Syntra/
├── backend/
│   ├── api/                       # FastAPI application routes and server
│   │   ├── __init__.py
│   │   └── main.py                # API endpoints, request models & CORS
│   ├── core/                      # 4-Phase AI ranking engine
│   │   ├── __init__.py
│   │   ├── config.py              # Gemini API keys & model settings
│   │   ├── jd_intelligence.py     # Phase 1: JD intent extraction
│   │   ├── candidate_profiler.py  # Phase 2: 5-dimension scoring
│   │   ├── semantic_matcher.py    # Phase 3: Composite ranking & shortlisting
│   │   └── llm_ranker.py          # Phase 4: Gemini LLM re-ranking & questions
│   ├── database/                  # SQLAlchemy ORM layer & seeds
│   │   ├── __init__.py
│   │   ├── connection.py          # Database engine and session handlers
│   │   ├── models.py              # Schema models (Candidates, Runs, Feedback)
│   │   ├── schema.sql             # Raw SQL schema definition
│   │   └── seeds/                 # Seed data and population script
│   │       ├── candidates.json    # Default candidate dataset & sample JD
│   │       └── seed.py            # Database seeder
│   └── tests/                     # Automated backend test suite
│       ├── test_history_endpoints.py # Run history and feedback tests
│       └── test_rank_persistence.py  # Pipeline execution & persistence tests
├── frontend/                      # React + TypeScript web application
│   ├── src/
│   │   ├── components/            # UI components (ResultCard, HistoryView, etc.)
│   │   ├── data/                  # Default fallback candidates & JDs
│   │   ├── lib/                   # API client helper functions
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

### Candidates
- **`GET /candidates`**
  - Retrieves all active candidate profiles stored in PostgreSQL.

### Parse Job Description
- **`POST /jd/parse`**
  - Extracts structured role requirements and skills using Gemini AI.
  - **Payload**:
    ```json
    {
      "jd_text": "We are seeking a Senior Backend Engineer with Go, Kafka, and Kubernetes experience..."
    }
    ```

### Run Candidate Ranking
- **`POST /rank`**
  - Executes the full 4-phase AI ranking pipeline, records a `RankingRun`, and persists all `RankedResult` records.
  - **Payload**:
    ```json
    {
      "jd_text": "Looking for a Staff Payments Engineer with Python, Go, and Distributed Systems expertise.",
      "candidates": [] 
    }
    ```
  - *Note: If `candidates` is omitted or empty, active candidates are automatically loaded from PostgreSQL.*
  - **Response**:
    ```json
    {
      "status": "success",
      "run_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      "duration_ms": 2840,
      "intent": { ... },
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
          }
        }
      ]
    }
    ```

### Ranking Run History
- **`GET /runs`**
  - Returns paginated ranking runs with optional status filtering.
  - **Query Parameters**:
    - `status` (*optional*): `pending` | `running` | `complete` | `failed`
    - `limit` (*default: 20, max: 100*)
    - `offset` (*default: 0*)
  - **Response**:
    ```json
    {
      "runs": [
        {
          "run_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
          "jd_id": "c8f23b20-67c4-4b53-832f-a9b0c20efb1a",
          "title": "Senior Staff Backend Engineer",
          "jd_snippet": "We are looking for a Senior Staff Backend Engineer to lead...",
          "status": "complete",
          "created_at": "2026-09-13T18:30:00Z",
          "duration_ms": 2840,
          "candidate_count": 8
        }
      ],
      "total": 12,
      "limit": 20,
      "offset": 0
    }
    ```

- **`GET /runs/{run_id}`**
  - Returns complete ranking run details including job description metadata and all ranked candidates with dimensional scores, strengths, risks, and interview questions.

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

Run all unit and integration tests with `pytest`:

```bash
pytest backend/tests
```

Or run individual test modules:

```bash
# Run run history & inspection endpoint tests
pytest backend/tests/test_history_endpoints.py

# Run ranking persistence & pipeline tests
pytest backend/tests/test_rank_persistence.py
```

### Frontend Typechecking & Production Build

```bash
cd frontend
npm run build
```

---

## 📄 License

This project is licensed under the MIT License — see the repository files for full terms.