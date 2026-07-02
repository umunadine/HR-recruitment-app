from __future__ import annotations
import json
import os
import uuid
from typing import Any, Dict, List, Literal, Optional

import openai as _openai
from openai import OpenAI
from pydantic import BaseModel

from models import (
    CandidateAnalysis,
    ExtractedProfile,
    GapAnalysis,
    JobRequirements,
    ScoreBreakdown,
    SkillMatch,
)


# ── Client config ────────────────────────────────────────────────────────────

_GROQ_BASE_URL   = "https://api.groq.com/openai/v1"
_GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/"


def _groq_client() -> OpenAI:
    return OpenAI(api_key=os.environ["GROQ_API_KEY"], base_url=_GROQ_BASE_URL)


def _gemini_client() -> OpenAI:
    key = os.environ.get("GEMINI_API_KEY", "")
    if not key:
        raise RuntimeError("GEMINI_API_KEY is not set. Add it to your .env file.")
    return OpenAI(api_key=key, base_url=_GEMINI_BASE_URL)


# Ordered fallback chain: (label, client_factory, model)
# Each entry is tried in sequence; if it raises RateLimitError the next is tried.
# All Groq models share the same API key but have SEPARATE per-model quotas.
def _fallback_chain():
    return [
        ("Groq llama-3.3-70b",   _groq_client,   "llama-3.3-70b-versatile"),
        # ("Groq llama-3.1-8b",    _groq_client,   "llama-3.1-8b-instant"),
        # ("Groq llama3-70b",      _groq_client,   "llama3-70b-8192"),
        # ("Groq gemma2-9b",       _groq_client,   "gemma2-9b-it"),
        # ("Groq mixtral-8x7b",    _groq_client,   "mixtral-8x7b-32768"),
        ("Gemini 2.0 flash",     _gemini_client, "gemini-2.0-flash"),
        # ("Gemini 1.5 flash",     _gemini_client, "gemini-1.5-flash"),
    ]


def _call_llm(
    messages: List[Dict[str, str]],
    max_tokens: int = 2048,
    json_mode: bool = True,
) -> Any:
    """Try each provider/model in _fallback_chain(); skip on RateLimitError."""
    kwargs: Dict[str, Any] = dict(
        messages=messages,
        temperature=0.1,
        max_tokens=max_tokens,
    )
    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}

    last_error: Exception = RuntimeError("No providers available.")
    for label, client_factory, model in _fallback_chain():
        try:
            client = client_factory()
            print(f"[analyzer] Trying {label}...")
            return client.chat.completions.create(model=model, **kwargs)
        except _openai.RateLimitError as e:
            print(f"[analyzer] {label} rate limit hit — trying next provider.")
            last_error = e
        except RuntimeError as e:
            # e.g. GEMINI_API_KEY not set — skip silently
            print(f"[analyzer] {label} skipped: {e}")
            last_error = e

    raise RuntimeError(
        "All providers are rate-limited or unavailable. "
        "Please wait and try again, or add more API keys.\n"
        f"Last error: {last_error}"
    )


# ── Internal schema ───────────────────────────────────────────────────────────

class _LLMResult(BaseModel):
    profile: ExtractedProfile
    skill_matches: List[SkillMatch]
    gaps: GapAnalysis
    scores: ScoreBreakdown
    recommendation: Literal["strong", "good", "moderate", "weak"]
    strengths: List[str]
    concerns: List[str]
    summary: str


# ── Prompts ───────────────────────────────────────────────────────────────────

# Explicit schema shown inline so Llama follows nested structure exactly
_SYSTEM = """You are a senior HR recruiter. Analyse CVs and return ONLY a JSON object \
with this exact nested structure — do NOT flatten it:

{
  "profile": {
    "candidate_name": "string",
    "email": "string or null",
    "phone": "string or null",
    "skills": ["string"],
    "years_of_experience": 0,
    "education": ["string"],
    "job_titles": ["string"],
    "summary": "string"
  },
  "skill_matches": [
    {"skill": "string", "found": true, "importance": "required"}
  ],
  "gaps": {
    "missing_required_skills": ["string"],
    "missing_preferred_skills": ["string"],
    "experience_gap": null,
    "missing_education": ["string"],
    "missing_keywords": ["string"]
  },
  "scores": {
    "skills_score": 0,
    "experience_score": 0,
    "education_score": 0,
    "keyword_score": 0,
    "cv_quality_score": 0,
    "overall_score": 0
  },
  "recommendation": "strong",
  "strengths": ["string"],
  "concerns": ["string"],
  "summary": "string"
}"""


def _user_prompt(cv_text: str, job: JobRequirements) -> str:
    return f"""Analyse the CV below against these job requirements. \
Return ONLY the JSON object described in the system prompt — no other text.

JOB REQUIREMENTS
Title            : {job.title}
Description      : {job.description}
Required Skills  : {", ".join(job.required_skills) or "Not specified"}
Preferred Skills : {", ".join(job.preferred_skills) or "Not specified"}
Min Experience   : {job.min_years_experience} year(s)
Education        : {", ".join(job.required_education) or "Not specified"}
Keywords         : {", ".join(job.keywords) or "Not specified"}

CV CONTENT
{cv_text}

SCORING
skills_score     : 70% required match + 30% preferred match (0-100)
experience_score : 100 if meets/exceeds requirement, proportional if below (0-100)
education_score  : % of required education criteria met (0-100)
keyword_score    : % of keywords found in CV (0-100)
cv_quality_score : CV completeness and professionalism (0-100)
overall_score    : skills*0.40 + experience*0.25 + education*0.10 + keywords*0.10 + cv_quality*0.15

RECOMMENDATION: strong (>=80, no missing required skills), good (>=65), moderate (>=45), weak (<45)

Include a skill_match entry for EVERY required skill, preferred skill, and keyword listed above."""


