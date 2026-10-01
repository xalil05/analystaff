"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores";
import { trainingApi } from "@/lib/api";
import {Dumbbell, Calendar, Clock, Edit2, Plus, Target, TrendingUp, User, Users} from "lucide-react";
import Link from "next/link";

type SessionStatus = "PLANIFIEE" | "EN_COURS" | "TERMINE" | "ANNULE";

interface SessionData {
  id: string;
  titre: string;
  date: string;
  objectifs: string[];
  charge_prevue: number;
  statut: SessionStatus;
  evaluations_count: number;
}

// ── Données mockées ──────────────────────────────────────────────────────────────

const MOCK_SESSIONS: SessionData[] = [
  {
    id: "s1",
    titre: "Séance technique : finition",
    date: "2026-08-14T17:00:00Z",
    objectifs: ["Améliorer la finition en jeu aérien", "Travail d'équipe en contre-attaque"],
    charge_prevue: 70,
    statut: "TERMINE",
    evaluations_count: 11,
  },
  {
    id: "s2",
    titre: "Séance physique : renforcement",
    date: "2026-08-11T16:30:00Z",
    objectifs: ["Renforcement quadriceps", "Prévention blessures"],
    charge_prevue: 80,
    statut: "TERMINE",
    evaluations_count: 8,
  },
  {
    id: "s3",
    titre: "Séance tactique : préparation Génération Foot",
    date: "2026-08-17T16:00:00Z",
    objectifs: ["Formation 4-3-3", "Transitions défensives"],
    charge_prevue: 60,
    statut: "PLANIFIEE",
    evaluations_count: 0,
  },
  {
    id: "s4",
    titre: "Séance de récupération active",
    date: "2026-08-18T09:00:00Z",
    objectifs: ["Récupération légère", "Travail technique individuel"],
    charge_prevue: 30,
    statut: "PLANIFIEE",
    evaluations_count: 0,
  },
];

const STATUS_BADGE: Record<SessionStatus, string> = {
  PLANIFIEE: "badge-info",
  EN_COURS: "badge-reserve",
  TERMINE: "badge-fit",
  ANNULE: "badge-neutral",
};

const COLORS = {
  bg: "var(--bg)",
  border: "var(--border)",
  surface: "var(--surface)",
  surface2: "var(--surface-2)",
  textStrong: "var(--text-strong)",
  textMuted: "var(--text-muted)",
  textFaint: "var(--text-faint)",
  primary: "var(--primary)",
  primarySoft: "var(--primary-soft)",
  accent: "var(--accent)",
  accentSoft: "var(--accent-soft)",
  destructive: "var(--destructive)",
  destructiveSoft: "var(--destructive-soft)",
};

function getStatusLabel(status: SessionStatus): string {
  return status === "PLANIFIEE" ? "Planifiée"
    : status === "EN_COURS" ? "En cours"
    : status === "TERMINE" ? "Terminée"
    : "Annulée";
}

function SessionCard({ session }: { session: SessionData }) {
  const statusClass = STATUS_BADGE[session.statut] ?? "badge-neutral";

  return (
    <div
      className="card p-5 hover:shadow-md transition-shadow"
      style={{ backgroundColor: COLORS.surface, borderColor: COLORS.border }}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-data font-semibold text-base" style={{ color: COLORS.textStrong }}>
            {session.titre}
          </h3>
          {session.statut !== "ANNULE" && (
            <p className="text-xs mt-1 flex items-center gap-1" style={{ color: COLORS.textMuted }}>
              <Calendar size={12} />
              {new Date(session.date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
              {" · "}
              <Clock size={12} />
              {new Date(session.date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
            </p>
          )}
        </div>
        <span className={`badge ${statusClass}`}>
          {getStatusLabel(session.statut)}
        </span>
      </div>

      {session.objectifs.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: COLORS.textFaint }}>
            Objectifs
          </p>
          <ul className="space-y-1">
            {session.objectifs.map((obj, i) => (
              <li key={i} className="text-sm flex items-center gap-2" style={{ color: COLORS.textMuted }}>
                <Target size={12} />
                {obj}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center justify-between mt-4 pt-3 border-t" style={{ borderColor: COLORS.border }}>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs" style={{ color: COLORS.textMuted }}>
            <TrendingUp size={12} />
            Charge prévue :
          </div>
          <span className="font-data font-semibold tabular-nums" style={{ color: COLORS.primary }}>
            {session.charge_prevue}%
          </span>
        </div>
        <div className="flex items-center gap-2">
          {session.evaluations_count > 0 && (
            <span className="text-xs font-medium" style={{ color: COLORS.textMuted }}>
              {session.evaluations_count} évaluations
            </span>
          )}
          <Link
            href={`/training/${session.id}`}
            className="btn btn-secondary btn-sm gap-1"
          >
            <Edit2 size={14} />
            Voir
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function TrainingPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) router.push("/login");
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;

  const [sessions] = useState<SessionData[]>(MOCK_SESSIONS);

  const sessionsPlanifiees = sessions.filter((s) => s.statut === "PLANIFIEE");
  const sessionsTerminees = sessions.filter((s) => s.statut === "TERMINE");
  const sessionsCours = sessions.filter((s) => s.statut === "EN_COURS");

  return (
    <div className="page-main">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-data text-xl font-bold" style={{ color: COLORS.textStrong }}>
              Entraînements
            </h1>
            <p className="text-sm" style={{ color: COLORS.textMuted }}>
              Planification et évaluation des séances
            </p>
          </div>
          <button
            className="btn"
            style={{ backgroundColor: COLORS.primary, color: "var(--on-primary)", borderColor: COLORS.primary }}
          >
            <Plus size={16} />
            Nouvelle séance
          </button>
        </div>

        {sessionsCours.length > 0 && (
          <div className="mb-6">
            <h2 className="font-data font-semibold text-sm text-text-strong mb-3">
              En cours
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sessionsCours.map((s) => <SessionCard key={s.id} session={s} />)}
            </div>
          </div>
        )}

        {sessionsPlanifiees.length > 0 && (
          <div className="mb-6">
            <h2 className="font-data font-semibold text-sm text-text-strong mb-3">
              Planifiés
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sessionsPlanifiees.map((s) => <SessionCard key={s.id} session={s} />)}
            </div>
          </div>
        )}

        {sessionsTerminees.length > 0 && (
          <div>
            <h2 className="font-data font-semibold text-sm text-text-strong mb-3">
              Terminés
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sessionsTerminees.map((s) => <SessionCard key={s.id} session={s} />)}
            </div>
          </div>
        )}

        {sessions.length === 0 && (
          <div className="card p-10 text-center" style={{ backgroundColor: COLORS.surface }}>
            <Dumbbell size={32} style={{ color: COLORS.textFaint }} />
            <p className="text-sm mt-3" style={{ color: COLORS.textMuted }}>
              Aucune séance enregistrée
            </p>
            <button className="btn btn-primary mt-4">
              <Plus size={16} />
              Créer une séance
            </button>
          </div>
        )}
    </div>
  );
}
