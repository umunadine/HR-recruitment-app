---
title: HR Recruitment Assistant
emoji: 💼
colorFrom: blue
colorTo: indigo
sdk: gradio
app_file: app.py
pinned: false
---

# HR Recruitment Assistant

A real-time CV screening web application built for HR teams. Upload multiple resumes, define job requirements, and instantly receive employability scores with detailed skill matching and gap analysis.

## Features

- **Bulk CV upload** — PDF, DOCX, and TXT files (up to 20 at once)
- **Job requirement matching** — Required skills, preferred skills, min. experience, education, keywords
- **Employability scoring** — Overall percentage score with breakdown (skills, experience, education, CV quality)
- **Candidate ranking** — Automatically sorted by best fit
- **Gap analysis** — Highlights missing skills, experience gaps, and education concerns
- **Strengths & concerns** — Quick summary for each candidate
- **User-friendly dashboard** — Clean, modern UI built with Next.js and Tailwind CSS

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm

### Installation

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Usage

1. Fill in the **Job Requirements** (title, skills, min. experience, etc.)
2. Click **Load example** to try with sample HR Recruiter criteria
3. **Upload CVs** via drag-and-drop or file browser
4. Click **Analyze** to get instant results
5. Expand each candidate card for detailed scores, skill matches, and gaps

## Scoring Methodology

| Category        | Weight | Description                                      |
|----------------|--------|--------------------------------------------------|
| Skills Match   | 40%    | Required & preferred skills found in CV          |
| Experience     | 25%    | Years of experience vs. minimum requirement      |
| Education      | 10%    | Required education credentials                   |
| Keywords       | 10%    | Additional job-related terms                       |
| CV Quality     | 15%    | Structure, completeness, and professional detail |

**Recommendations:**
- **80%+** — Strong Candidate (recommended for interview)
- **65–79%** — Good Fit
- **45–64%** — Moderate Fit (review carefully)
- **Below 45%** — Weak Match

## Tech Stack

- [Next.js 15](https://nextjs.org/) (App Router)
- [Tailwind CSS 3](https://tailwindcss.com/)
- [pdf-parse](https://www.npmjs.com/package/pdf-parse) — PDF text extraction
- [mammoth](https://www.npmjs.com/package/mammoth) — DOCX text extraction

## Important Note

This tool is designed to **assist** HR screening, not replace human judgment. Always conduct manual review and interviews before making final hiring decisions.

## License

Private — Internal HR use.
