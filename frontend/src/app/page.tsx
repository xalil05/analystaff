"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/stores";
import { useApiData } from "@/hooks/useApiData";
import { aiApi, dashboardApi, joueursApi, matchesApi, radarApi, trainingApi } from "@/lib/api";
import { formatDate, joursAvant } from "@/lib/stats";
import type {
  AiSuggestion,
  DashboardOverview,
  Match,
  TrainingSession,
} from "@/types";
import { SkeletonCard } from "@/components/ui/Skeleton";
import {
  AlertTriangle,
  ArrowUpRight,
  Brain,
  CalendarDays,
  Dumbbell,
  Goal,
  RefreshCw,
  TrendingUp,
  Users,
} from "lucide-react";

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
  accent: "var(--accent)",
  accentSoft: "var(--accent-soft)",
};

const JOURS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"] as const;

/** Activité d'un jour : nombre de séances et de matchs tombés dessus. */
interface JourActivite {
  label: string;
  seances: number;
  matchs: number;
}

/**
 * Regroupe séances et matchs par jour sur une fenêtre glissante.
 *
 * Une date illisible est ignorée : `new Date("")` vaut l'époque Unix, ce qui
 * ferait tout se concentrer sur le 1er janvier 1970.
 */
function activiteParJour(
  sessions: TrainingSession[],
  matchs: Match[],
  jours: number
): JourActivite[] {
  const jourMs = 24 * 60 * 60 * 1000;
  const debut = new Date();
  debut.setHours(0, 0, 0, 0);
  debut.setTime(debut.getTime() - (jours - 1) * jourMs);

  const bornes = Array.from({ length: jours }, (_, i) => {
    const d = new Date(debut.getTime() + i * jourMs);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const compteurs = new Map<number, { seances: number; matchs: number }>();
  for (const d of bornes) compteurs.set(d.getTime(), { seances: 0, matchs: 0 });

  const compter = (iso: string, cle: "seances" | "matchs") => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return;
    const jour = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const entree = compteurs.get(jour);
    if (entree) entree[cle] += 1;
  };

  sessions.forEach((s) => compter(s.date_seance, "seances"));
  matchs.forEach((m) => compter(m.date_match, "matchs"));

  return bornes.map((d) => ({
    label: JOURS[d.getDay()],
    ...compteurs.get(d.getTime())!,
  }));
}

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const clubId = user?.club_id ?? null;

  /**
   * Le tableau de bord n'affichait que des constantes : quatre KPI avec des
   * deltas inventés (« +3 vs mois dernier »), trois notes de staff avec des
   * auteurs et des rôles qui n'existent nulle part, et une semaine d'activité
   * fabriquée. Rien de tout cela n'est stocké.
   *
   * Ce qui est réel : les compteurs de /dashboard/overview, la moyenne du
   * club par radar, les dates réelles des séances et des matchs, et le
   * nombre de suggestions IA en attente.
   */
  const VIDE = {
    overview: {
      player_count: 0,
      match_count: 0,
      training_session_count: 0,
      last_match_adversaire: null,
      last_match_date: null,
      last_match_score: null,
    },
    matchs: [] as Match[],
    sessions: [] as TrainingSession[],
    notes: [] as (number | null)[],
    suggestions: [] as AiSuggestion[],
  };

  const charger = useCallback(async () => {
    if (clubId === null) return { data: VIDE };

    const [{ data: overview }, { data: matchs }, { data: sessions }, { data: joueurs }] =
      await Promise.all([
        dashboardApi.overview(clubId),
        matchesApi.list(clubId),
        trainingApi.list(clubId),
        joueursApi.list(clubId),
      ]);

    const notes = await Promise.all(
      joueurs.map(async (joueur) => {
        try {
          const { data: radar } = await radarApi.get(clubId, joueur.id);
          return typeof radar?.note_globale_moyenne === "number"
            ? radar.note_globale_moyenne
            : null;
        } catch {
          return null;
        }
      })
    );

    // L'IA est facultative : sans permission UTILISER_ASSISTANT_IA l'appel
    // renvoie 403 et le tableau de bord doit s'afficher quand même.
    let suggestions: AiSuggestion[] = [];
    try {
      const { data } = await aiApi.suggestions(true);
      suggestions = data;
    } catch {
      suggestions = [];
    }

    return { data: { overview, matchs, sessions, notes, suggestions } };
  }, [clubId]);

  const { data, isLoading, error, refetch } = useApiData<{
    overview: DashboardOverview;
    matchs: Match[];
    sessions: TrainingSession[];
    notes: (number | null)[];
    suggestions: AiSuggestion[];
  }>(charger, { enabled: isAuthenticated && clubId !== null });

  const notesChiffrees = useMemo(
    () => (data?.notes ?? []).filter((n): n is number => typeof n === "number"),
    [data]
  );
  const moyenneClub =
    notesChiffrees.length > 0
      ? notesChiffrees.reduce((a, b) => a + b, 0) / notesChiffrees.length
      : null;

  const activite = useMemo(
    () => activiteParJour(data?.sessions ?? [], data?.matchs ?? [], 7),
    [data]
  );
  const maxActivite = Math.max(
    ...activite.map((a) => a.seances + a.matchs),
    1
  );

  const prochain = useMemo(() => {
    const maintenant = Date.now();
    return (data?.matchs ?? [])
      .filter(
        (m) =>
          m.statut !== "termine" && new Date(m.date_match).getTime() >= maintenant
      )
      .sort((a, b) => +new Date(a.date_match) - +new Date(b.date_match))[0];
  }, [data]);

  const enAttente = data?.suggestions.length ?? 0;

  useEffect(() => {
    if (!isAuthenticated) router.push("/login");
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;

  const clubManquant = clubId === null;
  const overview = data?.overview;

  const kpis = [
    {
      label: "Joueurs",
      value: overview?.player_count ?? "—",
      detail:
        notesChiffrees.length > 0
          ? `${notesChiffrees.length} évalué${notesChiffrees.length > 1 ? "s" : ""}`
          : "aucun évalué",
      icon: Users,
      color: COLORS.primary,
      bg: COLORS.primarySoft,
    },
    {
      label: "Matchs",
      value: overview?.match_count ?? "—",
      detail: overview?.last_match_score
        ? `dernier : ${overview.last_match_score}`
        : "aucun résultat",
      icon: Goal,
      color: COLORS.accent,
      bg: COLORS.accentSoft,
    },
    {
      label: "Séances",
      value: overview?.training_session_count ?? "—",
      detail:
        activite.length > 0
          ? `${activite.reduce((s, a) => s + a.seances, 0)} sur 7 jours`
          : "—",
      icon: Dumbbell,
      color: "var(--pillar-technique)",
      bg: "var(--pillar-technique-soft)",
    },
    {
      label: "Note moyenne",
      value: moyenneClub !== null ? moyenneClub.toFixed(1) : "—",
      detail: moyenneClub !== null ? "sur 10" : "aucune évaluation",
      icon: TrendingUp,
      color: COLORS.destructive,
      bg: "var(--pillar-physique-soft)",
    },
  ];

  return (
    /* `px-3 min-[769px]:px-0` : le tableau de bord est la seule page dont la
       racine n'est pas un `.page-main` (voir ClientLayout). Sans gouttière,
       les cartes collaient au bord gauche de l'écran tout en laissant 16px à
       droite. La gouttière de 12px reprend celle de `.page-main` en mobile ;
       au-dessus de 768px, aucun padding n'est ajouté — le rendu desktop est
       inchangé. */
    <div className="space-y-6 animate-fade-in px-3 min-[769px]:px-0">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-data text-xl font-bold text-text-strong">
            Tableau de bord
          </h1>
          <p className="text-muted text-sm">
            Vue d&apos;ensemble du club
          </p>
        </div>
        {!isLoading && !error && (
          <button onClick={refetch} className="btn btn-ghost btn-sm">
            <RefreshCw size={14} />
            Actualiser
          </button>
        )}
      </div>

      {clubManquant ? (
        <div className="card p-6" role="alert">
          <p className="text-sm" style={{ color: COLORS.destructive }}>
            Club non résolu : reconnectez-vous pour charger le tableau de bord.
          </p>
        </div>
      ) : error ? (
        <div className="card p-6" role="alert">
          <p
            className="font-data font-semibold mb-1"
            style={{ color: COLORS.textStrong }}
          >
            Tableau de bord indisponible
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
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <SkeletonCard lines={1} />
            <SkeletonCard lines={1} />
            <SkeletonCard lines={1} />
            <SkeletonCard lines={1} />
          </div>
          <SkeletonCard lines={6} />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {kpis.map((kpi) => {
              const Icon = kpi.icon;
              return (
                <div key={kpi.label} className="card card-sm">
                  <div
                    className="kpi-icon"
                    style={{ backgroundColor: kpi.bg }}
                  >
                    <Icon className="w-5 h-5" style={{ color: kpi.color }} />
                  </div>
                  <div>
                    <p className="num-lg text-text-strong">{kpi.value}</p>
                    <p className="text-tiny uppercase tracking-wider text-muted font-medium">
                      {kpi.label}
                    </p>
                    <p
                      className="text-tiny mt-1 flex items-center gap-1"
                      style={{ color: COLORS.textFaint }}
                    >
                      <ArrowUpRight className="w-3 h-3" />
                      {kpi.detail}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Activité de la semaine */}
            <div className="lg:col-span-2 space-y-4">
              <h2 className="font-data text-lg font-semibold text-text-strong">
                Activité sur 7 jours
              </h2>
              <div className="card p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Dumbbell className="w-4 h-4 text-primary" />
                    <span className="text-sm text-muted">Séances</span>
                  </div>
                  <span className="font-data font-semibold text-text-strong tabular-nums">
                    {activite.reduce((s, a) => s + a.seances, 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-muted" />
                    <span className="text-sm text-muted">Matchs</span>
                  </div>
                  <span className="font-data font-semibold text-text-strong tabular-nums">
                    {activite.reduce((s, a) => s + a.matchs, 0)}
                  </span>
                </div>

                <div className="divider" />

                <div className="space-y-2">
                  {activite.map((a) => {
                    const total = a.seances + a.matchs;
                    return (
                      <div key={`${a.label}-${a.seances}-${a.matchs}`} className="flex items-center gap-3">
                        <span className="text-tiny font-medium text-muted w-8 shrink-0">
                          {a.label}
                        </span>
                        <div
                          className="flex-1 h-2 rounded-full overflow-hidden"
                          style={{ backgroundColor: COLORS.surface2 }}
                        >
                          {total > 0 && (
                            <div
                              className="h-full rounded-full"
                              style={{
                                backgroundColor: COLORS.primary,
                                width: `${(total / maxActivite) * 100}%`,
                              }}
                            />
                          )}
                        </div>
                        <span
                          className="text-tiny font-data font-semibold tabular-nums w-6 text-right shrink-0"
                          style={{ color: COLORS.textMuted }}
                        >
                          {total > 0 ? total : ""}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {/* Dernier résultat */}
              {overview?.last_match_adversaire && (
                <div className="card p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Goal className="w-4 h-4 text-primary" />
                      <span className="text-sm text-muted">Dernier match</span>
                    </div>
                    <span className="text-tiny text-muted">
                      {formatDate(overview.last_match_date)}
                    </span>
                  </div>
                  <p className="font-data font-semibold text-text-strong">
                    {overview.last_match_adversaire}
                  </p>
                  {overview.last_match_score && (
                    <p
                      className="font-data text-lg font-bold tabular-nums mt-1"
                      style={{ color: COLORS.primary }}
                    >
                      {overview.last_match_score}
                    </p>
                  )}
                </div>
              )}

              {/* Prochain match */}
              <div className="card p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-primary" />
                    <span className="text-sm text-muted">Prochain match</span>
                  </div>
                  {prochain && (
                    <span className="text-tiny text-muted">
                      {(() => {
                        const j = joursAvant(prochain.date_match);
                        if (j === null) return null;
                        if (j === 0) return "aujourd'hui";
                        if (j === 1) return "demain";
                        return `dans ${j} jours`;
                      })()}
                    </span>
                  )}
                </div>
                {prochain ? (
                  <>
                    <p className="font-data font-semibold text-text-strong">
                      {prochain.is_domicile ? "vs" : "à"} {prochain.adversaire}
                    </p>
                    <p className="text-tiny text-muted mt-1">
                      {formatDate(prochain.date_match)} ·{" "}
                      {prochain.lieu ?? (prochain.is_domicile ? "Domicile" : "Extérieur")}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted">
                    Aucun match à venir.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Suggestion IA : uniquement s'il y en a une réellement en attente. */}
          {enAttente > 0 && (
            <div
              className="card p-5"
              style={{ backgroundColor: COLORS.accentSoft }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Brain className="w-5 h-5" style={{ color: COLORS.accent }} />
                <h3
                  className="font-data font-semibold text-sm uppercase tracking-wider"
                  style={{ color: COLORS.textStrong }}
                >
                  {enAttente} suggestion{enAttente > 1 ? "s" : ""} en attente
                </h3>
              </div>
              <p className="text-sm mb-4" style={{ color: COLORS.textMuted }}>
                L&apos;assistant a produit des suggestions qui attendent votre
                validation.
              </p>
              <Link href="/ai" className="btn btn-primary gap-2">
                <Brain size={14} />
                Voir les suggestions
              </Link>
            </div>
          )}

          {/* Aucune donnée du tout : on le dit plutôt que d'afficher des zéros
              qui ressemblent à un club sans activité. */}
          {overview?.player_count === 0 && (
            <div className="card p-6 flex items-start gap-3" role="alert">
              <AlertTriangle size={18} className="shrink-0 mt-0.5" style={{ color: COLORS.destructive }} />
              <div>
                <p className="font-data font-semibold" style={{ color: COLORS.textStrong }}>
                  Club vide
                </p>
                <p className="text-sm" style={{ color: COLORS.textMuted }}>
                  Aucun joueur enregistré. Commencez par importer votre
                  effectif.
                </p>
                <Link href="/players/import" className="btn btn-primary btn-sm mt-3">
                  Importer un effectif
                </Link>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}