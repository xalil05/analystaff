"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/stores";
import { TacticalBoard } from "@/components/match/TacticalBoard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SkeletonCard, SkeletonText } from "@/components/ui/Skeleton";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import Link from "next/link";
import {
  ChevronRight,
  MapPin,
  Calendar,
  Trophy,
  Users,
  ArrowRight,
  Activity,
  Target,
  TrendingUp,
  Save,
  CheckCircle,
  Clock,
  Edit2,
  Trash2,
  Plus,
} from "lucide-react";

// ── Types locaux ────────────────────────────────────────────────────────────────
type CodeFormation = "4-4-2" | "4-3-3" | "4-2-3-1" | "4-1-4-1" | "3-5-2" | "3-4-3" | "5-3-2" | "5-4-1";
type TabKey = "composition" | "remplacements" | "evaluations";

interface PlayerMini {
  id: string;
  nom: string;
  prenom: string | null;
  numero: number | null;
}

interface LineupPlayer {
  id: string;
  player_id: string;
  is_starting: boolean;
  is_captain: boolean;
  is_goalkeeper: boolean;
  tactical_role: string | null;
  position_x: number;
  position_y: number;
  player?: PlayerMini;
}

interface SubstitutionData {
  id: string;
  player_out_id: string;
  player_in_id: string;
  minute: number;
  motif: string;
  player_out?: PlayerMini;
  player_in?: PlayerMini;
}

interface EvaluationData {
  id: string;
  joueur_id: string;
  note_globale: number | null;
  note_physique: number | null;
  note_technique: number | null;
  note_tactique: number | null;
  note_mental: number | null;
  remarques: string | null;
  player?: PlayerMini;
}

// ── Données ──────────────────────────────────────────────────────────────────────
const FORMATIONS: CodeFormation[] = [
  "4-4-2", "4-3-3", "4-2-3-1", "4-1-4-1", "3-5-2", "3-4-3", "5-3-2", "5-4-1",
];

const POSITIONS_4_4_2: { x: number; y: number; role: string }[] = [
  { x: 50, y: 90, role: "GK" },
  { x: 20, y: 70, role: "DC" },
  { x: 40, y: 70, role: "DC" },
  { x: 60, y: 70, role: "DC" },
  { x: 80, y: 70, role: "DC" },
  { x: 20, y: 45, role: "MC" },
  { x: 40, y: 45, role: "MC" },
  { x: 60, y: 45, role: "MC" },
  { x: 80, y: 45, role: "MC" },
  { x: 35, y: 20, role: "ST" },
  { x: 65, y: 20, role: "ST" },
];

const POSITIONS_4_3_3: { x: number; y: number; role: string }[] = [
  { x: 50, y: 90, role: "GK" },
  { x: 20, y: 70, role: "DC" },
  { x: 40, y: 70, role: "DC" },
  { x: 60, y: 70, role: "DC" },
  { x: 80, y: 70, role: "DC" },
  { x: 30, y: 45, role: "MC" },
  { x: 50, y: 45, role: "MC" },
  { x: 70, y: 45, role: "MC" },
  { x: 20, y: 20, role: "LW" },
  { x: 50, y: 15, role: "ST" },
  { x: 80, y: 20, role: "RW" },
];

const POSITIONS_4_2_3_1: { x: number; y: number; role: string }[] = [
  { x: 50, y: 90, role: "GK" },
  { x: 20, y: 70, role: "DC" },
  { x: 40, y: 70, role: "DC" },
  { x: 60, y: 70, role: "DC" },
  { x: 80, y: 70, role: "DC" },
  { x: 35, y: 50, role: "CDM" },
  { x: 65, y: 50, role: "CDM" },
  { x: 20, y: 30, role: "LAM" },
  { x: 50, y: 30, role: "CAM" },
  { x: 80, y: 30, role: "RAM" },
  { x: 50, y: 10, role: "ST" },
];

