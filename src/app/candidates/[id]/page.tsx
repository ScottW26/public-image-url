import { notFound } from "next/navigation";
import Link from "next/link";
import type { Candidate, Candidacy, CandidateWithMatches } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { FeeProximityBar } from "@/components/FeeProximityBar";
import { getProjectCandidates, getProjects } from "@/lib/atlas";
import { buildCandidateWithMatches } from "@/lib/matching";

export const dynamic = "force-dynamic";

async function loadCandidate(id: string): Promise<CandidateWithMatches | null> {
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

  const entry = personMap.get(id);
  if (!entry) return null;
  return buildCandidateWithMatches({ ...entry.candidate, candidacies: entry.candidacies }, projects);
}

const PHASE_BADGE: Record<string, "green" | "yellow" | "blue" | "gray"> = {
  late_stage: "green",
  first_round: "yellow",
  presentation: "blue",
  internal_selection: "gray",
};

export default async function CandidatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const candidate = await loadCandidate(id);
  if (!candidate) notFound();

  const activeCandidacies = candidate.candidacies.filter((c) => !c.rejectedAt);

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <Link href="/" className="text-sm text-blue-600 hover:underline mb-6 block">
          ← Back to pipeline
        </Link>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm mb-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{candidate.name}</h1>
              <p className="text-gray-500 mt-0.5">{candidate.headline}</p>
              {candidate.email && (
                <a
                  href={`mailto:${candidate.email}`}
                  className="text-sm text-blue-600 hover:underline mt-1 block"
                >
                  {candidate.email}
                </a>
              )}
              {candidate.location && (
                <p className="text-sm text-gray-400 mt-1">{candidate.location}</p>
              )}
            </div>
            {candidate.linkedinUrl && (
              <a
                href={candidate.linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 text-xs text-blue-600 hover:underline"
              >
                LinkedIn
              </a>
            )}
          </div>
          <div className="mt-4">
            <p className="text-xs text-gray-400 mb-1">Fee proximity</p>
            <FeeProximityBar score={candidate.feeProximityScore} />
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <section>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Active in pipeline</h2>
            {activeCandidacies.length === 0 ? (
              <p className="text-sm text-gray-400">Not in any active role.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {activeCandidacies.map((c) => (
                  <div key={c.candidateId} className="rounded-lg border border-gray-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{c.projectRole}</p>
                        <p className="text-xs text-gray-500">{c.company}</p>
                      </div>
                      <Badge variant={PHASE_BADGE[c.stage.phase] ?? "gray"}>{c.stage.stage}</Badge>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{c.stage.status}</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Spec to these clients</h2>
            {candidate.specSuggestions.length === 0 ? (
              <p className="text-sm text-gray-400">No strong spec matches found.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {candidate.specSuggestions.map((p) => (
                  <div key={p.id} className="rounded-lg border border-purple-100 bg-purple-50 p-4">
                    <p className="font-medium text-gray-900 text-sm">{p.company.name}</p>
                    <p className="text-xs text-gray-500">{p.role}</p>
                    <Badge variant="purple">{p.state}</Badge>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="md:col-span-2">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">All role matches</h2>
            {candidate.topMatches.length === 0 ? (
              <p className="text-sm text-gray-400">No matches found across open roles.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {candidate.topMatches.map((m) => (
                  <div
                    key={m.project.id}
                    className="rounded-lg border border-gray-200 bg-white p-4 flex items-start gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm">{m.project.role}</p>
                      <p className="text-xs text-gray-500">{m.project.company.name}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {m.reasons.map((r) => (
                          <Badge key={r} variant="gray">{r}</Badge>
                        ))}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-lg font-bold text-blue-600">{m.score}%</p>
                      <p className="text-xs text-gray-400">match</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
