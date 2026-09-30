"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores";
import { planningApi } from "@/lib/api";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import {AlertCircle, Calendar, Check, Clock, Plus, Target, TrendingUp} from "lucide-react";
import Link from "next/link";

// ── Types ────────────────────────────────────────────────────────────────────────

interface WorkItem {
  id: string;
  titre: string;
  date: string;
  type: "entrainement" | "match" | "recuper" | "analyse";
  objectifs: string[];
  statut: "fini" | "en_cours" | "planifie" | "skip";
}

interface WorkPlan {
  id: string;
  titre: string;
  semaine_debut: string;
  semaine_fin: string;
  items: WorkItem[];
}

// ── Données mockées ──────────────────────────────────────────────────────────────

const MOCK_WORK_PLANS: WorkPlan[] = [
  {
    id: "wp1",
    titre: "Semaine 33 · Préparation Génération Foot",
    semaine_debut: "2026-08-10",
    semaine_fin: "2026-08-17",
    items: [
      {
        id: "w1",
        titre: "Séance technique : finition",
        date: "2026-08-14",
        type: "entrainement",
        objectifs: ["Finition en jeu aérien", "Contre-attaque"],
        statut: "fini",
      },
      {
        id: "w2",
        titre: "Séance physique : renforcement",
        date: "2026-08-11",
        type: "entrainement",
        objectifs: ["Renforcement quadriceps", "Prévention"],
        statut: "fini",
      },
      {
        id: "w3",
        titre: "Match : Casa Sports",
        date: "2026-08-10",
        type: "match",
        objectifs: ["Défendre le terrain", "Reprendre le ballon rapidement"],
        statut: "fini",
      },
      {
        id: "w4",
        titre: "Match : Génération Foot",
        date: "2026-08-17",
        type: "match",
        objectifs: ["Formation 4-3-3", "Contre-attaque rapide"],
        statut: "planifie",
      },
      {
        id: "w5",
        titre: "Analyse vidéo match Casa Sports",
        date: "2026-08-13",
        type: "analyse",
        objectifs: ["Identifier les axes d'amélioration défensive"],
        statut: "en_cours",
      },
    ],
  },
];

const COLORS = {
  bg: "#F8FAFC",
  surface: "#FFFFFF",
  surface2: "#F1F5F9",
  border: "#E2E8F0",
  textStrong: "#1E293B",
  textMuted: "#64748B",
  textFaint: "#94A3B8",
  primary: "#10B981",
  primarySoft: "#D1FAE5",
  accent: "#F59E0B",
  accentSoft: "#FEF3C7",
  destructive: "#DC2626",
  destructiveSoft: "#FEE2E2",
  technique: "#1E88E5",
  techniqueSoft: "#DBEAFE",
  tactique: "#8E24AA",
  tactiqueSoft: "#EDE7F6",
};

const TYPE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  entrainement: { label: "Entraînement", color: COLORS.primary, bg: COLORS.primarySoft },
  match: { label: "Match", color: COLORS.tactique, bg: COLORS.tactiqueSoft },
  recuper: { label: "Récupération", color: COLORS.accent, bg: COLORS.accentSoft },
  analyse: { label: "Analyse", color: COLORS.technique, bg: COLORS.techniqueSoft },
};

const STATUT_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  fini: { label: "Terminé", color: COLORS.primary, bg: COLORS.primarySoft },
  en_cours: { label: "En cours", color: COLORS.accent, bg: COLORS.accentSoft },
  planifie: { label: "Planifié", color: COLORS.textMuted, bg: COLORS.surface2 },
  skip: { label: "Reporté", color: COLORS.textFaint, bg: COLORS.surface2 },
};

