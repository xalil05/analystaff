// ─── Types partagés — Alignés sur SCHEMA_SQL.md ────────────────────────────────
// Mise à jour 12/09/2026 : restauration conforme + ajout labels métier

// ─── Auth ───────────────────────────────────────────────────────────────────────
export interface AuthUser {
  id: string;
  email: string;
  nom: string;
  prenom: string;
  role: string;
  club_id: string;
  club_nom: string;
  permissions: string[];
}

/**
 * POST /api/v1/auth/login renvoie TokenResponse : access_token + user minimal
 * (UserResponse = id, email, nom, prenom). Le refresh_token httpOnly est pose
 * en cookie par le backend et expires_in n'est pas renvoye.
 */
export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: AuthUser;
}

export interface LoginData {
  email: string;
  password: string;
}

// ─── Joueurs ────────────────────────────────────────────────────────────────────
// Contrat vérifié contre PlayerResponse (backend/app/players/schemas.py) et
// un GET /api/v1/clubs/1/players réel : les identifiants sont des entiers,
// les statuts sont en minuscules, et le poste se nomme `poste` (pas
// poste_principal). Les colonnes physiques vivent dans physical_profiles,
// pas dans le joueur.
export type PlayerStatut =
  | "actif"
  | "blesse"
  | "suspendu"
  | "parti"
  | "archive";

export interface Joueur {
  id: number;
  club_id: number;
  team_id: number | null;
  nom: string;
  prenom: string | null;
  photo_url: string | null;
  poste: string | null;
  numero: number | null;
  date_naissance: string | null;
  statut: PlayerStatut;
  is_archived: boolean;
}

export interface CreateJoueurData {
  nom: string;
  prenom?: string;
  date_naissance?: string;
  poste?: string;
  numero?: number;
  team_id?: number;
  statut?: PlayerStatut;
}

export interface UpdateJoueurData {
  nom?: string;
  prenom?: string;
  date_naissance?: string;
  poste?: string;
  numero?: number;
  team_id?: number;
  statut?: PlayerStatut;
  photo_url?: string;
}

/** Une ligne du CSV que l'import n'a pas pu traiter. */
export interface ImportLigneRejetee {
  /** Numéro de ligne dans le fichier, en-tête inclus : la première donnée est 2. */
  ligne: number;
  nom: string;
  raison: string;
}

/** Résultat d'un import d'effectif. */
export interface ImportEffectif {
  importes: number;
  rejetes: ImportLigneRejetee[];
  /** Colonnes acceptées puis écartées (Téléphone, Email : absentes de players). */
  colonnes_ignorees: string[];
  /** Colonnes non reconnues — probablement une faute de frappe dans l'en-tête. */
  colonnes_inconnues: string[];
}

// ─── Profil joueur (sections) ───────────────────────────────────────────────────
export interface PlayerIdentity {
  id: number;
  nom: string;
  prenom: string | null;
  photo_url: string | null;
  poste: string | null;
  numero: number | null;
  date_naissance: string | null;
  statut: PlayerStatut;
}

/** Contrat réel PhysicalProfileResponse : charge_travail est nullable. */
export interface PlayerPhysical {
  player_id: number;
  taille_cm: number | null;
  poids_kg: number | null;
  imc: number | null;
  charge_travail: number | null;
}

// ─── Matchs ─────────────────────────────────────────────────────────────────────
/** Statut d'un match (app/core/enums.py MatchStatut) : minuscules. */
export type MatchStatut = "brouillon" | "programme" | "termine" | "archive";

/** Statut d'une composition (app/core/enums.py LineupStatut). */
export type LineupStatut = "brouillon" | "valide";

/**
 * Contrat réel MatchResponse (app/matches/schemas.py).
 * Les scores sont score_equipe / score_adversaire ; `composition_validee`
 * et `score_domicile` n'existent pas côté API.
 */
export interface Match {
  id: number;
  club_id: number;
  team_id: number | null;
  season_id: number | null;
  adversaire: string;
  competition: string | null;
  is_domicile: boolean;
  date_match: string;
  lieu: string | null;
  score_equipe: number | null;
  score_adversaire: number | null;
  statut: MatchStatut;
}