const FORMATIONS_MAP: Record<CodeFormation, { x: number; y: number; role: string }[]> = {
  "4-4-2": POSITIONS_4_4_2,
  "4-3-3": POSITIONS_4_3_3,
  "4-2-3-1": POSITIONS_4_2_3_1,
  "4-1-4-1": POSITIONS_4_3_3.map((p, i) => i < 5 ? p : { ...p, x: p.x, y: p.y }),
  "3-5-2": POSITIONS_4_4_2.map((p, i) => i < 5 ? p : { ...p, x: p.x, y: p.y }),
  "3-4-3": POSITIONS_4_3_3.map((p, i) => i < 5 ? p : { ...p, x: p.x, y: p.y }),
  "5-3-2": POSITIONS_4_4_2.map((p, i) => i < 5 ? p : { ...p, x: p.x, y: p.y }),
  "5-4-1": POSITIONS_4_4_2.map((p, i) => i < 5 ? p : { ...p, x: p.x, y: p.y }),
};

const MOCK_PLAYERS: PlayerMini[] = [
  { id: "j1", nom: "Mané", prenom: "Sadio", numero: 10 },
  { id: "j2", nom: "Koulibaly", prenom: "Kalidou", numero: 6 },
  { id: "j3", nom: "Gueye", prenom: "Idrissa", numero: 8 },
  { id: "j4", nom: "Mendy", prenom: "Édouard", numero: 1 },
  { id: "j5", nom: "Sarr", prenom: "Ismaïla", numero: 12 },
  { id: "j6", nom: "Diédhiou", prenom: "Famara", numero: 17 },
  { id: "j7", nom: "Alberto", prenom: "Pape", numero: 2 },
  { id: "j8", nom: "Garde", prenom: "Lamine", numero: 19 },
  { id: "j9", nom: "Diallo", prenom: "Abdou", numero: 16 },
  { id: "j10", nom: "Jallow", prenom: "Nicolas", numero: 11 },
  { id: "j11", nom: "Barry", prenom: "Boubacar", numero: 4 },
  { id: "j12", nom: "Toure", prenom: "Khady", numero: 15 },
];

const MOCK_LINEUP: LineupPlayer[] = [
  { id: "lu1", player_id: "j4", is_starting: true, is_captain: false, is_goalkeeper: true, tactical_role: "GK", position_x: 50, position_y: 90, player: MOCK_PLAYERS[3] },
  { id: "lu2", player_id: "j7", is_starting: true, is_captain: false, is_goalkeeper: false, tactical_role: "DC", position_x: 20, position_y: 70, player: MOCK_PLAYERS[6] },
  { id: "lu3", player_id: "j2", is_starting: true, is_captain: true, is_goalkeeper: false, tactical_role: "DC", position_x: 40, position_y: 70, player: MOCK_PLAYERS[1] },
  { id: "lu4", player_id: "j11", is_starting: true, is_captain: false, is_goalkeeper: false, tactical_role: "DC", position_x: 60, position_y: 70, player: MOCK_PLAYERS[10] },
  { id: "lu5", player_id: "j6", is_starting: true, is_captain: false, is_goalkeeper: false, tactical_role: "DC", position_x: 80, position_y: 70, player: MOCK_PLAYERS[5] },
  { id: "lu6", player_id: "j3", is_starting: true, is_captain: false, is_goalkeeper: false, tactical_role: "MC", position_x: 20, position_y: 45, player: MOCK_PLAYERS[2] },
  { id: "lu7", player_id: "j12", is_starting: true, is_captain: false, is_goalkeeper: false, tactical_role: "MC", position_x: 40, position_y: 45, player: MOCK_PLAYERS[11] },
  { id: "lu8", player_id: "j8", is_starting: true, is_captain: false, is_goalkeeper: false, tactical_role: "MC", position_x: 60, position_y: 45, player: MOCK_PLAYERS[7] },
  { id: "lu9", player_id: "j10", is_starting: true, is_captain: false, is_goalkeeper: false, tactical_role: "MC", position_x: 80, position_y: 45, player: MOCK_PLAYERS[9] },
  { id: "lu10", player_id: "j1", is_starting: true, is_captain: false, is_goalkeeper: false, tactical_role: "ST", position_x: 35, position_y: 20, player: MOCK_PLAYERS[0] },
  { id: "lu11", player_id: "j5", is_starting: true, is_captain: false, is_goalkeeper: false, tactical_role: "ST", position_x: 65, position_y: 20, player: MOCK_PLAYERS[4] },
  { id: "lu12", player_id: "j9", is_starting: false, is_captain: false, is_goalkeeper: false, tactical_role: null, position_x: 50, position_y: 50, player: MOCK_PLAYERS[8] },
];

