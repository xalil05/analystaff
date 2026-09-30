"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores";
import {Dumbbell, Activity, AlertTriangle, ArrowDownRight, ArrowUpRight, Brain, Calendar, Goal, LayoutDashboard, Target, TrendingUp, User, Users} from "lucide-react";
import Link from "next/link";

// ── Données mockées pour le MVP ──────────────────────────────────────────────────

const KPI_DATA = [
  {
    label: "Évaluations ce mois",
    value: 24,
    delta: "+3 vs mois dernier",
    deltaUp: true,
    icon: Target,
    color: "text-primary",
    bg: "bg-primary-soft",
  },
  {
    label: "Joueurs évalués",
    value: 18,
    delta: "100% de l'effectif",
    deltaUp: true,
    icon: Users,
    color: "text-pillar-technique-text",
    bg: "bg-pillar-technique-soft",
  },
  {
    label: "Note moyenne équipe",
    value: 7.2,
    delta: "+0.3 ce mois",
    deltaUp: true,
    icon: TrendingUp,
    color: "text-pillar-tactique-text",
    bg: "bg-pillar-tactique-soft",
  },
  {
    label: "Signaux de fatigue",
    value: 3,
    delta: "2 nouveaux",
    deltaUp: false,
    icon: AlertTriangle,
    color: "text-destructive",
    bg: "bg-destructive-soft",
  },
];

const RECENT_NOTES = [
  {
    id: "1",
    auteur: "Aliou Cissé",
    role: "Entraîneur principal",
    texte: "Forme globale satisfaisante. À surveiller la récupération de Mendy après le match de cette semaine — il a fait 85 min.",
    heure: "Il y a 2 heures",
    joueur: "Édouard Mendy",
    initiale: "AC",
  },
  {
    id: "2",
    auteur: "Dr. Diallo",
    role: "Staff médical",
    texte: "Koulibaly autorisé pour l'entraînement de demain. Pas de restriction physique. Suite à vérifier après le match.",
    heure: "Il y a 5 heures",
    joueur: "Kalidou Koulibaly",
    initiale: "KD",
  },
  {
    id: "3",
    auteur: "Régis Le Bris",
    role: "Entraîneur adjoint",
    texte: "Bonne intensité collective en séance. La défense gagnait en cohérence — à maintenir dans la préparation du match.",
    heure: "Hier 18:40",
    joueur: null,
    initiale: "RL",
  },
];