/**
 * Le détail d'un match est le même objet que la liste : la composition vit
 * dans une ressource séparée (/matches/{id}/tactical-setup), pas dans le
 * match. `MatchDetail` est donc un alias, pas une extension.
 */
export type MatchDetail = Match;

/** Un joueur positionné sur le plateau (LineupPlayerResponse). */
export interface TacticalPlayerPosition {
  id: number;
  player_id: number;
  is_starting: boolean;
  is_captain: boolean;
  is_goalkeeper: boolean;
  tactical_role: string | null;
  position_x: number | null;
  position_y: number | null;
  substitute_order: number | null;
}

/** Payload de sauvegarde du plateau (TacticalSetupSave). */
/** Joueur minimal, résolu par la page depuis GET /players pour afficher un nom. */
export interface PlayerMini {
  id: number;
  nom: string;
  prenom: string | null;
  numero: number | null;
}

/** Motif d'une substitution (app/core/enums.py SubstitutionMotif). */
export type SubstitutionMotif =
  | "tactique"
  | "blessure"
  | "fatigue"
  | "sanction"
  | "autre";

/** Contrat réel SubstitutionResponse (app/matches/schemas.py). */
export interface Substitution {
  id: number;
  match_id: number;
  player_out_id: number;
  player_in_id: number;
  minute: number | null;
  motif: SubstitutionMotif;
  notes: string | null;
}

export interface TacticalSetupSave {
  formation_id?: number;
  formation_label?: string;
  notes?: string;
  players: {
    player_id: number;
    is_starting: boolean;
    is_captain: boolean;
    is_goalkeeper: boolean;
    tactical_role?: string | null;
    /** Coordonnées 0-100 (LineupPlayerInput). */
    position_x: number;
    position_y: number;
    substitute_order?: number | null;
  }[];
}

/** Composition d'un match (TacticalSetupResponse). */
export interface TacticalSetup {
  id: number | null;
  match_id: number;
  formation_id: number | null;
  formation_label: string | null;
  is_custom: boolean;
  statut: LineupStatut | null;
  validated_by: number | null;
  validated_at: string | null;
  notes: string | null;
  players: TacticalPlayerPosition[];
}

export interface TacticalPlayerPosition {
  joueur_id: string;
  x: number;
  y: number;
  role: string;
  statut: "TITULAIRE" | "REMPLACANT" | "GARDIEN";
  est_capitaine: boolean;
}

export interface MatchEvaluation {
  id: string;
  joueur_id: string;
  note_globale: number | null;
  note_physique: number | null;
  note_technique: number | null;
  note_tactique: number | null;
  note_mental: number | null;
  minutes: number;
  buts: number;
  passes: number;
  remarques: string | null;
  contexte_saisie: string;
  saisie_hors_ligne: boolean;
  synchronisee: boolean;
  date_saisie_reelle: string;
}

export interface CreateMatchData {
  adversaire: string;
  date_match: string;
  lieu: string;
  competition: string;
  domicile: boolean;
  statut?: string;
}

export interface UpdateMatchData {
  adversaire?: string;
  date_match?: string;
  lieu?: string;
  competition?: string;
  statut?: string;
  score_domicile?: number;
  score_exterieur?: number;
}

// ─── Entraînements ──────────────────────────────────────────────────────────────
/** Payload de création d'une séance (TrainingSessionCreate). */
export interface CreateTrainingData {
  date_seance: string;
  lieu?: string;
  /** Texte libre, pas un tableau. */
  objectifs?: string;
  exercices?: string;
  charge_prevue?: number;
}

/** Payload d'évaluation post-séance. */
export interface CreateTrainingEvaluationData {
  player_id: number;
  assiduite: Assiduite;
  charge_percue_rpe?: number | null;
  saisie_hors_ligne?: boolean;
  contexte_saisie?: string;
  pillars: { pilier: Pilier; note: number }[];
}

/** Statut d'une séance (app/core/enums.py TrainingStatut) : minuscules. */
export type TrainingStatut = "planifiee" | "realisee" | "annulee";

/** Assiduité à une séance (app/core/enums.py Assiduite). */
export type Assiduite = "present" | "absent" | "retard";

/**
 * Contrat réel TrainingSessionResponse (app/training/schemas.py).
 *
 * Le champ est date_seance (pas `date`), il n'y a pas de `titre`, et
 * objectifs est un texte libre — pas un tableau. C'est ce qui faisait
 * planter `.map()` sur objectifs dans la copie /data.
 */
