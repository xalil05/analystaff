"use client";

import { useCallback, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores";
import { useApiList } from "@/hooks/useApiData";
import { trainingApi } from "@/lib/api";
import type { TrainingSession, TrainingStatut } from "@/types";
import { SkeletonCard } from "@/components/ui/Skeleton";
import {
  Calendar,
  Clock,
  Dumbbell,
  Edit2,
  RefreshCw,
  Target,
  TrendingUp,
} from "lucide-react";

// Statuts minuscules (app/core/enums.py TrainingStatut). Le mock précédent
// utilisait PLANIFIEE / EN_COURS / TERMINE / ANNULE — aucun n'existe.
const STATUT_LABELS: Record<TrainingStatut, string> = {
  planifiee: "Planifiée",
  realisee: "Réalisée",
  annulee: "Annulée",
};

const STATUT_COLORS: Record<TrainingStatut, { bg: string; color: string }> = {
  planifiee: { bg: "var(--info-soft)", color: "var(--info)" },
  realisee: { bg: "var(--primary-soft)", color: "var(--primary-hover)" },
  annulee: { bg: "var(--surface-2)", color: "var(--text-muted)" },
};

const COLORS = {
  surface: "var(--surface)",
  border: "var(--border)",
  textStrong: "var(--text-strong)",
  textMuted: "var(--text-muted)",
  textFaint: "var(--text-faint)",
  primary: "var(--primary)",
  destructive: "var(--destructive)",
};

/**
 * `objectifs` est un texte libre côté backend, pas un tableau : le mock
 *对它做 `.map()` — c'est ce qui faisait planter `.map is not a function`.
 * On découpe sur les lignes, seule décomposition qui ne perd rien.
 */
function objectifsEnListe(objectifs: string | null): string[] {
  if (!objectifs) return [];
  return objectifs
    .split("\n")
    .map((l) => l.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean);
}

function formatDate(iso: string): { jour: string; heure: string } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { jour: "—", heure: "" };
  return {
    jour: d.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    }),
    heure: d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
  };
}

