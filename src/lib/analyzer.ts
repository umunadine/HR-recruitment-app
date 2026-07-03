import type {
  CandidateAnalysis,
  ExtractedProfile,
  GapAnalysis,
  JobRequirements,
  ScoreBreakdown,
  SkillMatch,
} from "./types";

function normalizeSkill(skill: string): string {
  return skill.toLowerCase().trim();
}

function skillFound(profile: ExtractedProfile, skill: string, cvText?: string): boolean {
  const normalized = normalizeSkill(skill);
  const inSkills = profile.skills.some(
    (s) =>
      normalizeSkill(s) === normalized ||
      normalizeSkill(s).includes(normalized) ||
      normalized.includes(normalizeSkill(s))
  );
  if (inSkills) return true;

  if (cvText) {
    const pattern = new RegExp(
      normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "i"
    );
    return pattern.test(cvText);
  }

  return false;
}

function computeSkillMatches(
  profile: ExtractedProfile,
  job: JobRequirements,
  cvText?: string
): SkillMatch[] {
  const matches: SkillMatch[] = [];

  for (const skill of job.requiredSkills) {
    matches.push({
      skill,
      found: skillFound(profile, skill, cvText),
      importance: "required",
    });
  }

  for (const skill of job.preferredSkills) {
    matches.push({
      skill,
      found: skillFound(profile, skill, cvText),
      importance: "preferred",
    });
  }

  for (const keyword of job.keywords) {
    matches.push({
      skill: keyword,
      found: skillFound(profile, keyword, cvText),
      importance: "keyword",
    });
  }

  return matches;
}

function computeGaps(
  profile: ExtractedProfile,
  job: JobRequirements,
  skillMatches: SkillMatch[]
): GapAnalysis {
  const missingRequiredSkills = skillMatches
    .filter((m) => m.importance === "required" && !m.found)
    .map((m) => m.skill);

  const missingPreferredSkills = skillMatches
    .filter((m) => m.importance === "preferred" && !m.found)
    .map((m) => m.skill);

  const missingKeywords = skillMatches
    .filter((m) => m.importance === "keyword" && !m.found)
    .map((m) => m.skill);

  const experienceGap =
    job.minYearsExperience > 0 &&
    profile.yearsOfExperience < job.minYearsExperience
      ? job.minYearsExperience - profile.yearsOfExperience
      : null;

  const cvLower = profile.education.join(" ").toLowerCase();
  const missingEducation = job.requiredEducation.filter((edu) => {
    const eduLower = edu.toLowerCase();
    return !cvLower.includes(eduLower.split(" ")[0]);
  });

  return {
    missingRequiredSkills,
    missingPreferredSkills,
    experienceGap,
    missingEducation,
    missingKeywords,
  };
}

function scorePercentage(matched: number, total: number): number {
  if (total === 0) return 100;
  return Math.round((matched / total) * 100);
}

function computeCvQualityScore(profile: ExtractedProfile, cvText: string): number {
  let score = 0;
  const checks = [
    profile.candidateName !== "Unknown Candidate",
    !!profile.email,
    profile.skills.length >= 3,
    profile.yearsOfExperience > 0,
    profile.education.length > 0,
    profile.jobTitles.length > 0,
    profile.summary.length > 50,
    cvText.length > 500,
    cvText.length < 15000,
    /experience|employment|work/i.test(cvText),
  ];

  for (const check of checks) {
    if (check) score += 10;
  }

  return Math.min(score, 100);
}

function computeScores(
  profile: ExtractedProfile,
  job: JobRequirements,
  skillMatches: SkillMatch[],
  gaps: GapAnalysis,
  cvText: string
): ScoreBreakdown {
  const requiredMatches = skillMatches.filter((m) => m.importance === "required");
  const preferredMatches = skillMatches.filter((m) => m.importance === "preferred");
  const keywordMatches = skillMatches.filter((m) => m.importance === "keyword");

  const skillsScore = Math.round(
    scorePercentage(
      requiredMatches.filter((m) => m.found).length,
      requiredMatches.length
    ) *
      0.7 +
      scorePercentage(
        preferredMatches.filter((m) => m.found).length,
        preferredMatches.length
      ) *
        0.3
  );

  let experienceScore = 100;
  if (job.minYearsExperience > 0) {
    const ratio = profile.yearsOfExperience / job.minYearsExperience;
    experienceScore = Math.min(Math.round(ratio * 100), 100);
    if (profile.yearsOfExperience >= job.minYearsExperience) {
      experienceScore = 100;
    }
  }

  let educationScore = 100;
  if (job.requiredEducation.length > 0) {
    educationScore = scorePercentage(
      job.requiredEducation.length - gaps.missingEducation.length,
      job.requiredEducation.length
    );
  }

  const keywordScore = scorePercentage(
    keywordMatches.filter((m) => m.found).length,
    keywordMatches.length
  );

  const cvQualityScore = computeCvQualityScore(profile, cvText);

  const weights = {
    skills: 0.4,
    experience: 0.25,
    education: 0.1,
    keywords: 0.1,
    cvQuality: 0.15,
  };

  const overallScore = Math.round(
    skillsScore * weights.skills +
      experienceScore * weights.experience +
      educationScore * weights.education +
      keywordScore * weights.keywords +
      cvQualityScore * weights.cvQuality
  );

  return {
    skillsScore,
    experienceScore,
    educationScore,
    keywordScore,
    cvQualityScore,
    overallScore: Math.min(Math.max(overallScore, 0), 100),
  };
}

