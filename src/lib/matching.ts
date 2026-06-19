import type {
  Candidate,
  CandidateWithMatches,
  MatchResult,
  PipelinePhase,
  Project,
} from "@/types";

const PHASE_ORDER: Record<PipelinePhase, number> = {
  internal_selection: 1,
  presentation: 2,
  first_round: 3,
  late_stage: 4,
};

// Score how far a candidate is from a fee across all their candidacies
export function feeProximityScore(candidate: Candidate): number {
  if (!candidate.candidacies.length) return 0;
  const active = candidate.candidacies.filter((c) => !c.rejectedAt);
  if (!active.length) return 0;
  return Math.max(...active.map((c) => PHASE_ORDER[c.stage.phase] ?? 0));
}

// Simple keyword overlap between two strings
function keywordOverlap(a: string, b: string): number {
  const tokenise = (s: string) =>
    s
      .toLowerCase()
      .split(/[\s,/|&-]+/)
      .filter((t) => t.length > 2);
  const aWords = new Set(tokenise(a));
  const bWords = tokenise(b);
  const hits = bWords.filter((w) => aWords.has(w)).length;
  return hits / Math.max(bWords.length, 1);
}

function scoreMatch(candidate: Candidate, project: Project): MatchResult {
  const reasons: string[] = [];
  let score = 0;

  const candidateText = [
    candidate.headline,
    candidate.currentTitle ?? "",
    candidate.currentCompany ?? "",
    ...(candidate.tags ?? []),
  ]
    .join(" ")
    .toLowerCase();

  const projectText = [project.role, project.description ?? "", project.company.name]
    .join(" ")
    .toLowerCase();

  // Role/title keyword match
  const roleScore = keywordOverlap(candidate.currentTitle ?? candidate.headline, project.role);
  if (roleScore > 0.2) {
    score += roleScore * 40;
    reasons.push(`Title matches "${project.role}"`);
  }

  // Sector/keyword overlap across full text
  const textScore = keywordOverlap(candidateText, projectText);
  if (textScore > 0.1) {
    score += textScore * 30;
    reasons.push("Background aligns with role requirements");
  }

  // Seniority signals
  const seniorTerms = ["director", "head of", "senior", "vp", "chief", "manager", "lead"];
  const candidateSeniority = seniorTerms.find((t) => candidateText.includes(t));
  const roleSeniority = seniorTerms.find((t) => project.role.toLowerCase().includes(t));
  if (candidateSeniority && roleSeniority && candidateSeniority === roleSeniority) {
    score += 20;
    reasons.push("Seniority level matches");
  }

  // Already in pipeline for this project — not a spec target
  const alreadyInProject = candidate.candidacies.some((c) => c.projectId === project.id);
  if (alreadyInProject) {
    score = 0;
    return { project, score, reasons: [], phase: null };
  }

  const activeCandidacy = candidate.candidacies.find(
    (c) => c.projectId === project.id && !c.rejectedAt
  );
  const phase = activeCandidacy ? (activeCandidacy.stage.phase as PipelinePhase) : null;

  return { project, score: Math.min(Math.round(score), 100), reasons, phase };
}

export function buildCandidateWithMatches(
  candidate: Candidate,
  allProjects: Project[]
): CandidateWithMatches {
  const openProjects = allProjects.filter(
    (p) => p.state !== "closed" && !candidate.candidacies.some((c) => c.projectId === p.id)
  );

  const matches = openProjects
    .map((p) => scoreMatch(candidate, p))
    .filter((m) => m.score > 15)
    .sort((a, b) => b.score - a.score);

  const topMatches = matches.slice(0, 5);
  const specSuggestions = matches
    .filter((m) => m.score >= 30)
    .slice(0, 3)
    .map((m) => m.project);

  return {
    ...candidate,
    feeProximityScore: feeProximityScore(candidate),
    topMatches,
    specSuggestions,
  };
}
