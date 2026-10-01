"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores";
import { evaluationsApi } from "@/lib/api";
import { PlayerCard } from "@/components/player/PlayerCard";
import {AlertTriangle, BarChart3, Target, TrendingUp, Trophy, User, Users} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────────

interface PlayerAnalyse {
  id: string;
  nom: string;
  prenom: string;
  poste: string;
  photo_url: string | null;
  note_moyenne: number | null;
  matches_joues: number;
  buts: number;
  passes_decisives: number;
}

// ── Données mockées ──────────────────────────────────────────────────────────────

const MOCK_ANALYSES: PlayerAnalyse[] = [
  { id: "p1", nom: "Mané", prenom: "Sadio", poste: "Ailier gauche", photo_url: null, note_moyenne: 7.8, matches_joues: 12, buts: 6, passes_decisives: 4 },
  { id: "p2", nom: "Koulibaly", prenom: "Kalidou", poste: "Défenseur central", photo_url: null, note_moyenne: 8.5, matches_joues: 12, buts: 1, passes_decisives: 2 },
  { id: "p3", nom: "Gueye", prenom: "Idrissa", poste: "Milieu défensif", photo_url: null, note_moyenne: 7.4, matches_joues: 11, buts: 1, passes_decisives: 5 },
  { id: "p4", nom: "Mendy", prenom: "Édouard", poste: "Gardien", photo_url: null, note_moyenne: 8.1, matches_joues: 12, buts: 0, passes_decisives: 3 },
  { id: "p5", nom: "Sarr", prenom: "Ismaïla", poste: "Ailier droit", photo_url: null, note_moyenne: 7.0, matches_joues: 10, buts: 4, passes_decisives: 3 },
  { id: "p6", nom: "Diédhiou", prenom: "Famara", poste: "Milieu central", photo_url: null, note_moyenne: 6.8, matches_joues: 9, buts: 3, passes_decisives: 2 },
];

const CLUB_MOYENNE = 7.2;
const TOTAL_BUTS = 15;
const TOTAL_PASSES = 19;

const COLORS = {
  bg: "var(--bg)",
  surface: "var(--surface)",
  surface2: "var(--surface-2)",
  border: "var(--border)",
  textStrong: "var(--text-strong)",
  textMuted: "var(--text-muted)",
  textFaint: "var(--text-faint)",
  primary: "var(--primary)",
  primarySoft: "var(--primary-soft)",
  onPrimary: "var(--on-primary)",
  accent: "var(--accent)",
  accentSoft: "var(--accent-soft)",
  accentDark: "var(--accent-strong)",
  destructive: "var(--destructive)",
  destructiveSoft: "var(--destructive-soft)",
  technique: "var(--pillar-technique)",
  techniqueSoft: "var(--pillar-technique-soft)",
};

function StatCard({
  label,
  value,
  icon,
  color,
  bg,
}: {
  label: string;
  value: string | number;
  icon: typeof BarChart3;
  color: string;
  bg: string;
}) {
  const Icon = icon;
  return (
    <div className="card card-sm p-4" style={{ backgroundColor: COLORS.surface }}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: bg, color }}>
          <Icon size={18} />
        </div>
        <div>
          <p className="font-data font-semibold text-lg tabular-nums" style={{ color: COLORS.textStrong }}>
            {value}
          </p>
          <p className="text-xs uppercase tracking-wider" style={{ color: COLORS.textMuted }}>
            {label}
          </p>
        </div>
      </div>
    </div>
  );
}

