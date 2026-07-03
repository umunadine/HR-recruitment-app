import type { ExtractedProfile } from "./types";

const COMMON_SKILLS = [
  "javascript",
  "typescript",
  "python",
  "java",
  "c#",
  "c++",
  "react",
  "next.js",
  "nextjs",
  "node.js",
  "nodejs",
  "angular",
  "vue",
  "html",
  "css",
  "tailwind",
  "sql",
  "postgresql",
  "mysql",
  "mongodb",
  "redis",
  "aws",
  "azure",
  "gcp",
  "docker",
  "kubernetes",
  "git",
  "agile",
  "scrum",
  "project management",
  "leadership",
  "communication",
  "excel",
  "powerpoint",
  "salesforce",
  "sap",
  "hr",
  "recruitment",
  "talent acquisition",
  "onboarding",
  "payroll",
  "compensation",
  "benefits",
  "employee relations",
  "performance management",
  "hris",
  "workday",
  "people analytics",
  "dei",
  "labor law",
  "compliance",
  "training",
  "learning and development",
  "coaching",
  "negotiation",
  "customer service",
  "marketing",
  "seo",
  "content writing",
  "data analysis",
  "machine learning",
  "ai",
  "tableau",
  "power bi",
  "figma",
  "ui/ux",
  "rest api",
  "graphql",
  "microservices",
  "ci/cd",
  "jenkins",
  "terraform",
  "linux",
  "networking",
  "cybersecurity",
  "accounting",
  "finance",
  "budgeting",
  "forecasting",
  "supply chain",
  "logistics",
  "quality assurance",
  "six sigma",
  "lean",
  "public speaking",
  "stakeholder management",
  "conflict resolution",
  "problem solving",
  "analytical thinking",
  "team management",
  "budget management",
  "vendor management",
  "contract negotiation",
  "crm",
  "hubspot",
  "microsoft office",
  "google workspace",
  "slack",
  "jira",
  "confluence",
  "notion",
  "linkedin recruiter",
  "ats",
  "greenhouse",
  "lever",
  "bamboohr",
];

