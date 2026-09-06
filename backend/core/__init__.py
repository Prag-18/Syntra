"""
Syntra core package.

Contains the AI pipeline components:
  - config            : environment / model configuration
  - jd_intelligence   : job-description intent extraction (Gemini)
  - candidate_profiler: dimension scoring (trajectory, leadership, etc.)
  - semantic_matcher  : phase-3 embedding-free semantic matching
  - llm_ranker        : phase-4 holistic LLM re-ranking (Gemini)
"""
