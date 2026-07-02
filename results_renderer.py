from __future__ import annotations
import math
from typing import List

from models import CandidateAnalysis, JobRequirements


_REC = {
    "strong":   {"label": "Strong Candidate", "text": "#065f46", "bg": "#d1fae5", "border": "#6ee7b7"},
    "good":     {"label": "Good Fit",          "text": "#1e40af", "bg": "#dbeafe", "border": "#93c5fd"},
    "moderate": {"label": "Moderate Fit",      "text": "#92400e", "bg": "#fef3c7", "border": "#fcd34d"},
    "weak":     {"label": "Weak Match",        "text": "#991b1b", "bg": "#fee2e2", "border": "#fca5a5"},
}


def _color(score: int) -> str:
    if score >= 80:
        return "#059669"
    if score >= 65:
        return "#2563eb"
    if score >= 45:
        return "#d97706"
    return "#dc2626"


def _ring(score: int) -> str:
    r = 40
    circ = 2 * math.pi * r
    offset = circ * (1 - score / 100)
    color = _color(score)
    return (
        '<div style="position:relative;width:80px;height:80px;flex-shrink:0;">'
        f'<svg width="80" height="80" viewBox="0 0 100 100" style="transform:rotate(-90deg)">'
        f'<circle cx="50" cy="50" r="{r}" fill="none" stroke="#e2e8f0" stroke-width="10"/>'
        f'<circle cx="50" cy="50" r="{r}" fill="none" stroke="{color}" stroke-width="10"'
        f' stroke-linecap="round" stroke-dasharray="{circ:.2f}" stroke-dashoffset="{offset:.2f}"/>'
        "</svg>"
        '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;">'
        f'<span style="font-size:1rem;font-weight:800;color:#ffffff;text-shadow:0 1px 3px rgba(0,0,0,0.5);">{score}%</span>'
        "</div></div>"
    )


def _bar(label: str, value: int) -> str:
    c = _color(value)
    return (
        '<div style="margin-bottom:6px;">'
        '<div style="display:flex;justify-content:space-between;font-size:0.72rem;margin-bottom:2px;">'
        f'<span class="hr-bar-label" style="color:#64748b;">{label}</span>'
        f'<span class="hr-bar-value" style="font-weight:700;color:#ffffff;">{value}%</span>'
        "</div>"
        '<div style="height:6px;background:#e2e8f0;border-radius:9999px;overflow:hidden;">'
        f'<div style="height:100%;width:{value}%;background:{c};border-radius:9999px;"></div>'
        "</div></div>"
    )


def _stat(value: str, label: str, bg: str, border: str, val_color: str, label_color: str) -> str:
    return (
        f'<div style="flex:1;min-width:110px;padding:14px 16px;background:{bg};'
        f'border:1px solid {border};border-radius:10px;text-align:center;">'
        f'<div style="font-size:1.6rem;font-weight:800;color:{val_color};">{value}</div>'
        f'<div style="font-size:0.72rem;color:{label_color};margin-top:2px;">{label}</div>'
        "</div>"
    )