const MOCK_SUBSTITUTIONS: SubstitutionData[] = [
  {
    id: "sub1",
    player_out_id: "j8",
    player_in_id: "j3",
    minute: 65,
    motif: "Tactique",
    player_out: MOCK_PLAYERS[7],
    player_in: MOCK_PLAYERS[2],
  },
  {
    id: "sub2",
    player_out_id: "j5",
    player_in_id: "j10",
    minute: 72,
    motif: "Fatigue",
    player_out: MOCK_PLAYERS[4],
    player_in: MOCK_PLAYERS[9],
  },
];

const MOCK_EVALUATIONS: EvaluationData[] = [
  { id: "ev1", joueur_id: "j1", note_globale: 8.2, note_physique: 8, note_technique: 9, note_tactique: 8, note_mental: 8, remarques: "Très bonne finition, excellent placement", player: MOCK_PLAYERS[0] },
  { id: "ev2", joueur_id: "j2", note_globale: 7.8, note_physique: 8, note_technique: 7, note_tactique: 8, note_mental: 8, remarques: "Bon match défensif", player: MOCK_PLAYERS[1] },
  { id: "ev3", joueur_id: "j3", note_globale: 7.5, note_physique: 7, note_technique: 8, note_tactique: 8, note_mental: 7, remarques: "Bonne vision du jeu", player: MOCK_PLAYERS[2] },
  { id: "ev4", joueur_id: "j4", note_globale: 7.0, note_physique: 7, note_technique: 6, note_tactique: 7, note_mental: 8, remarques: "Clean sheet", player: MOCK_PLAYERS[3] },
  { id: "ev5", joueur_id: "j7", note_globale: 6.8, note_physique: 7, note_technique: 6, note_tactique: 7, note_mental: 7, remarques: "Correct", player: MOCK_PLAYERS[6] },
  { id: "ev6", joueur_id: "j10", note_globale: 6.5, note_physique: 6, note_technique: 7, note_tactique: 6, note_mental: 7, remarques: "Peu de temps de jeu", player: MOCK_PLAYERS[9] },
];

const PILLAR_COLORS: Record<string, string> = {
  physique: "oklch(0.55 0.22 25)",
  technique: "oklch(0.45 0.18 255)",
  tactique: "oklch(0.45 0.19 310)",
  mental: "oklch(0.65 0.16 65)",
};

const COLORS = {
  bg: "var(--bg)",
  surface: "var(--surface)",
  surface2: "var(--surface-2)",
  line: "var(--border)",
  textStrong: "var(--text-strong)",
  muted: "var(--text-muted)",
  faint: "var(--text-faint)",
  primary: "var(--primary)",
  primarySoft: "var(--primary-soft)",
  accent: "var(--accent)",
  destructive: "var(--destructive)",
  destructiveSoft: "var(--destructive-soft)",
  onPrimary: "var(--on-primary)",
};

