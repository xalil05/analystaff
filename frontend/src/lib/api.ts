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
  TrainingEvaluation,
  CreateTrainingData,
  CreateTrainingEvaluationData,
  WorkPlan,
  CreateWorkPlanData,
  Evaluation,
  ChargeJour,
  PlayerPhysical,
  ImportEffectif,
  RadarJoueur,
  DashboardOverview,
  HistoryEntry,
  TacticalSetup,
  TacticalSetupSave,
  MedicalRecord,
  PillarNote,
  SuggestionResponse,
  RoleResponse,
  StaffMember,
  AuthResponse,
  AuthUser,
  LoginData,
  FileUploadResponse,
  IaActionKey,
} from "@/types";

// ─── Joueurs ─────────────────────────────────────────────────────────────────────
// Le backend n'expose PAS /clubs/me/players : la seule route est
// /clubs/{club_id}/players (app/players/router.py). Un GET sur /clubs/me/players
// renvoie 422 (int_parsing sur club_id="me").
// Le profil physique est une ressource séparée :
// /clubs/{club_id}/players/{player_id}/physical — absent de la liste.

export const joueursApi = {
  list: (clubId: string | number) =>
    apiClient<Joueur[]>(`/api/v1/clubs/${clubId}/players`),
  get: (clubId: string | number, id: string | number) =>
    apiClient<Joueur>(`/api/v1/clubs/${clubId}/players/${id}`),
  create: (clubId: string | number, data: CreateJoueurData) =>
    apiClient<Joueur>(`/api/v1/clubs/${clubId}/players`, {
      method: "POST",
      body: data,
    }),
  update: (clubId: string | number, id: string | number, data: UpdateJoueurData) =>
    apiClient<Joueur>(`/api/v1/clubs/${clubId}/players/${id}`, {
      method: "PUT",
      body: data,
    }),
  delete: (clubId: string | number, id: string | number) =>
    apiClient<void>(`/api/v1/clubs/${clubId}/players/${id}`, {
      method: "DELETE",
    }),
  physical: (clubId: string | number, id: string | number) =>
    apiClient<PlayerPhysical>(
      `/api/v1/clubs/${clubId}/players/${id}/physical`
    ),
  /**
   * Importe un effectif depuis un CSV.
   *
   * Le fichier est envoyé en multipart. La réponse décrit le résultat même
   * quand des lignes sont refusées : un import partiel est un résultat
   * normal, pas une erreur.
   */
  importCsv: (clubId: string | number, fichier: File) => {
    const formData = new FormData();
    formData.append("fichier", fichier);
    return apiClient<ImportEffectif>(`/api/v1/clubs/${clubId}/players/import`, {
      method: "POST",
      body: formData,
    });
  },
};

// ─── Matchs ─────────────────────────────────────────────────────────────────────

export const matchesApi = {
  list: (clubId: string | number) =>
    apiClient<Match[]>(`/api/v1/clubs/${clubId}/matches`),
  get: (clubId: string | number, id: string | number) =>
    apiClient<MatchDetail>(`/api/v1/clubs/${clubId}/matches/${id}`),
  create: (clubId: string | number, data: CreateMatchData) =>
    apiClient<Match>(`/api/v1/clubs/${clubId}/matches`, {
      method: "POST",
      body: data,
    }),
  // Le backend expose PATCH, pas PUT, et /matches/{id} — pas /lineup/validate.
  update: (clubId: string | number, id: string | number, data: UpdateMatchData) =>
    apiClient<Match>(`/api/v1/clubs/${clubId}/matches/${id}`, {
      method: "PATCH",
      body: data,
    }),
  getTacticalSetup: (clubId: string | number, id: string | number) =>
    apiClient<TacticalSetup>(`/api/v1/clubs/${clubId}/matches/${id}/tactical-setup`),
  saveTacticalSetup: (
    clubId: string | number,
    id: string | number,
    body: TacticalSetupSave
  ) =>
    apiClient<TacticalSetup>(`/api/v1/clubs/${clubId}/matches/${id}/tactical-setup`, {
      method: "PUT",
      body,
    }),
  validateTacticalSetup: (clubId: string | number, id: string | number) =>
    apiClient<unknown>(
      `/api/v1/clubs/${clubId}/matches/${id}/tactical-setup/validate`,
      { method: "POST" }
    ),
};

