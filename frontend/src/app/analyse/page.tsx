"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores";
import { useApiData } from "@/hooks/useApiData";
import { dashboardApi, joueursApi, radarApi } from "@/lib/api";
import type { DashboardOverview, Joueur, RadarJoueur } from "@/types";
import { SkeletonCard } from "@/components/ui/Skeleton";
import {
  AlertTriangle,
  BarChart3,
  Calendar,
  Dumbbell,
  RefreshCw,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";

// ── Couleurs ────────────────────────────────────────────────────────────────────

const COLORS = {
  surface: "var(--surface)",
  surface2: "var(--surface-2)",
  border: "var(--border)",
  textStrong: "var(--text-strong)",
  textMuted: "var(--text-muted)",
  textFaint: "var(--text-faint)",
  primary: "var(--primary)",
  primarySoft: "var(--primary-soft)",
  onPrimary: "var(--on-primary)",
  destructive: "var(--destructive)",
  destructiveSoft: "var(--destructive-soft)",
  technique: "var(--pillar-technique)",
  techniqueSoft: "var(--pillar-technique-soft)",
  accent: "var(--accent)",
  accentSoft: "var(--accent-soft)",
};

// ── Types ────────────────────────────────────────────────────────────────────────

/** Un joueur de l'effectif, avec son radar agrégé. */
interface LigneRadar {
  joueur: Joueur;
  radar: RadarJoueur | null;
}

/** Ce que la page affiche pour le classement : jamais de buts, le backend
 *  ne les stocke pas — voir plus bas. */
interface LigneClassement extends LigneRadar {
  note: number | null;
}

/** Les 4 piliers, dans l'ordre d'affichage. */
const PILIERS = [
  { cle: "physique", label: "Physique", color: COLORS.destructive },
  { cle: "technique", label: "Technique", color: COLORS.technique },
  { cle: "tactique", label: "Tactique", color: COLORS.accent },
  { cle: "mental", label: "Mental", color: COLORS.primary },
] as const;

type ClePilier = (typeof PILIERS)[number]["cle"];

function moyenne(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** Valeur numérique safe : le radar renvoie des Decimal sérialisés en nombre
 *  mais `null` dès qu'un joueur n'a jamais été évalué. */
function pilier(radar: RadarJoueur | null, cle: ClePilier): number | null {
  const v = radar?.[cle];
  return typeof v === "number" ? v : null;
}

// ── Composants ───────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  bg,
}: {
  label: string;
  value: string | number;
  icon: typeof BarChart3;
  color: string;
  bg: string;
}) {
  return (
    <div className="card card-sm p-4" style={{ backgroundColor: COLORS.surface }}>
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: bg, color }}
        >
          <Icon size={18} />
        </div>
        <div className="min-w-0">
          <p
            className="font-data font-semibold text-lg tabular-nums truncate"
            style={{ color: COLORS.textStrong }}
          >
            {value}
          </p>
          <p
            className="text-xs uppercase tracking-wider truncate"
            style={{ color: COLORS.textMuted }}
          >
            {label}
          </p>
        </div>
      </div>
    </div>
  );
}

