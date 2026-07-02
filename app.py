from __future__ import annotations
import os
import warnings

# Suppress Gradio/Starlette internal deprecation noise (not our code)
warnings.filterwarnings("ignore", message=".*HTTP_422_UNPROCESSABLE_ENTITY.*")
warnings.filterwarnings("ignore", message=".*HTTP_422_UNPROCESSABLE_CONTENT.*")

import gradio as gr
from dotenv import load_dotenv

from cv_parser import extract_text_from_file
from analyzer import analyze_candidate, parse_job_post
from models import JobRequirements
from results_renderer import render_results

load_dotenv()

# ── Example job ───────────────────────────────────────────────────────────────

_EXAMPLE = dict(
    title="HR Recruiter",
    description=(
        "We are looking for an experienced HR Recruiter to manage full-cycle recruitment, "
        "source top talent, and partner with hiring managers to fill open positions efficiently."
    ),
    required_skills="Recruitment, Talent Acquisition, Interviewing, HR, Communication, ATS",
    preferred_skills="LinkedIn Recruiter, Workday, Greenhouse, People Analytics, Onboarding",
    min_experience=3,
    education="Bachelor's",
    keywords="hiring, candidate sourcing, job posting, offer negotiation, stakeholder management",
)

# ── File helper ───────────────────────────────────────────────────────────────

def _resolve_file(file_obj) -> tuple[str, str] | None:
    """Return (file_path, display_name) from a Gradio file object (v4, v5, or v6)."""
    if file_obj is None:
        return None
    if hasattr(file_obj, "path"):
        path = file_obj.path
        name = getattr(file_obj, "orig_name", os.path.basename(path))
    elif isinstance(file_obj, dict):
        path = file_obj.get("path") or file_obj.get("name", "")
        name = file_obj.get("orig_name") or os.path.basename(path)
    else:
        path = str(file_obj)
        name = os.path.basename(path)
    return path, name

# ── Job post upload callback ──────────────────────────────────────────────────

def upload_job_post(file_obj):
    """Parse a job posting file with GPT-4o and auto-populate the form fields."""
    empty = ("", "", "", "", 0, "", "")
    if not file_obj:
        return empty
    if not os.getenv("GROQ_API_KEY"):
        return (f"⚠ GROQ_API_KEY not set", "", "", "", 0, "", "")
    resolved = _resolve_file(file_obj)
    if not resolved:
        return empty
    file_path, file_name = resolved
    try:
        with open(file_path, "rb") as fh:
            file_bytes = fh.read()
        text = extract_text_from_file(file_bytes, file_name)
        fields = parse_job_post(text)
        return (
            fields["title"],
            fields["description"],
            fields["required_skills"],
            fields["preferred_skills"],
            fields["min_experience"],
            fields["education"],
            fields["keywords"],
        )
    except Exception as exc:
        return (f"Error parsing job post: {exc}", "", "", "", 0, "", "")

# ── Main analysis callback ────────────────────────────────────────────────────

