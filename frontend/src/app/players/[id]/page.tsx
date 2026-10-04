"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/stores";
import { useApiData, useApiList } from "@/hooks/useApiData";
import { joueursApi, radarApi, evaluationsApi } from "@/lib/api";
import { RadarChart } from "@/components/radar/RadarChart";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SkeletonCard, SkeletonText } from "@/components/ui/Skeleton";
import Link from "next/link";
import {
  Users,
  Calendar,
  Target,
  Activity,
  TrendingUp,
  AlertTriangle,
  MapPin,
  Shield,
  Heart,
  BarChart3,
  ChevronRight,
  Clock,
  Zap,
} from "lucide-react";

// ── Types ───────────────────────────────────────────────────────────────────────
// Les types viennent de @/types, alignes sur les schemas backend
// (PlayerResponse, PhysicalProfileResponse, MedicalRecordResponse). Les
// redclarer ici avait produit des casts `as` et des champs qui n'existent
// pas dans la reponse de l'API.
import type {
  HistoryEntry,
  RadarJoueur,
  Joueur,
  MedicalRecord,
  PlayerPhysical,
  PillarNote as PillarNoteGlobal,
} from "@/types";


// Le backend n'expose pas les evaluations par joueur, seulement par match
// (app/evaluations/router.py : /matches/{match_id}/evaluations). Ce type
// decrit ce que rend /dashboard/players/{id}/history : une entree d'historique
// par match evalue. Les notes par pilier viennent du radar agrege.
type Evaluation = HistoryEntry;

type PillarNote = PillarNoteGlobal;

// ── Types locaux ────────────────────────────────────────────────────────────────
type TabKey = "apercu" | "sportif" | "physique" | "medical" | "historique";

const TAB_CONFIG: { key: TabKey; label: string; icon: typeof Users }[] = [
  { key: "apercu", label: "Aperçu", icon: Users },
  { key: "sportif", label: "Sportif", icon: Activity },
  { key: "physique", label: "Physique", icon: Zap },
  { key: "medical", label: "Médical", icon: Heart },
  { key: "historique", label: "Historique", icon: Clock },
];

const PILLAR_LABELS: Record<string, string> = {
  physique: "Physique",
  technique: "Technique",
  tactique: "Tactique",
  mental: "Mental",
};

const PILLAR_COLORS: Record<string, string> = {
  physique: "var(--pillar-physique)",
  technique: "var(--pillar-technique)",
  tactique: "var(--pillar-tactique)",
  mental: "var(--pillar-mental)",
};

// ── Données mockées ─────────────────────────────────────────────────────────────












