# Syntra — AI Candidate Ranking Engine

Syntra is an AI-powered talent intelligence and candidate ranking platform that evaluates, profiles, and ranks candidate pools against job descriptions. Built with **FastAPI**, **React + TypeScript**, **PostgreSQL**, and **Google Gemini**, Syntra delivers transparent scoring, deep rationales, risk analysis, interview question generation, and real-time recruiter feedback loops.

---

## ⚡ Key Features

- **4-Phase Ranking Pipeline**: Combines deterministic multi-dimensional signal profiling with semantic scoring and LLM holistic re-ranking.
- **JD Intent Intelligence**: Uses Gemini to parse job descriptions into structured requirements (must-haves, nice-to-haves, seniority, domain, soft signals).
- **5-Dimensional Profiling**: Evaluates candidates across **Skills**, **Trajectory**, **Leadership**, **Domain Relevance**, and **Communication**.
- **Transparent & Explainable AI**: Generates comprehensive match rationales, identified risks/red flags, and tailored technical interview questions.
- **Recruiter Feedback Loop**: Enables hiring teams to tag decisions (`accept`, `maybe`, `reject`), log notes, and track historical recruiter sentiment.
- **Custom Candidate Simulation**: Add and test custom candidate profiles dynamically directly from the interactive frontend dashboard.
- **Responsive Dashboard**: Dark-mode React dashboard with real-time pipeline status indicators, dimension grids, and signal badges.

---

## 🏗️ Architecture & Pipeline

```text
┌─────────────────────────────────────────────────────────────┐
│                 React + TypeScript Dashboard                │
│                 (Vite, Tailwind/Vanilla CSS)                │
└──────────────────────────────┬──────────────────────────────┘
                               │  POST /rank
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                      FastAPI Backend                        │
├─────────────────────────────────────────────────────────────┤
│  Phase 1: JD Intelligence (core/jd_intelligence.py)         │
│  - Extracts role intent, must-haves, seniority & signals    │
│                                                             │
│  Phase 2: Candidate Profiling (core/candidate_profiler.py)  │
│  - Heuristic scoring across 5 key dimensions                │
│                                                             │
│  Phase 3: Semantic Matcher (core/semantic_matcher.py)       │
│  - Weighted composite match score & top-10 candidate filter │
│                                                             │
│  Phase 4: Holistic LLM Ranker (core/llm_ranker.py)          │
│  - Gemini LLM re-ranking, risk flags & interview questions  │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    PostgreSQL Database                      │
│     - Candidates, Job Descriptions, Runs & Feedback Logs    │
└─────────────────────────────────────────────────────────────┘
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

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Vanilla CSS design system
- **Backend**: Python 3.10+, FastAPI, Uvicorn, SQLAlchemy 2.0, Pydantic v2, HTTPX
- **Database**: PostgreSQL with `psycopg2-binary`
- **AI / LLM**: Google Gemini REST API (`gemini-2.5-flash`)

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
│   └── database/                  # SQLAlchemy ORM layer & seeds
│       ├── __init__.py
│       ├── connection.py          # Database engine and session handlers
│       ├── models.py              # Schema models (Candidates, Runs, Feedback)
│       ├── schema.sql             # Raw SQL schema definition
│       └── seeds/                 # Seed data and population script
│           ├── candidates.json    # Default candidate dataset & sample JD
│           └── seed.py            # Database seeder
├── frontend/                      # React + TypeScript web application
│   ├── src/
│   │   ├── components/            # UI components (ResultCard, FeedbackRow, etc.)
│   │   ├── data/                  # Default fallback candidates & JDs
│   │   ├── lib/                   # API client helper functions
│   │   ├── types/                 # TypeScript interfaces
│   │   ├── App.tsx                # Main application view
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

# PostgreSQL connection string
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/syntra
```

---

### 2. Backend Setup

1. **Install dependencies:**

   ```bash
   pip install -r requirements.txt
   ```

2. **Initialize and seed the PostgreSQL database:**

   Make sure your PostgreSQL server is running and the database specified in `DATABASE_URL` (e.g., `syntra`) exists, then execute the seeder:

   ```bash
   cd backend
   python -m database.seeds.seed
   ```

3. **Start the FastAPI backend server:**

   From the `backend` directory:
   ```bash
   uvicorn api.main:app --reload --port 8000
   ```

   Or from the root directory:
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
  - **Response**: `{"status": "online", "database": "connected"}`

### Candidates
- **`GET /candidates`**
  - Retrieves all active candidate profiles stored in PostgreSQL.

### Parse Job Description
- **`POST /jd/parse`**
  - Extracts structured role requirements using Gemini AI.
  - **Payload**:
    ```json
    {
      "jd_text": "We are seeking a Senior Backend Engineer with Go, Kafka, and Kubernetes experience..."
    }
    ```

### Run Candidate Ranking
- **`POST /rank`**
  - Executes the full 4-phase AI ranking pipeline on provided or database candidates.
  - **Payload**:
    ```json
    {
      "jd_text": "Looking for a Staff Payments Engineer with Python, Go, and Distributed Systems expertise.",
      "candidates": [] 
    }
    ```
  - *Note: If `candidates` is omitted or empty, candidates are automatically fetched from PostgreSQL.*

### Recruiter Feedback
- **`POST /feedback`**
  - Records recruiter decisions (`accept`, `maybe`, `reject`) and review notes.
  - **Payload**:
    ```json
    {
      "candidate_id": "cand_001",
      "decision": "accept",
      "notes": "Strong distributed systems background, recommended for technical screen."
    }
    ```
- **`GET /feedback/summary`**
  - Fetches aggregated recruiter sentiment metrics across all candidates.

---

## 🧪 Development & Testing

- **Backend Linting / Formatting**: Use standard Python linters (`flake8`, `black`, or `ruff`).
- **Frontend Typecheck & Build**:
  ```bash
  cd frontend
  npm run build
  ```

---

## 📄 License

This project is licensed under the MIT License — see the repository files for full terms.