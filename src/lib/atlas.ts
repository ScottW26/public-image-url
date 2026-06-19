import type {
  Candidate,
  Candidacy,
  CandidacyStage,
  Company,
  PipelineSummary,
  Project,
} from "@/types";

const BASE_URL = process.env.ATLAS_API_BASE_URL ?? "https://api.recruitwithatlas.com/v1";
const API_KEY = process.env.ATLAS_API_KEY ?? "";
const AGENCY_ID = process.env.ATLAS_AGENCY_ID ?? "";

async function atlasGet<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "X-Agency-ID": AGENCY_ID,
      "Content-Type": "application/json",
    },
    next: { revalidate: 300 },
  });
  if (!res.ok) {
    throw new Error(`Atlas API error ${res.status}: ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

// Raw Atlas API shapes — adjust field names to match your actual API response
interface AtlasPersonRaw {
  id: string;
  name: string;
  email?: string;
  headline?: string;
  current_title?: string;
  current_company?: string;
  location?: string;
  linkedin_url?: string;
  tags?: string[];
  last_activity_at?: string;
}

interface AtlasProjectRaw {
  id: string;
  role: string;
  state: string;
  company: { id: string; name: string; website?: string };
  description?: string;
  created_at: string;
}

interface AtlasCandidateRaw {
  id: string;
  person_id: string;
  person: AtlasPersonRaw;
  project_id: string;
  stage: { name: string; phase: string; status?: string };
  rejected_at?: string;
}

interface AtlasPipelineRaw {
  project_id: string;
  role: string;
  company: string;
  active_count: number;
  rejected_count: number;
  phases: Record<string, number>;
}

function mapProject(raw: AtlasProjectRaw): Project {
  const company: Company = {
    id: raw.company.id,
    name: raw.company.name,
    website: raw.company.website,
  };
  return {
    id: raw.id,
    role: raw.role,
    state: raw.state as Project["state"],
    company,
    description: raw.description,
    createdAt: raw.created_at,
  };
}

function mapCandidate(raw: AtlasPersonRaw, candidacies: Candidacy[] = []): Candidate {
  return {
    id: raw.id,
    name: raw.name,
    email: raw.email,
    headline: raw.headline ?? "",
    currentTitle: raw.current_title,
    currentCompany: raw.current_company,
    location: raw.location,
    linkedinUrl: raw.linkedin_url,
    tags: raw.tags ?? [],
    lastActivityAt: raw.last_activity_at,
    candidacies,
  };
}

function mapCandidacy(raw: AtlasCandidateRaw, project: Project): Candidacy {
  const stage: CandidacyStage = {
    stage: raw.stage.name,
    phase: raw.stage.phase as CandidacyStage["phase"],
    status: raw.stage.status ?? "",
  };
  return {
    candidateId: raw.id,
    personId: raw.person_id,
    projectId: project.id,
    projectRole: project.role,
    company: project.company.name,
    stage,
    rejectedAt: raw.rejected_at,
  };
}

export async function getProjects(state?: string[]): Promise<Project[]> {
  const params: Record<string, string> = {};
  if (state?.length) params.state = state.join(",");
  const raw = await atlasGet<{ projects: AtlasProjectRaw[] }>("/projects", params);
  return raw.projects.map(mapProject);
}

export async function getProjectPipeline(projectId: string): Promise<PipelineSummary> {
  const raw = await atlasGet<AtlasPipelineRaw>(`/projects/${projectId}/pipeline`);
  return {
    projectId: raw.project_id,
    role: raw.role,
    company: raw.company,
    totalActive: raw.active_count,
    totalRejected: raw.rejected_count,
    byPhase: {
      internal_selection: raw.phases?.internal_selection ?? 0,
      presentation: raw.phases?.presentation ?? 0,
      first_round: raw.phases?.first_round ?? 0,
      late_stage: raw.phases?.late_stage ?? 0,
    },
  };
}

export async function getProjectCandidates(
  projectId: string,
  project: Project,
  phase?: string
): Promise<{ candidate: Candidate; candidacy: Candidacy }[]> {
  const params: Record<string, string> = { include_rejected: "false" };
  if (phase) params.phase = phase;
  const raw = await atlasGet<{ candidates: AtlasCandidateRaw[] }>(
    `/projects/${projectId}/candidates`,
    params
  );
  return raw.candidates.map((c) => {
    const candidacy = mapCandidacy(c, project);
    const candidate = mapCandidate(c.person, [candidacy]);
    return { candidate, candidacy };
  });
}

export async function searchCandidates(query: string): Promise<Candidate[]> {
  const raw = await atlasGet<{ people: AtlasPersonRaw[] }>("/people/search", { q: query });
  return raw.people.map((p) => mapCandidate(p));
}
