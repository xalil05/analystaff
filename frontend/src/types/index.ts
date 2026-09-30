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

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: AuthUser;
  expires_in: number;
}

export interface LoginData {
  email: string;
  password: string;
  club_id?: string;
}

// ─── Joueurs ────────────────────────────────────────────────────────────────────
export type PlayerStatut =
  | "ACTIF"
  | "BLESSE"
  | "REPRISE"
  | "SUSPENDU"
  | "INDISPONIBLE"
  | "ARCHIVE";

export interface Joueur {
  id: string;
  club_id: string;
  prenom: string;
  nom: string;
  poste_principal: string;
  postes_secondaires: string[];
  numero_maillot: number | null;
  photo_url: string | null;
  statut: PlayerStatut;
  date_naissance: string | null;
  taille: number | null;
  poids: number | null;
  charge_travail: number | null;
}

export interface CreateJoueurData {
  prenom: string;
  nom: string;
  date_naissance?: string;
  poste_principal: string;
  postes_secondaires?: string[];
  numero_maillot?: number;
  taille?: number;
  poids?: number;
  statut?: PlayerStatut;
}

export interface UpdateJoueurData {
  prenom?: string;
  nom?: string;
  date_naissance?: string;
  poste_principal?: string;
  postes_secondaires?: string[];
  numero_maillot?: number;
  taille?: number;
  poids?: number;
  statut?: PlayerStatut;
  photo_url?: string;
}

// ─── Profil joueur (sections) ───────────────────────────────────────────────────
export interface PlayerIdentity {
  id: string;
  nom: string;
  prenom: string | null;
  photo_url: string | null;
  poste: string | null;
  numero: number | null;
  date_naissance: string | null;
  statut: PlayerStatut;
}

export interface PlayerPhysical {
  taille_cm: number | null;
  poids_kg: number | null;
  imc: number | null;
  charge_travail: number;
}

// ─── Matchs ─────────────────────────────────────────────────────────────────────
export type MatchStatut =
  | "PLANIFIE"
  | "EN_COURS"
  | "TERMINE"
  | "ANNULE";

export interface Match {
  id: string;
  club_id: string;
  adversaire: string;
  date_match: string;
  lieu: string;
  competition: string;
  statut: MatchStatut;
  composition_validee: boolean;
  score_domicile: number | null;
  score_exterieur: number | null;
}

export interface MatchDetail extends Match {
  formation: string | null;
  disposition: TacticalSetup | null;
  titulaires: string[];
  remplacants: string[];
  capitaine: string | null;
  gardien: string | null;
  evaluations: MatchEvaluation[];
  substitutions: Substitution[];
}

export interface TacticalSetup {
  formation: string;
  disposition_libre: boolean;
  joueurs: TacticalPlayerPosition[];
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

export interface Substitution {
  id: string;
  joueur_sortant_id: string;
  joueur_entrant_id: string;
  minute: number;
  motif: string;
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
export interface TrainingSession {
  id: string;
  club_id: string;
  date: string;
  titre: string;
  objectifs: string[];
  charge_prevue: number;
  statut: string;
  joueurs: string[];
  evaluations: TrainingEvaluation[];
}

export interface TrainingEvaluation {
  id: string;
  joueur_id: string;
  assiduite: string;
  rpe: number | null;
  note_physique: number | null;
  note_technique: number | null;
  note_tactique: number | null;
  note_mental: number | null;
  remarques: string | null;
  contexte_saisie: string;
  saisie_hors_ligne: boolean;
  synchronisee: boolean;
  date_saisie_reelle: string;
}

export interface CreateTrainingData {
  titre: string;
  date: string;
  objectifs: string[];
  charge_prevue: number;
  joueurs: string[];
}

export interface EvaluationData {
  joueur_id: string;
  assiduite: string;
  rpe?: number;
  note_physique?: number;
  note_technique?: number;
  note_tactique?: number;
  note_mental?: number;
  remarques?: string;
}

// ─── Planification ──────────────────────────────────────────────────────────────
export interface WorkPlan {
  id: string;
  club_id: string;
  titre: string;
  semaine_debut: string;
  semaine_fin: string;
  items: WorkPlanItem[];
}

export interface WorkPlanItem {
  id: string;
  titre: string;
  date: string;
  type: string;
  objectifs: string[];
  statut: string;
}

export interface CreateWorkPlanData {
  titre: string;
  semaine_debut: string;
  semaine_fin: string;
  items: CreateWorkPlanItem[];
}

export interface CreateWorkPlanItem {
  titre: string;
  date: string;
  type: string;
  objectifs: string[];
}

// ─── Évaluations / Piliers ───────────────────────────────────────────────────────
export type Pilier = "physique" | "technique" | "tactique" | "mental";

export interface PillarNote {
  pilier: Pilier;
  note: number;
}

export interface Evaluation {
  id: string;
  match_id: string | null;
  joueur_id: string;
  date: string;
  note_globale: number | null;
  note_physique: number | null;
  note_technique: number | null;
  note_tactique: number | null;
  note_mental: number | null;
  remarques: string | null;
}

export interface WeightingSnapshot {
  poids_physique: number;
  poids_technique: number;
  poids_tactique: number;
  poids_mental: number;
}

export interface ChargeJour {
  jour: string;
  valeur: number;
}

// ─── Dossier médical ─────────────────────────────────────────────────────────────
export type MedicalType =
  | "blessure"
  | "contre_indication"
  | "antecedent"
  | "suivi";

export interface MedicalRecord {
  id: string;
  type: MedicalType;
  description: string | null;
  date_debut: string | null;
  date_fin: string | null;
  statut: string;
  joueur_id: string;
}

// ─── Pondérations ───────────────────────────────────────────────────────────────
export interface Ponderation {
  poste: string;
  physique: number;
  technique: number;
  tactique: number;
  mental: number;
}

export interface UpdatePonderationData {
  physique: number;
  technique: number;
  tactique: number;
  mental: number;
}

// ─── Staff ───────────────────────────────────────────────────────────────────────
export type StaffRole =
  | "HEAD_COACH"
  | "ASSISTANT_COACH"
  | "FITNESS_COACH"
  | "GOALKEEPER_COACH"
  | "ANALYST"
  | "MEDICAL_STAFF"
  | "PSYCHOLOGIST"
  | "KIT_MANAGER"
  | "ADMIN_CLUB";

export interface StaffMember {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  role: StaffRole;
  photo_url: string | null;
  permissions: string[];
  statut: string;
}

export interface InviteStaffData {
  email: string;
  role: StaffRole;
}

export interface UpdatePermissionsData {
  permissions: string[];
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
