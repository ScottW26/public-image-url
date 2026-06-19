"use client";

import Link from "next/link";
import type { CandidateWithMatches } from "@/types";
import { Badge } from "./ui/Badge";
import { FeeProximityBar } from "./FeeProximityBar";

const PHASE_BADGE: Record<string, "green" | "yellow" | "blue" | "gray"> = {
  late_stage: "green",
  first_round: "yellow",
  presentation: "blue",
  internal_selection: "gray",
};

export function CandidateCard({ candidate }: { candidate: CandidateWithMatches }) {
  const activeCandidacies = candidate.candidacies.filter((c) => !c.rejectedAt);
  const topCandidacy = activeCandidacies.sort((a, b) => {
    const order = { late_stage: 4, first_round: 3, presentation: 2, internal_selection: 1 };
    return (order[b.stage.phase] ?? 0) - (order[a.stage.phase] ?? 0);
  })[0];

  return (
    <Link href={`/candidates/${candidate.id}`} className="block">
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">{candidate.name}</h3>
            <p className="text-sm text-gray-500 truncate">{candidate.headline}</p>
          </div>
          {topCandidacy && (
            <Badge variant={PHASE_BADGE[topCandidacy.stage.phase] ?? "gray"}>
              {topCandidacy.stage.stage}
            </Badge>
          )}
        </div>

        {topCandidacy && (
          <p className="mt-2 text-xs text-gray-400 truncate">
            {topCandidacy.projectRole} — {topCandidacy.company}
          </p>
        )}

        <div className="mt-3">
          <FeeProximityBar score={candidate.feeProximityScore} />
        </div>

        {candidate.specSuggestions.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            <span className="text-xs text-gray-400">Spec to:</span>
            {candidate.specSuggestions.map((p) => (
              <Badge key={p.id} variant="purple">
                {p.company.name}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