function PlayerRow({ player, noteMoyenneClub }: { player: PlayerAnalyse; noteMoyenneClub: number }) {
  const diff = player.note_moyenne != null ? (player.note_moyenne - noteMoyenneClub) : 0;
  const diffClass = diff > 0 ? "text-primary" : diff < 0 ? "text-destructive" : "text-muted";
  const diffIcon = diff > 0 ? <TrendingUp size={12} /> : diff < 0 ? <AlertTriangle size={12} /> : null;

  return (
    <div
      className="flex items-center justify-between p-3 rounded-md hover:shadow-sm transition-shadow"
      style={{ backgroundColor: COLORS.surface, border: `1px solid ${COLORS.border}` }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-white font-data font-bold text-sm shrink-0"
          style={{ backgroundColor: COLORS.primary, color: COLORS.onPrimary }}
        >
          {player.prenom?.[0] ?? ""}{player.nom?.[0] ?? ""}
        </div>
        <div className="min-w-0">
          <p className="font-data font-medium text-sm truncate" style={{ color: COLORS.textStrong }}>
            {player.prenom} {player.nom}
          </p>
          <p className="text-xs truncate" style={{ color: COLORS.textMuted }}>
            {player.poste}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4 shrink-0">
        <div className="text-center">
          <p className="font-data font-semibold text-sm tabular-nums" style={{ color: COLORS.textStrong }}>
            {player.matches_joues}
          </p>
          <p className="text-xs" style={{ color: COLORS.textMuted }}>Matchs</p>
        </div>
        <div className="text-center">
          <p className="font-data font-semibold text-sm tabular-nums" style={{ color: COLORS.primary }}>
            {player.buts}
          </p>
          <p className="text-xs" style={{ color: COLORS.textMuted }}>Buts</p>
        </div>
        <div className="text-center">
          <p className="font-data font-semibold text-sm tabular-nums" style={{ color: COLORS.technique }}>
            {player.passes_decisives}
          </p>
          <p className="text-xs" style={{ color: COLORS.textMuted }}>Passes D.</p>
        </div>
        <div className="text-center min-w-[80px]">
          <p className="font-data font-bold text-lg tabular-nums" style={{ color: COLORS.textStrong }}>
            {player.note_moyenne?.toFixed(1) ?? "—"}
          </p>
          <div className="flex items-center justify-center gap-0.5">
            {diffIcon}
            <p className={`text-xs font-medium tabular-nums ${diffClass}`}>
              {diff > 0 ? "+" : ""}{diff.toFixed(1)}
            </p>
            <p className="text-xs" style={{ color: COLORS.textFaint }}>/ moy.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function TopButeurRow({ nom, buts, matchs, maxButs }: { nom: string; buts: number; matchs: number; maxButs: number }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <span className="w-6 h-6 rounded-full bg-onPrimary text-primary flex items-center justify-center text-xs font-data font-bold" style={{ backgroundColor: COLORS.primary, color: COLORS.onPrimary }}>
        {buts}
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-data font-medium text-sm truncate" style={{ color: COLORS.textStrong }}>
          {nom}
        </p>
        <p className="text-xs" style={{ color: COLORS.textMuted }}>{matchs} matchs</p>
      </div>
      <div className="w-24 bg-surface2 rounded-full h-2 overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ backgroundColor: COLORS.primary, width: `${(buts / maxButs) * 100}%` }}
        />
      </div>
      <span className="font-data font-semibold text-sm tabular-nums" style={{ color: COLORS.textStrong, width: 24, textAlign: "right" }}>
        {buts}
      </span>
    </div>
  );
}

export default function AnalysePage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) router.push("/login");
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;

  const [analyses] = useState<PlayerAnalyse[]>(MOCK_ANALYSES);
  const sorted = [...analyses].sort((a, b) => (b.note_moyenne ?? 0) - (a.note_moyenne ?? 0));
  const topButeurs = [...analyses].sort((a, b) => b.buts - a.buts).slice(0, 3);
  const maxButs = topButeurs[0]?.buts ?? 1;

  return (
    <div className="page-main">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-data text-xl font-bold" style={{ color: COLORS.textStrong }}>
            Analyse & Statistiques
          </h1>
          <p className="text-sm" style={{ color: COLORS.textMuted }}>
            Performance globale de l'équipe
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Buts marqués"
          value={TOTAL_BUTS}
          icon={Target}
          color={COLORS.primary}
          bg={COLORS.primarySoft}
        />
        <StatCard
          label="Buts encaissés"
          value={8}
          icon={Trophy}
          color={COLORS.destructive}
          bg={COLORS.destructiveSoft}
        />
        <StatCard
          label="Moyenne équipe"
          value={CLUB_MOYENNE.toFixed(1)}
          icon={TrendingUp}
          color={COLORS.technique}
          bg={COLORS.techniqueSoft}
        />
        <StatCard
          label="Clean sheets"
          value={4}
          icon={Users}
          color={COLORS.accent}
          bg={COLORS.accentSoft}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Classement par note */}
        <div>
          <h2 className="font-data font-semibold text-lg mb-4 flex items-center gap-2" style={{ color: COLORS.textStrong }}>
            <BarChart3 size={16} style={{ color: COLORS.primary }} />
            Classement par note
          </h2>
          <div className="card p-4" style={{ backgroundColor: COLORS.surface, borderColor: COLORS.border }}>
            <div className="space-y-1">
              {sorted.map((player, index) => (
                <PlayerRow
                  key={player.id}
                  player={player}
                  noteMoyenneClub={CLUB_MOYENNE}
                />
              ))}
            </div>
            <div className="mt-4 pt-3 border-t" style={{ borderColor: COLORS.border }}>
              <div className="flex items-center justify-between text-sm">
                <span style={{ color: COLORS.textMuted }}>Moyenne club</span>
                <span className="font-data font-bold tabular-nums" style={{ color: COLORS.primary }}>
                  {CLUB_MOYENNE.toFixed(1)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Top buteurs + Moyennes par critère */}
        <div className="space-y-6">
          {/* Top buteurs */}
          <div>
            <h2 className="font-data font-semibold text-lg mb-4 flex items-center gap-2" style={{ color: COLORS.textStrong }}>
              <Target size={16} style={{ color: COLORS.primary }} />
              Top buteurs
            </h2>
            <div className="card p-4" style={{ backgroundColor: COLORS.surface, borderColor: COLORS.border }}>
              <div className="space-y-1">
                {topButeurs.map((player) => (
                  <TopButeurRow
                    key={player.id}
                    nom={`${player.prenom} ${player.nom}`}
                    buts={player.buts}
                    matchs={player.matches_joues}
                    maxButs={maxButs}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Moyennes par critère */}
          <div>
            <h2 className="font-data font-semibold text-lg mb-4 flex items-center gap-2" style={{ color: COLORS.textStrong }}>
              <TrendingUp size={16} style={{ color: COLORS.accent }} />
              Moyennes par critère
            </h2>
            <div className="card p-4" style={{ backgroundColor: COLORS.surface, borderColor: COLORS.border }}>
              <div className="space-y-5">
                {[
                  { label: "Physique", moyenne: 7.2, color: COLORS.destructive },
                  { label: "Technique", moyenne: 6.8, color: COLORS.technique },
                  { label: "Tactique", moyenne: 7.5, color: COLORS.accent },
                  { label: "Mental", moyenne: 6.9, color: COLORS.primary },
                ].map((crit) => (
                  <div key={crit.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span style={{ color: COLORS.textMuted }}>{crit.label}</span>
                      <span className="font-data font-bold tabular-nums" style={{ color: COLORS.textStrong }}>
                        {crit.moyenne.toFixed(1)}/10
                      </span>
                    </div>
                    <div className="w-full h-2 bg-surface2 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ backgroundColor: crit.color, width: `${crit.moyenne * 10}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
