import { apiClient, ApiError } from "./api-client";
import type {
  Joueur,
  CreateJoueurData,
  UpdateJoueurData,
  Match,
  MatchDetail,
  CreateMatchData,
  UpdateMatchData,
  TrainingSession,
  CreateTrainingData,
  EvaluationData,
  WorkPlan,
  CreateWorkPlanData,
  Evaluation,
  ChargeJour,
  PlayerPhysical,
  MedicalRecord,
  PillarNote,
  SuggestionResponse,
  Ponderation,
  UpdatePonderationData,
  StaffMember,
  InviteStaffData,
  UpdatePermissionsData,
  AuthResponse,
  AuthUser,
  LoginData,
  FileUploadResponse,
  IaActionKey,
} from "@/types";

// ─── Joueurs ─────────────────────────────────────────────────────────────────────

export const joueursApi = {
  list: () =>
    apiClient<Joueur[]>("/api/v1/clubs/me/players"),
  get: (id: string | number) =>
    apiClient<Joueur>(`/api/v1/clubs/me/players/${id}`),
  create: (data: CreateJoueurData) =>
    apiClient<Joueur>("/api/v1/clubs/me/players", {
      method: "POST",
      body: data,
    }),
  update: (id: string | number, data: UpdateJoueurData) =>
    apiClient<Joueur>(`/api/v1/clubs/me/players/${id}`, {
      method: "PUT",
      body: data,
    }),
  delete: (id: string | number) =>
    apiClient<void>(`/api/v1/clubs/me/players/${id}`, {
      method: "DELETE",
    }),
};

// ─── Matchs ─────────────────────────────────────────────────────────────────────

export const matchesApi = {
  list: () =>
    apiClient<Match[]>("/api/v1/clubs/me/matches"),
  get: (id: string | number) =>
    apiClient<MatchDetail>(`/api/v1/clubs/me/matches/${id}`),
  create: (data: CreateMatchData) =>
    apiClient<Match>("/api/v1/clubs/me/matches", {
      method: "POST",
      body: data,
    }),
  update: (id: string | number, data: UpdateMatchData) =>
    apiClient<Match>(`/api/v1/clubs/me/matches/${id}`, {
      method: "PUT",
      body: data,
    }),
  validateLineup: (id: string | number) =>
    apiClient<Match>(`/api/v1/clubs/me/matches/${id}/lineup/validate`, {
      method: "PUT",
    }),
};

// ─── Entraînements ──────────────────────────────────────────────────────────────

export const trainingApi = {
  list: () =>
    apiClient<TrainingSession[]>("/api/v1/clubs/me/training/sessions"),
  get: (id: string | number) =>
    apiClient<TrainingSession>(
      `/api/v1/clubs/me/training/sessions/${id}`
    ),
  create: (data: CreateTrainingData) =>
    apiClient<TrainingSession>(
      "/api/v1/clubs/me/training/sessions",
      { method: "POST", body: data }
    ),
  evaluate: (id: string | number, data: EvaluationData) =>
    apiClient<void>(
      `/api/v1/clubs/me/training/sessions/${id}/evaluations`,
      { method: "POST", body: data }
    ),
};

// ─── Planification ──────────────────────────────────────────────────────────────

export const planningApi = {
  list: () =>
    apiClient<WorkPlan[]>("/api/v1/clubs/me/planning/work-plans"),
  create: (data: CreateWorkPlanData) =>
    apiClient<WorkPlan>(
      "/api/v1/clubs/me/planning/work-plans",
      { method: "POST", body: data }
    ),
};

// ─── Évaluations joueur ─────────────────────────────────────────────────────────

export const evaluationsApi = {
  getPlayer: (playerId: string | number) =>
    apiClient<Evaluation[]>(
      `/api/v1/clubs/me/players/${playerId}/evaluations`
    ),
  getPlayerCharge: (playerId: string | number) =>
    apiClient<ChargeJour[]>(
      `/api/v1/clubs/me/players/${playerId}/charge`
    ),
  getPlayerPhysical: (playerId: string | number) =>
    apiClient<PlayerPhysical>(
      `/api/v1/clubs/me/players/${playerId}/physical`
    ),
  getPlayerMedical: (playerId: string | number) =>
    apiClient<MedicalRecord[]>(
      `/api/v1/clubs/me/players/${playerId}/medical`
    ),
  getClubMoyenne: () =>
    apiClient<PillarNote[] | null>(
      "/api/v1/clubs/me/moyenne-piliers"
    ),
};