def analyze(
    title, description, required_skills, preferred_skills,
    min_experience, education, keywords, cv_files,
    progress=gr.Progress(),
):
    if not os.getenv("GROQ_API_KEY"):
        return (
            '<p style="color:#dc2626;padding:16px;font-family:sans-serif;">'
            "<strong>&#9888; GROQ_API_KEY not found.</strong> "
            "Create a <code>.env</code> file with <code>GROQ_API_KEY=gsk_...</code> and restart.</p>"
        )
    if not cv_files:
        return '<p style="color:#dc2626;padding:16px;font-family:sans-serif;">Please upload at least one CV file.</p>'

    def split(s: str) -> list[str]:
        return [x.strip() for x in (s or "").split(",") if x.strip()]

    job = JobRequirements(
        title=title or "Unknown Position",
        description=description or "",
        required_skills=split(required_skills),
        preferred_skills=split(preferred_skills),
        min_years_experience=int(min_experience or 0),
        required_education=split(education),
        keywords=split(keywords),
    )

    cv_data: list[tuple[str, str]] = []
    parse_errors: list[str] = []

    progress(0.02, desc="Parsing CV files…")
    for file_obj in cv_files:
        resolved = _resolve_file(file_obj)
        if not resolved:
            continue
        file_path, file_name = resolved
        try:
            with open(file_path, "rb") as fh:
                file_bytes = fh.read()
            text = extract_text_from_file(file_bytes, file_name)
            if len(text.strip()) < 50:
                parse_errors.append(f"{file_name}: Could not extract enough readable text.")
            else:
                cv_data.append((file_name, text))
        except Exception as exc:
            parse_errors.append(f"{file_name}: {exc}")

    if not cv_data:
        items = "".join(f"<li>{e}</li>" for e in parse_errors)
        return f'<p style="color:#dc2626;font-family:sans-serif;">No CVs could be processed.<ul>{items}</ul></p>'

    candidates = []
    analysis_errors: list[str] = []

    for i, (file_name, cv_text) in enumerate(cv_data):
        progress(
            0.1 + (i / len(cv_data)) * 0.85,
            desc=f"Analysing {file_name} with GPT-4o… ({i + 1}/{len(cv_data)})",
        )
        try:
            result = analyze_candidate(file_name, cv_text, job)
            candidates.append(result)
        except Exception as exc:
            analysis_errors.append(f"{file_name}: {exc}")

    progress(1.0, desc="Done!")

    if not candidates:
        items = "".join(f"<li>{e}</li>" for e in parse_errors + analysis_errors)
        return f'<p style="color:#dc2626;font-family:sans-serif;">All CV analyses failed.<ul>{items}</ul></p>'

    candidates.sort(key=lambda c: c.scores.overall_score, reverse=True)
    return render_results(candidates, job, parse_errors + analysis_errors)


def load_example():
    return (
        _EXAMPLE["title"], _EXAMPLE["description"],
        _EXAMPLE["required_skills"], _EXAMPLE["preferred_skills"],
        _EXAMPLE["min_experience"], _EXAMPLE["education"],
        _EXAMPLE["keywords"],
    )


# ── Styles ────────────────────────────────────────────────────────────────────