function getRecommendation(
  score: number,
  gaps: GapAnalysis
): CandidateAnalysis["recommendation"] {
  const criticalGaps =
    gaps.missingRequiredSkills.length > 0 ||
    (gaps.experienceGap !== null && gaps.experienceGap > 3);

  if (score >= 80 && !criticalGaps) return "strong";
  if (score >= 65) return "good";
  if (score >= 45) return "moderate";
  return "weak";
}

function buildStrengths(
  profile: ExtractedProfile,
  skillMatches: SkillMatch[],
  scores: ScoreBreakdown
): string[] {
  const strengths: string[] = [];

  const matchedRequired = skillMatches.filter(
    (m) => m.importance === "required" && m.found
  );
  if (matchedRequired.length > 0) {
    strengths.push(
      `Matches ${matchedRequired.length} required skill(s): ${matchedRequired
        .slice(0, 4)
        .map((m) => m.skill)
        .join(", ")}${matchedRequired.length > 4 ? "..." : ""}`
    );
  }

  if (profile.yearsOfExperience >= 5) {
    strengths.push(
      `Solid experience track record (${profile.yearsOfExperience} years)`
    );
  } else if (profile.yearsOfExperience > 0) {
    strengths.push(
      `${profile.yearsOfExperience} year(s) of relevant experience identified`
    );
  }

  if (scores.cvQualityScore >= 70) {
    strengths.push("Well-structured CV with clear professional information");
  }

  if (profile.jobTitles.length > 0) {
    strengths.push(
      `Relevant roles: ${profile.jobTitles.slice(0, 2).join(", ")}`
    );
  }

  if (profile.education.length > 0) {
    strengths.push("Educational background documented");
  }

  return strengths.slice(0, 5);
}

function buildConcerns(gaps: GapAnalysis, scores: ScoreBreakdown): string[] {
  const concerns: string[] = [];

  if (gaps.missingRequiredSkills.length > 0) {
    concerns.push(
      `Missing required skills: ${gaps.missingRequiredSkills.join(", ")}`
    );
  }

  if (gaps.experienceGap !== null && gaps.experienceGap > 0) {
    concerns.push(
      `Experience gap: ${gaps.experienceGap} year(s) below minimum requirement`
    );
  }

  if (gaps.missingEducation.length > 0) {
    concerns.push(
      `Education requirements not clearly met: ${gaps.missingEducation.join(", ")}`
    );
  }

  if (gaps.missingPreferredSkills.length > 2) {
    concerns.push(
      `Limited preferred skills (${gaps.missingPreferredSkills.length} not found)`
    );
  }

  if (scores.cvQualityScore < 50) {
    concerns.push("CV lacks detail or structure — manual review recommended");
  }

  return concerns.slice(0, 5);
}

function buildAnalysisSummary(
  profile: ExtractedProfile,
  scores: ScoreBreakdown,
  recommendation: CandidateAnalysis["recommendation"],
  job: JobRequirements
): string {
  const employability = scores.overallScore;
  const recLabels = {
    strong: "highly recommended for interview",
    good: "a good fit worth considering",
    moderate: "partially aligned — review carefully",
    weak: "unlikely to meet core requirements",
  };

  return `${profile.candidateName} scores ${employability}% employability for "${job.title}". ` +
    `They bring ${profile.yearsOfExperience} years of experience and ${profile.skills.length} identified skills. ` +
    `This candidate is ${recLabels[recommendation]}.`;
}

export function analyzeCandidate(
  id: string,
  fileName: string,
  profile: ExtractedProfile,
  job: JobRequirements,
  cvText: string
): CandidateAnalysis {
  const skillMatches = computeSkillMatches(profile, job, cvText);
  const gaps = computeGaps(profile, job, skillMatches);
  const scores = computeScores(profile, job, skillMatches, gaps, cvText);
  const recommendation = getRecommendation(scores.overallScore, gaps);
  const strengths = buildStrengths(profile, skillMatches, scores);
  const concerns = buildConcerns(gaps, scores);
  const summary = buildAnalysisSummary(profile, scores, recommendation, job);

  return {
    id,
    fileName,
    profile,
    skillMatches,
    gaps,
    scores,
    recommendation,
    strengths,
    concerns,
    summary,
  };
}

export function sortCandidates(
  candidates: CandidateAnalysis[]
): CandidateAnalysis[] {
  return [...candidates].sort(
    (a, b) => b.scores.overallScore - a.scores.overallScore
  );
}
