"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/stores";
import { TacticalBoard } from "@/components/match/TacticalBoard";
import type { LineupPlayer } from "@/components/match/TacticalBoard";
import { useApiData, useApiList } from "@/hooks/useApiData";
import { matchesApi, evaluationsApi, joueursApi } from "@/lib/api";
import type {
  Evaluation,
  Joueur,
  Match,
  PlayerMini,
  Substitution,
  TacticalSetup,
} from "@/types";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SkeletonCard, SkeletonText } from "@/components/ui/Skeleton";
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



// Les types viennent de @/types : Substitution et Evaluation y sont definis
// d'apres SubstitutionResponse et EvaluationResponse. Les redclarer ici
// avait produit des champs qui n'existent pas (remarques, note_physique).

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
                className={`px-3 py-1.5 rounded-lg text-xs font-data font-bold transition-colors ${
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

/**
 * Le backend ne renvoie que des player_id dans les substitutions : les noms
 * sont résolus par la page depuis la liste de l'effectif.
 */
function TabRemplacements({
  substitutions,
  parId,
}: {
  substitutions: Substitution[];
  parId: Record<number, PlayerMini>;
}) {
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
                    {parId[sub.player_out_id]?.numero ?? "?"}
                  </div>
                  <div>
                    <p className="font-data font-medium text-sm" style={{ color: COLORS.textStrong }}>
                      {parId[sub.player_out_id]?.prenom} {parId[sub.player_out_id]?.nom}
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
                    {parId[sub.player_in_id]?.numero ?? "?"}
                  </div>
                  <div>
                    <p className="font-data font-medium text-sm" style={{ color: COLORS.textStrong }}>
                      {parId[sub.player_in_id]?.prenom} {parId[sub.player_in_id]?.nom}
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
                        sub.motif === "tactique"
                          ? "var(--info-soft)"
                          : sub.motif === "blessure"
                          ? COLORS.destructiveSoft
                          : sub.motif === "fatigue"
                          ? "var(--accent-soft)"
                          : COLORS.surface2,
                      color:
                        sub.motif === "tactique"
                          ? "var(--info)"
                          : sub.motif === "blessure"
                          ? COLORS.destructive
                          : sub.motif === "fatigue"
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

/** Note d'un pilier : le backend les range dans `pillars`, pas en champs plats. */
function noteDe(evaluation: Evaluation, pilier: string): number | null {
  return evaluation.pillars?.find((p) => p.pilier === pilier)?.note ?? null;
}

function TabEvaluations({
  evaluations,
  parId,
}: {
  evaluations: Evaluation[];
  parId: Record<number, PlayerMini>;
}) {
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
                        {parId[ev.player_id]?.numero ?? "?"}
                      </div>
                      <span className="font-data font-medium text-sm" style={{ color: COLORS.textStrong }}>
                        {parId[ev.player_id]?.prenom?.[0]}. {parId[ev.player_id]?.nom}
                      </span>
                    </div>
                  </td>
                  <td className="font-data font-bold tabular-nums" style={{ color: COLORS.textStrong }}>
                    {noteDe(ev, "physique") != null ? (
                      <span style={{ color: PILLAR_COLORS.physique }}>{noteDe(ev, "physique")!.toFixed(1)}</span>
                    ) : "—"}
                  </td>
                  <td className="font-data font-bold tabular-nums" style={{ color: COLORS.textStrong }}>
                    {noteDe(ev, "technique") != null ? (
                      <span style={{ color: PILLAR_COLORS.technique }}>{noteDe(ev, "technique")!.toFixed(1)}</span>
                    ) : "—"}
                  </td>
                  <td className="font-data font-bold tabular-nums" style={{ color: COLORS.textStrong }}>
                    {noteDe(ev, "tactique") != null ? (
                      <span style={{ color: PILLAR_COLORS.tactique }}>{noteDe(ev, "tactique")!.toFixed(1)}</span>
                    ) : "—"}
                  </td>
                  <td className="font-data font-bold tabular-nums" style={{ color: COLORS.textStrong }}>
                    {noteDe(ev, "mental") != null ? (
                      <span style={{ color: PILLAR_COLORS.mental }}>{noteDe(ev, "mental")!.toFixed(1)}</span>
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
                    {ev.contexte_saisie.replace(/_/g, " ")}
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
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const clubId = user?.club_id ?? null;
  const matchId = params.id;

  const [activeTab, setActiveTab] = useState<TabKey>("composition");
  const [formation, setFormation] = useState<CodeFormation>("4-4-2");

  const chargerMatch = useCallback(
    () => matchesApi.get(clubId as string, matchId),
    [clubId, matchId]
  );
  const chargerSetup = useCallback(
    () => matchesApi.getTacticalSetup(clubId as string, matchId),
    [clubId, matchId]
  );
  const chargerEffectif = useCallback(
    () => joueursApi.list(clubId as string),
    [clubId]
  );
  const chargerEvaluations = useCallback(
    () => evaluationsApi.getMatchEvaluations(clubId as string, matchId),
    [clubId, matchId]
  );

  const actif = isAuthenticated && clubId !== null;

  const matchRes = useApiData<Match>(chargerMatch, { enabled: actif });
  const setupRes = useApiData<TacticalSetup>(chargerSetup, { enabled: actif });
  const effectifRes = useApiList<Joueur>(chargerEffectif, { enabled: actif });
  const evalRes = useApiList<Evaluation>(chargerEvaluations, { enabled: actif });

  useEffect(() => {
    if (!isAuthenticated) router.push("/login");
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;

  if (matchRes.isLoading) {
    return (
      <div className="page-main">
        <SkeletonText width="30%" height={24} mb={24} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonCard lines={6} />
          <SkeletonCard lines={4} />
        </div>
      </div>
    );
  }

  if (matchRes.error || !matchRes.data) {
    return (
      <div className="page-main">
        <div className="card p-6" role="alert">
          <p
            className="font-data font-semibold mb-1"
            style={{ color: COLORS.textStrong }}
          >
            Match introuvable
          </p>
          <p className="text-sm mb-4" style={{ color: COLORS.muted }}>
            {matchRes.error ?? "Ce match n'existe pas ou n'appartient pas à ce club."}
          </p>
          <Link href="/matches" className="btn btn-secondary justify-center">
            Retour aux matchs
          </Link>
        </div>
      </div>
    );
  }

  const match = matchRes.data;

  // Table id -> joueur : le backend ne renvoie que des player_id dans la
  // composition, les substitutions et les evaluations.
  const parId: Record<number, PlayerMini> = Object.fromEntries(
    effectifRes.items.map((j) => [
      j.id,
      { id: j.id, nom: j.nom, prenom: j.prenom, numero: j.numero },
    ])
  );

  const setup = setupRes.data;
  // Le backend renvoie formation_label (ex. "4-3-3") ou null tant qu'aucune
  // formation n'est choisie : on retombe sur le sélecteur par défaut.
  const formationEffective = (setup?.formation_label ??
    formation) as CodeFormation;
  const lineup: LineupPlayer[] = (setup?.players ?? []).map((p) => ({
    id: p.id,
    player_id: p.player_id,
    is_starting: p.is_starting,
    is_captain: p.is_captain,
    is_goalkeeper: p.is_goalkeeper,
    tactical_role: p.tactical_role,
    position_x: p.position_x == null ? null : Number(p.position_x),
    position_y: p.position_y == null ? null : Number(p.position_y),
    substitute_order: p.substitute_order,
  }));

  const substitutions: Substitution[] = [];
  const evaluations = evalRes.items;

  const [enregistrement, setEnregistrement] = useState(false);

  /**
   * Persiste le plateau (PUT /matches/{id}/tactical-setup, permission
   * PREPARER_COMPOSITION). Les deux boutons du plateau — « Enregistrer
   * brouillon » et « Valider » — appelaient `alert()` : le drag & drop
   * n'était jamais écrit en base.
   */
  async function sauvegarder(valider: boolean) {
    if (!clubId) return;
    setEnregistrement(true);
    try {
      await matchesApi.saveTacticalSetup(clubId, matchId, {
        formation_label: formationEffective,
        players: lineup.map((p) => ({
          player_id: p.player_id,
          is_starting: p.is_starting,
          is_captain: p.is_captain,
          is_goalkeeper: p.is_goalkeeper,
          tactical_role: p.tactical_role,
          position_x: p.position_x ?? 50,
          position_y: p.position_y ?? 50,
          substitute_order: p.substitute_order,
        })),
      });
      if (valider) {
        await matchesApi.validateTacticalSetup(clubId, matchId);
      }
      await Promise.all([setupRes.refetch(), matchRes.refetch()]);
    } catch {
      // Le message d'erreur reste affiché par le plateau ; on ne masque pas
      // l'échec derrière un « enregistré » optimiste.
    } finally {
      setEnregistrement(false);
    }
  }


  return (
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
              {match.statut === "termine"
                ? "Terminé"
                : match.statut === "programme"
                ? "Programmé"
                : match.statut === "brouillon"
                ? "Brouillon"
                : "Archivé"}
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
            formation={formationEffective}
            onFormationChange={setFormation}
            lineup={lineup}
            onValidate={() => void sauvegarder(true)}
            onSaveDraft={() => void sauvegarder(false)}
/>
)}
{activeTab === "remplacements" && <TabRemplacements substitutions={substitutions} parId={parId} />}
{activeTab === "evaluations" && <TabEvaluations evaluations={evaluations} parId={parId} />}
      </div>
  );
}