_CSS = """
/* ─── Force light mode — override OS dark preference ─── */
:root, html, body {
    color-scheme: light !important;
}

/* ─── CSS variable overrides: light mode ─── */
:root {
    --body-background-fill: #f1f5f9;
    --block-background-fill: #ffffff;
    --input-background-fill: #f8fafc;
    --input-background-fill-focus: #ffffff;
    --border-color-primary: #e2e8f0;
    --border-color-accent: #cbd5e1;
    --label-background-fill: transparent;
    --label-text-color: #374151;
    --block-border-color: #e2e8f0;
    --block-border-width: 1px;
    --block-shadow: 0 1px 3px rgba(0,0,0,0.05);
    --block-radius: 10px;
    --input-radius: 8px;
    --button-primary-background-fill: #2563eb;
    --button-primary-background-fill-hover: #1d4ed8;
    --button-primary-text-color: #ffffff;
    --button-secondary-background-fill: #ffffff;
    --button-secondary-background-fill-hover: #f8fafc;
    --button-secondary-text-color: #374151;
    --button-secondary-border-color: #e2e8f0;
    --color-accent: #2563eb;
}

/* ─── Remove Gradio footer completely ─── */
footer,
.footer,
.gradio-footer,
.built-with,
[class*="footer"] { display: none !important; }

/* ─── Label text — no coloured badge ─── */
.label-wrap span,
label > span,
.block label span {
    background: transparent !important;
    color: #374151 !important;
    font-weight: 600 !important;
    font-size: 0.82rem !important;
    border-radius: 0 !important;
    padding: 0 !important;
    box-shadow: none !important;
}

/* ─── Inputs ─── */
input[type="text"],
input[type="number"],
textarea {
    border: 1px solid #e2e8f0 !important;
    background: #f8fafc !important;
    border-radius: 8px !important;
    color: #0f172a !important;
}
input[type="text"]:focus,
textarea:focus {
    border-color: #93c5fd !important;
    outline: none !important;
    background: #ffffff !important;
}

/* ─── Markdown separators ─── */
.divider-row {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 2px 0;
    color: #94a3b8;
    font-size: 0.78rem;
    font-style: italic;
}
.divider-row::before,
.divider-row::after {
    content: '';
    flex: 1;
    height: 1px;
    background: #e2e8f0;
}

/* ─── Analyse button ─── */
.analyze-btn {
    font-size: 1rem !important;
    font-weight: 700 !important;
    height: 52px !important;
    letter-spacing: 0.01em !important;
}

/* ─── Main container — centred ─── */
body {
    min-height: 100vh;
    background: #f1f5f9;
}
.gradio-container {
    max-width: 1200px !important;
    width: 100% !important;
    margin: 0 auto !important;
    padding: 0 24px !important;
    box-sizing: border-box !important;
}

/* ─── Title ─── */
:root { --hr-title-color: #0f172a; }
.app-title { color: #0f172a; }

/* ─── Results panel dark mode ─── */
html.dark .hr-title { color: #f8fafc !important; -webkit-text-fill-color: #f8fafc !important; }
html.dark .hr-scoring-guide, html.dark .hr-scoring-guide p,
html.dark .hr-scoring-guide td, html.dark .hr-scoring-guide th { color: #e2e8f0 !important; }
html.dark .hr-results h2 { color: #f1f5f9 !important; }
html.dark .hr-name { color: #f1f5f9 !important; }
html.dark .hr-summary { color: #cbd5e1 !important; }
html.dark .hr-skill-header { color: #94a3b8 !important; }
html.dark .hr-results li { color: #cbd5e1 !important; }
html.dark .hr-bar-value { color: #f1f5f9 !important; }
html.dark .hr-bar-label { color: #94a3b8 !important; }
html.dark .hr-card { background: #1e293b !important; border-color: #334155 !important; }
html.dark .hr-card-body { background: #162032 !important; border-color: #1e293b !important; }

/* ─── Dark mode — covers both html.dark class AND OS media query ─── */
@media (prefers-color-scheme: dark) {
    :root { --hr-title-color: #f8fafc; }
    body, .gradio-container { background: #0f172a !important; color: #f1f5f9 !important; }
    .block, .form, .panel, .wrap { background: transparent !important; border-color: transparent !important; box-shadow: none !important; }
    input, textarea, select {
        background: #1e293b !important; background-color: #1e293b !important;
        border-color: #334155 !important; color: #f1f5f9 !important;
    }
    input::placeholder, textarea::placeholder { color: #94a3b8 !important; }
    label, .label-wrap span, label > span,
    .block label, .form label, .gradio-container label,
    label span, .label-wrap, .label-wrap > span,
    .svelte-1b6s6s, [class*="label"] { color: #ffffff !important; background: transparent !important; }
    .markdown, .prose { color: #e2e8f0 !important; }
    .hr-results h2, .hr-name, .hr-bar-value { color: #ffffff !important; }
    .hr-summary, .hr-results li { color: #e2e8f0 !important; }
    .hr-bar-label, .hr-skill-header { color: #94a3b8 !important; }
    .hr-card      { background: #1e293b !important; border-color: #334155 !important; }
    .hr-card-body { background: #162032 !important; border-color: #1e293b !important; }
    html { --hr-title-color: #f8fafc; }
    .hr-title { color: #f8fafc !important; -webkit-text-fill-color: #f8fafc !important; }
    .hr-scoring-guide, .hr-scoring-guide p,
    .hr-scoring-guide td, .hr-scoring-guide th { color: #e2e8f0 !important; }
}
html.dark body,
html.dark .gradio-container {
    background: #0f172a !important;
    color: #FFFFFF !important;
}
html.dark .block,
html.dark .form,
html.dark .panel,
html.dark .wrap,
html.dark .svelte-1gfkn6j,
html.dark [class*="block"] {
    background: transparent !important;
    border-color: transparent !important;
    box-shadow: none !important;
}
/* Inputs — use high specificity to beat Gradio’s scoped styles */
html.dark .gradio-container input,
html.dark .gradio-container textarea,
html.dark .gradio-container select,
html.dark input[type="text"],
html.dark input[type="number"],
html.dark textarea {
    background: #1e293b !important;
    background-color: #1e293b !important;
    border-color: #334155 !important;
    color: #f1f5f9 !important;
}
html.dark input::placeholder,
html.dark textarea::placeholder {
    color: #94a3b8 !important;
}
html.dark p,
html.dark span:not(#hr-sun-icon):not(#hr-moon-icon):not(#hr-pill-knob),
html.dark label,
html.dark h1, html.dark h2, html.dark h3 {
    color: #ffffff !important;
}
html.dark .label-wrap span,
html.dark label > span,
html.dark .block label,
html.dark .form label,
html.dark .gradio-container label,
html.dark label span,
html.dark .label-wrap,
html.dark .label-wrap > span {
    color: #ffffff !important;
    background: transparent !important;
}
html.dark .markdown,
html.dark .prose { color: #e2e8f0 !important; }
html.dark button:not(#hr-pill-btn):not([class*="primary"]) {
    background: #1e293b !important;
    border-color: #334155 !important;
    color: #e2e8f0 !important;
}
/* File-upload drop zones — targeted by ID */
html.dark #job-post-upload,
html.dark #cv-upload {
    background: #1e293b !important;
    border-color: #334155 !important;
    border-radius: 10px !important;
}
@media (prefers-color-scheme: dark) {
    #job-post-upload,
    #cv-upload {
        background: #1e293b !important;
        border-color: #334155 !important;
        border-radius: 10px !important;
    }
}
"""

