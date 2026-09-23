/**
 * Analystaff — Types pour le PlayerDetailDrawer
 * Aligné sur SCHEMA_SQL.md et DECISIONS_FIGEES.md
 */

// ─── Permissions (§5.3 SCHEMA_SQL) ───────────────────────────────────────────
export type PermissionCode =
  | 'VOIR_DONNEES_PHYSIQUES'
  | 'ECRIRE_DONNEES_PHYSIQUES'
  | 'VOIR_DONNEES_MEDICALES'
  | 'ECRIRE_DONNEES_MEDICALES'
  | 'CREER_SEANCE_ENTRAINEMENT'
  | 'EVALUER_ENTRAINEMENT';

// ─── Enums SQL ───────────────────────────────────────────────────────────────
export type PlayerStatut = 'actif' | 'blesse' | 'suspendu' | 'parti' | 'archive';
export type Pilier = 'physique' | 'technique' | 'tactique' | 'mental';
export type ContexteSaisie =
  | 'direct_stade'
  | 'apres_match'
  | 'avant_entrainement'
  | 'apres_entrainement'
  | 'planification'
  | 'autre';

// ─── Données joueur (tables players + physical_profiles) ─────────────────────
export interface PlayerIdentity {
  id: number;
  nom: string;
  prenom: string | null;
  photoUrl: string | null;
  poste: string | null;
  numero: number | null;
  dateNaissance: string | null; // ISO date
  statut: PlayerStatut;
}

export interface PlayerPhysical {
  tailleCm: number | null;
  poidsKg: number | null;
  imc: number | null;
  chargeTravail: number;
}

// ─── Pilier / Radar ──────────────────────────────────────────────────────────
export interface PillarNote {
  pilier: Pilier;
  note: number; // 0-10
}

export interface WeightingSnapshot {
  poidsPhysique: number;
  poidsTechnique: number;
  poidsTactique: number;
  poidsMental: number;
}

// ─── Évaluation match (tables evaluations + match_evaluation_pillars) ────────
export interface MatchEvaluation {
  matchId: number;
  adversaire: string;
  competition: string;
  dateMatch: string; // ISO datetime
  minutes: number;
  buts: number;
  passes: number;
  noteGlobale: number | null;
  pillars: PillarNote[];
  snapshot: WeightingSnapshot | null;
  contexteSaisie: ContexteSaisie;
  saisieHorsLigne: boolean;
  synchronisee: boolean;
  dateSaisieReelle: string; // ISO datetime
}

// ─── Dossier médical (table medical_records) ─────────────────────────────────
export interface MedicalRecord {
  id: number;
  type: 'blessure' | 'contre_indication' | 'antecedent' | 'suivi';
  description: string | null;
  dateDebut: string | null;
  dateFin: string | null;
  statut: string;
}

// ─── Charge d'entraînement (7 jours) ─────────────────────────────────────────
export interface ChargeJour {
  jour: string; // Lun, Mar, Mer...
  valeur: number; // 0-100
}

// ─── Props du composant ──────────────────────────────────────────────────────
export interface PlayerDetailDrawerProps {
  player: PlayerIdentity;
  physical: PlayerPhysical | null;
  evaluations: MatchEvaluation[];
  medicalRecords: MedicalRecord[];
  charge7Jours: ChargeJour[];
  clubMoyenne: PillarNote[] | null; // moyenne du club pour le radar
  userPermissions: PermissionCode[]; // permissions de l'utilisateur connecté
  onClose: () => void;
  onExportPdf: () => void;
  onEvaluer: () => void;
  onIaAction: (actionKey: IaActionKey) => void;
}

// ─── Actions IA métier (DECISIONS_FIGEES.md §11) ─────────────────────────────
export type IaActionKey =
  | 'ANALYSER_FATIGUE'
  | 'SUGGERER_COMPOSITION'
  | 'EVOLUTION_FORME'
  | 'EVALUER_RISQUE_BLESSURE';

export interface IaAction {
  key: IaActionKey;
  label: string;
  icon: string; // emoji ou nom d'icône
}