function JoueurRadarRow({
  ligne,
  moyenneClub,
}: {
  ligne: LigneClassement;
  moyenneClub: number | null;
}) {
  const { joueur, radar, note } = ligne;
  // Sans moyenne club, l'écart n'a pas de sens : on n'affiche pas de delta.
  const diff = note !== null && moyenneClub !== null ? note - moyenneClub : null;
  const auDessus = diff !== null && diff > 0.05;
  const enDessous = diff !== null && diff < -0.05;

  return (
    <div
      className="flex items-center justify-between p-3 rounded-md transition-shadow hover:shadow-sm gap-3"
      style={{ border: `1px solid ${COLORS.border}` }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center font-data font-bold text-sm shrink-0"
          style={{ backgroundColor: COLORS.primary, color: COLORS.onPrimary }}
        >
          {joueur.prenom?.[0] ?? ""}
          {joueur.nom?.[0] ?? ""}
        </div>
        <div className="min-w-0">
          <p
            className="font-data font-medium text-sm truncate"
            style={{ color: COLORS.textStrong }}
          >
            {joueur.prenom} {joueur.nom}
          </p>
          <p className="text-xs truncate" style={{ color: COLORS.textMuted }}>
            {joueur.poste ?? "Poste non renseigné"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4 shrink-0">
        <div className="text-center">
          <p
            className="font-data font-semibold text-sm tabular-nums"
            style={{ color: COLORS.textStrong }}
          >
            {radar?.matches_analyzed ?? 0}
          </p>
          <p className="text-xs" style={{ color: COLORS.textMuted }}>
            Matchs
          </p>
        </div>
        <div className="text-center min-w-[86px]">
          <p
            className="font-data font-bold text-lg tabular-nums"
            style={{ color: COLORS.textStrong }}
          >
            {note !== null ? note.toFixed(1) : "—"}
          </p>
          <div
            className="flex items-center justify-center gap-0.5"
            style={{ minHeight: 16 }}
          >
            {diff === null ? (
              <p className="text-xs" style={{ color: COLORS.textFaint }}>
                non évalué
              </p>
            ) : (
              <>
                {auDessus && <TrendingUp size={12} style={{ color: COLORS.primary }} />}
                {enDessous && (
                  <AlertTriangle size={12} style={{ color: COLORS.destructive }} />
                )}
                <p
                  className="text-xs font-medium tabular-nums"
                  style={{
                    color: auDessus
                      ? COLORS.primary
                      : enDessous
                        ? COLORS.destructive
                        : COLORS.textMuted,
                  }}
                >
                  {diff > 0 ? "+" : ""}
                  {diff.toFixed(1)}
                </p>
                <p className="text-xs" style={{ color: COLORS.textFaint }}>
                  / moy.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function JoueurEvalueRow({
  ligne,
  max,
}: {
  ligne: LigneRadar;
  max: number;
}) {
  const { joueur, radar } = ligne;
  const nb = radar?.matches_analyzed ?? 0;
  return (
    <div className="flex items-center gap-3 py-2">
      <span
        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-data font-bold shrink-0"
        style={{ backgroundColor: COLORS.primary, color: COLORS.onPrimary }}
      >
        {nb}
      </span>
      <div className="flex-1 min-w-0">
        <p
          className="font-data font-medium text-sm truncate"
          style={{ color: COLORS.textStrong }}
        >
          {joueur.prenom} {joueur.nom}
        </p>
        <p className="text-xs truncate" style={{ color: COLORS.textMuted }}>
          {joueur.poste ?? "Poste non renseigné"}
        </p>
      </div>
      {/* max === 0 → pas de division, la barre reste vide au lieu de NaN% */}
      <div className="w-24 rounded-full h-2 overflow-hidden shrink-0" style={{ backgroundColor: COLORS.surface2 }}>
        <div
          className="h-full rounded-full"
          style={{
            backgroundColor: COLORS.primary,
            width: `${max > 0 ? (nb / max) * 100 : 0}%`,
          }}
        />
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────────

export default function AnalysePage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const clubId = user?.club_id ?? null;
  const actif = isAuthenticated && clubId !== null;

  const { data, isLoading, error, refetch } = useApiData<{
    lignes: LigneClassement[];
    overview: DashboardOverview | null;
  }>(async () => {
    if (clubId === null) return { data: { lignes: [], overview: null } };
    const { data: joueurs } = await joueursApi.list(clubId);
    const lignes = await Promise.all(
      joueurs.map(async (joueur) => {
        try {
          const { data: radar } = await radarApi.get(clubId, joueur.id);
          return { joueur, radar } as LigneClassement;
        } catch {
          return { joueur, radar: null } as LigneClassement;
        }
      })
    );
    const { data: overview } = await dashboardApi.overview(clubId);
    return { data: { lignes, overview } };
  }, { enabled: actif });

  useEffect(() => {
    if (!isAuthenticated) router.push("/login");
  }, [isAuthenticated, router]);

  const lignes = data?.lignes ?? [];
  const overview = data?.overview ?? null;

  const notes = lignes
    .map((l) => l.radar?.note_globale_moyenne)
    .filter((n): n is number => typeof n === "number");
  const moyenneClub = useMemo(() => moyenne(notes), [data]);

  const classement = useMemo(
    () =>
      [...lignes]
        .map((l) => ({
          ...l,
          note:
            typeof l.radar?.note_globale_moyenne === "number"
              ? l.radar.note_globale_moyenne
              : null,
        }))
        .sort((a, b) => (b.note ?? -1) - (a.note ?? -1)),
    [data]
  );

  const plusEvalues = useMemo(
    () =>
      [...lignes]
        .sort((a, b) => (b.radar?.matches_analyzed ?? 0) - (a.radar?.matches_analyzed ?? 0))
        .slice(0, 5),
    [data]
  );
  const maxEvalues = plusEvalues[0]?.radar?.matches_analyzed ?? 0;

  // Moyennes par pilier sur l'effectif évalué. On ignore les null : un joueur
  // jamais évalué ne doit pas Tirer la moyenne vers 0.
  const moyennesPiliers = useMemo(
    () =>
      PILIERS.map(({ cle, label, color }) => ({
        label,
        color,
        valeur: moyenne(
          lignes
            .map((l) => pilier(l.radar, cle))
            .filter((v): v is number => typeof v === "number")
        ),
      })),
    [data]
  );

  const evalues = notes.length;

  if (!isAuthenticated) return null;

  const clubManquant = clubId === null;

  return (
    <div className="page-main">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1
            className="font-data text-xl font-bold"
            style={{ color: COLORS.textStrong }}
          >
            Analyse &amp; Statistiques
          </h1>
          <p className="text-sm" style={{ color: COLORS.textMuted }}>
            Notes d&apos;évaluation par pilier, sur l&apos;effectif évalué
          </p>
        </div>
      </div>

      {clubManquant ? (
        <div className="card p-6" role="alert">
          <p className="text-sm" style={{ color: COLORS.destructive }}>
            Club non résolu : reconnectez-vous pour charger les statistiques.
          </p>
        </div>
      ) : error ? (
        <div className="card p-6" role="alert">
          <p
            className="font-data font-semibold mb-1"
            style={{ color: COLORS.textStrong }}
          >
            Statistiques indisponibles
          </p>
          <p className="text-sm mb-4" style={{ color: COLORS.textMuted }}>
            {error}
          </p>
          <button onClick={refetch} className="btn btn-primary gap-2">
            <RefreshCw size={14} />
            Réessayer
          </button>
        </div>
      ) : isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <SkeletonCard lines={1} />
            <SkeletonCard lines={1} />
            <SkeletonCard lines={1} />
            <SkeletonCard lines={1} />
          </div>
          <SkeletonCard lines={6} />
        </div>
      ) : lignes.length === 0 ? (
        <div className="card p-8 text-center">
          <BarChart3 size={32} style={{ color: COLORS.textFaint, marginBottom: 8 }} />
          <p
            className="font-data font-semibold"
            style={{ color: COLORS.textStrong }}
          >
            Aucun joueur à analyser
          </p>
          <p className="text-sm mt-1" style={{ color: COLORS.textMuted }}>
            Importez un effectif pour voir les moyennes par pilier.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard
              label="Joueurs évalués"
              value={`${evalues}/${lignes.length}`}
              icon={Users}
              color={COLORS.primary}
              bg={COLORS.primarySoft}
            />
            <StatCard
              label="Matchs"
              value={overview?.match_count ?? "—"}
              icon={Calendar}
              color={COLORS.accent}
              bg={COLORS.accentSoft}
            />
            <StatCard
              label="Séances"
              value={overview?.training_session_count ?? "—"}
              icon={Dumbbell}
              color={COLORS.technique}
              bg={COLORS.techniqueSoft}
            />
            <StatCard
              label="Moyenne club"
              value={moyenneClub !== null ? moyenneClub.toFixed(1) : "—"}
              icon={TrendingUp}
              color={COLORS.destructive}
              bg={COLORS.destructiveSoft}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section>
              <h2
                className="font-data font-semibold text-lg mb-4 flex items-center gap-2"
                style={{ color: COLORS.textStrong }}
              >
                <BarChart3 size={16} style={{ color: COLORS.primary }} />
                Classement par note
              </h2>
              <div
                className="card p-4"
                style={{ backgroundColor: COLORS.surface, borderColor: COLORS.border }}
              >
                <div className="space-y-1">
                  {classement.map((ligne) => (
                    <JoueurRadarRow
                      key={ligne.joueur.id}
                      ligne={ligne}
                      moyenneClub={moyenneClub}
                    />
                  ))}
                </div>
                <div
                  className="mt-4 pt-3 border-t flex items-center justify-between text-sm"
                  style={{ borderColor: COLORS.border }}
                >
                  <span style={{ color: COLORS.textMuted }}>
                    Moyenne club ({evalues} joueur{evalues > 1 ? "s" : ""} évalué
                    {evalues > 1 ? "s" : ""})
                  </span>
                  <span
                    className="font-data font-bold tabular-nums"
                    style={{ color: COLORS.primary }}
                  >
                    {moyenneClub !== null ? moyenneClub.toFixed(1) : "—"}
                  </span>
                </div>
              </div>
            </section>

            <div className="space-y-6">
              <section>
                <h2
                  className="font-data font-semibold text-lg mb-4 flex items-center gap-2"
                  style={{ color: COLORS.textStrong }}
                >
                  <Target size={16} style={{ color: COLORS.primary }} />
                  Les plus évalués
                </h2>
                <div
                  className="card p-4"
                  style={{ backgroundColor: COLORS.surface, borderColor: COLORS.border }}
                >
                  <div className="space-y-1">
                    {plusEvalues.map((ligne) => (
                      <JoueurEvalueRow
                        key={ligne.joueur.id}
                        ligne={ligne}
                        max={maxEvalues}
                      />
                    ))}
                  </div>
                </div>
              </section>

              <section>
                <h2
                  className="font-data font-semibold text-lg mb-4 flex items-center gap-2"
                  style={{ color: COLORS.textStrong }}
                >
                  <TrendingUp size={16} style={{ color: COLORS.accent }} />
                  Moyennes par critère
                </h2>
                <div
                  className="card p-4"
                  style={{ backgroundColor: COLORS.surface, borderColor: COLORS.border }}
                >
                  <div className="space-y-5">
                    {moyennesPiliers.map((crit) => (
                      <div key={crit.label}>
                        <div className="flex justify-between text-sm mb-1">
                          <span style={{ color: COLORS.textMuted }}>
                            {crit.label}
                          </span>
                          <span
                            className="font-data font-bold tabular-nums"
                            style={{ color: COLORS.textStrong }}
                          >
                            {crit.valeur !== null ? `${crit.valeur.toFixed(1)}/10` : "—"}
                          </span>
                        </div>
                        <div
                          className="w-full h-2 rounded-full overflow-hidden"
                          style={{ backgroundColor: COLORS.surface2 }}
                        >
                          <div
                            className="h-full rounded-full"
                            style={{
                              backgroundColor: crit.color,
                              width: `${crit.valeur !== null ? crit.valeur * 10 : 0}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </div>
          </div>
        </>
      )}
    </div>
  );
}