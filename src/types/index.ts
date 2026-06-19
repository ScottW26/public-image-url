export type ProjectState =
  | "active"
  | "lead"
  | "on_hold"
  | "closed"
  | "pitch"
  | "opportunity"
  | "talent_pool";

export type PipelinePhase =
  | "internal_selection"
  | "presentation"
  | "first_round"
  | "late_stage";

export interface Company {
  id: string;
  name: string;
  website?: string;
  sector?: string;
}

export interface Project {
  id: string;
  role: string;
  state: ProjectState;
  company: Company;
  description?: string;
  createdAt: string;
}

export interface CandidacyStage {
  stage: string;
  phase: PipelinePhase;
  status: string;
}

export interface Candidacy {
  candidateId: string;
  personId: string;
  projectId: string;
  projectRole: string;
  company: string;
  stage: CandidacyStage;
  rejectedAt?: string;
}

export interface Candidate {
  id: string;
  name: string;
  email?: string;
  headline: string;
  currentTitle?: string;
  currentCompany?: string;
  location?: string;
  linkedinUrl?: string;
  candidacies: Candidacy[];
  tags?: string[];
  lastActivityAt?: string;
}

export interface PipelineSummary {
  projectId: string;
  role: string;
  company: string;
  totalActive: number;
  totalRejected: number;
  byPhase: {
    internal_selection: number;
    presentation: number;
    first_round: number;
    late_stage: number;
  };
}

export interface MatchResult {
  project: Project;
  score: number;
  reasons: string[];
  phase: PipelinePhase | null;
}

export interface CandidateWithMatches extends Candidate {
  feeProximityScore: number;
  topMatches: MatchResult[];
  specSuggestions: Project[];
}
