"use client";

import { useState } from "react";
import { Briefcase, Zap, Shield, BarChart3 } from "lucide-react";
import { ScreeningForm } from "@/components/ScreeningForm";
import { ResultsPanel } from "@/components/ResultsPanel";
import type { AnalysisSession } from "@/lib/types";

export default function HomePage() {
  const [session, setSession] = useState<AnalysisSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  const handleAnalyze = async (formData: FormData) => {
    setIsLoading(true);
    setError(null);
    setWarnings([]);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Analysis failed.");
        if (data.details) setWarnings(data.details);
        return;
      }

      setSession(data.session);
      if (data.errors?.length) setWarnings(data.errors);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewScreening = () => {
    setSession(null);
    setError(null);
    setWarnings([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white">
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">
                HR Recruitment Assistant
              </h1>
              <p className="text-xs text-slate-500">
                Smart CV screening for your hiring team
              </p>
            </div>
          </div>
          {session && (
            <button
              onClick={handleNewScreening}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              New Screening
            </button>
          )}
        </div>
      </header>

      {!session && (
        <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Screen candidates in seconds, not hours
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-slate-600">
              Upload CVs, define your job requirements, and get instant
              employability scores with skill matching, experience analysis, and
              gap identification.
            </p>
          </div>

          <div className="mb-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <Zap className="h-8 w-8 text-amber-500" />
              <h3 className="mt-3 font-semibold text-slate-900">
                Instant Analysis
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                Process multiple CVs at once and rank candidates by fit
                percentage.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <BarChart3 className="h-8 w-8 text-brand-500" />
              <h3 className="mt-3 font-semibold text-slate-900">
                Detailed Scoring
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                Skills, experience, education, and CV quality broken down with
                clear percentages.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <Shield className="h-8 w-8 text-emerald-500" />
              <h3 className="mt-3 font-semibold text-slate-900">
                Gap Detection
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                Instantly see missing qualifications and experience gaps before
                interviews.
              </p>
            </div>
          </div>
        </section>
      )}

      <main className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {warnings.length > 0 && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <p className="font-medium">Notes:</p>
            <ul className="mt-1 list-inside list-disc">
              {warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        )}

        {session ? (
          <ResultsPanel session={session} />
        ) : (
          <ScreeningForm onSubmit={handleAnalyze} isLoading={isLoading} />
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        HR Recruitment Assistant — Designed to support HR decision-making.
        Always review top candidates manually before final hiring decisions.
      </footer>
    </div>
  );
}