const COLORS = {
  bg: "var(--bg)",
  surface: "var(--surface)",
  surface2: "var(--surface-2)",
  line: "var(--border)",
  textStrong: "var(--text-strong)",
  muted: "var(--text-muted)",
  faint: "var(--text-faint)",
  primary: "var(--primary)",
  primarySoft: "var(--primary-soft)",
  accent: "var(--accent)",
  destructive: "var(--destructive)",
  destructiveSoft: "var(--destructive-soft)",
  onPrimary: "var(--on-primary)",
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Non renseignée";
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

// ── Onglets ──────────────────────────────────────────────────────────────────────
function TabApercu({
  joueur,
  noteGlobale,
  pillars,
  chargeTravail,
}: {
  joueur: Joueur;
  noteGlobale: number | null;
  pillars: PillarNote[];
  chargeTravail: number | null;
}) {
  const initials = `${joueur.prenom?.[0] ?? ""}${joueur.nom?.[0] ?? ""}`.toUpperCase();
  const statusLabel =
    joueur.statut === "actif"
      ? "Actif"
      : joueur.statut === "blesse"
      ? "Blessé"
      : joueur.statut === "suspendu"
      ? "Reprise"
      : joueur.statut === "parti"
      ? "Suspendu"
      : joueur.statut === "archive"
      ? "Indisponible"
      : "Archivé";

  return (
    <div className="space-y-6">
      {/* Header joueur */}
      <div className="card p-6">
        <div className="flex flex-col md:flex-row gap-6 items-start">
          <div
            className="avatar-initials lg shrink-0"
            style={{ backgroundColor: COLORS.primary }}
          >
            <span className="text-on-primary text-lg font-data font-bold">
              {initials}
            </span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="font-data text-2xl text-text-strong font-bold" style={{ color: COLORS.textStrong }}>
                {joueur.prenom} {joueur.nom}
              </h1>
              <StatusBadge statut={joueur.statut} size="md" />
            </div>
            <p className="text-lg text-muted font-data font-medium">
              {joueur.poste ? POSTES_LABELS[joueur.poste] ?? joueur.poste : "Poste non renseigné"}
            </p>
            {joueur.numero && (
              <div
                className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-primary-soft text-primary font-data font-bold text-sm rounded-lg"
                style={{ backgroundColor: COLORS.primarySoft, color: COLORS.primary }}
              >
                Maillot N°{joueur.numero}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Note globale */}
        <div className="card card-sm flex items-center gap-3">
          <div className="kpi-icon bg-primary-soft text-primary">
            <Target size={18} />
          </div>
          <div>
            <p className="text-muted text-tiny font-medium uppercase tracking-wider">
              Note globale
            </p>
            <p className="font-data font-semibold text-text-strong text-lg tabular-nums" style={{ color: COLORS.textStrong }}>
              {noteGlobale != null ? noteGlobale.toFixed(1) : "—"}/10
            </p>
            <p className="text-xs" style={{ color: COLORS.muted }}>
              3 derniers matchs
            </p>
          </div>
        </div>

        {/* Date naissance */}
        <div className="card card-sm flex items-center gap-3">
          <div className="kpi-icon bg-primary-soft text-primary">
            <Calendar size={18} />
          </div>
          <div>
            <p className="text-muted text-tiny font-medium uppercase tracking-wider">
              Né le
            </p>
            <p className="font-data font-semibold text-text-strong text-sm" style={{ color: COLORS.textStrong }}>
              {formatDate(joueur.date_naissance)}
            </p>
          </div>
        </div>

        {/* Charge 7 jours */}
        <div className="card card-sm flex items-center gap-3">
          <div
            className="kpi-icon"
            style={{ backgroundColor: "var(--accent-soft)" }}
          >
            <Activity size={18} style={{ color: "var(--accent-strong)" }} />
          </div>
          <div>
            <p className="text-muted text-tiny font-medium uppercase tracking-wider">
              Charge de travail
            </p>
            <p className="font-data font-semibold text-text-strong text-sm tabular-nums" style={{ color: COLORS.textStrong }}>
              {chargeTravail != null ? `${chargeTravail} pts` : "Non renseignée"}
            </p>
          </div>
        </div>

        {/* Matchs */}
        <div className="card card-sm flex items-center gap-3">
          <div className="kpi-icon bg-primary-soft text-primary">
            <BarChart3 size={18} />
          </div>
          <div>
            <p className="text-muted text-tiny font-medium uppercase tracking-wider">
              Matchs joués
            </p>
            <p className="font-data font-semibold text-text-strong text-lg tabular-nums" style={{ color: COLORS.textStrong }}>
              12
            </p>
          </div>
        </div>
      </div>

      {/* Radar + Piliers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h2 className="font-data text-lg font-semibold text-text-strong mb-4 flex items-center gap-2" style={{ color: COLORS.textStrong }}>
            <Activity size={16} style={{ color: COLORS.primary }} />
            Profil 4 piliers
          </h2>
          <div className="radar-container">
            <RadarChart pillars={pillars} clubMoyenne={null} size={160} />
            <div className="radar-legend space-y-2">
              {pillars.map((p) => (
                <div key={p.pilier} className="radar-legend-item">
                  <span
                    className="radar-legend-dot"
                    style={{ backgroundColor: PILLAR_COLORS[p.pilier] }}
                  />
                  <span className="radar-legend-label text-sm text-text">
                    {PILLAR_LABELS[p.pilier]}
                  </span>
                  <span className="radar-legend-value text-text-strong font-data font-bold tabular-nums">
                    {p.note.toFixed(1)}
                  </span>
                </div>
              ))}
              <div className="mt-2 pt-2 border-t border-border">
                <p className="text-xs text-muted italic">Moyenne club en pointillés</p>
              </div>
            </div>
          </div>
        </div>

        {/* Commentaire terrain */}
        <div className="card p-6">
          <h2 className="font-data text-lg font-semibold text-text-strong mb-4 flex items-center gap-2" style={{ color: COLORS.textStrong }}>
            <TrendingUp size={16} style={{ color: COLORS.primary }} />
            Lecture des piliers
          </h2>
          {/* L'ecart a la moyenne de club n'est pas affiche : le backend
              n'expose aucune moyenne de club (aucune route pour). Comparer
              le joueur a son propre meilleur pilier reste exact. */}
          <div className="space-y-3">
            {pillars.map((p) => {
              const autres = pillars.filter((o) => o.pilier !== p.pilier);
              const diff = p.note - (autres.length ? autres.reduce((a, o) => a + o.note, 0) / autres.length : 0);
              const diffLabel = diff > 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1);
              const diffColor = diff > 0 ? COLORS.primary : diff < 0 ? COLORS.destructive : COLORS.muted;
              return (
                <div key={p.pilier} className="flex items-center justify-between p-3 bg-surface-2 rounded-md" style={{ backgroundColor: COLORS.surface2 }}>
                  <span className="text-sm font-medium" style={{ color: COLORS.textStrong }}>
                    {PILLAR_LABELS[p.pilier]}
                  </span>
                  <span className="font-data font-bold tabular-nums" style={{ color: diffColor }}>
                    {diffLabel} pts vs ses autres piliers
                  </span>
                </div>
              );
            })}
        </div>
        </div>
      </div>
    </div>
  );
}

function TabSportif({ evaluations }: { evaluations: Evaluation[] }) {
  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="font-data text-lg font-semibold text-text-strong mb-4 flex items-center gap-2" style={{ color: COLORS.textStrong }}>
          <Activity size={16} style={{ color: COLORS.primary }} />
          Historique des évaluations
        </h2>
        {evaluations.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-muted text-sm">Aucune évaluation enregistrée</p>
          </div>
        ) : (
          <div className="space-y-2">
            {evaluations.map((ev) => (
              <div
                key={ev.evaluation_id}
                className="flex items-center justify-between p-3 bg-surface-2 rounded-md"
                style={{ backgroundColor: COLORS.surface2 }}
              >
                <div>
                  <p className="font-data font-medium text-text-strong" style={{ color: COLORS.textStrong }}>
                    {formatDate(ev.date_match)}
                  </p>
                  <p className="text-tiny text-muted">{ev.adversaire}</p>
                </div>
                <div className="text-right">
                  <span
                    className={`font-data font-bold tabular-nums px-2 py-0.5 rounded-full text-xs ${
                      ev.note_globale != null && ev.note_globale >= 8
                        ? "bg-primary-soft text-primary font-bold"
                        : ev.note_globale != null && ev.note_globale >= 6
                        ? "bg-accent-soft text-accent-strong"
                        : "bg-destructive-soft text-destructive"
                    }`}
                  >
                    {ev.note_globale?.toFixed(1) ?? "—"}/10
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// La morphologie et la charge ne viennent PAS du joueur : elles vivent dans
// la ressource /players/{id}/physical. Les lire sur `joueur` affichait
// undefined en production (le champ n'existe pas dans PlayerResponse).
function TabPhysique({
  joueur,
  physical,
}: {
  joueur: Joueur;
  physical: PlayerPhysical | null;
}) {
  const taille = physical?.taille_cm ?? null;
  const poids = physical?.poids_kg ?? null;
  const charge = physical?.charge_travail ?? null;
  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="font-data text-lg font-semibold text-text-strong mb-4 flex items-center gap-2" style={{ color: COLORS.textStrong }}>
          <Zap size={16} style={{ color: COLORS.primary }} />
          Morphologie
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-surface-2 rounded-lg text-center" style={{ backgroundColor: COLORS.surface2 }}>
            <p className="text-muted text-tiny font-medium uppercase tracking-wider">Taille</p>
            <p className="font-data font-bold text-2xl tabular-nums mt-1" style={{ color: COLORS.textStrong }}>
              {taille ?? "—"} cm
            </p>
          </div>
          <div className="p-4 bg-surface-2 rounded-lg text-center" style={{ backgroundColor: COLORS.surface2 }}>
            <p className="text-muted text-tiny font-medium uppercase tracking-wider">Poids</p>
            <p className="font-data font-bold text-2xl tabular-nums mt-1" style={{ color: COLORS.textStrong }}>
              {poids ?? "—"} kg
            </p>
          </div>
          <div className="p-4 bg-surface-2 rounded-lg text-center" style={{ backgroundColor: COLORS.surface2 }}>
            <p className="text-muted text-tiny font-medium uppercase tracking-wider">IMC</p>
            <p className="font-data font-bold text-2xl tabular-nums mt-1" style={{ color: COLORS.textStrong }}>
              {taille && poids
                ? (poids / ((taille / 100) ** 2)).toFixed(1)
                : "—"}
            </p>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="font-data text-lg font-semibold text-text-strong mb-4 flex items-center gap-2" style={{ color: COLORS.textStrong }}>
          <Activity size={16} style={{ color: COLORS.primary }} />
          Charge de travail
        </h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm" style={{ color: COLORS.muted }}>Charge cumulée</span>
            <span className="font-data font-bold tabular-nums" style={{ color: COLORS.primary }}>
              {charge ?? "—"} pts
            </span>
          </div>
          <div className="w-full h-2 bg-surface-2 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${charge ? Math.min((charge / 1000) * 100, 100) : 0}%`,
                backgroundColor: COLORS.primary,
              }}
            />
          </div>
          <p className="text-xs" style={{ color: COLORS.muted }}>
            Alimentée automatiquement par les évaluations d'entraînement
          </p>
        </div>
      </div>
    </div>
  );
}

function TabMedical({ medical }: { medical: MedicalRecord[] }) {
  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="font-data text-lg font-semibold text-text-strong mb-4 flex items-center gap-2" style={{ color: COLORS.textStrong }}>
          <Heart size={16} style={{ color: COLORS.destructive }} />
          Dossier médical
        </h2>
        {medical.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-muted text-sm">Aucun antécédent médical enregistré</p>
          </div>
        ) : (
          <div className="space-y-2">
            {medical.map((rec) => (
              <div
                key={rec.id}
                className="flex items-center justify-between p-3 bg-surface-2 rounded-md"
                style={{ backgroundColor: COLORS.surface2 }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{
                      backgroundColor:
                        rec.type === "blessure"
                          ? COLORS.destructiveSoft
                          : rec.type === "suivi"
                          ? COLORS.primarySoft
                          : "var(--info-soft)",
                    }}
                  >
                    <AlertTriangle
                      size={14}
                      style={{
                        color:
                          rec.type === "blessure"
                            ? COLORS.destructive
                            : rec.type === "suivi"
                            ? COLORS.primary
                            : "var(--info)",
                      }}
                    />
                  </div>
                  <div>
                    <p className="font-data font-medium text-sm text-text-strong" style={{ color: COLORS.textStrong }}>
                      {rec.description}
                    </p>
                    <p className="text-tiny text-muted">
                      {formatDate(rec.date_debut)} — {rec.statut}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TabHistorique({ evaluations }: { evaluations: Evaluation[] }) {
  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="font-data text-lg font-semibold text-text-strong mb-4 flex items-center gap-2" style={{ color: COLORS.textStrong }}>
          <Clock size={16} style={{ color: COLORS.primary }} />
          Tous les matchs
        </h2>
        {evaluations.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-muted text-sm">Aucun match joué</p>
          </div>
        ) : (
          <div className="space-y-2">
            {evaluations.map((ev) => (
              <div
                key={ev.evaluation_id}
                className="flex items-center justify-between p-3 bg-surface-2 rounded-md"
                style={{ backgroundColor: COLORS.surface2 }}
              >
                <div>
                  <p className="font-data font-medium text-text-strong" style={{ color: COLORS.textStrong }}>
                    Match du {formatDate(ev.date_match)}
                  </p>
                  <p className="text-tiny text-muted">{ev.adversaire}</p>
                </div>
                <div className="text-right">
                  <span
                    className={`font-data font-bold tabular-nums px-2 py-0.5 rounded-full text-xs ${
                      ev.note_globale != null && ev.note_globale >= 8
                        ? "bg-primary-soft text-primary font-bold"
                        : ev.note_globale != null && ev.note_globale >= 6
                        ? "bg-accent-soft text-accent-strong"
                        : "bg-destructive-soft text-destructive"
                    }`}
                  >
                    {ev.note_globale?.toFixed(1) ?? "—"}/10
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────────
export default function PlayerDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const clubId = user?.club_id ?? null;
  const playerId = params.id;

  const [activeTab, setActiveTab] = useState<TabKey>("apercu");

  // Quatre ressources distinctes : le joueur, son profil physique, son radar
  // agrégé et son dossier médical. Le médical est une donnée sensible — la
  // permission ECRIRE/VOIR_DONNEES_MEDICALES est contrôlée côté serveur, on
  // ne fait que refléter ce qu'il renvoie.
  const chargerJoueur = useCallback(
    () => joueursApi.get(clubId as string, playerId),
    [clubId, playerId]
  );
  const chargerPhysical = useCallback(
    () => joueursApi.physical(clubId as string, playerId),
    [clubId, playerId]
  );
  const chargerRadar = useCallback(
    () => radarApi.get(clubId as string, playerId),
    [clubId, playerId]
  );
  const chargerHistorique = useCallback(
    () => radarApi.history(clubId as string, playerId),
    [clubId, playerId]
  );
  const chargerMedical = useCallback(
    () => evaluationsApi.getPlayerMedical(clubId as string, playerId),
    [clubId, playerId]
  );

  const actif = isAuthenticated && clubId !== null;

  const joueurRes = useApiData<Joueur>(chargerJoueur, { enabled: actif });
  const physicalRes = useApiData<PlayerPhysical>(chargerPhysical, { enabled: actif });
  const radarRes = useApiData<RadarJoueur>(chargerRadar, { enabled: actif });
  const historiqueRes = useApiList<HistoryEntry>(chargerHistorique, { enabled: actif });
  const medicalRes = useApiList<MedicalRecord>(chargerMedical, { enabled: actif });

  useEffect(() => {
    if (!isAuthenticated) router.push("/login");
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;

  if (joueurRes.isLoading) {
    return (
    <div className="page-main">
          <SkeletonText width="30%" height={24} mb={24} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SkeletonCard lines={4} />
            <SkeletonCard lines={4} />
          </div>
    </div>
    );
  }

  // Erreur sur le joueur : les autres appels ne servent à rien.
  if (joueurRes.error || !joueurRes.data) {
    return (
      <div className="page-main">
        <div className="card p-6" role="alert">
          <p className="font-data font-semibold mb-1" style={{ color: COLORS.textStrong }}>
            Joueur introuvable
          </p>
          <p className="text-sm mb-4" style={{ color: COLORS.muted }}>
            {joueurRes.error ?? "Ce joueur n'existe pas ou n'appartient pas à ce club."}
          </p>
          <Link href="/players" className="btn btn-secondary justify-center">
            Retour à l'effectif
          </Link>
        </div>
      </div>
    );
  }

  const joueur = joueurRes.data;
  const physical = physicalRes.data;
  const medical = medicalRes.items;
  const evaluations = historiqueRes.items;
  const radar = radarRes.data;

  // Le radar agrégé remplace le calcul des moyennes côté client :
  // /dashboard/players/{id}/radar fait déjà le travail sur toutes les
  // évaluations validées.
  const pillars: PillarNote[] = radar
    ? [
        { pilier: "physique" as const, note: radar.physique ?? 0 },
        { pilier: "technique" as const, note: radar.technique ?? 0 },
        { pilier: "tactique" as const, note: radar.tactique ?? 0 },
        { pilier: "mental" as const, note: radar.mental ?? 0 },
      ]
    : [];
  const noteGlobale = radar?.note_globale_moyenne ?? null;
  const matchesAnalyses = radar?.matches_analyzed ?? 0;

  const activeTabConfig = TAB_CONFIG.find((t) => t.key === activeTab);
  const ActiveIcon = activeTabConfig?.icon ?? Users;

  return (
    <div className="page-main">
{/* Breadcrumb */}
<div className="flex items-center gap-2 mb-4 text-sm">
          <Link href="/players" className="text-muted hover:text-primary transition-colors">
            Effectif
          </Link>
          <ChevronRight size={12} style={{ color: COLORS.faint }} />
          <span className="text-text-strong font-medium" style={{ color: COLORS.textStrong }}>
            {joueur.prenom} {joueur.nom}
          </span>
</div>

{/* Onglets */}
<div className="tabs mb-6">
          {TAB_CONFIG.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`tab ${active ? "active" : ""}`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
</div>

{/* Contenu onglet */}
{activeTab === "apercu" && (
          <TabApercu
            joueur={joueur}
            noteGlobale={noteGlobale}
            pillars={pillars}
            chargeTravail={physical?.charge_travail ?? null}
          />
)}
{activeTab === "sportif" && <TabSportif evaluations={evaluations} />}
{activeTab === "physique" && <TabPhysique joueur={joueur} physical={physical} />}
{activeTab === "medical" && <TabMedical medical={medical} />}
{activeTab === "historique" && <TabHistorique evaluations={evaluations} />}
    </div>
  );
}

const POSTES_LABELS: Record<string, string> = {
  GARDIEN: "Gardien",
  DEFENSEUR_CENTRAL: "Défenseur central",
  DEFENSEUR_LATERAL: "Défenseur latéral",
  MILIEU_CENTRAL: "Milieu central",
  MILIEU_OFFENSIF: "Milieu offensif",
  ATTAQUANT: "Attaquant",
  POLYVALENT: "Polyvalent",
  LATERAL_DROIT: "Latéral droit",
  LATERAL_GAUCHE: "Latéral gauche",
  MILIEU_DEFENSIF: "Milieu défensif",
  AILIER_DROIT: "Ailier droit",
  AILIER_GAUCHE: "Ailier gauche",
};
