"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores";
import { matchesApi } from "@/lib/api";
import {Calendar, Check, CheckCircle, Clock, Edit2, Goal, MapPin, Plus, Trophy, X, XCircle} from "lucide-react";
import Link from "next/link";

// ── Types ────────────────────────────────────────────────────────────────────────

type MatchStatus = "PLANIFIE" | "EN_COURS" | "TERMINE" | "ANNULE";

interface MatchData {
  id: string;
  adversaire: string;
  date_match: string;
  lieu: string;
  competition: string;
  statut: MatchStatus;
  composition_validee: boolean;
  score_domicile: number | null;
  score_exterieur: number | null;
}

// ── Données mockées (MVP) ────────────────────────────────────────────────────────

const MOCK_MATCHES: MatchData[] = [
  {
    id: "m1",
    adversaire: "Génération Foot",
    date_match: "2026-08-17T16:00:00Z",
    lieu: "Domicile",
    competition: "Ligue 1",
    statut: "PLANIFIE",
    composition_validee: false,
    score_domicile: null,
    score_exterieur: null,
  },
  {
    id: "m2",
    adversaire: "Casa Sports",
    date_match: "2026-08-10T16:00:00Z",
    lieu: "Extérieur",
    competition: "Ligue 1",
    statut: "TERMINE",
    composition_validee: true,
    score_domicile: 2,
    score_exterieur: 1,
  },
  {
    id: "m3",
    adversaire: "Diambars FC",
    date_match: "2026-08-03T15:00:00Z",
    lieu: "Domicile",
    competition: "Ligue 1",
    statut: "TERMINE",
    composition_validee: true,
    score_domicile: 3,
    score_exterieur: 2,
  },
  {
    id: "m4",
    adversaire: "Teungueth FC",
    date_match: "2026-08-24T15:00:00Z",
    lieu: "Extérieur",
    competition: "Ligue 1",
    statut: "PLANIFIE",
    composition_validee: false,
    score_domicile: null,
    score_exterieur: null,
  },
];

const STATUS_COLOR: Record<MatchStatus, string> = {
  PLANIFIE: "badge-info",
  EN_COURS: "badge-reserve",
  TERMINE: "badge-fit",
  ANNULE: "badge-neutral",
};

// Tokens sémantiques — charte §2.4 : jamais de hex en dur, toujours un token.
const COLORS: Record<string, string> = {
  match_bg: "var(--bg)",
  match_border: "var(--border)",
  accent: "var(--primary)",
  accent_soft: "var(--primary-soft)",
  text_strong: "var(--text-strong)",
  text_muted: "var(--text-muted)",
  text_faint: "var(--text-faint)",
};

function getStatusColor(status: MatchStatus): string {
  return STATUS_COLOR[status] ?? "badge-neutral";
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function MatchRow({ match }: { match: MatchData }) {
  return (
    <Link
      href={`/matches/${match.id}`}
      className="block p-4 border border-match-border rounded-lg hover:shadow-md transition-shadow"
      style={{ backgroundColor: COLORS.match_bg, borderColor: COLORS.match_border }}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <span className="font-data text-sm font-semibold" style={{ color: COLORS.text_strong }}>
              {match.adversaire}
            </span>
            <span className={`badge ${getStatusColor(match.statut)}`}>
              {match.statut === "PLANIFIE" ? "Planifié" :
               match.statut === "EN_COURS" ? "En cours" :
               match.statut === "TERMINE" ? "Terminé" : "Annulé"}
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs" style={{ color: COLORS.text_muted }}>
            <span className="flex items-center gap-1">
              <Calendar size={12} />
              {formatDate(match.date_match)}
            </span>
            <span className="flex items-center gap-1">
              <MapPin size={12} />
              {match.lieu}
            </span>
            <span className="flex items-center gap-1">
              <Trophy size={12} />
              {match.competition}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-4">
          {match.score_domicile != null && match.score_exterieur != null && (
            <span className="font-data text-sm font-bold tabular-nums" style={{ color: COLORS.text_strong }}>
              {match.score_domicile} — {match.score_exterieur}
            </span>
          )}
          <span className="p-1.5 rounded-full bg-surface-2 flex items-center justify-center" style={{ border: `1px solid ${COLORS.match_border}` }}>
            <Edit2 size={14} style={{ color: COLORS.text_faint }} />
          </span>
        </div>
      </div>
      {match.statut === "PLANIFIE" && !match.composition_validee && (
        <div className="mt-2 flex items-center gap-2 text-xs" style={{ color: COLORS.text_muted }}>
          <Clock size={12} />
          Composition non validée
        </div>
      )}
      {match.composition_validee && match.statut !== "PLANIFIE" && (
        <div className="mt-2 flex items-center gap-2 text-xs" style={{ color: COLORS.accent }}>
          <CheckCircle size={12} />
          Composition validée
        </div>
      )}
    </Link>
  );
}

export default function MatchesPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) router.push("/login");
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;

  const [matches, setMatches] = useState<MatchData[]>(MOCK_MATCHES);

  return (
    <div className="page-main">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-data text-xl font-bold" style={{ color: COLORS.text_strong }}>
              Matchs
            </h1>
            <p className="text-sm" style={{ color: COLORS.text_muted }}>
              Gestion des compositions et évaluations
            </p>
          </div>
          <button className="btn" style={{ backgroundColor: COLORS.accent, color: "var(--on-primary)", borderColor: COLORS.accent }}>
            <Plus size={16} />
            Nouveau match
          </button>
        </div>

        <div className="space-y-3">
          {matches.map((match) => <MatchRow key={match.id} match={match} />)}
        </div>
    </div>
  );
}
