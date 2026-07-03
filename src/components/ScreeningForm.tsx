"use client";

import { useCallback, useState } from "react";
import {
  Upload,
  FileText,
  X,
  Loader2,
  Sparkles,
  ClipboardList,
} from "lucide-react";

interface JobFormData {
  title: string;
  description: string;
  requiredSkills: string;
  preferredSkills: string;
  minYearsExperience: string;
  requiredEducation: string;
  keywords: string;
}

interface ScreeningFormProps {
  onSubmit: (formData: FormData) => Promise<void>;
  isLoading: boolean;
}

const DEFAULT_JOB: JobFormData = {
  title: "",
  description: "",
  requiredSkills: "",
  preferredSkills: "",
  minYearsExperience: "0",
  requiredEducation: "",
  keywords: "",
};

const EXAMPLE_JOB: JobFormData = {
  title: "HR Recruiter",
  description:
    "We are looking for an experienced HR Recruiter to manage full-cycle recruitment, source top talent, and partner with hiring managers to fill open positions efficiently.",
  requiredSkills:
    "Recruitment, Talent Acquisition, Interviewing, HR, Communication, ATS",
  preferredSkills:
    "LinkedIn Recruiter, Workday, Greenhouse, People Analytics, Onboarding",
  minYearsExperience: "3",
  requiredEducation: "Bachelor's",
  keywords:
    "hiring, candidate sourcing, job posting, offer negotiation, stakeholder management",
};

export function ScreeningForm({ onSubmit, isLoading }: ScreeningFormProps) {
  const [job, setJob] = useState<JobFormData>(DEFAULT_JOB);
  const [files, setFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);

  const updateField = (field: keyof JobFormData, value: string) => {
    setJob((prev) => ({ ...prev, [field]: value }));
  };

  const handleFiles = useCallback((incoming: FileList | File[]) => {
    const allowed = [".pdf", ".docx", ".doc", ".txt"];
    const newFiles = Array.from(incoming).filter((f) => {
      const ext = "." + f.name.split(".").pop()?.toLowerCase();
      return allowed.includes(ext);
    });
    setFiles((prev) => {
      const combined = [...prev, ...newFiles];
      const unique = combined.filter(
        (file, index, self) =>
          index === self.findIndex((f) => f.name === file.name)
      );
      return unique.slice(0, 20);
    });
  }, []);

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const loadExample = () => setJob(EXAMPLE_JOB);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) return;

    const formData = new FormData();
    formData.append("title", job.title);
    formData.append("description", job.description);
    formData.append("requiredSkills", job.requiredSkills);
    formData.append("preferredSkills", job.preferredSkills);
    formData.append("minYearsExperience", job.minYearsExperience);
    formData.append("requiredEducation", job.requiredEducation);
    formData.append("keywords", job.keywords);
    files.forEach((file) => formData.append("cvs", file));

    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-brand-600" />
            <h2 className="text-lg font-semibold text-slate-900">
              Job Requirements
            </h2>
          </div>
          <button
            type="button"
            onClick={loadExample}
            className="text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            Load example
          </button>
        </div>

        <div className="grid gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Job Title *
            </label>
            <input
              type="text"
              required
              value={job.title}
              onChange={(e) => updateField("title", e.target.value)}
              placeholder="e.g. Senior Software Engineer"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Job Description
            </label>
            <textarea
              rows={4}
              value={job.description}
              onChange={(e) => updateField("description", e.target.value)}
              placeholder="Describe the role, responsibilities, and ideal candidate profile..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Required Skills *
              </label>
              <textarea
                rows={3}
                required
                value={job.requiredSkills}
                onChange={(e) => updateField("requiredSkills", e.target.value)}
                placeholder="Comma-separated: Python, SQL, Project Management"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Preferred Skills
              </label>
              <textarea
                rows={3}
                value={job.preferredSkills}
                onChange={(e) => updateField("preferredSkills", e.target.value)}
                placeholder="Comma-separated: AWS, Agile, Leadership"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Min. Years Experience
              </label>
              <input
                type="number"
                min="0"
                max="40"
                value={job.minYearsExperience}
                onChange={(e) =>
                  updateField("minYearsExperience", e.target.value)
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Required Education
              </label>
              <input
                type="text"
                value={job.requiredEducation}
                onChange={(e) =>
                  updateField("requiredEducation", e.target.value)
                }
                placeholder="Bachelor's, Master's"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Additional Keywords
              </label>
              <input
                type="text"
                value={job.keywords}
                onChange={(e) => updateField("keywords", e.target.value)}
                placeholder="Industry terms, certifications"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Upload className="h-5 w-5 text-brand-600" />
          <h2 className="text-lg font-semibold text-slate-900">
            Upload CVs
          </h2>
          <span className="ml-auto text-xs text-slate-500">
            PDF, DOCX, TXT — up to 20 files
          </span>
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            handleFiles(e.dataTransfer.files);
          }}
          className={`rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
            dragActive
              ? "border-brand-400 bg-brand-50"
              : "border-slate-300 bg-slate-50 hover:border-brand-300"
          }`}
        >
          <Upload className="mx-auto h-10 w-10 text-slate-400" />
          <p className="mt-3 text-sm font-medium text-slate-700">
            Drag & drop CV files here
          </p>
          <p className="mt-1 text-xs text-slate-500">or</p>
          <label className="mt-3 inline-block cursor-pointer rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
            Browse Files
            <input
              type="file"
              multiple
              accept=".pdf,.docx,.doc,.txt"
              className="hidden"
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
            />
          </label>
        </div>

        {files.length > 0 && (
          <ul className="mt-4 space-y-2">
            {files.map((file, index) => (
              <li
                key={`${file.name}-${index}`}
                className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2"
              >
                <FileText className="h-4 w-4 shrink-0 text-brand-500" />
                <span className="min-w-0 flex-1 truncate text-sm text-slate-700">
                  {file.name}
                </span>
                <span className="text-xs text-slate-400">
                  {(file.size / 1024).toFixed(0)} KB
                </span>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-red-500"
                  aria-label={`Remove ${file.name}`}
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        type="submit"
        disabled={isLoading || files.length === 0 || !job.title || !job.requiredSkills}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-3.5 text-base font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Analyzing CVs...
          </>
        ) : (
          <>
            <Sparkles className="h-5 w-5" />
            Analyze {files.length > 0 ? `${files.length} CV${files.length > 1 ? "s" : ""}` : "Candidates"}
          </>
        )}
      </button>
    </form>
  );
}
