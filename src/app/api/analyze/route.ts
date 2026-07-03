import { NextRequest, NextResponse } from "next/server";
import { analyzeCandidate, sortCandidates } from "@/lib/analyzer";
import { extractTextFromFile } from "@/lib/cv-parser";
import { extractProfile, parseJobRequirements } from "@/lib/profile-extractor";
import type { AnalysisSession } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const title = (formData.get("title") as string) ?? "";
    const description = (formData.get("description") as string) ?? "";
    const requiredSkills = (formData.get("requiredSkills") as string) ?? "";
    const preferredSkills = (formData.get("preferredSkills") as string) ?? "";
    const minYearsExperience = parseInt(
      (formData.get("minYearsExperience") as string) ?? "0",
      10
    );
    const requiredEducation =
      (formData.get("requiredEducation") as string) ?? "";
    const keywords = (formData.get("keywords") as string) ?? "";

    const files = formData.getAll("cvs") as File[];

    if (files.length === 0) {
      return NextResponse.json(
        { error: "Please upload at least one CV file." },
        { status: 400 }
      );
    }

    const job = parseJobRequirements({
      title,
      description,
      requiredSkills,
      preferredSkills,
      minYearsExperience: isNaN(minYearsExperience) ? 0 : minYearsExperience,
      requiredEducation,
      keywords,
    });

    const allSkills = [
      ...job.requiredSkills,
      ...job.preferredSkills,
      ...job.keywords,
    ];

    const candidates = [];
    const errors: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file || file.size === 0) continue;

      try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const text = await extractTextFromFile(buffer, file.name);

        if (!text || text.trim().length < 50) {
          errors.push(`${file.name}: Could not extract enough text from file.`);
          continue;
        }

        const profile = extractProfile(text, allSkills);
        const analysis = analyzeCandidate(
          `candidate-${i}-${Date.now()}`,
          file.name,
          profile,
          job,
          text
        );
        candidates.push(analysis);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        errors.push(`${file.name}: ${message}`);
      }
    }

    if (candidates.length === 0) {
      return NextResponse.json(
        {
          error: "No CVs could be analyzed.",
          details: errors,
        },
        { status: 400 }
      );
    }

    const session: AnalysisSession = {
      job,
      candidates: sortCandidates(candidates),
      analyzedAt: new Date().toISOString(),
    };

    return NextResponse.json({ session, errors });
  } catch (err) {
    console.error("Analysis error:", err);
    return NextResponse.json(
      { error: "Failed to analyze CVs. Please try again." },
      { status: 500 }
    );
  }
}
