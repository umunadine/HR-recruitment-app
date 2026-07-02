from __future__ import annotations
from typing import Optional, List, Literal, Annotated
from pydantic import BaseModel, Field, BeforeValidator

# Accepts int or float from the LLM and rounds to the nearest integer
_RoundedInt = Annotated[int, BeforeValidator(lambda v: round(float(v)))]


class JobRequirements(BaseModel):
    title: str
    description: str
    required_skills: List[str] = Field(default_factory=list)
    preferred_skills: List[str] = Field(default_factory=list)
    min_years_experience: int = 0
    required_education: List[str] = Field(default_factory=list)
    keywords: List[str] = Field(default_factory=list)


class ExtractedProfile(BaseModel):
    candidate_name: str = "Unknown Candidate"
    email: Optional[str] = None
    phone: Optional[str] = None
    skills: List[str] = Field(default_factory=list)
    years_of_experience: int = 0
    education: List[str] = Field(default_factory=list)
    job_titles: List[str] = Field(default_factory=list)
    summary: str = ""


class SkillMatch(BaseModel):
    skill: str
    found: bool
    importance: Literal["required", "preferred", "keyword"]


class GapAnalysis(BaseModel):
    missing_required_skills: List[str] = Field(default_factory=list)
    missing_preferred_skills: List[str] = Field(default_factory=list)
    experience_gap: Optional[int] = None
    missing_education: List[str] = Field(default_factory=list)
    missing_keywords: List[str] = Field(default_factory=list)


class ScoreBreakdown(BaseModel):
    skills_score: _RoundedInt
    experience_score: _RoundedInt
    education_score: _RoundedInt
    keyword_score: _RoundedInt
    cv_quality_score: _RoundedInt
    overall_score: _RoundedInt


class CandidateAnalysis(BaseModel):
    id: str
    file_name: str
    profile: ExtractedProfile
    skill_matches: List[SkillMatch] = Field(default_factory=list)
    gaps: GapAnalysis
    scores: ScoreBreakdown
    recommendation: Literal["strong", "good", "moderate", "weak"]
    strengths: List[str] = Field(default_factory=list)
    concerns: List[str] = Field(default_factory=list)
    summary: str