const EDUCATION_PATTERNS = [
  /\b(ph\.?d|doctorate)\b/i,
  /\b(master'?s?|msc|m\.sc|mba|m\.a\.|ma)\b/i,
  /\b(bachelor'?s?|bsc|b\.sc|ba|b\.a\.|undergraduate degree)\b/i,
  /\b(associate'?s?|diploma|certificate|certification)\b/i,
  /\b(high school|secondary school|ged)\b/i,
];

const JOB_TITLE_PATTERNS = [
  /(?:^|\n)\s*([A-Z][A-Za-z\s/&-]{3,40}(?:manager|director|engineer|developer|analyst|specialist|coordinator|consultant|lead|head|officer|associate|assistant|intern|recruiter|administrator))\s*(?:\n|$|at\b)/gim,
];

function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function extractEmail(text: string): string | null {
  const match = text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  return match ? match[0].toLowerCase() : null;
}

function extractPhone(text: string): string | null {
  const match = text.match(
    /(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/
  );
  return match ? match[0].trim() : null;
}

function extractCandidateName(text: string): string {
  const titleWords =
    /manager|director|engineer|developer|analyst|specialist|coordinator|consultant|recruiter|administrator|intern|officer|lead|head/i;

  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  for (const line of lines.slice(0, 8)) {
    if (line.length > 3 && line.length < 50 && !line.includes("@")) {
      if (titleWords.test(line) && line.split(/\s+/).length <= 4) continue;

      const cleaned = line.replace(/[^a-zA-Z\s.'-]/g, "").trim();
      const words = cleaned.split(/\s+/);
      if (words.length >= 2 && words.length <= 4) {
        const looksLikeName = words.every(
          (w) => /^[A-Z][a-z'.-]+$/.test(w) || /^[A-Z]+$/.test(w)
        );
        if (looksLikeName) return cleaned;
      }
    }
  }

  const email = extractEmail(text);
  if (email) {
    const local = email.split("@")[0];
    return local
      .split(/[._-]/)
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(" ");
  }

  return "Unknown Candidate";
}

function extractSkills(text: string, customSkills: string[] = []): string[] {
  const lower = text.toLowerCase();
  const found = new Set<string>();

  for (const skill of COMMON_SKILLS) {
    const pattern = new RegExp(
      `\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
      "i"
    );
    if (pattern.test(lower)) {
      found.add(skill);
    }
  }

  for (const skill of customSkills) {
    const trimmed = skill.trim();
    if (!trimmed) continue;
    const pattern = new RegExp(
      `\\b${trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
      "i"
    );
    if (pattern.test(lower)) {
      found.add(trimmed.toLowerCase());
    }
  }

  const skillsSection = text.match(
    /(?:skills|competencies|expertise|technologies)[:\s]*([\s\S]{0,800})/i
  );
  if (skillsSection) {
    const sectionText = skillsSection[1].split(/\n\n/)[0];
    const items = sectionText.split(/[,;|•·\n]/);
    for (const item of items) {
      const cleaned = item.replace(/^[\s\-–•*]+/, "").trim();
      if (cleaned.length >= 2 && cleaned.length <= 40) {
        found.add(cleaned.toLowerCase());
      }
    }
  }

  return Array.from(found).slice(0, 40);
}

function parseYearFromDate(str: string): number | null {
  const match = str.match(/\b(19|20)\d{2}\b/);
  return match ? parseInt(match[0], 10) : null;
}

function extractYearsOfExperience(text: string): number {
  const lower = text.toLowerCase();
  let explicitYears = 0;

  const explicitPatterns = [
    /(\d+(?:\.\d+)?)\+?\s*(?:years?|yrs?)\s*(?:of\s*)?(?:experience|exp)/gi,
    /(?:experience|exp)[:\s]*(\d+(?:\.\d+)?)\+?\s*(?:years?|yrs?)/gi,
  ];

  for (const pattern of explicitPatterns) {
    let match;
    while ((match = pattern.exec(lower)) !== null) {
      const years = parseFloat(match[1]);
      if (years > explicitYears) explicitYears = years;
    }
  }

  if (explicitYears > 0) return Math.round(explicitYears * 10) / 10;

  const dateRangePattern =
    /\b((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{4}|\d{1,2}\/\d{4}|\d{4})\s*[-–—to]+\s*((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{4}|\d{1,2}\/\d{4}|\d{4}|present|current|now)\b/gi;

  const ranges: { start: number; end: number }[] = [];
  let match;
  while ((match = dateRangePattern.exec(text)) !== null) {
    const start = parseYearFromDate(match[1]);
    let end = parseYearFromDate(match[2]);
    if (/present|current|now/i.test(match[2])) {
      end = new Date().getFullYear();
    }
    if (start && end && end >= start) {
      ranges.push({ start, end });
    }
  }

  if (ranges.length === 0) {
    const yearMatches = text.match(/\b(19|20)\d{2}\b/g);
    if (yearMatches && yearMatches.length >= 2) {
      const years = yearMatches.map((y) => parseInt(y, 10)).sort((a, b) => a - b);
      const span = years[years.length - 1] - years[0];
      return Math.min(Math.max(span, 0), 40);
    }
    return 0;
  }

  ranges.sort((a, b) => a.start - b.start);
  const merged: { start: number; end: number }[] = [];
  for (const range of ranges) {
    const last = merged[merged.length - 1];
    if (!last || range.start > last.end + 1) {
      merged.push({ ...range });
    } else {
      last.end = Math.max(last.end, range.end);
    }
  }

  const totalYears = merged.reduce((sum, r) => sum + (r.end - r.start), 0);
  return Math.min(Math.round(totalYears * 10) / 10, 40);
}

function extractEducation(text: string): string[] {
  const found: string[] = [];
  const lower = text.toLowerCase();

  for (const pattern of EDUCATION_PATTERNS) {
    if (pattern.test(lower)) {
      const match = lower.match(pattern);
      if (match) found.push(match[0]);
    }
  }

  const eduSection = text.match(
    /(?:education|qualifications|academic)[:\s]*([\s\S]{0,600})/i
  );
  if (eduSection) {
    const lines = eduSection[1].split("\n").slice(0, 5);
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length > 5 && trimmed.length < 120) {
        found.push(trimmed);
      }
    }
  }

  return [...new Set(found)].slice(0, 8);
}

function extractJobTitles(text: string): string[] {
  const titles = new Set<string>();
  let match;
  const pattern = JOB_TITLE_PATTERNS[0];
  while ((match = pattern.exec(text)) !== null) {
    titles.add(match[1].trim());
  }

  const experienceSection = text.match(
    /(?:experience|employment|work history|professional experience)[:\s]*([\s\S]{0,2000})/i
  );
  if (experienceSection) {
    const lines = experienceSection[1].split("\n").slice(0, 15);
    for (const line of lines) {
      const trimmed = line.trim();
      if (
        trimmed.length > 5 &&
        trimmed.length < 60 &&
        /^[A-Z]/.test(trimmed) &&
        !trimmed.includes("@")
      ) {
        titles.add(trimmed);
      }
    }
  }

  return Array.from(titles).slice(0, 10);
}

function buildSummary(text: string): string {
  const summaryMatch = text.match(
    /(?:summary|profile|objective|about me)[:\s]*([\s\S]{0,400})/i
  );
  if (summaryMatch) {
    return normalizeText(summaryMatch[1].split("\n\n")[0]).slice(0, 300);
  }
  return normalizeText(text).slice(0, 250);
}

export function extractProfile(
  text: string,
  customSkills: string[] = []
): ExtractedProfile {
  const normalized = text.replace(/\r\n/g, "\n");

  return {
    candidateName: extractCandidateName(normalized),
    email: extractEmail(normalized),
    phone: extractPhone(normalized),
    skills: extractSkills(normalized, customSkills),
    yearsOfExperience: extractYearsOfExperience(normalized),
    education: extractEducation(normalized),
    jobTitles: extractJobTitles(normalized),
    summary: buildSummary(normalized),
  };
}

export function parseJobRequirements(input: {
  title: string;
  description: string;
  requiredSkills: string;
  preferredSkills: string;
  minYearsExperience: number;
  requiredEducation: string;
  keywords: string;
}): import("./types").JobRequirements {
  const splitList = (s: string) =>
    s
      .split(/[,;\n]/)
      .map((x) => x.trim())
      .filter(Boolean);

  const requiredSkills = splitList(input.requiredSkills);
  const preferredSkills = splitList(input.preferredSkills);
  const requiredEducation = splitList(input.requiredEducation);
  const keywords = splitList(input.keywords);

  return {
    title: input.title.trim() || "Open Position",
    description: input.description.trim(),
    requiredSkills,
    preferredSkills,
    minYearsExperience: input.minYearsExperience || 0,
    requiredEducation,
    keywords,
  };
}