// ─── Entraînements ──────────────────────────────────────────────────────────────

export const trainingApi = {
  list: (clubId: string | number) =>
    apiClient<TrainingSession[]>(`/api/v1/clubs/${clubId}/training/sessions`),
  get: (clubId: string | number, id: string | number) =>
    apiClient<TrainingSession>(
      `/api/v1/clubs/${clubId}/training/sessions/${id}`
    ),
  create: (clubId: string | number, data: CreateTrainingData) =>
    apiClient<TrainingSession>(
      `/api/v1/clubs/${clubId}/training/sessions`,
      { method: "POST", body: data }
    ),
  // Le backend expose PATCH, pas PUT.
  update: (clubId: string | number, id: string | number, data: CreateTrainingData) =>
    apiClient<TrainingSession>(
      `/api/v1/clubs/${clubId}/training/sessions/${id}`,
      { method: "PATCH", body: data }
    ),
  cancel: (clubId: string | number, id: string | number) =>
    apiClient<TrainingSession>(
      `/api/v1/clubs/${clubId}/training/sessions/${id}/cancel`,
      { method: "POST" }
    ),
  listEvaluations: (clubId: string | number, id: string | number) =>
    apiClient<TrainingEvaluation[]>(
      `/api/v1/clubs/${clubId}/training/sessions/${id}/evaluations`
    ),
  evaluate: (
    clubId: string | number,
    id: string | number,
    body: CreateTrainingEvaluationData
  ) =>
    apiClient<TrainingEvaluation>(
      `/api/v1/clubs/${clubId}/training/sessions/${id}/evaluations`,
      { method: "POST", body }
    ),
};

// ─── Planification ──────────────────────────────────────────────────────────────

export const planningApi = {
  list: (clubId: string | number) =>
    apiClient<WorkPlan[]>(`/api/v1/clubs/${clubId}/planning/work-plans`),
  get: (clubId: string | number, id: string | number) =>
    apiClient<WorkPlan>(`/api/v1/clubs/${clubId}/planning/work-plans/${id}`),
  create: (clubId: string | number, data: CreateWorkPlanData) =>
    apiClient<WorkPlan>(
      `/api/v1/clubs/${clubId}/planning/work-plans`,
      { method: "POST", body: data }
    ),
};

// ─── Évaluations joueur ─────────────────────────────────────────────────────────

