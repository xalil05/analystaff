"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/stores";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useApiList } from "@/hooks/useApiData";
import { matchesApi } from "@/lib/api";
import type { Match, MatchStatut } from "@/types";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { Calendar, MapPin, RefreshCw, Trophy } from "lucide-react";

// Statuts minuscules (app/core/enums.py MatchStatut). Le mock précédent
// utilisait PLANIFIE / EN_COURS / TERMINE / ANNULE — aucun n'existe en base.
const STATUT_LABELS: Record<MatchStatut, string> = {
  brouillon: "Brouillon",
  programme: "Programmé",
  termine: "Terminé",
  archive: "Archivé",
};

const STATUT_COLORS: Record<MatchStatut, { bg: string; color: string }> = {
  brouillon: { bg: "var(--surface-2)", color: "var(--text-muted)" },
  programme: { bg: "var(--info-soft)", color: "var(--info)" },
  termine: { bg: "var(--primary-soft)", color: "var(--primary-hover)" },
  archive: { bg: "var(--surface-2)", color: "var(--text-faint)" },
};

const COLORS = {
  text_strong: "var(--text-strong)",
  text_muted: "var(--text-muted)",
  text_faint: "var(--text-faint)",
  border: "var(--border)",
  primary: "var(--primary)",
  destructive: "var(--destructive)",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function MatchRow({ match }: { match: Match }) {
  const statut = STATUT_COLORS[match.statut] ?? STATUT_COLORS.archive;
  // is_domicile décide du côté : le backend ne renvoie pas « Domicile » /
  // « Extérieur » dans lieu, seulement un booléen et un nom de stade.
  const terrain = match.is_domicile ? "Domicile" : "Extérieur";

  return (
    <Link
      href={`/matches/${match.id}`}
      className="block p-4 rounded-lg transition-shadow hover:shadow-md"
      style={{ backgroundColor: "var(--surface)", border: `1px solid ${COLORS.border}` }}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <span
              className="font-data text-sm font-semibold"
              style={{ color: COLORS.text_strong }}
            >
              {match.adversaire}
            </span>
            <span
              className="badge"
              style={{ backgroundColor: statut.bg, color: statut.color }}
            >
              {STATUT_LABELS[match.statut]}
            </span>
          </div>
          <div
            className="flex items-center gap-4 text-xs"
            style={{ color: COLORS.text_muted }}
          >
            <span className="flex items-center gap-1">
              <Calendar size={12} />
              {formatDate(match.date_match)}
            </span>
            <span className="flex items-center gap-1">
              <MapPin size={12} />
              {match.lieu ?? terrain}
            </span>
            {match.competition && (
              <span className="flex items-center gap-1">
                <Trophy size={12} />
                {match.competition}
              </span>
            )}
          </div>
        </div>
        {match.score_equipe != null && match.score_adversaire != null && (
          <span
            className="font-data text-sm font-bold tabular-nums shrink-0 ml-4"
            style={{ color: COLORS.text_strong }}
          >
            {match.score_equipe} — {match.score_adversaire}
          </span>
        )}
      </div>
    </Link>
  );
}

export default function MatchesPage() {
  const { isAuthenticated, user } = useAuthStore();
  const clubId = user?.club_id ?? null;

  const charger = useCallback(() => matchesApi.list(clubId as string), [clubId]);
  const { items: matches, isLoading, error, refetch } = useApiList<Match>(charger, {
    enabled: isAuthenticated && clubId !== null,
  });

  const clubManquant = isAuthenticated && clubId === null;

  const autorise = useRequireAuth();

  if (!autorise) return null;

  return (
    <div className="page-main">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1
            className="font-data text-xl font-bold"
            style={{ color: COLORS.text_strong }}
          >
            Matchs
          </h1>
          <p className="text-sm" style={{ color: COLORS.text_muted }}>
            Calendrier et compositions
          </p>
        </div>
        {/* Pas de bouton « Nouveau match » : POST /matches exige Competition,
            date et adversaire. L'écran de création n'existe pas encore — un
            bouton muet laisserait croire le contraire. */}
      </div>

      {clubManquant ? (
        <div className="card p-6" role="alert">
          <p className="text-sm" style={{ color: COLORS.destructive }}>
            Club non résolu : reconnectez-vous pour charger les matchs.
          </p>
        </div>
      ) : error ? (
        <div className="card p-6" role="alert">
          <p className="font-data font-semibold mb-1" style={{ color: COLORS.text_strong }}>
            Matchs indisponibles
          </p>
          <p className="text-sm mb-4" style={{ color: COLORS.text_muted }}>
            {error}
          </p>
          <button onClick={refetch} className="btn btn-primary gap-2">
            <RefreshCw size={14} />
            Réessayer
          </button>
        </div>
      ) : isLoading ? (
        <div className="space-y-3">
          <SkeletonCard lines={2} />
          <SkeletonCard lines={2} />
          <SkeletonCard lines={2} />
        </div>
      ) : matches.length === 0 ? (
        <div className="card p-8 text-center">
          <Calendar size={32} style={{ color: COLORS.text_faint, marginBottom: 8 }} />
          <p
            className="font-data font-semibold"
            style={{ color: COLORS.text_strong }}
          >
            Aucun match
          </p>
          <p className="text-sm mt-1" style={{ color: COLORS.text_muted }}>
            Le calendrier de la saison est vide.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {matches.map((match) => (
            <MatchRow key={match.id} match={match} />
          ))}
        </div>
      )}
    </div>
  );
}