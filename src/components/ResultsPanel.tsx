"use client";

import React from "react";
import {
  Briefcase,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  TrendingUp,
  Users,
  Clock,
  Target,
} from "lucide-react";
import type { CandidateAnalysis, AnalysisSession } from "@/lib/types";

const RECOMMENDATION_CONFIG = {
  strong: {
    label: "Strong Candidate",
    color: "text-emerald-700",
    bg: "bg-emerald-50 border-emerald-200",
    badge: "bg-emerald-100 text-emerald-800",
    icon: CheckCircle2,
  },
  good: {
    label: "Good Fit",
    color: "text-blue-700",
    bg: "bg-blue-50 border-blue-200",
    badge: "bg-blue-100 text-blue-800",
    icon: TrendingUp,
  },
  moderate: {
    label: "Moderate Fit",
    color: "text-amber-700",
    bg: "bg-amber-50 border-amber-200",
    badge: "bg-amber-100 text-amber-800",
    icon: AlertTriangle,
  },
  weak: {
    label: "Weak Match",
    color: "text-red-700",
    bg: "bg-red-50 border-red-200",
    badge: "bg-red-100 text-red-800",
    icon: XCircle,
  },
};

function ScoreRing({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (score / 100) * circumference;
  const color =
    score >= 80
      ? "#059669"
      : score >= 65
        ? "#2563eb"
        : score >= 45
          ? "#d97706"
          : "#dc2626";

  return (
    <div className="relative flex h-24 w-24 items-center justify-center">
      <svg className="h-24 w-24 -rotate-90" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="8"
        />
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute text-center">
        <span className="text-2xl font-bold text-slate-900">{score}%</span>
      </div>
    </div>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const color =
    value >= 80
      ? "bg-emerald-500"
      : value >= 65
        ? "bg-blue-500"
        : value >= 45
          ? "bg-amber-500"
          : "bg-red-500";

  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-slate-600">{label}</span>
        <span className="font-medium text-slate-800">{value}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function CandidateCard({
  candidate,
  rank,
  isExpanded,
  onToggle,
}: {
  candidate: CandidateAnalysis;
  rank: number;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const config = RECOMMENDATION_CONFIG[candidate.recommendation];
  const Icon = config.icon;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-4 p-5 text-left"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600">
          #{rank}
        </div>

        <ScoreRing score={candidate.scores.overallScore} />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-slate-900">
              {candidate.profile.candidateName}
            </h3>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${config.badge}`}
            >
              <Icon className="h-3 w-3" />
              {config.label}
            </span>
          </div>
          <p className="mt-0.5 truncate text-sm text-slate-500">
            {candidate.fileName}
          </p>
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-600">
            <span>{candidate.profile.yearsOfExperience} yrs experience</span>
            <span>•</span>
            <span>{candidate.profile.skills.length} skills found</span>
            {candidate.profile.email && (
              <>
                <span>•</span>
                <span>{candidate.profile.email}</span>
              </>
            )}
          </div>
        </div>

        <div className="hidden shrink-0 text-slate-400 sm:block">
          {isExpanded ? "▲" : "▼"}
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-slate-100 bg-slate-50/50 p-5">
          <p className="mb-4 text-sm leading-relaxed text-slate-700">
            {candidate.summary}
          </p>

          <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <ScoreBar label="Skills Match" value={candidate.scores.skillsScore} />
            <ScoreBar
              label="Experience"
              value={candidate.scores.experienceScore}
            />
            <ScoreBar
              label="Education"
              value={candidate.scores.educationScore}
            />
            <ScoreBar label="Keywords" value={candidate.scores.keywordScore} />
            <ScoreBar
              label="CV Quality"
              value={candidate.scores.cvQualityScore}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="mb-2 text-sm font-semibold text-emerald-800">
                Strengths
              </h4>
              <ul className="space-y-1">
                {candidate.strengths.map((s, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-slate-700"
                  >
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="mb-2 text-sm font-semibold text-amber-800">
                Gaps & Concerns
              </h4>
              {candidate.concerns.length > 0 ? (
                <ul className="space-y-1">
                  {candidate.concerns.map((c, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-slate-700"
                    >
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                      {c}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">
                  No major gaps identified.
                </p>
              )}
            </div>
          </div>

          {candidate.skillMatches.length > 0 && (
            <div className="mt-4">
              <h4 className="mb-2 text-sm font-semibold text-slate-800">
                Skill Matching
              </h4>
              <div className="flex flex-wrap gap-2">
                {candidate.skillMatches.map((match, i) => (
                  <span
                    key={i}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      match.found
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-red-100 text-red-800 line-through"
                    }`}
                  >
                    {match.skill}
                    {match.importance === "required" && " *"}
                  </span>
                ))}
              </div>
              <p className="mt-1 text-xs text-slate-500">* Required skill</p>
            </div>
          )}

          {candidate.profile.skills.length > 0 && (
            <div className="mt-4">
              <h4 className="mb-2 text-sm font-semibold text-slate-800">
                Extracted Skills
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {candidate.profile.skills.map((skill, i) => (
                  <span
                    key={i}
                    className="rounded-md bg-white px-2 py-0.5 text-xs text-slate-700 ring-1 ring-slate-200"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ResultsPanel({ session }: { session: AnalysisSession }) {
  const [expandedId, setExpandedId] = React.useState<string | null>(
    session.candidates[0]?.id ?? null
  );

  const strongCount = session.candidates.filter(
    (c) => c.recommendation === "strong"
  ).length;
  const goodCount = session.candidates.filter(
    (c) => c.recommendation === "good"
  ).length;
  const avgScore = Math.round(
    session.candidates.reduce((sum, c) => sum + c.scores.overallScore, 0) /
      session.candidates.length
  );

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Analysis Results
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {session.job.title} — {session.candidates.length} candidate
              {session.candidates.length !== 1 ? "s" : ""} analyzed
            </p>
          </div>
          <div className="text-right text-xs text-slate-400">
            <Clock className="mb-1 inline h-3 w-3" />{" "}
            {new Date(session.analyzedAt).toLocaleString()}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg bg-emerald-50 p-4">
            <div className="flex items-center gap-2 text-emerald-700">
              <Target className="h-5 w-5" />
              <span className="text-sm font-medium">Strong Candidates</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-emerald-900">
              {strongCount}
            </p>
          </div>
          <div className="rounded-lg bg-blue-50 p-4">
            <div className="flex items-center gap-2 text-blue-700">
              <Users className="h-5 w-5" />
              <span className="text-sm font-medium">Good Fits</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-blue-900">{goodCount}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-slate-700">
              <Briefcase className="h-5 w-5" />
              <span className="text-sm font-medium">Average Score</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {avgScore}%
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {session.candidates.map((candidate, index) => (
          <CandidateCard
            key={candidate.id}
            candidate={candidate}
            rank={index + 1}
            isExpanded={expandedId === candidate.id}
            onToggle={() =>
              setExpandedId(
                expandedId === candidate.id ? null : candidate.id
              )
            }
          />
        ))}
      </div>
    </div>
  );
}