export const evaluationsApi = {
  /** Évaluations d'un match : la seule route qui expose les notes par
   *  joueur, via le match où elles ont été saisies. */
  getMatchEvaluations: (clubId: string | number, matchId: string | number) =>
    apiClient<Evaluation[]>(
      `/api/v1/clubs/${clubId}/matches/${matchId}/evaluations`
    ),
  getPlayerCharge: (clubId: string | number, playerId: string | number) =>
    apiClient<ChargeJour[]>(
      `/api/v1/clubs/${clubId}/dashboard/players/${playerId}/history`
    ),
  getPlayerPhysical: (clubId: string | number, playerId: string | number) =>
    apiClient<PlayerPhysical>(
      `/api/v1/clubs/${clubId}/players/${playerId}/physical`
    ),
  getPlayerMedical: (clubId: string | number, playerId: string | number) =>
    apiClient<MedicalRecord[]>(
      `/api/v1/clubs/${clubId}/players/${playerId}/medical`
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
// Le backend expose ces routes via app/evaluations/router.py, monté sous
// /api/v1/clubs. La granularité est le GROUPE de poste (PosteGroupe) :
// gardien | defenseur | milieu | attaquant — voir MATRICE_PERMISSIONS §3.3.
// GET et PUT exigent la permission GERER_PARAMETRES_CLUB.

export const POSTE_GROUPES = [
  "gardien",
  "defenseur",
  "milieu",
  "attaquant",
] as const;

export type PosteGroupe = (typeof POSTE_GROUPES)[number];

/** Poids bruts en pourcentage. Le total n'a pas à faire 100 côté backend
 *  (WeightingMatrixUpsert exige seulement une somme > 0), mais l'interface
 *  garde la règle des 100 % pour rester lisible pour le staff. */
export interface WeightingMatrix {
  id: number;
  club_id: number;
  poste_groupe: PosteGroupe;
  poids_physique: number;
  poids_technique: number;
  poids_tactique: number;
  poids_mental: number;
  is_active: boolean;
}

export interface UpdatePonderationData {
  poids_physique: number;
  poids_technique: number;
  poids_tactique: number;
  poids_mental: number;
}

export const ponderationsApi = {
  list: (clubId: string | number) =>
    apiClient<WeightingMatrix[]>(
      `/api/v1/clubs/${clubId}/evaluations/weighting-matrices`
    ),
  update: (
    clubId: string | number,
    poste: PosteGroupe,
    data: UpdatePonderationData
  ) =>
    apiClient<WeightingMatrix>(
      `/api/v1/clubs/${clubId}/evaluations/weighting-matrices/${poste}`,
      { method: "PUT", body: data }
    ),
};

// ─── Dashboard joueur ───────────────────────────────────────────────────────────
// Le radar agrégé est la seule source de moyenne par joueur : le backend
// n'expose pas les évaluations par joueur, seulement par match.

export const dashboardApi = {
  /** Vue d'ensemble du club : counts réels, pas des moyennes de piliers. */
  overview: (clubId: string | number) =>
    apiClient<DashboardOverview>(`/api/v1/clubs/${clubId}/dashboard/overview`),
};

export const radarApi = {
  get: (clubId: string | number, playerId: string | number) =>
    apiClient<RadarJoueur>(`/api/v1/clubs/${clubId}/dashboard/players/${playerId}/radar`),
  /** Le backend renvoie { player_id, entries } ; on déplie pour que
   *  l'appelant consomme une liste, comme les autres endpoints. */
  history: async (clubId: string | number, playerId: string | number) => {
    const { data } = await apiClient<{ player_id: number; entries: HistoryEntry[] }>(
      `/api/v1/clubs/${clubId}/dashboard/players/${playerId}/history`
    );
    return { data: data?.entries ?? [] };
  },
};

// ─── Staff ───────────────────────────────────────────────────────────────────────

// Contrat vérifié sur app/roles/router.py + schemas.py :
// - pas de /staff/invite : on POST /staff avec {email, role_code}
// - pas de PUT /staff/{id}/permissions : c'est POST .../permissions/{code}
// - StaffMemberResponse expose user_email / user_nom / role_code (pas email/nom)
export const staffApi = {
  listRoles: (clubId: string | number) =>
    apiClient<RoleResponse[]>(`/api/v1/clubs/${clubId}/roles`),
  list: (clubId: string | number) =>
    apiClient<StaffMember[]>(`/api/v1/clubs/${clubId}/staff`),
  invite: (clubId: string | number, data: { email: string; role_code: string }) =>
    apiClient<StaffMember>(`/api/v1/clubs/${clubId}/staff`, {
      method: "POST",
      body: data,
    }),
  update: (
    clubId: string | number,
    staffMemberId: string | number,
    data: { role_code?: string; statut?: string }
  ) =>
    apiClient<StaffMember>(`/api/v1/clubs/${clubId}/staff/${staffMemberId}`, {
      method: "PATCH",
      body: data,
    }),
  remove: (clubId: string | number, staffMemberId: string | number) =>
    apiClient<StaffMember>(
      `/api/v1/clubs/${clubId}/staff/${staffMemberId}`,
      { method: "DELETE", body: {} }
    ),
  grantPermission: (
    clubId: string | number,
    staffMemberId: string | number,
    permissionCode: string
  ) =>
    apiClient<void>(
      `/api/v1/clubs/${clubId}/staff/${staffMemberId}/permissions/${permissionCode}`,
      { method: "POST" }
    ),
  revokePermission: (
    clubId: string | number,
    staffMemberId: string | number,
    permissionCode: string
  ) =>
    apiClient<void>(
      `/api/v1/clubs/${clubId}/staff/${staffMemberId}/permissions/${permissionCode}`,
      { method: "DELETE" }
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
  /** Revoque le refresh token (cookie httpOnly) cote serveur. */
  logout: () => apiClient<void>("/api/v1/auth/logout", { method: "POST" }),
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
