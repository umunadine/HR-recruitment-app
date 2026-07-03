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

A smart CV screening tool for HR teams. Upload multiple resumes, describe the role you're hiring for, and instantly get AI-powered scores with detailed skill matching and gap analysis — ranked from best to weakest fit.

🚀 **Live demo**: [huggingface.co/spaces/umunadine/hr-recruitment-assistant](https://huggingface.co/spaces/umunadine/hr-recruitment-assistant)

## Features

- **Bulk CV upload** — PDF, DOCX, and TXT files (up to 20 at once)
- **Job post upload or manual input** — Upload a job posting document or fill in requirements by hand
- **AI-powered analysis** — Each CV is read and evaluated by an LLM against your job requirements
- **Employability scoring** — Overall percentage score with breakdown (skills, experience, education, keywords, CV quality)
- **Candidate ranking** — Automatically sorted by best fit
- **Skill match chips** — Visual breakdown of which skills were found or missing
- **Gap analysis** — Highlights missing skills, experience gaps, and education concerns
- **Strengths & concerns** — Quick summary for each candidate
- **Automatic AI fallback** — If one model hits its rate limit, the app silently switches to the next

## Getting Started

### Prerequisites

- Python 3.10+
- A [Groq API key](https://console.groq.com) (free)
- Optionally a [Gemini API key](https://aistudio.google.com) (free, used as fallback)

### Installation

```bash
pip install -r requirements.txt
```

Create a `.env` file in the project root (see `.env.example`):

```env
GROQ_API_KEY=your_groq_key_here
GEMINI_API_KEY=your_gemini_key_here   # optional but recommended
```

### Run locally

```bash
py app.py
```

Open [http://localhost:7860](http://localhost:7860) in your browser.

### Usage

1. Upload a **job posting** document or fill in the job requirements manually
2. Click **Load Example** to try with sample criteria
3. **Upload CVs** via drag-and-drop or file browser
4. Click **Analyze CVs** to get instant results
5. Review each ranked candidate card for scores, skill matches, and gaps

## AI Models & Fallback Chain

The app uses LLMs via the Groq and Gemini APIs. If a model hits its daily rate limit, it automatically tries the next one in order:

| # | Model | Provider |
|---|-------|----------|
| 1 | `llama-3.3-70b-versatile` | Groq |
| 2 | `llama-3.1-8b-instant` | Groq |
| 3 | `llama3-70b-8192` | Groq |
| 4 | `gemma2-9b-it` | Groq |
| 5 | `mixtral-8x7b-32768` | Groq |
| 6 | `gemini-2.0-flash` | Google |
| 7 | `gemini-1.5-flash` | Google |

## Scoring Methodology

| Category      | Weight | Description                                     |
|---------------|--------|-------------------------------------------------|
| Skills Match  | 40%    | Required & preferred skills found in CV         |
| Experience    | 25%    | Years of experience vs. minimum requirement     |
| Education     | 10%    | Required education credentials                  |
| Keywords      | 10%    | Additional job-related terms                    |
| CV Quality    | 15%    | Structure, completeness, and professional detail|

**Recommendations:**
- **80%+** — Strong Candidate (recommended for interview)
- **65–79%** — Good Fit
- **45–64%** — Moderate Fit (review carefully)
- **Below 45%** — Weak Match

## Tech Stack

- [Gradio](https://gradio.app/) — web UI
- [Groq](https://console.groq.com) + [Google Gemini](https://aistudio.google.com) — LLM inference
- [pypdf](https://pypdf.readthedocs.io/) — PDF text extraction
- [python-docx](https://python-docx.readthedocs.io/) — DOCX text extraction
- [Pydantic v2](https://docs.pydantic.dev/) — data validation

## Deployment on Hugging Face Spaces

The app is deployed on [Hugging Face Spaces](https://huggingface.co/spaces) using the Gradio SDK.

To deploy your own copy:
1. Create a new Space at [huggingface.co/new-space](https://huggingface.co/new-space) — select **Gradio** as the SDK
2. Add your API keys as **Secrets** in Space Settings (`GROQ_API_KEY`, `GEMINI_API_KEY`)
3. Push the Python files:

```bash
git remote add space https://huggingface.co/spaces/<your-username>/<space-name>
git push space master:main
```

## Important Note

This tool is designed to **assist** HR screening, not replace human judgment. Always conduct manual review and interviews before making final hiring decisions.

## License

Private — Internal HR use.