// ── Onglets ──────────────────────────────────────────────────────────────────────
function TabComposition({
  formation,
  onFormationChange,
  lineup,
  onValidate,
  onSaveDraft,
}: {
  formation: CodeFormation;
  onFormationChange: (f: CodeFormation) => void;
  lineup: LineupPlayer[];
  onValidate: () => void;
  onSaveDraft: () => void;
}) {
  return (
    <div className="space-y-6">
      {/* Sélecteur formation */}
      <div className="card p-4">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-sm font-medium" style={{ color: COLORS.textStrong }}>
            Formation
          </span>
          <div className="flex flex-wrap gap-1">
            {FORMATIONS.map((f) => (
              <button
                key={f}
                onClick={() => onFormationChange(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-data font-bold transition-all ${
                  formation === f ? "text-white" : ""
                }`}
                style={{
                  backgroundColor: formation === f ? COLORS.primary : COLORS.surface2,
                  color: formation === f ? COLORS.onPrimary : COLORS.muted,
                  border: `1px solid ${formation === f ? COLORS.primary : COLORS.line}`,
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Plateau tactique */}
      <TacticalBoard
        formation={formation}
        joueurs={lineup}
        onValidate={onValidate}
        onSaveDraft={onSaveDraft}
        isEditable={true}
      />
    </div>
  );
}

function TabRemplacements({ substitutions }: { substitutions: SubstitutionData[] }) {
  return (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-data text-lg font-semibold text-text-strong flex items-center gap-2" style={{ color: COLORS.textStrong }}>
            <ArrowRight size={16} style={{ color: COLORS.primary }} />
            Remplacements du match
          </h2>
          <button className="btn btn-secondary btn-sm gap-1">
            <Plus size={14} />
            Ajouter
          </button>
        </div>

        {substitutions.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-muted text-sm">Aucun remplacement enregistré</p>
          </div>
        ) : (
          <div className="space-y-3">
            {substitutions.map((sub) => (
              <div
                key={sub.id}
                className="flex items-center gap-4 p-4 rounded-lg"
                style={{ backgroundColor: COLORS.surface2 }}
              >
                {/* Minute */}
                <div className="text-center min-w-[50px]">
                  <span className="font-data font-bold text-lg" style={{ color: COLORS.primary }}>
                    {sub.minute}&apos;
                  </span>
                </div>

                {/* Sortant */}
                <div className="flex-1 flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white font-data font-bold text-sm shrink-0"
                    style={{ backgroundColor: COLORS.destructive }}
                  >
                    {sub.player_out?.numero ?? "?"}
                  </div>
                  <div>
                    <p className="font-data font-medium text-sm" style={{ color: COLORS.textStrong }}>
                      {sub.player_out?.prenom} {sub.player_out?.nom}
                    </p>
                    <p className="text-xs" style={{ color: COLORS.muted }}>Sortant</p>
                  </div>
                </div>

                {/* Flèche */}
                <div className="flex items-center gap-1">
                  <ArrowRight size={16} style={{ color: COLORS.muted }} />
                </div>

                {/* Entrant */}
                <div className="flex-1 flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white font-data font-bold text-sm shrink-0"
                    style={{ backgroundColor: COLORS.primary }}
                  >
                    {sub.player_in?.numero ?? "?"}
                  </div>
                  <div>
                    <p className="font-data font-medium text-sm" style={{ color: COLORS.textStrong }}>
                      {sub.player_in?.prenom} {sub.player_in?.nom}
                    </p>
                    <p className="text-xs" style={{ color: COLORS.muted }}>Entrant</p>
                  </div>
                </div>

                {/* Motif */}
                <div className="min-w-[80px] text-right">
                  <span
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium uppercase tracking-wider"
                    style={{
                      backgroundColor:
                        sub.motif === "Tactique"
                          ? "var(--info-soft)"
                          : sub.motif === "Blessure"
                          ? COLORS.destructiveSoft
                          : sub.motif === "Fatigue"
                          ? "var(--accent-soft)"
                          : COLORS.surface2,
                      color:
                        sub.motif === "Tactique"
                          ? "var(--info)"
                          : sub.motif === "Blessure"
                          ? COLORS.destructive
                          : sub.motif === "Fatigue"
                          ? "var(--accent-strong)"
                          : COLORS.muted,
                    }}
                  >
                    {sub.motif}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TabEvaluations({ evaluations }: { evaluations: EvaluationData[] }) {
  const moyenne = evaluations.length > 0
    ? evaluations.reduce((s, e) => s + (e.note_globale ?? 0), 0) / evaluations.length
    : null;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="card card-sm flex items-center gap-3">
          <div className="kpi-icon bg-primary-soft text-primary">
            <Target size={18} />
          </div>
          <div>
            <p className="text-muted text-tiny font-medium uppercase tracking-wider">
              Moyenne
            </p>
            <p className="font-data font-semibold text-lg tabular-nums" style={{ color: COLORS.textStrong }}>
              {moyenne != null ? moyenne.toFixed(1) : "—"}/10
            </p>
          </div>
        </div>
        <div className="card card-sm flex items-center gap-3">
          <div className="kpi-icon bg-primary-soft text-primary">
            <Activity size={18} />
          </div>
          <div>
            <p className="text-muted text-tiny font-medium uppercase tracking-wider">
              Joueurs évalués
            </p>
            <p className="font-data font-semibold text-lg tabular-nums" style={{ color: COLORS.textStrong }}>
              {evaluations.length}
            </p>
          </div>
        </div>
        <div className="card card-sm flex items-center gap-3">
          <div className="kpi-icon bg-primary-soft text-primary">
            <TrendingUp size={18} />
          </div>
          <div>
            <p className="text-muted text-tiny font-medium uppercase tracking-wider">
              Note max
            </p>
            <p className="font-data font-semibold text-lg tabular-nums" style={{ color: COLORS.textStrong }}>
              {evaluations.length > 0
                ? Math.max(...evaluations.map((e) => e.note_globale ?? 0)).toFixed(1)
                : "—"}
            </p>
          </div>
        </div>
        <div className="card card-sm flex items-center gap-3">
          <div
            className="kpi-icon"
            style={{ backgroundColor: "oklch(0.78 0.15 75 / 0.1)" }}
          >
            <Activity size={18} style={{ color: "var(--accent-strong)" }} />
          </div>
          <div>
            <p className="text-muted text-tiny font-medium uppercase tracking-wider">
              Note min
            </p>
            <p className="font-data font-semibold text-lg tabular-nums" style={{ color: COLORS.textStrong }}>
              {evaluations.length > 0
                ? Math.min(...evaluations.map((e) => e.note_globale ?? 0)).toFixed(1)
                : "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Tableau évaluations */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-data text-lg font-semibold text-text-strong flex items-center gap-2" style={{ color: COLORS.textStrong }}>
            <Target size={16} style={{ color: COLORS.primary }} />
            Évaluations détaillées
          </h2>
          <button className="btn btn-primary btn-sm gap-1" style={{ backgroundColor: COLORS.primary, color: COLORS.onPrimary, borderColor: COLORS.primary }}>
            <Plus size={14} />
            Évaluer
          </button>
        </div>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Joueur</th>
                <th>Physique</th>
                <th>Technique</th>
                <th>Tactique</th>
                <th>Mental</th>
                <th>Note globale</th>
                <th>Remarques</th>
              </tr>
            </thead>
            <tbody>
              {evaluations.map((ev) => (
                <tr key={ev.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-white font-data font-bold text-xs shrink-0"
                        style={{ backgroundColor: COLORS.primary }}
                      >
                        {ev.player?.numero ?? "?"}
                      </div>
                      <span className="font-data font-medium text-sm" style={{ color: COLORS.textStrong }}>
                        {ev.player?.prenom?.[0]}. {ev.player?.nom}
                      </span>
                    </div>
                  </td>
                  <td className="font-data font-bold tabular-nums" style={{ color: COLORS.textStrong }}>
                    {ev.note_physique != null ? (
                      <span style={{ color: PILLAR_COLORS.physique }}>{ev.note_physique.toFixed(1)}</span>
                    ) : "—"}
                  </td>
                  <td className="font-data font-bold tabular-nums" style={{ color: COLORS.textStrong }}>
                    {ev.note_technique != null ? (
                      <span style={{ color: PILLAR_COLORS.technique }}>{ev.note_technique.toFixed(1)}</span>
                    ) : "—"}
                  </td>
                  <td className="font-data font-bold tabular-nums" style={{ color: COLORS.textStrong }}>
                    {ev.note_tactique != null ? (
                      <span style={{ color: PILLAR_COLORS.tactique }}>{ev.note_tactique.toFixed(1)}</span>
                    ) : "—"}
                  </td>
                  <td className="font-data font-bold tabular-nums" style={{ color: COLORS.textStrong }}>
                    {ev.note_mental != null ? (
                      <span style={{ color: PILLAR_COLORS.mental }}>{ev.note_mental.toFixed(1)}</span>
                    ) : "—"}
                  </td>
                  <td className="font-data font-bold tabular-nums" style={{ color: COLORS.textStrong }}>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs ${
                        ev.note_globale != null && ev.note_globale >= 8
                          ? "bg-primary-soft text-primary font-bold"
                          : ev.note_globale != null && ev.note_globale >= 6
                          ? "bg-accent-soft text-accent-strong"
                          : "bg-destructive-soft text-destructive"
                      }`}
                    >
                      {ev.note_globale?.toFixed(1) ?? "—"}
                    </span>
                  </td>
                  <td className="text-sm" style={{ color: COLORS.muted }}>
                    {ev.remarques ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────────
export default function MatchDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  const [activeTab, setActiveTab] = useState<TabKey>("composition");
  const [formation, setFormation] = useState<CodeFormation>("4-4-2");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    const t = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(t);
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;

  if (loading) {
    return (
      <div className="page-wrapper">
        <Sidebar />
        <main className="page-content ml-56" style={{ backgroundColor: COLORS.bg }}>
          <Header />
          <div className="page-main">
            <SkeletonText width="30%" height={24} mb={24} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SkeletonCard lines={6} />
              <SkeletonCard lines={4} />
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Match mocké
  const match = {
    id: params.id as string,
    adversaire: "Génération Foot",
    date_match: "2026-09-10T16:00:00Z",
    lieu: "Dakar",
    competition: "Ligue 1",
    is_domicile: true,
    score_equipe: 2,
    score_adversaire: 1,
    statut: "TERMINE",
  };

  const lineup = MOCK_LINEUP;
  const substitutions = MOCK_SUBSTITUTIONS;
  const evaluations = MOCK_EVALUATIONS;

  return (
    <div className="page-wrapper">
      <Sidebar />
      <main className="page-content ml-56" style={{ backgroundColor: COLORS.bg }}>
        <Header />
        <div className="page-main">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-4 text-sm">
            <Link href="/matches" className="text-muted hover:text-primary transition-colors">
              Matchs
            </Link>
            <ChevronRight size={12} style={{ color: COLORS.faint }} />
            <span className="text-text-strong font-medium" style={{ color: COLORS.textStrong }}>
              vs {match.adversaire}
            </span>
          </div>

          {/* Header match */}
          <div className="card p-6 mb-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-xs uppercase tracking-wider" style={{ color: COLORS.muted }}>
                    {match.is_domicile ? "Domicile" : "Extérieur"}
                  </p>
                  <p className="font-data text-3xl font-bold tabular-nums" style={{ color: COLORS.textStrong }}>
                    {match.score_equipe}
                  </p>
                </div>
                <div className="text-2xl font-bold" style={{ color: COLORS.faint }}>
                  —
                </div>
                <div className="text-center">
                  <p className="text-xs uppercase tracking-wider" style={{ color: COLORS.muted }}>
                    {match.is_domicile ? "Extérieur" : "Domicile"}
                  </p>
                  <p className="font-data text-3xl font-bold tabular-nums" style={{ color: COLORS.textStrong }}>
                    {match.score_adversaire}
                  </p>
                </div>
                <div className="ml-4">
                  <p className="font-data text-lg font-semibold" style={{ color: COLORS.textStrong }}>
                    vs {match.adversaire}
                  </p>
                  <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: COLORS.muted }}>
                    <span className="flex items-center gap-1">
                      <Calendar size={11} />
                      {new Date(match.date_match).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin size={11} />
                      {match.lieu}
                    </span>
                    <span className="flex items-center gap-1">
                      <Trophy size={11} />
                      {match.competition}
                    </span>
                  </div>
                </div>
              </div>
              <span
                className="badge badge-fit"
                style={{ fontSize: "12px", padding: "4px 12px" }}
              >
                {match.statut === "TERMINE" ? "Terminé" : match.statut === "EN_COURS" ? "En cours" : match.statut === "PLANIFIE" ? "Planifié" : match.statut}
              </span>
            </div>
          </div>

          {/* Onglets */}
          <div className="tabs mb-6">
            <button
              onClick={() => setActiveTab("composition")}
              className={`tab ${activeTab === "composition" ? "active" : ""}`}
            >
              <Users size={16} />
              Composition
            </button>
            <button
              onClick={() => setActiveTab("remplacements")}
              className={`tab ${activeTab === "remplacements" ? "active" : ""}`}
            >
              <ArrowRight size={16} />
              Remplacements
            </button>
            <button
              onClick={() => setActiveTab("evaluations")}
              className={`tab ${activeTab === "evaluations" ? "active" : ""}`}
            >
              <Target size={16} />
              Évaluations
            </button>
          </div>

          {/* Contenu */}
          {activeTab === "composition" && (
            <TabComposition
              formation={formation}
              onFormationChange={setFormation}
              lineup={lineup}
              onValidate={() => alert("Composition validée")}
              onSaveDraft={() => alert("Brouillon enregistré")}
            />
          )}
          {activeTab === "remplacements" && <TabRemplacements substitutions={substitutions} />}
          {activeTab === "evaluations" && <TabEvaluations evaluations={evaluations} />}
        </div>
      </main>
    </div>
  );
}
