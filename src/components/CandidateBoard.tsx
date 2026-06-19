"use client";

import { useState, useMemo } from "react";
import type { CandidateWithMatches } from "@/types";
import { CandidateCard } from "./CandidateCard";

const FILTER_OPTIONS = [
  { label: "All", value: "all" },
  { label: "Late Stage / Offer", value: "4" },
  { label: "Interviewing", value: "3" },
  { label: "Presented", value: "2" },
  { label: "Longlist", value: "1" },
  { label: "Spec Ready", value: "spec" },
] as const;

export function CandidateBoard({ candidates }: { candidates: CandidateWithMatches[] }) {
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return candidates.filter((c) => {
      const matchesSearch =
        !search ||
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.headline.toLowerCase().includes(search.toLowerCase()) ||
        c.candidacies.some(
          (cd) =>
            cd.company.toLowerCase().includes(search.toLowerCase()) ||
            cd.projectRole.toLowerCase().includes(search.toLowerCase())
        );

      const matchesFilter =
        filter === "all" ||
        (filter === "spec" && c.specSuggestions.length > 0) ||
        String(c.feeProximityScore) === filter;

      return matchesSearch && matchesFilter;
    });
  }, [candidates, filter, search]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="text"
          placeholder="Search candidates, roles, companies..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex gap-2 flex-wrap">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === opt.value
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-gray-400 py-16">No candidates match this filter.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <CandidateCard key={c.id} candidate={c} />
          ))}
        </div>
      )}
    </div>
  );
}