export interface TrainingSession {
  id: number;
  club_id: number;
  team_id: number | null;
  season_id: number | null;
  date_seance: string;
  lieu: string | null;
  objectifs: string | null;
  exercices: string | null;
  charge_prevue: number | null;
  statut: TrainingStatut;
}

/** Contrat réel TrainingEvaluationResponse. */
export interface TrainingEvaluation {
  id: number;
  training_session_id: number;
  player_id: number;
  assiduite: Assiduite;
  /** RPE = charge perçue, entier 1-10 (charge_percue_rpe côté API). */
  charge_percue_rpe: number | null;
  saisie_hors_ligne: boolean;
  synchronisee: boolean;
  contexte_saisie: string;
  date_saisie_reelle: string;
  date_creation_en_base: string;
  pillars: PillarNote[];
}

// ─── Évaluations / Piliers ───────────────────────────────────────────────────────
export type Pilier = "physique" | "technique" | "tactique" | "mental";

/** Entree d'historique : /dashboard/players/{id}/history (HistoryEntry). */
export interface HistoryEntry {
  evaluation_id: number;
  match_id: number;
  date_match: string;
  adversaire: string;
  note_globale: number | null;
}

/** Contrat réel DashboardOverview (app/dashboard/schemas.py). */
export interface DashboardOverview {
  player_count: number;
  match_count: number;
  training_session_count: number;
  last_match_adversaire: string | null;
  last_match_date: string | null;
  last_match_score: string | null;
}

/** Radar agrege d'un joueur : /dashboard/players/{id}/radar (RadarResponse). */
export interface RadarJoueur {
  player_id: number;
  matches_analyzed: number;
  physique: number | null;
  technique: number | null;
  tactique: number | null;
  mental: number | null;
  note_globale_moyenne: number | null;
}

export interface PillarNote {
  pilier: Pilier;
  note: number;
}

/** Statut d'une évaluation (app/core/enums.py EvaluationStatut). */
export type EvaluationStatut = "brouillon" | "validee" | "archive";

/**
 * Contrat réel EvaluationResponse (app/evaluations/schemas.py).
 * Les notes par pilier arrivent dans `pillars`, pas en champs plats.
 */
export interface Evaluation {
  id: number;
  match_id: number;
  player_id: number;
  note_globale: number | null;
  poids_physique_utilise: number | null;
  poids_technique_utilise: number | null;
  poids_tactique_utilise: number | null;
  poids_mental_utilise: number | null;
  statut: EvaluationStatut;
  contexte_saisie: string;
  date_saisie_reelle: string;
  date_creation_en_base: string;
  poste_groupe: string | null;
  pillars: PillarNote[];
}

export interface ChargeJour {
  jour: string;
  valeur: number;
}

// ─── Dossier médical ─────────────────────────────────────────────────────────────
export interface MedicalRecord {
  id: number;
  player_id: number;
  type: string;
  description: string | null;
  date_debut: string | null;
  date_fin: string | null;
  statut: string | null;
}

// ─── Staff ───────────────────────────────────────────────────────────────────────
export type StaffRole =
  | "HEAD_COACH"
  | "ASSISTANT_COACH"
  | "FITNESS_COACH"
  | "GOALKEEPER_COACH"
  | "VIDEO_ANALYST"
  | "MEDICAL_STAFF"
  | "DATA_SCIENTIST"
  | "SCOUT"
  | "INTENDANT"
  | "KIT_MANAGER";

export type StaffMemberStatut = "actif" | "suspendu" | "parti";

export interface RoleResponse {
  id: number;
  code: string;
  label: string;
  description: string | null;
}

/** Contrat réel StaffMemberResponse : l'email et le nom viennent du user joint. */
export interface StaffMember {
  id: number;
  user_id: number;
  club_id: number;
  role_id: number;
  statut: StaffMemberStatut;
  joined_at: string;
  left_at: string | null;
  user_email: string;
  user_nom: string;
  role_code: StaffRole | string;
  role_label: string;
}

// ─── Planification ──────────────────────────────────────────────────────────────
/** Type de plan (app/core/enums.py WorkPlanType). */
export type WorkPlanType = "hebdomadaire" | "mensuel";