function SessionCard({ session }: { session: TrainingSession }) {
  const statut = STATUT_COLORS[session.statut] ?? STATUT_COLORS.annulee;
  const objectifs = objectifsEnListe(session.objectifs);
  const { jour, heure } = formatDate(session.date_seance);

  return (
    <div
      className="card p-5 transition-shadow hover:shadow-md"
      style={{ backgroundColor: COLORS.surface, borderColor: COLORS.border }}
    >
      <div className="flex items-start justify-between mb-3 gap-3">
        <div className="min-w-0">
          {/* Pas de `titre` : TrainingSession n'en a pas. Le premier objectif
              sert de titre, sinon la date. */}
          <h3
            className="font-data font-semibold text-base truncate"
            style={{ color: COLORS.textStrong }}
          >
            {objectifs[0] ?? "Séance d'entraînement"}
          </h3>
          {session.statut !== "annulee" && (
            <p
              className="text-xs mt-1 flex items-center gap-1"
              style={{ color: COLORS.textMuted }}
            >
              <Calendar size={12} />
              {jour}
              {heure && (
                <>
                  {" · "}
                  <Clock size={12} />
                  {heure}
                </>
              )}
            </p>
          )}
          {session.lieu && (
            <p className="text-xs mt-0.5" style={{ color: COLORS.textFaint }}>
              {session.lieu}
            </p>
          )}
        </div>
        <span className="badge shrink-0" style={{ backgroundColor: statut.bg, color: statut.color }}>
          {STATUT_LABELS[session.statut]}
        </span>
      </div>

      {objectifs.length > 1 && (
        <div className="mb-3">
          <p
            className="text-xs font-medium uppercase tracking-wider mb-2"
            style={{ color: COLORS.textFaint }}
          >
            Objectifs
          </p>
          <ul className="space-y-1">
            {objectifs.slice(1).map((obj, i) => (
              <li
                key={i}
                className="text-sm flex items-start gap-2"
                style={{ color: COLORS.textMuted }}
              >
                <Target size={12} className="shrink-0 mt-1" />
                {obj}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div
        className="flex items-center justify-between mt-4 pt-3 border-t"
        style={{ borderColor: COLORS.border }}
      >
        <div className="flex items-center gap-3">
          <TrendingUp size={12} style={{ color: COLORS.textMuted }} />
          <span className="text-xs" style={{ color: COLORS.textMuted }}>
            Charge prévue :
          </span>
          <span
            className="font-data font-semibold tabular-nums"
            style={{ color: COLORS.primary }}
          >
            {session.charge_prevue != null ? `${session.charge_prevue} AU` : "—"}
          </span>
        </div>
        <Link
          href={`/training/${session.id}`}
          className="btn btn-secondary btn-sm gap-1"
        >
          <Edit2 size={14} />
          Voir
        </Link>
      </div>
    </div>
  );
}

export default function TrainingPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const clubId = user?.club_id ?? null;

  const charger = useCallback(() => trainingApi.list(clubId as string), [clubId]);
  const { items: sessions, isLoading, error, refetch } = useApiList<TrainingSession>(
    charger,
    { enabled: isAuthenticated && clubId !== null }
  );

  const clubManquant = isAuthenticated && clubId === null;

  useEffect(() => {
    if (!isAuthenticated) router.push("/login");
  }, [isAuthenticated, router]);

  const groupes = useMemo(() => {
    const par: Record<TrainingStatut, TrainingSession[]> = {
      planifiee: [],
      realisee: [],
      annulee: [],
    };
    for (const s of sessions) {
      // Une séance annulee reste visible : sans elle, le staff ne distingue
      // pas « pas de séance annulée » de « séance annulée non affichée ».
      par[s.statut]?.push(s);
    }
    return par;
  }, [sessions]);

  if (!isAuthenticated) return null;

  const titres: { cle: TrainingStatut; titre: string }[] = [
    { cle: "planifiee", titre: "Planifiées" },
    { cle: "realisee", titre: "Réalisées" },
    { cle: "annulee", titre: "Annulées" },
  ];

  return (
    <div className="page-main">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1
            className="font-data text-xl font-bold"
            style={{ color: COLORS.textStrong }}
          >
            Entraînements
          </h1>
          <p className="text-sm" style={{ color: COLORS.textMuted }}>
            Planification et évaluation des séances
          </p>
        </div>
        {/* Pas de bouton « Nouvelle séance » : l'écran de création n'existe
            pas. Un bouton muet laisserait croire le contraire. */}
      </div>

      {clubManquant ? (
        <div className="card p-6" role="alert">
          <p className="text-sm" style={{ color: COLORS.destructive }}>
            Club non résolu : reconnectez-vous pour charger les séances.
          </p>
        </div>
      ) : error ? (
        <div className="card p-6" role="alert">
          <p
            className="font-data font-semibold mb-1"
            style={{ color: COLORS.textStrong }}
          >
            Séances indisponibles
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SkeletonCard lines={4} />
          <SkeletonCard lines={4} />
        </div>
      ) : sessions.length === 0 ? (
        <div className="card p-10 text-center" style={{ backgroundColor: COLORS.surface }}>
          <Dumbbell size={32} style={{ color: COLORS.textFaint, marginBottom: 8 }} />
          <p
            className="font-data font-semibold"
            style={{ color: COLORS.textStrong }}
          >
            Aucune séance enregistrée
          </p>
          <p className="text-sm mt-1" style={{ color: COLORS.textMuted }}>
            Le planning d'entraînement de la saison est vide.
          </p>
        </div>
      ) : (
        titres
          .filter(({ cle }) => groupes[cle].length > 0)
          .map(({ cle, titre }, i) => (
            <div key={cle} className={i === titres.length - 1 ? "" : "mb-6"}>
              <h2
                className="font-data font-semibold text-sm mb-3"
                style={{ color: COLORS.textStrong }}
              >
                {titre}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {groupes[cle].map((s) => (
                  <SessionCard key={s.id} session={s} />
                ))}
              </div>
            </div>
          ))
      )}
    </div>
  );
}