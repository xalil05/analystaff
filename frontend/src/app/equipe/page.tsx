"use client";

import { useCallback, useMemo } from "react";
import { useAuthStore } from "@/stores";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useApiData } from "@/hooks/useApiData";
import { dashboardApi, joueursApi, matchesApi, radarApi } from "@/lib/api";
import type { DashboardOverview, Joueur, Match } from "@/types";
import {
  calculerBilan,
  formatDate,
  prochainsMatchs,
} from "@/lib/stats";
import { SkeletonCard } from "@/components/ui/Skeleton";
import {
  CalendarDays,
  MapPin,
  RefreshCw,
  Shield,
  Trophy,
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
  onPrimaryVeil: "var(--on-primary-veil)",
  destructive: "var(--destructive)",
  destructiveSoft: "var(--destructive-soft)",
  accent: "var(--accent)",
  accentSoft: "var(--accent-soft)",
};

interface JoueurNote {
  joueur: Joueur;
  note: number | null;
}

function JoueurCle({ joueur, note }: JoueurNote) {
  const initiales =
    `${joueur.prenom?.[0] ?? ""}${joueur.nom?.[0] ?? ""}`.toUpperCase() || "?";
  return (
    <div
      className="flex items-center gap-3 p-3 rounded-md"
      style={{ backgroundColor: COLORS.surface2 }}
    >
      <div
        className="avatar-initials sm shrink-0"
        style={{ backgroundColor: COLORS.primarySoft, color: COLORS.primary }}
      >
        {initiales}
      </div>
      <div className="flex-1 min-w-0">
        <p
          className="font-data font-medium text-sm truncate"
          style={{ color: COLORS.textStrong }}
        >
          {joueur.prenom} {joueur.nom}
        </p>
        <p className="text-tiny truncate" style={{ color: COLORS.textMuted }}>
          {joueur.poste ?? "Poste non renseigné"}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p
          className="font-data font-bold tabular-nums"
          style={{ color: COLORS.textStrong }}
        >
          {note !== null ? note.toFixed(1) : "—"}
        </p>
        <p className="text-tiny" style={{ color: COLORS.textMuted }}>
          Note moy.
        </p>
      </div>
    </div>
  );
}

function MatchCard({ match }: { match: Match }) {
  return (
    <div
      className="flex items-center justify-between p-3 rounded-md gap-3"
      style={{ backgroundColor: COLORS.surface2 }}
    >
      <div className="min-w-0">
        <p
          className="font-data font-medium truncate"
          style={{ color: COLORS.textStrong }}
        >
          <span style={{ color: COLORS.textFaint }}>
            {match.is_domicile ? "vs" : "à"}
          </span>{" "}
          {match.adversaire}
        </p>
        <p
          className="text-tiny flex items-center gap-2 mt-0.5"
          style={{ color: COLORS.textMuted }}
        >
          <span>{match.competition ?? "Compétition non renseignée"}</span>
          <span style={{ color: COLORS.textFaint }}>·</span>
          <span className="flex items-center gap-0.5">
            <MapPin size={10} />
            {match.lieu ?? (match.is_domicile ? "Domicile" : "Extérieur")}
          </span>
        </p>
      </div>
      <span
        className="font-data font-medium tabular-nums text-sm shrink-0"
        style={{ color: COLORS.textStrong }}
      >
        {formatDate(match.date_match)}
      </span>
    </div>
  );
}

