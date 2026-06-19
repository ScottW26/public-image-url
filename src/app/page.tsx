import { Suspense } from "react";
import type { Candidate, Candidacy, CandidateWithMatches } from "@/types";
import { CandidateBoard } from "@/components/CandidateBoard";
import { getProjectCandidates, getProjects } from "@/lib/atlas";
import { buildCandidateWithMatches } from "@/lib/matching";

export const dynamic = "force-dynamic";

async function loadCandidates(): Promise<CandidateWithMatches[]> {
  const projects = await getProjects();
  const personMap = new Map<string, { candidate: Candidate; candidacies: Candidacy[] }>();

  await Promise.all(
    projects
      .filter((p) => p.state !== "closed")
      .map(async (project) => {
        const entries = await getProjectCandidates(project.id, project);
        for (const { candidate, candidacy } of entries) {
          const existing = personMap.get(candidate.id);
          if (existing) {
            existing.candidacies.push(candidacy);
          } else {
            personMap.set(candidate.id, { candidate, candidacies: [candidacy] });
          }
        }
      })
  );

  return Array.from(personMap.values())
    .map(({ candidate, candidacies }) =>
      buildCandidateWithMatches({ ...candidate, candidacies }, projects)
    )
    .sort((a, b) => {
      if (b.feeProximityScore !== a.feeProximityScore) return b.feeProximityScore - a.feeProximityScore;
      return a.name.localeCompare(b.name);
    });
}

export default async function HomePage() {
  const candidates = await loadCandidates();

  const atOffer = candidates.filter((c) => c.feeProximityScore >= 4).length;
  const interviewing = candidates.filter((c) => c.feeProximityScore === 3).length;
  const presented = candidates.filter((c) => c.feeProximityScore === 2).length;
  const specReady = candidates.filter((c) => c.specSuggestions.length > 0).length;

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Candidate Pipeline</h1>
          <p className="text-sm text-gray-500 mt-1">Williams Recruitment — candidate-first view</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <StatCard label="Late Stage / Offer" value={atOffer} color="text-green-600" />
          <StatCard label="Interviewing" value={interviewing} color="text-yellow-600" />
          <StatCard label="Presented" value={presented} color="text-blue-600" />
          <StatCard label="Spec Opportunities" value={specReady} color="text-purple-600" />
        </div>

        <Suspense fallback={<p className="text-gray-400">Loading candidates…</p>}>
          <CandidateBoard candidates={candidates} />
        </Suspense>
      </div>
    </main>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}