function WeekPlanCard({ plan, onEdit }: { plan: WorkPlan; onEdit?: () => void }) {
  const itemsByStatus: Record<string, WorkItem[]> = {
    fini: [],
    en_cours: [],
    planifie: [],
    skip: [],
  };
  plan.items.forEach((item) => {
    if (item.statut in itemsByStatus) {
      itemsByStatus[item.statut].push(item);
    }
  });

  return (
    <div
      className="card p-5 hover:shadow-md transition-shadow"
      style={{ backgroundColor: COLORS.surface, borderColor: COLORS.border }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-data font-semibold" style={{ color: COLORS.textStrong }}>
          {plan.titre}
        </h3>
        <Link href="#" className="btn btn-ghost btn-sm gap-1" onClick={onEdit}>
          <EditSmall size={14} />
          Modifier le plan
        </Link>
      </div>

      <p className="text-xs mb-4" style={{ color: COLORS.textMuted }}>
        Du {plan.semaine_debut} au {plan.semaine_fin}
      </p>

      <div className="space-y-2">
        {plan.items.map((item) => {
          const typeInfo = TYPE_LABELS[item.type] ?? TYPE_LABELS.entrainement;
          const statutInfo = STATUT_LABELS[item.statut] ?? STATUT_LABELS.planifie;
          return (
            <div
              key={item.id}
              className="flex items-center gap-3 p-2.5 rounded-md"
              style={{
                backgroundColor: COLORS.surface2,
                borderLeft: `3px solid ${typeInfo.color}`,
              }}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: COLORS.textStrong }}>
                  {item.titre}
                </p>
                <p className="text-xs mt-0.5" style={{ color: COLORS.textMuted }}>
                  {item.date} · {typeInfo.label}
                </p>
              </div>
              <span className="badge shrink-0" style={{ backgroundColor: statutInfo.bg, color: statutInfo.color }}>
                {statutInfo.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Résumé */}
      <div className="mt-4 pt-3 border-t" style={{ borderColor: COLORS.border }}>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-xs" style={{ color: COLORS.textMuted }}>
            <Check size={12} />
            {itemsByStatus.fini.length} fait(s)
          </div>
          <div className="flex items-center gap-1.5 text-xs" style={{ color: COLORS.textMuted }}>
            <Clock size={12} />
            {itemsByStatus.en_cours.length} en cours
          </div>
          <div className="flex items-center gap-1.5 text-xs" style={{ color: COLORS.textMuted }}>
            <Calendar size={12} />
            {itemsByStatus.planifie.length} planifié(s)
          </div>
        </div>
      </div>
    </div>
  );
}

// Petit icône manquante
function EditSmall({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

export default function PlanningPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) router.push("/login");
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;

  const [plans] = useState<WorkPlan[]>(MOCK_WORK_PLANS);

  return (
    <div className="page-wrapper">
      <Sidebar />
      <main className="page-content ml-56" style={{ backgroundColor: COLORS.bg }}>
        <Header />
        <div className="page-main">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="font-data text-xl font-bold" style={{ color: COLORS.textStrong }}>
                Planification
              </h1>
              <p className="text-sm" style={{ color: COLORS.textMuted }}>
                Plans de travail hebdomadaires et mensuels
              </p>
            </div>
            <button
              className="btn"
              style={{ backgroundColor: COLORS.primary, color: "#fff", borderColor: COLORS.primary }}
            >
              <Plus size={16} />
              Nouveau plan
            </button>
          </div>

          <div className="space-y-4">
            {plans.map((plan) => (
              <WeekPlanCard key={plan.id} plan={plan} />
            ))}
          </div>

          {plans.length === 0 && (
            <div
              className="card p-10 text-center"
              style={{ backgroundColor: COLORS.surface }}
            >
              <Calendar size={32} style={{ color: COLORS.textFaint }} />
              <p className="text-sm mt-3" style={{ color: COLORS.textMuted }}>
                Aucun plan de travail créé
              </p>
              <button
                className="btn btn-primary mt-4"
                style={{ backgroundColor: COLORS.primary, color: "#fff", borderColor: COLORS.primary }}
              >
                <Plus size={16} />
                Créer un plan
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