export default function EquipePage() {
  const { isAuthenticated, user } = useAuthStore();
  const clubId = user?.club_id ?? null;
  const clubNom = user?.club_nom ?? null;

  /**
   * Le backend ne renvoie pas de classement de club, ni de ville, ni de ligue :
   * ces trois éléments du bandeau étaient écrits en dur. Le bilan est
   * recalculé ici à partir des scores réels des matchs terminés, et les
   * « joueurs clés » viennent du radar agrégé.
   */
  const charger = useCallback(async () => {
    if (clubId === null) {
      return { data: { matches: [] as Match[], notes: [] as JoueurNote[], overview: null } };
    }
    const [{ data: matches }, { data: joueurs }, { data: overview }] =
      await Promise.all([
        matchesApi.list(clubId),
        joueursApi.list(clubId),
        dashboardApi.overview(clubId),
      ]);

    const notes = await Promise.all(
      joueurs.map(async (joueur) => {
        try {
          const { data: radar } = await radarApi.get(clubId, joueur.id);
          return {
            joueur,
            note:
              typeof radar?.note_globale_moyenne === "number"
                ? radar.note_globale_moyenne
                : null,
          } as JoueurNote;
        } catch {
          return { joueur, note: null } as JoueurNote;
        }
      })
    );

    return { data: { matches, notes, overview } };
  }, [clubId]);

  const { data, isLoading, error, refetch } = useApiData<{
    matches: Match[];
    notes: JoueurNote[];
    overview: DashboardOverview | null;
  }>(charger, { enabled: isAuthenticated && clubId !== null });

  const bilan = useMemo(() => calculerBilan(data?.matches ?? []), [data]);

  const prochains = useMemo(
    () => prochainsMatchs(data?.matches ?? []).slice(0, 5),
    [data]
  );

  const joueursCles = useMemo(
    () =>
      [...(data?.notes ?? [])]
        .filter((n) => n.note !== null)
        .sort((a, b) => (b.note ?? 0) - (a.note ?? 0))
        .slice(0, 3),
    [data]
  );

  const autorise = useRequireAuth();

  if (!autorise) return null;

  const clubManquant = clubId === null;
  const effectif = data?.overview?.player_count ?? null;

  const stats = [
    { label: "Matchs joués", value: bilan.joues, color: COLORS.primary, bg: COLORS.primarySoft },
    { label: "Victoires", value: bilan.victoires, color: COLORS.accent, bg: COLORS.accentSoft },
    { label: "Nuls", value: bilan.nuls, color: COLORS.textMuted, bg: COLORS.surface2 },
    { label: "Défaites", value: bilan.defaites, color: COLORS.destructive, bg: COLORS.destructiveSoft },
  ];

  return (
    <div className="page-main animate-fade-in">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-data text-lg font-semibold text-text-strong">
              Mon Équipe
            </h1>
            <p className="text-muted text-sm">Vue d&apos;ensemble de votre club</p>
          </div>
        </div>

        {/* Bandeau : uniquement ce que l'API connaît. Ni ville, ni ligue, ni
            rang au classement — aucun de ces trois champs n'existe en base. */}
        <div
          className="card p-6 text-on-primary"
          style={{ backgroundColor: COLORS.primary }}
        >
          <div className="flex flex-col md:flex-row items-start md:items-center gap-5">
            <div
              className="w-20 h-20 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: COLORS.onPrimaryVeil }}
            >
              <Shield width="32" height="32" style={{ color: COLORS.onPrimary }} />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-data text-2xl font-bold text-on-primary truncate">
                {clubNom ?? "Votre club"}
              </h2>
              <div
                className="flex flex-wrap items-center gap-4 mt-1 text-sm"
                style={{ color: "var(--on-primary)", opacity: 0.8 }}
              >
                {effectif !== null && (
                  <span className="flex items-center gap-1">
                    <Users width="14" height="14" />
                    {effectif} joueur{effectif > 1 ? "s" : ""}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Trophy width="14" height="14" />
                  {bilan.victoires} victoire{bilan.victoires > 1 ? "s" : ""} ·{" "}
                  {bilan.defaites} défaite{bilan.defaites > 1 ? "s" : ""}
                </span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="font-data text-4xl font-bold text-on-primary leading-none tabular-nums">
                {bilan.joues}
              </p>
              <p className="text-on-primary/70 text-xs uppercase tracking-wider mt-1">
                matchs joués
              </p>
            </div>
          </div>
        </div>

        {clubManquant ? (
          <div className="card p-6" role="alert">
            <p className="text-sm" style={{ color: COLORS.destructive }}>
              Club non résolu : reconnectez-vous pour charger le club.
            </p>
          </div>
        ) : error ? (
          <div className="card p-6" role="alert">
            <p
              className="font-data font-semibold mb-1"
              style={{ color: COLORS.textStrong }}
            >
              Club indisponible
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
            <SkeletonCard lines={1} />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <SkeletonCard lines={1} />
              <SkeletonCard lines={1} />
              <SkeletonCard lines={1} />
              <SkeletonCard lines={1} />
            </div>
            <SkeletonCard lines={4} />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {stats.map((stat) => (
                <div key={stat.label} className="card card-sm">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
                    style={{ backgroundColor: stat.bg, color: stat.color }}
                  >
                    <Trophy width="18" height="18" />
                  </div>
                  <p className="font-data text-2xl font-bold text-text-strong tabular-nums">
                    {stat.value}
                  </p>
                  <p className="text-muted text-tiny uppercase tracking-wider">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>

            {/* Ratio buts : déduit du bilan, absent du backend. */}
            {bilan.joues > 0 && (
              <p className="text-sm text-muted -mt-2">
                {bilan.pour} buts pour, {bilan.contre} encaissés sur{" "}
                {bilan.joues} match{bilan.joues > 1 ? "s" : ""}
              </p>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="card p-6">
                <h2 className="font-data text-lg font-semibold text-text-strong mb-4 flex items-center gap-2">
                  <Users width="16" height="16" className="text-primary" />
                  Meilleures évaluations
                </h2>
                {joueursCles.length === 0 ? (
                  <p className="text-sm text-muted py-4">
                    Aucun joueur évalué pour l&apos;instant.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {joueursCles.map((j) => (
                      <JoueurCle key={j.joueur.id} {...j} />
                    ))}
                  </div>
                )}
              </div>

              <div className="card p-6">
                <h2 className="font-data text-lg font-semibold text-text-strong mb-4 flex items-center gap-2">
                  <CalendarDays width="16" height="16" className="text-primary" />
                  Prochains matchs
                </h2>
                {prochains.length === 0 ? (
                  <p className="text-sm text-muted py-4">
                    Aucun match à venir. Ajoutez-en depuis la page matchs.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {prochains.map((m) => (
                      <MatchCard key={m.id} match={m} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}