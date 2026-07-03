export interface JobRequirements {
  title: string;
  description: string;
  requiredSkills: string[];
  preferredSkills: string[];
  minYearsExperience: number;
  requiredEducation: string[];
  keywords: string[];
}

export interface ExtractedProfile {
  candidateName: string;
  email: string | null;
  phone: string | null;
  skills: string[];
  yearsOfExperience: number;
  education: string[];
  jobTitles: string[];
  summary: string;
}

export interface SkillMatch {
  skill: string;
  found: boolean;
  importance: "required" | "preferred" | "keyword";
}

export interface GapAnalysis {
  missingRequiredSkills: string[];
  missingPreferredSkills: string[];
  experienceGap: number | null;
  missingEducation: string[];
  missingKeywords: string[];
}

export interface ScoreBreakdown {
  skillsScore: number;
  experienceScore: number;
  educationScore: number;
  keywordScore: number;
  cvQualityScore: number;
  overallScore: number;
}

export interface CandidateAnalysis {
  id: string;
  fileName: string;
  profile: ExtractedProfile;
  skillMatches: SkillMatch[];
  gaps: GapAnalysis;
  scores: ScoreBreakdown;
  recommendation: "strong" | "good" | "moderate" | "weak";
  strengths: string[];
  concerns: string[];
  summary: string;
}

export interface AnalysisSession {
  job: JobRequirements;
  candidates: CandidateAnalysis[];
  analyzedAt: string;
}