const WEEKLY_ACTIVITY = [
  { jour: "Lun", sessions: 2, evaluations: 8 },
  { jour: "Mar", sessions: 1, evaluations: 5 },
  { jour: "Mer", sessions: 2, evaluations: 11 },
  { jour: "Jeu", sessions: 1, evaluations: 14 },
  { jour: "Ven", sessions: 0, evaluations: 0 },
  { jour: "Sam", sessions: 1, evaluations: 18 },
  { jour: "Dim", sessions: 0, evaluations: 0 },
];

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;

  const maxEvaluations = Math.max(...WEEKLY_ACTIVITY.map((a) => a.evaluations), 1);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Titre */}
      <div>
        <h1 className="font-data text-xl font-bold text-text-strong">
          Tableau de bord
        </h1>
        <p className="text-muted text-sm">
          Vue d'ensemble de la semaine en cours
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {KPI_DATA.map((kpi, i) => {
          const Icon = kpi.icon;
          const isHighPriority = i === 3; // alerte fatigue = priorité
          return (
            <div
              key={kpi.label}
              className={`card card-sm ${isHighPriority ? "border-primary" : ""}`}
              style={{
                backgroundColor: isHighPriority ? "var(--primary-soft)" : undefined,
              }}
            >
              <div className="kpi-icon" style={{ backgroundColor: isHighPriority ? "var(--primary-soft)" : kpi.bg }}>
                <Icon className={`w-5 h-5 ${kpi.color}`} />
              </div>
              <div>
                <p className="num-lg text-text-strong">{kpi.value}</p>
                <p className="text-tiny uppercase tracking-wider text-muted font-medium">
                  {kpi.label}
                </p>
                {kpi.delta && (
                  <p className="text-tiny mt-1 flex items-center gap-1">
                    {kpi.deltaUp ? (
                      <ArrowUpRight className="w-3 h-3 text-pillar-physique-text" />
                    ) : (
                      <ArrowDownRight className="w-3 h-3 text-destructive" />
                    )}
                    <span
                      className={
                        kpi.deltaUp ? "text-pillar-physique-text" : "text-destructive"
                      }
                    >
                      {kpi.delta}
                    </span>
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Notes du staff (colonne gauche) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-data text-lg font-semibold text-text-strong">
              Notes du staff
            </h2>
            <button className="btn btn-ghost btn-sm gap-1">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              voir tout
            </button>
          </div>

          <div className="space-y-3">
            {RECENT_NOTES.map((note) => (
              <div key={note.id} className="note-card">
                <div
                  className="note-avatar"
                  style={{ backgroundColor: "var(--primary)" }}
                >
                  {note.initiale}
                </div>
                <div className="note-content">
                  <div className="note-author">
                    <span>{note.auteur}</span>
                    <span className="note-role">· {note.role}</span>
                  </div>
                  <p className="note-time">{note.heure}</p>
                  <p className="note-text">{note.texte}</p>
                  {note.joueur && (
                    <p className="text-tiny text-muted mt-1">
                      concernant {note.joueur}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Activité de la semaine (colonne droite) */}
        <div className="space-y-4">
          <h2 className="font-data text-lg font-semibold text-text-strong">
            Cette semaine
          </h2>

          <div className="card p-5 space-y-4">
            {/* Sessions */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Dumbbell className="w-4 h-4 text-primary" />
                <span className="text-sm text-muted">Sessions</span>
              </div>
              <span className="font-data font-semibold text-text-strong tabular-nums">
                {WEEKLY_ACTIVITY.reduce((s, a) => s + a.sessions, 0)}
              </span>
            </div>

            {/* Évaluations */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-pillar-technique-text" />
                <span className="text-sm text-muted">Évalutations</span>
              </div>
              <span className="font-data font-semibold text-text-strong tabular-nums">
                {WEEKLY_ACTIVITY.reduce((s, a) => s + a.evaluations, 0)}
              </span>
            </div>

            <div className="divider" />

            {/* Barre hebdomadaire */}
            <div className="space-y-2">
              {WEEKLY_ACTIVITY.map((a) => (
                <div key={a.jour} className="flex items-center gap-3">
                  <span className="text-tiny font-medium text-muted w-6">
                    {a.jour}
                  </span>
                  <div className="flex-1 h-2 bg-surface-2 rounded-full overflow-hidden">
                    {a.evaluations > 0 && (
                      <div
                        className="h-full rounded-full"
                        style={{ backgroundColor: "var(--primary)", width: `${(a.evaluations / maxEvaluations) * 100}%` }}
                      />
                    )}
                  </div>
                  <span className="text-tiny font-data font-semibold text-muted tabular-nums w-6 text-right">
                    {a.evaluations > 0 ? a.evaluations : ""}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Match hebdo */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Goal className="w-4 h-4 text-pillar-tactique-text" />
                <span className="text-sm text-muted">Prochain match</span>
              </div>
              <span className="text-tiny text-muted">dans 5 jours</span>
            </div>
            <p className="font-data font-semibold text-text-strong">
              vs Génération Foot
            </p>
            <p className="text-tiny text-muted mt-1">Samedi 17/08 · 16:00 · Domicile</p>
          </div>
        </div>
      </div>

      {/* Composition suggérée (IA) */}
      <div className="card p-5 bg-secondary text-on-dark" style={{ backgroundColor: "var(--secondary)" }}>
        <div className="flex items-center gap-2 mb-3">
          <Brain className="w-5 h-5 text-on-dark" />
          <h3 className="font-data font-semibold text-on-dark text-sm uppercase tracking-wider">
            Suggestion IA prête
          </h3>
        </div>
        <p className="text-on-dark/80 text-sm mb-4">
          Analyse de fatigue : 3 joueurs présentent des signaux de surendetraînement.
          <br />Cliquez pour voir les détails et accepter / modifier / rejeter.
        </p>
        <div className="flex gap-2">
          <button className="btn btn-ai gap-1 text-sm" style={{ backgroundColor: "var(--secondary)", borderColor: "var(--secondary)" }}>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            Voir la suggestion
          </button>
          <button className="btn btn-ghost btn-sm text-on-dark gap-1" style={{ color: "var(--on-dark)" }}>
            Ignorer
          </button>
        </div>
      </div>
    </div>
  );
}