def _coerce_to_nested(data: dict, job: JobRequirements) -> dict:
    """
    Rescue a flat LLM response by reconstructing the nested schema.
    Called when model_validate fails on the raw response.
    """
    all_skills = (
        [{"skill": s, "found": False, "importance": "required"} for s in job.required_skills] +
        [{"skill": s, "found": False, "importance": "preferred"} for s in job.preferred_skills] +
        [{"skill": s, "found": False, "importance": "keyword"} for s in job.keywords]
    )
    return {
        "profile": data.get("profile") or {
            "candidate_name": data.get("candidate_name", "Unknown Candidate"),
            "email": data.get("email"),
            "phone": data.get("phone"),
            "skills": data.get("skills", []),
            "years_of_experience": data.get("years_of_experience", 0),
            "education": data.get("education", []),
            "job_titles": data.get("job_titles", []),
            "summary": data.get("profile_summary", data.get("summary", "")),
        },
        "skill_matches": data.get("skill_matches") or all_skills,
        "gaps": data.get("gaps") or {
            "missing_required_skills": data.get("missing_required_skills", []),
            "missing_preferred_skills": data.get("missing_preferred_skills", []),
            "experience_gap": data.get("experience_gap"),
            "missing_education": data.get("missing_education", []),
            "missing_keywords": data.get("missing_keywords", []),
        },
        "scores": data.get("scores") or {
            "skills_score":     int(data.get("skills_score", 0)),
            "experience_score": int(data.get("experience_score", 0)),
            "education_score":  int(data.get("education_score", 0)),
            "keyword_score":    int(data.get("keyword_score", 0)),
            "cv_quality_score": int(data.get("cv_quality_score", 0)),
            "overall_score":    int(data.get("overall_score", data.get("score", 0))),
        },
        "recommendation": data.get("recommendation", "moderate"),
        "strengths": data.get("strengths", []),
        "concerns":  data.get("concerns", []),
        "summary":   data.get("summary", data.get("analysis_summary", "")),
    }


# ── Core function ─────────────────────────────────────────────────────────────

def analyze_candidate(file_name: str, cv_text: str, job: JobRequirements) -> CandidateAnalysis:
    """Send CV + job requirements to Groq (llama-3.3-70b) and return a CandidateAnalysis."""
    from pydantic import ValidationError

    truncated = cv_text[:6000]

    response = _call_llm(
        messages=[
            {"role": "system", "content": _SYSTEM},
            {"role": "user",   "content": _user_prompt(truncated, job)},
        ],
        max_tokens=2048,
        json_mode=True,
    )
    data = json.loads(response.choices[0].message.content)

    try:
        result = _LLMResult.model_validate(data)
    except ValidationError:
        # Model returned a flat structure — reconstruct nested form and retry
        data = _coerce_to_nested(data, job)
        result = _LLMResult.model_validate(data)

    # Always recompute overall_score from components — LLMs often return 0 or wrong values
    s = result.scores
    computed_overall = round(
        s.skills_score     * 0.40 +
        s.experience_score * 0.25 +
        s.education_score  * 0.10 +
        s.keyword_score    * 0.10 +
        s.cv_quality_score * 0.15
    )
    s.overall_score = computed_overall

    return CandidateAnalysis(
        id=str(uuid.uuid4()),
        file_name=file_name,
        profile=result.profile,
        skill_matches=result.skill_matches,
        gaps=result.gaps,
        scores=result.scores,
        recommendation=result.recommendation,
        strengths=result.strengths,
        concerns=result.concerns,
        summary=result.summary,
    )


# ── Job post parser ───────────────────────────────────────────────────────────

class _JobExtract(BaseModel):
    title: str
    description: str
    required_skills: str    # comma-separated
    preferred_skills: str   # comma-separated
    min_years_experience: int
    required_education: str # comma-separated
    keywords: str           # comma-separated


def parse_job_post(file_text: str) -> dict:
    """Use Groq (llama-3.3-70b) to extract structured job requirements from a posting."""
    truncated = file_text[:4000]

    response = _call_llm(
        messages=[
            {
                "role": "system",
                "content": (
                    "Extract structured job requirements from job posting documents. "
                    "Return skills, education, and keywords as comma-separated strings. "
                    "Always respond with valid JSON only."
                ),
            },
            {
                "role": "user",
                "content": (
                    "Extract the job requirements from this posting and return JSON with: "
                    "title, description, required_skills (comma-separated), "
                    "preferred_skills (comma-separated), min_years_experience (int), "
                    "required_education (comma-separated), keywords (comma-separated).\n\n"
                    + truncated
                ),
            },
        ],
        max_tokens=1024,
        json_mode=True,
    )
    data = json.loads(response.choices[0].message.content)
    result = _JobExtract.model_validate(data)

    return {
        "title": result.title,
        "description": result.description,
        "required_skills": result.required_skills,
        "preferred_skills": result.preferred_skills,
        "min_experience": result.min_years_experience,
        "education": result.required_education,
        "keywords": result.keywords,
    }
