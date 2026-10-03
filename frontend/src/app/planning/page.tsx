"use client";

import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores";
import { useApiList } from "@/hooks/useApiData";
import { planningApi } from "@/lib/api";
import type { WorkPlan, WorkPlanType } from "@/types";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { Calendar, RefreshCw } from "lucide-react";

const TYPE_LABELS: Record<WorkPlanType, string> = {
  hebdomadaire: "Hebdomadaire",
  mensuel: "Mensuel",
};

const COLORS = {
  surface: "var(--surface)",
  surface2: "var(--surface-2)",
  border: "var(--border)",
  textStrong: "var(--text-strong)",
  textMuted: "var(--text-muted)",
  textFaint: "var(--text-faint)",
  primary: "var(--primary)",
  primarySoft: "var(--primary-soft)",
  accent: "var(--accent)",
  accentSoft: "var(--accent-soft)",
  destructive: "var(--destructive)",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

/**
 * Un plan est une fenêtre `date_debut` → `date_fin` (WorkPlanResponse).
 * Le mock affichait « semaine_debut / semaine_fin » avec un ém-dash ; les
 * bornes réelles sont des dates pleines.
 */
function Periode({ plan }: { plan: WorkPlan }) {
  return (
    <span className="flex items-center gap-1">
      <Calendar size={12} />
      {formatDate(plan.date_debut)}
      <span className="mx-1" style={{ color: COLORS.textFaint }}>
        {"→"}
      </span>
      {formatDate(plan.date_fin)}
    </span>
  );
}

function PlanCard({ plan }: { plan: WorkPlan }) {
  return (
    <div
      className="card p-5 transition-shadow hover:shadow-md"
      style={{ backgroundColor: COLORS.surface, borderColor: COLORS.border }}
    >
      <div className="flex items-start justify-between mb-2 gap-3">
        <div className="min-w-0">
          <h3
            className="font-data font-semibold text-base truncate"
            style={{ color: COLORS.textStrong }}
          >
            {plan.nom}
          </h3>
          <p
            className="text-xs mt-1 flex items-center gap-1"
            style={{ color: COLORS.textMuted }}
          >
            <Periode plan={plan} />
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span
            className="badge"
            style={{
              backgroundColor:
                plan.type === "hebdomadaire" ? COLORS.primarySoft : COLORS.accentSoft,
              color: plan.type === "hebdomadaire" ? COLORS.primary : COLORS.accent,
            }}
          >
            {TYPE_LABELS[plan.type]}
          </span>
          {plan.statut && (
            <span className="text-tiny" style={{ color: COLORS.textFaint }}>
              {plan.statut}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PlanningPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const clubId = user?.club_id ?? null;

  const charger = useCallback(() => planningApi.list(clubId as string), [clubId]);
  const { items: plans, isLoading, error, refetch } = useApiList<WorkPlan>(charger, {
    enabled: isAuthenticated && clubId !== null,
  });

  const clubManquant = isAuthenticated && clubId === null;

  useEffect(() => {
    if (!isAuthenticated) router.push("/login");
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;

  return (
    <div className="page-main">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1
            className="font-data text-xl font-bold"
            style={{ color: COLORS.textStrong }}
          >
            Planification
          </h1>
          <p className="text-sm" style={{ color: COLORS.textMuted }}>
            Plans de travail hebdomadaires et mensuels
          </p>
        </div>
        {/* Pas de bouton « Nouveau plan » : l'écran de création n'existe pas.
            POST /planning/work-plans exige nom, type et deux dates. */}
      </div>

      {clubManquant ? (
        <div className="card p-6" role="alert">
          <p className="text-sm" style={{ color: COLORS.destructive }}>
            Club non résolu : reconnectez-vous pour charger les plans.
          </p>
        </div>
      ) : error ? (
        <div className="card p-6" role="alert">
          <p
            className="font-data font-semibold mb-1"
            style={{ color: COLORS.textStrong }}
          >
            Plans indisponibles
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
        <div className="space-y-3">
          <SkeletonCard lines={2} />
          <SkeletonCard lines={2} />
        </div>
      ) : plans.length === 0 ? (
        <div className="card p-8 text-center">
          <Calendar size={32} style={{ color: COLORS.textFaint, marginBottom: 8 }} />
          <p
            className="font-data font-semibold"
            style={{ color: COLORS.textStrong }}
          >
            Aucun plan de travail
          </p>
          <p className="text-sm mt-1" style={{ color: COLORS.textMuted }}>
            Les plans hebdomadaires et mensuels apparaîtront ici.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {plans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>
      )}
    </div>
  );
}