/**
 * Contrat réel WorkPlanResponse (app/planning/schemas.py).
 * Le champ est `nom` (pas titre) et les bornes sont date_debut / date_fin.
 */
export interface WorkPlan {
  id: number;
  club_id: number;
  team_id: number | null;
  season_id: number | null;
  nom: string;
  type: WorkPlanType;
  date_debut: string;
  date_fin: string;
  statut: string;
}

/** WorkPlanItemResponse : un item référence une séance, pas un titre. */
export interface WorkPlanItem {
  id: number;
  work_plan_id: number;
  training_session_id: number | null;
  ordre: number;
  objectifs: string | null;
  statut_prevu: string | null;
  statut_reel: string | null;
}

/** WorkPlanDetailResponse : le plan plus ses items. */
export interface WorkPlanDetail extends WorkPlan {
  items: WorkPlanItem[];
}

/** Payload de création (WorkPlanCreate). */
export interface CreateWorkPlanData {
  nom: string;
  type: WorkPlanType;
  date_debut: string;
  date_fin: string;
}

// ─── IA ──────────────────────────────────────────────────────────────────────────
export type IaActionKey =
  | "SUGGEST_TRAINING_SESSION"
  | "SUGGEST_LINEUP"
  | "ANALYZE_FATIGUE"
  | "SUMMARIZE_WEEK"
  | "ADAPT_WORKLOAD"
  | "PREPARE_PRE_MATCH"
  | "ORGANIZE_WEEK"
  | "BALANCE_WORKLOAD"
  | "PARSE_UPLOADED_SESSION";

export interface SuggestionResponse {
  id: string;
  action_key: IaActionKey;
  club_id: string;
  contenu: string;
  type: string;
  statut: string;
  date_cree: string;
}

export interface Suggestion {
  id: string;
  action_key: IaActionKey;
  club_id: string;
  contenu: string;
  type: string;
  statut: string;
  date_cree: string;
  accepte: boolean | null;
  modifie: boolean | null;
  rejete: boolean | null;
}

// ─── Fichiers ───────────────────────────────────────────────────────────────────
export interface FileUploadResponse {
  id: string;
  filename: string;
  size: number;
  mime_type: string;
  uploaded_at: string;
}

// ─── Permissions ────────────────────────────────────────────────────────────────
export type PermissionCode =
  | "VOIR_DONNEES_PHYSIQUES"
  | "ECRIRE_DONNEES_PHYSIQUES"
  | "VOIR_DONNEES_MEDICALES"
  | "ECRIRE_DONNEES_MEDICALES"
  | "CREER_SEANCE_ENTRAINEMENT"
  | "EVALUER_ENTRAINEMENT"
  | "VOIR_DONNEES_MATCH"
  | "ECRIRE_DONNEES_MATCH"
  | "VOIR_DONNEES_PLANNING"
  | "ECRIRE_DONNEES_PLANNING"
  | "VOIR_SUGGESTIONS_IA"
  | "ACCEPTER_SUGGESTIONS_IA"
  | "VOIR_STAFF"
  | "GERER_STAFF";

export const POSTES_LABELS: Record<string, string> = {
  GARDIEN: "Gardien",
  DEFENSEUR_CENTRAL: "Défenseur central",
  DEFENSEUR_LATERAL: "Défenseur latéral",
  MILIEU_CENTRAL: "Milieu central",
  MILIEU_OFFENSIF: "Milieu offensif",
  ATTAQUANT: "Attaquant",
  POLYVALENT: "Polyvalent",
};

export const PILLAR_LABELS: Record<Pilier, string> = {
  physique: "Physique",
  technique: "Technique",
  tactique: "Tactique",
  mental: "Mental",
};

export const PILLAR_COLORS: Record<Pilier, string> = {
  physique: "oklch(0.55 0.22 25)",
  technique: "oklch(0.45 0.18 255)",
  tactique: "oklch(0.45 0.19 310)",
  mental: "oklch(0.65 0.16 65)",
};

export const PILLAR_TEXT_COLORS: Record<Pilier, string> = {
  physique: "oklch(0.42 0.2 25)",
  technique: "oklch(0.38 0.16 255)",
  tactique: "oklch(0.38 0.17 310)",
  mental: "oklch(0.53 0.13 55)",
};