// ─── IA ──────────────────────────────────────────────────────────────────────────

export const aiApi = {
  suggestTrainingSession: (clubId: string) =>
    apiClient<SuggestionResponse>(
      `/api/v1/clubs/${clubId}/ai/actions/SUGGEST_TRAINING_SESSION`,
      { method: "POST" }
    ),
  suggestLineup: (clubId: string, matchId: string) =>
    apiClient<SuggestionResponse>(
      `/api/v1/clubs/${clubId}/ai/actions/SUGGEST_LINEUP`,
      { method: "POST", body: { match_id: matchId } }
    ),
  analyzeFatigue: (clubId: string) =>
    apiClient<SuggestionResponse>(
      `/api/v1/clubs/${clubId}/ai/actions/ANALYZE_FATIGUE`,
      { method: "POST" }
    ),
  summarizeWeek: (clubId: string) =>
    apiClient<SuggestionResponse>(
      `/api/v1/clubs/${clubId}/ai/actions/SUMMARIZE_WEEK`,
      { method: "POST" }
    ),
  adaptWorkload: (clubId: string) =>
    apiClient<SuggestionResponse>(
      `/api/v1/clubs/${clubId}/ai/actions/ADAPT_WORKLOAD`,
      { method: "POST" }
    ),
  preparePreMatch: (clubId: string) =>
    apiClient<SuggestionResponse>(
      `/api/v1/clubs/${clubId}/ai/actions/PREPARE_PRE_MATCH`,
      { method: "POST" }
    ),
  organizeWeek: (clubId: string) =>
    apiClient<SuggestionResponse>(
      `/api/v1/clubs/${clubId}/ai/actions/ORGANIZE_WEEK`,
      { method: "POST" }
    ),
  balanceWorkload: (clubId: string) =>
    apiClient<SuggestionResponse>(
      `/api/v1/clubs/${clubId}/ai/actions/BALANCE_WORKLOAD`,
      { method: "POST" }
    ),
  parseUploadedSession: (clubId: string, fileId: string) =>
    apiClient<SuggestionResponse>(
      `/api/v1/clubs/${clubId}/ai/actions/PARSE_UPLOADED_SESSION`,
      { method: "POST", body: { file_id: fileId } }
    ),
};

// ─── Pondérations ───────────────────────────────────────────────────────────────

export const ponderationsApi = {
  list: (clubId: string) =>
    apiClient<Ponderation[]>(`/api/v1/clubs/${clubId}/ponderations`),
  update: (
    clubId: string,
    poste: string,
    data: UpdatePonderationData
  ) =>
    apiClient<Ponderation>(
      `/api/v1/clubs/${clubId}/ponderations/${poste}`,
      { method: "PUT", body: data }
    ),
};

// ─── Staff ───────────────────────────────────────────────────────────────────────

export const staffApi = {
  list: (clubId: string) =>
    apiClient<StaffMember[]>(`/api/v1/clubs/${clubId}/staff`),
  invite: (clubId: string, data: InviteStaffData) =>
    apiClient<StaffMember>(
      `/api/v1/clubs/${clubId}/staff/invite`,
      { method: "POST", body: data }
    ),
  updatePermissions: (
    clubId: string,
    userId: string,
    data: UpdatePermissionsData
  ) =>
    apiClient<StaffMember>(
      `/api/v1/clubs/${clubId}/staff/${userId}/permissions`,
      { method: "PUT", body: data }
    ),
};

// ─── Auth ────────────────────────────────────────────────────────────────────────

export const authApi = {
  login: (data: LoginData) =>
    apiClient<AuthResponse>("/api/v1/auth/login", {
      method: "POST",
      body: data,
    }),
  refresh: () =>
    apiClient<AuthResponse>("/api/v1/auth/refresh", { method: "POST" }),
  me: () => apiClient<AuthUser>("/api/v1/auth/me"),
};

// ─── Fichiers ───────────────────────────────────────────────────────────────────

export const filesApi = {
  upload: (clubId: string, data: FormData) =>
    apiClient<FileUploadResponse>(
      `/api/v1/clubs/${clubId}/files/upload`,
      {
        method: "POST",
        body: data,
      } as Parameters<typeof apiClient>[1]
    ),
};