def _card(candidate: CandidateAnalysis, rank: int) -> str:
    cfg    = _REC.get(candidate.recommendation, _REC["weak"])
    scores = candidate.scores
    p      = candidate.profile

    bars = "".join([
        _bar("Skills Match", scores.skills_score),
        _bar("Experience",   scores.experience_score),
        _bar("Education",    scores.education_score),
        _bar("Keywords",     scores.keyword_score),
        _bar("CV Quality",   scores.cv_quality_score),
    ])

    strengths_html = "".join(
        '<li style="display:flex;gap:6px;margin-bottom:3px;font-size:0.78rem;color:#374151;">'
        f'<span style="color:#10b981;flex-shrink:0;">&#10003;</span>{strength}</li>'
        for strength in candidate.strengths
    ) or "<li style='font-size:0.78rem;color:#9ca3af;'>None identified</li>"

    concerns_html = "".join(
        '<li style="display:flex;gap:6px;margin-bottom:3px;font-size:0.78rem;color:#374151;">'
        f'<span style="color:#f59e0b;flex-shrink:0;">&#9650;</span>{concern}</li>'
        for concern in candidate.concerns
    ) or "<li style='font-size:0.78rem;color:#9ca3af;'>No major concerns</li>"

    chips = "".join(
        f'<span style="display:inline-block;padding:2px 9px;border-radius:9999px;font-size:0.68rem;'
        f'font-weight:500;margin:2px;background:{"#d1fae5" if m.found else "#fee2e2"};'
        f'color:{"#065f46" if m.found else "#991b1b"};'
        f'{"text-decoration:line-through;" if not m.found else ""}">'
        f'{m.skill}{"*" if m.importance == "required" else ""}</span>'
        for m in candidate.skill_matches
    )

    email_html = (
        f'<span>&#183;</span>'
        f'<span style="color:#64748b;font-size:0.72rem;">&#9993; {p.email}</span>'
        if p.email else ""
    )

    skills_section = (
        '<div>'
        '<div class="hr-skill-header" style="font-size:0.76rem;font-weight:700;color:#1e293b;margin-bottom:6px;">Skill Matching</div>'
        f'<div style="display:flex;flex-wrap:wrap;">{chips}</div>'
        '<p style="font-size:0.68rem;color:#94a3b8;margin:3px 0 0;">* Required skill</p>'
        '</div>'
    ) if candidate.skill_matches else ""

    return (
        '<div class="hr-card" style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;background:#fff;'
        'margin-bottom:14px;box-shadow:0 1px 4px rgba(0,0,0,0.06);">'

        # ── Header row ──
        '<div style="display:flex;align-items:center;gap:14px;padding:16px 20px;">'
        f'<div style="width:32px;height:32px;border-radius:50%;background:#f1f5f9;display:flex;'
        f'align-items:center;justify-content:center;font-weight:800;color:#475569;'
        f'font-size:0.8rem;flex-shrink:0;">#{rank}</div>'
        f'{_ring(scores.overall_score)}'
        '<div style="flex:1;min-width:0;">'
        '<div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:3px;">'
        f'<span class="hr-name" style="font-size:1rem;font-weight:700;color:#0f172a;">{p.candidate_name}</span>'
        f'<span style="padding:2px 9px;border-radius:9999px;font-size:0.68rem;font-weight:600;'
        f'background:{cfg["bg"]};color:{cfg["text"]};border:1px solid {cfg["border"]};">'
        f'{cfg["label"]}</span>'
        '</div>'
        f'<div style="font-size:0.75rem;color:#64748b;margin-bottom:4px;overflow:hidden;'
        f'text-overflow:ellipsis;white-space:nowrap;">&#128196; {candidate.file_name}</div>'
        '<div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px;font-size:0.72rem;color:#64748b;">'
        f'<span>&#128336; {p.years_of_experience} yrs exp</span>'
        f'<span>&#183;</span><span>&#128295; {len(p.skills)} skills</span>'
        f'{email_html}'
        '</div></div></div>'

        # ── Body ──
        '<div class="hr-card-body" style="border-top:1px solid #f1f5f9;padding:16px 20px;background:#f8fafc;">'
        f'<p class="hr-summary" style="font-size:0.82rem;line-height:1.65;color:#475569;margin:0 0 14px;">{candidate.summary}</p>'
        '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));'
        f'gap:6px;margin-bottom:14px;">{bars}</div>'
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px;">'
        '<div>'
        '<div style="font-size:0.76rem;font-weight:700;color:#065f46;margin-bottom:6px;">&#9989; Strengths</div>'
        f'<ul style="margin:0;padding:0;list-style:none;">{strengths_html}</ul>'
        '</div>'
        '<div>'
        '<div style="font-size:0.76rem;font-weight:700;color:#92400e;margin-bottom:6px;">&#9888; Gaps &amp; Concerns</div>'
        f'<ul style="margin:0;padding:0;list-style:none;">{concerns_html}</ul>'
        '</div>'
        f'</div>{skills_section}'
        '</div></div>'
    )


def render_results(
    candidates: List[CandidateAnalysis],
    job: JobRequirements,
    errors: List[str],
) -> str:
    if not candidates:
        return (
            '<p style="color:#dc2626;padding:16px;font-family:sans-serif;">'
            "No candidates were successfully analysed.</p>"
        )

    strong = sum(1 for c in candidates if c.recommendation == "strong")
    good   = sum(1 for c in candidates if c.recommendation == "good")
    avg    = sum(c.scores.overall_score for c in candidates) // len(candidates)

    stats = (
        '<div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:18px;">'
        + _stat(str(len(candidates)), "Candidates",  "#fff",    "#e2e8f0", "#0f172a", "#64748b")
        + _stat(str(strong),          "Strong Fits", "#d1fae5", "#6ee7b7", "#065f46", "#059669")
        + _stat(str(good),            "Good Fits",   "#dbeafe", "#93c5fd", "#1e40af", "#2563eb")
        + _stat(f"{avg}%",            "Avg Score",   "#fff",    "#e2e8f0", _color(avg), "#64748b")
        + "</div>"
    )

    error_html = ""
    if errors:
        items = "".join(f"<li style='font-size:0.78rem;'>{e}</li>" for e in errors)
        error_html = (
            '<div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;'
            'padding:12px;margin-bottom:14px;color:#92400e;">'
            '<strong style="font-size:0.82rem;">&#9888; Some files could not be processed:</strong>'
            f'<ul style="margin:6px 0 0;padding-left:18px;">{items}</ul>'
            "</div>"
        )

    cards = "".join(_card(c, i + 1) for i, c in enumerate(candidates))

    return (
        "<div class=\"hr-results\" style=\"font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:860px;\">"
        f'<h2 style="font-size:1.2rem;font-weight:800;color:#0f172a;margin:0 0 14px;">'
        f"Analysis Results &#8212; {job.title}</h2>"
        f"{stats}{error_html}{cards}"
        "</div>"
    )
