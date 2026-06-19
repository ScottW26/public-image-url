import { NextResponse } from "next/server";
import { getProjectCandidates, getProjects } from "@/lib/atlas";
import { buildCandidateWithMatches } from "@/lib/matching";
import type { Candidate, Candidacy } from "@/types";

export const revalidate = 300;

export async function GET() {
  try {
    const projects = await getProjects();
    const openProjects = projects.filter((p) => p.state !== "closed");

    // Collect all candidates across all open projects
    const personMap = new Map<string, { candidate: Candidate; candidacies: Candidacy[] }>();

    await Promise.all(
      openProjects.map(async (project) => {
        const entries = await getProjectCandidates(project.id, project);
        for (const { candidate, candidacy } of entries) {
          const existing = personMap.get(candidate.id);
          if (existing) {
            existing.candidacies.push(candidacy);
          } else {
            personMap.set(candidate.id, {
              candidate,
              candidacies: [candidacy],
            });
          }
        }
      })
    );

    const candidates = Array.from(personMap.values()).map(({ candidate, candidacies }) =>
      buildCandidateWithMatches({ ...candidate, candidacies }, projects)
    );

    // Sort by fee proximity descending, then by name
    candidates.sort((a, b) => {
      if (b.feeProximityScore !== a.feeProximityScore) {
        return b.feeProximityScore - a.feeProximityScore;
      }
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json(candidates);
  } catch (err) {
    console.error("Candidates API error:", err);
    return NextResponse.json({ error: "Failed to load candidates" }, { status: 500 });
  }
}