_JS = """
() => {
    function forceLight() {
        document.documentElement.classList.remove('dark');
    }

    // Run immediately, then repeatedly while Gradio is still mounting
    forceLight();
    [50, 150, 300, 600, 1000, 1800].forEach(ms => setTimeout(forceLight, ms));

    // Keep it removed permanently after that
    new MutationObserver(forceLight)
        .observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
}
"""

# ── Gradio UI ─────────────────────────────────────────────────────────────────

with gr.Blocks(
    title="HR Recruitment Assistant",
    theme=gr.themes.Default(),
    css=_CSS,
    js=_JS,
) as demo:

    # Header
    gr.HTML("""
    <div style="text-align:center;padding:22px 0 4px;">
      <div style="font-size:1.85rem;font-weight:800;margin:0;letter-spacing:-0.02em;font-family:inherit;">
        <span class="hr-title" style="color:var(--hr-title-color,#0f172a);-webkit-text-fill-color:var(--hr-title-color,#0f172a);background:none;">HR Recruitment Assistant</span>
      </div>
    </div>
    """)

    with gr.Row(equal_height=False):
        # ── Left: Job Requirements ─────────────────────────────────────────
        with gr.Column(scale=3):
            gr.Markdown("### 📋 Job Requirements")

            job_post_upload = gr.File(
                label="Upload Job Post  (PDF / DOCX / TXT — auto-fills fields below)",
                file_count="single",
                file_types=[".pdf", ".docx", ".doc", ".txt"],
                height=170,
                elem_id="job-post-upload",
            )
            gr.HTML('<div class="divider-row">or fill in manually</div>')

            title_in    = gr.Textbox(label="Job Title",
                                     placeholder="e.g. Senior Data Analyst")
            desc_in     = gr.Textbox(label="Job Description", lines=4,
                                     placeholder="Describe responsibilities, team, and expectations…")
            req_skills  = gr.Textbox(label="Required Skills (comma-separated)",
                                     placeholder="Python, SQL, Excel, Communication")
            pref_skills = gr.Textbox(label="Preferred Skills (comma-separated)",
                                     placeholder="Tableau, Power BI, Looker")
            with gr.Row():
                min_exp = gr.Number(label="Min Years of Experience", value=0, minimum=0)
                edu_in  = gr.Textbox(label="Required Education",
                                     placeholder="Bachelor's, Master's")
            keywords_in = gr.Textbox(label="Keywords (comma-separated)",
                                     placeholder="data pipeline, stakeholder reporting, agile")
            example_btn = gr.Button("📄 Load Example", variant="secondary", size="sm")

        # ── Right: Upload CVs ──────────────────────────────────────────────
        with gr.Column(scale=2):
            gr.Markdown("### 📂 Upload CVs")
            cv_upload = gr.File(
                label="Drag & drop CV files here",
                file_count="multiple",
                file_types=[".pdf", ".docx", ".doc", ".txt"],
                height=300,
                elem_id="cv-upload",
            )
            gr.Markdown("*Supported: PDF, DOCX, DOC, TXT — up to 20 files*")

    analyze_btn = gr.Button(
        "🔍  Analyse Candidates",
        variant="primary",
        elem_classes=["analyze-btn"],
    )

    with gr.Accordion("📊 Scoring Guide", open=False):
        gr.HTML("""
        <div class="hr-scoring-guide" style="font-family:sans-serif;font-size:0.88rem;color:#374151;padding:4px 8px 8px;">
          <div style="display:flex;gap:32px;flex-wrap:wrap;">
            <div>
              <p style="font-weight:700;margin:0 0 6px;color:#0f172a;">&#127381; Recommendation Bands</p>
              <table style="border-collapse:collapse;">
                <tr>
                  <td style="padding:3px 10px 3px 0;"><span style="background:#d1fae5;color:#065f46;font-weight:700;padding:2px 9px;border-radius:999px;">Strong Candidate</span></td>
                  <td style="color:#374151;">Overall score &ge; 80 <em>and</em> no missing required skills</td>
                </tr>
                <tr>
                  <td style="padding:3px 10px 3px 0;"><span style="background:#dbeafe;color:#1e40af;font-weight:700;padding:2px 9px;border-radius:999px;">Good Fit</span></td>
                  <td style="color:#374151;">Overall score 65 &ndash; 79</td>
                </tr>
                <tr>
                  <td style="padding:3px 10px 3px 0;"><span style="background:#fef3c7;color:#92400e;font-weight:700;padding:2px 9px;border-radius:999px;">Moderate Fit</span></td>
                  <td style="color:#374151;">Overall score 45 &ndash; 64</td>
                </tr>
                <tr>
                  <td style="padding:3px 10px 3px 0;"><span style="background:#fee2e2;color:#991b1b;font-weight:700;padding:2px 9px;border-radius:999px;">Weak Match</span></td>
                  <td style="color:#374151;">Overall score &lt; 45</td>
                </tr>
              </table>
            </div>
            <div>
              <p style="font-weight:700;margin:0 0 6px;color:#0f172a;">&#9878; Score Weights (total 100%)</p>
              <table style="border-collapse:collapse;">
                <tr><td style="padding:3px 10px 3px 0;font-weight:600;">Skills</td><td style="color:#374151;">40% &mdash; required (70%) + preferred (30%) match</td></tr>
                <tr><td style="padding:3px 10px 3px 0;font-weight:600;">Experience</td><td style="color:#374151;">25% &mdash; proportional to required years</td></tr>
                <tr><td style="padding:3px 10px 3px 0;font-weight:600;">CV Quality</td><td style="color:#374151;">15% &mdash; completeness &amp; professionalism</td></tr>
                <tr><td style="padding:3px 10px 3px 0;font-weight:600;">Education</td><td style="color:#374151;">10% &mdash; % of required criteria met</td></tr>
                <tr><td style="padding:3px 10px 3px 0;font-weight:600;">Keywords</td><td style="color:#374151;">10% &mdash; keyword density in CV</td></tr>
              </table>
            </div>
          </div>
        </div>
        """)

    results_out = gr.HTML()

    # ── Event wiring ───────────────────────────────────────────────────────────
    job_post_upload.change(
        fn=upload_job_post,
        inputs=[job_post_upload],
        outputs=[title_in, desc_in, req_skills, pref_skills, min_exp, edu_in, keywords_in],
    )
    example_btn.click(
        fn=load_example,
        outputs=[title_in, desc_in, req_skills, pref_skills, min_exp, edu_in, keywords_in],
    )
    analyze_btn.click(
        fn=analyze,
        inputs=[title_in, desc_in, req_skills, pref_skills, min_exp, edu_in, keywords_in, cv_upload],
        outputs=[results_out],
    )

if __name__ == "__main__":
    demo.launch(server_name="0.0.0.0", server_port=7860)
