"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/stores";
import { TrainingStatusBadge } from "@/components/ui/TrainingStatusBadge";
import { SkeletonCard, SkeletonText } from "@/components/ui/Skeleton";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import Link from "next/link";
import {ChevronRight, Calendar, MapPin, Target, Users, Activity, Clock, CheckCircle, AlertCircle, TrendingUp, Dumbbell, Plus, MessageSquare, ClipboardList, Save, Edit2, Zap, } from "lucide-react";

// ── Types locaux ────────────────────────────────────────────────────────────────
type TabKey = "details" | "evaluations" | "synthese";

interface PlayerMini {
  id: string;
  nom: string;
  prenom: string | null;
  numero: number | null;
}

interface EvaluationData {
  id: string;
  joueur_id: string;
  assiduite: "present" | "absent" | "retard";
  rpe: number | null;
  note_physique: number | null;
  note_technique: number | null;
  note_tactique: number | null;
  note_mental: number | null;
  remarques: string | null;
  player?: PlayerMini;
}

// ── Données ──────────────────────────────────────────────────────────────────────
const PILLAR_COLORS: Record<string, string> = {
  physique: "oklch(0.55 0.22 25)",
  technique: "oklch(0.45 0.18 255)",
  tactique: "oklch(0.45 0.19 310)",
  mental: "oklch(0.65 0.16 65)",
};

const MOCK_SESSION = {
  id: "s1",
  date_seance: "2026-09-14T17:00:00Z",
  lieu: "Stade Lat-Dior",
  objectifs: ["Travail de finition", "Transitions offensives", "Jeu aérien"],
  exercices:
    "Échauffement 15 min, atelier finition 20 min, jeu en espace réduit 25 min, match à thème 30 min, retour au calme 10 min.",
  charge_prevue: 72,
  statut: "realisee",
  equipe: "Senior A",
};

const MOCK_PLAYERS: PlayerMini[] = [
  { id: "j1", nom: "Mané", prenom: "Sadio", numero: 10 },
  { id: "j2", nom: "Koulibaly", prenom: "Kalidou", numero: 6 },
  { id: "j3", nom: "Gueye", prenom: "Idrissa", numero: 8 },
  { id: "j4", nom: "Mendy", prenom: "Édouard", numero: 1 },
  { id: "j5", nom: "Sarr", prenom: "Ismaïla", numero: 12 },
  { id: "j6", nom: "Diédhiou", prenom: "Famara", numero: 17 },
  { id: "j7", nom: "Alberto", prenom: "Pape", numero: 2 },
  { id: "j8", nom: "Garde", prenom: "Lamine", numero: 19 },
  { id: "j9", nom: "Diallo", prenom: "Abdou", numero: 16 },
  { id: "j10", nom: "Jallow", prenom: "Nicolas", numero: 11 },
  { id: "j11", nom: "Barry", prenom: "Boubacar", numero: 4 },
  { id: "j12", nom: "Toure", prenom: "Khady", numero: 15 },
];

const MOCK_EVALUATIONS: EvaluationData[] = [
  { id: "te1", joueur_id: "j1", assiduite: "present", rpe: 8, note_physique: 8, note_technique: 9, note_tactique: 8, note_mental: 8, remarques: "Excellente finition", player: MOCK_PLAYERS[0] },
  { id: "te2", joueur_id: "j2", assiduite: "present", rpe: 7, note_physique: 8, note_technique: 7, note_tactique: 8, note_mental: 8, remarques: "Solide défensivement", player: MOCK_PLAYERS[1] },
  { id: "te3", joueur_id: "j3", assiduite: "present", rpe: 7, note_physique: 7, note_technique: 8, note_tactique: 8, note_mental: 7, remarques: "Bonne vision", player: MOCK_PLAYERS[2] },
  { id: "te4", joueur_id: "j4", assiduite: "present", rpe: 6, note_physique: 7, note_technique: 6, note_tactique: 7, note_mental: 8, remarques: "Peu sollicité", player: MOCK_PLAYERS[3] },
  { id: "te5", joueur_id: "j5", assiduite: "absent", rpe: null, note_physique: null, note_technique: null, note_tactique: null, note_mental: null, remarques: "Blessé", player: MOCK_PLAYERS[4] },
  { id: "te6", joueur_id: "j6", assiduite: "present", rpe: 8, note_physique: 8, note_technique: 7, note_tactique: 7, note_mental: 7, remarques: "Bon volume", player: MOCK_PLAYERS[5] },
  { id: "te7", joueur_id: "j7", assiduite: "retard", rpe: 7, note_physique: 7, note_technique: 7, note_tactique: 7, note_mental: 7, remarques: "Retard bus", player: MOCK_PLAYERS[6] },
  { id: "te8", joueur_id: "j8", assiduite: "present", rpe: 6, note_physique: 7, note_technique: 6, note_tactique: 7, note_mental: 7, remarques: "Correct", player: MOCK_PLAYERS[7] },
  { id: "te9", joueur_id: "j9", assiduite: "present", rpe: 5, note_physique: 6, note_technique: 6, note_tactique: 6, note_mental: 7, remarques: "Peu de temps", player: MOCK_PLAYERS[8] },
  { id: "te10", joueur_id: "j10", assiduite: "present", rpe: 7, note_physique: 7, note_technique: 7, note_tactique: 6, note_mental: 7, remarques: "Bonne implication", player: MOCK_PLAYERS[9] },
  { id: "te11", joueur_id: "j11", assiduite: "present", rpe: 8, note_physique: 8, note_technique: 7, note_tactique: 7, note_mental: 8, remarques: "Match complet", player: MOCK_PLAYERS[10] },
  { id: "te12", joueur_id: "j12", assiduite: "present", rpe: 6, note_physique: 7, note_technique: 7, note_tactique: 7, note_mental: 6, remarques: "Peut mieux faire", player: MOCK_PLAYERS[11] },
];

const COLORS = {
  bg: "var(--bg)",
  surface: "var(--surface)",
  surface2: "var(--surface-2)",
  line: "var(--border)",
  textStrong: "var(--text-strong)",
  text: "var(--text)",
  muted: "var(--text-muted)",
  faint: "var(--text-faint)",
  primary: "var(--primary)",
  primarySoft: "var(--primary-soft)",
  accent: "var(--accent)",
  destructive: "var(--destructive)",
  destructiveSoft: "var(--destructive-soft)",
  onPrimary: "var(--on-primary)",
};

// ── Onglets ──────────────────────────────────────────────────────────────────────
function TabDetails({ session }: { session: typeof MOCK_SESSION }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Infos générales */}
        <div className="card p-6">
          <h2 className="font-data text-lg font-semibold text-text-strong mb-4 flex items-center gap-2" style={{ color: COLORS.textStrong }}>
            <Dumbbell size={16} style={{ color: COLORS.primary }} />
            Informations
          </h2>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Calendar size={14} style={{ color: COLORS.muted }} />
              <div>
                <p className="text-xs uppercase tracking-wider" style={{ color: COLORS.muted }}>Date</p>
                <p className="font-data font-medium text-sm" style={{ color: COLORS.textStrong }}>
                  {new Date(session.date_seance).toLocaleDateString("fr-FR", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <MapPin size={14} style={{ color: COLORS.muted }} />
              <div>
                <p className="text-xs uppercase tracking-wider" style={{ color: COLORS.muted }}>Lieu</p>
                <p className="font-data font-medium text-sm" style={{ color: COLORS.textStrong }}>
                  {session.lieu}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Users size={14} style={{ color: COLORS.muted }} />
              <div>
                <p className="text-xs uppercase tracking-wider" style={{ color: COLORS.muted }}>Équipe</p>
                <p className="font-data font-medium text-sm" style={{ color: COLORS.textStrong }}>
                  {session.equipe}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Activity size={14} style={{ color: COLORS.muted }} />
              <div>
                <p className="text-xs uppercase tracking-wider" style={{ color: COLORS.muted }}>Charge prévue</p>
                <p className="font-data font-medium text-sm" style={{ color: COLORS.primary }}>
                  {session.charge_prevue}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Objectifs */}
        <div className="card p-6">
          <h2 className="font-data text-lg font-semibold text-text-strong mb-4 flex items-center gap-2" style={{ color: COLORS.textStrong }}>
            <Target size={16} style={{ color: COLORS.primary }} />
            Objectifs
          </h2>
          <ul className="space-y-2">
            {session.objectifs.map((obj, i) => (
              <li key={i} className="flex items-center gap-2 text-sm" style={{ color: COLORS.text }}>
                <CheckCircle size={14} style={{ color: COLORS.primary }} />
                {obj}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Exercices */}
      <div className="card p-6">
        <h2 className="font-data text-lg font-semibold text-text-strong mb-4 flex items-center gap-2" style={{ color: COLORS.textStrong }}>
          <ClipboardList size={16} style={{ color: COLORS.primary }} />
          Contenu de la séance
        </h2>
        <p className="text-sm leading-relaxed" style={{ color: COLORS.text }}>
          {session.exercices}
        </p>
      </div>
    </div>
  );
}

function TabEvaluations({ evaluations }: { evaluations: EvaluationData[] }) {
  const presents = evaluations.filter((e) => e.assiduite === "present").length;
  const absents = evaluations.filter((e) => e.assiduite === "absent").length;
  const retards = evaluations.filter((e) => e.assiduite === "retard").length;
  const rpeMoyen =
    evaluations.filter((e) => e.rpe != null).length > 0
      ? evaluations.filter((e) => e.rpe != null).reduce((s, e) => s + e.rpe!, 0) /
        evaluations.filter((e) => e.rpe != null).length
      : null;

  const phyM =
    evaluations.filter((e) => e.note_physique != null).length > 0
      ? evaluations.filter((e) => e.note_physique != null).reduce((s, e) => s + e.note_physique!, 0) /
        evaluations.filter((e) => e.note_physique != null).length
      : null;
  const techM =
    evaluations.filter((e) => e.note_technique != null).length > 0
      ? evaluations.filter((e) => e.note_technique != null).reduce((s, e) => s + e.note_technique!, 0) /
        evaluations.filter((e) => e.note_technique != null).length
      : null;
  const tacM =
    evaluations.filter((e) => e.note_tactique != null).length > 0
      ? evaluations.filter((e) => e.note_tactique != null).reduce((s, e) => s + e.note_tactique!, 0) /
        evaluations.filter((e) => e.note_tactique != null).length
      : null;
  const mentM =
    evaluations.filter((e) => e.note_mental != null).length > 0
      ? evaluations.filter((e) => e.note_mental != null).reduce((s, e) => s + e.note_mental!, 0) /
        evaluations.filter((e) => e.note_mental != null).length
      : null;

  return (
    <div className="space-y-6">
      {/* Stats assiduité + RPE */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card card-sm flex items-center gap-3">
          <div className="kpi-icon bg-primary-soft text-primary">
            <CheckCircle size={18} />
          </div>
          <div>
            <p className="text-muted text-tiny font-medium uppercase tracking-wider">Présents</p>
            <p className="font-data font-semibold text-lg tabular-nums" style={{ color: COLORS.textStrong }}>
              {presents}/{evaluations.length}
            </p>
          </div>
        </div>
        <div className="card card-sm flex items-center gap-3">
          <div className="kpi-icon bg-destructive-soft text-destructive">
            <AlertCircle size={18} />
          </div>
          <div>
            <p className="text-muted text-tiny font-medium uppercase tracking-wider">Absents</p>
            <p className="font-data font-semibold text-lg tabular-nums" style={{ color: COLORS.textStrong }}>
              {absents}
            </p>
          </div>
        </div>
        <div className="card card-sm flex items-center gap-3">
          <div className="kpi-icon bg-accent-soft text-accent-strong">
            <Clock size={18} />
          </div>
          <div>
            <p className="text-muted text-tiny font-medium uppercase tracking-wider">Retards</p>
            <p className="font-data font-semibold text-lg tabular-nums" style={{ color: COLORS.textStrong }}>
              {retards}
            </p>
          </div>
        </div>
        <div className="card card-sm flex items-center gap-3">
          <div
            className="kpi-icon"
            style={{ backgroundColor: "oklch(0.78 0.15 75 / 0.1)" }}
          >
            <Zap size={18} style={{ color: "var(--accent-strong)" }} />
          </div>
          <div>
            <p className="text-muted text-tiny font-medium uppercase tracking-wider">RPE moyen</p>
            <p className="font-data font-semibold text-lg tabular-nums" style={{ color: COLORS.textStrong }}>
              {rpeMoyen != null ? rpeMoyen.toFixed(1) : "—"}/10
            </p>
          </div>
        </div>
      </div>

      {/* Piliers moyens */}
      <div className="card p-6">
        <h2 className="font-data text-lg font-semibold text-text-strong mb-4 flex items-center gap-2" style={{ color: COLORS.textStrong }}>
          <TrendingUp size={16} style={{ color: COLORS.primary }} />
          Notes moyennes par pilier
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Physique", value: phyM, color: PILLAR_COLORS.physique },
            { label: "Technique", value: techM, color: PILLAR_COLORS.technique },
            { label: "Tactique", value: tacM, color: PILLAR_COLORS.tactique },
            { label: "Mental", value: mentM, color: PILLAR_COLORS.mental },
          ].map((p) => (
            <div key={p.label} className="text-center">
              <div
                className="w-full h-2 rounded-full overflow-hidden"
                style={{ backgroundColor: COLORS.surface2 }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${((p.value ?? 0) / 10) * 100}%`,
                    backgroundColor: p.color,
                  }}
                />
              </div>
              <p className="font-data font-bold text-xl tabular-nums mt-2" style={{ color: p.color }}>
                {p.value != null ? p.value.toFixed(1) : "—"}
              </p>
              <p className="text-xs uppercase tracking-wider" style={{ color: COLORS.muted }}>
                {p.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Tableau évaluations */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-data text-lg font-semibold text-text-strong flex items-center gap-2" style={{ color: COLORS.textStrong }}>
            <Activity size={16} style={{ color: COLORS.primary }} />
            Évaluations individuelles
          </h2>
          <button className="btn btn-primary btn-sm gap-1" style={{ backgroundColor: COLORS.primary, color: COLORS.onPrimary, borderColor: COLORS.primary }}>
            <Plus size={14} />
            Ajouter évaluation
          </button>
        </div>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Joueur</th>
                <th>Assiduité</th>
                <th>RPE</th>
                <th>Physique</th>
                <th>Technique</th>
                <th>Tactique</th>
                <th>Mental</th>
                <th>Remarques</th>
              </tr>
            </thead>
            <tbody>
              {evaluations.map((ev) => (
                <tr key={ev.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-white font-data font-bold text-xs shrink-0"
                        style={{ backgroundColor: COLORS.primary }}
                      >
                        {ev.player?.numero ?? "?"}
                      </div>
                      <span className="font-data font-medium text-sm" style={{ color: COLORS.textStrong }}>
                        {ev.player?.prenom?.[0]}. {ev.player?.nom}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium uppercase tracking-wider ${
                        ev.assiduite === "present"
                          ? "badge-fit"
                          : ev.assiduite === "absent"
                          ? "bg-destructive-soft text-destructive"
                          : "bg-accent-soft text-accent-strong"
                      }`}
                    >
                      {ev.assiduite === "present" ? "Présent" : ev.assiduite === "absent" ? "Absent" : "Retard"}
                    </span>
                  </td>
                  <td className="font-data font-bold tabular-nums" style={{ color: COLORS.textStrong }}>
                    {ev.rpe != null ? ev.rpe.toFixed(0) : "—"}
                  </td>
                  <td className="font-data font-bold tabular-nums" style={{ color: PILLAR_COLORS.physique }}>
                    {ev.note_physique != null ? ev.note_physique.toFixed(1) : "—"}
                  </td>
                  <td className="font-data font-bold tabular-nums" style={{ color: PILLAR_COLORS.technique }}>
                    {ev.note_technique != null ? ev.note_technique.toFixed(1) : "—"}
                  </td>
                  <td className="font-data font-bold tabular-nums" style={{ color: PILLAR_COLORS.tactique }}>
                    {ev.note_tactique != null ? ev.note_tactique.toFixed(1) : "—"}
                  </td>
                  <td className="font-data font-bold tabular-nums" style={{ color: PILLAR_COLORS.mental }}>
                    {ev.note_mental != null ? ev.note_mental.toFixed(1) : "—"}
                  </td>
                  <td className="text-sm max-w-[200px] truncate" style={{ color: COLORS.muted }}>
                    {ev.remarques ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function TabSynthèse({ evaluations }: { evaluations: EvaluationData[] }) {
  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="font-data text-lg font-semibold text-text-strong mb-4 flex items-center gap-2" style={{ color: COLORS.textStrong }}>
          <MessageSquare size={16} style={{ color: COLORS.primary }} />
          Commentaire terrain
        </h2>
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 rounded-lg" style={{ backgroundColor: COLORS.surface2 }}>
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-white font-data font-bold text-xs shrink-0"
              style={{ backgroundColor: COLORS.primary }}
            >
              AC
            </div>
            <div>
              <p className="text-xs font-medium" style={{ color: COLORS.textStrong }}>
                Aliou Cissé · Entraîneur principal
              </p>
              <p className="text-xs" style={{ color: COLORS.faint }}>Aujourd'hui 18:42</p>
              <p className="text-sm mt-1" style={{ color: COLORS.text }}>
                Bonne intensité collective. La finition s'améliore — à maintenir dans la durée. Sarr absent, vérifier avec le kiné demain matin.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-lg" style={{ backgroundColor: COLORS.surface2 }}>
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-white font-data font-bold text-xs shrink-0"
              style={{ backgroundColor: COLORS.accent }}
            >
              DF
            </div>
            <div>
              <p className="text-xs font-medium" style={{ color: COLORS.textStrong }}>
                Dr. Faye · Staff médical
              </p>
              <p className="text-xs" style={{ color: COLORS.faint }}>Aujourd'hui 19:15</p>
              <p className="text-sm mt-1" style={{ color: COLORS.text }}>
                Sarr : cheville droite à surveiller. Pas de reprise avant jeudi. Charge de travail réduite pour Koulibaly la semaine prochaine.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────────
export default function TrainingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  const [activeTab, setActiveTab] = useState<TabKey>("details");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    const t = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(t);
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;

  if (loading) {
    return (
      <div className="page-wrapper">
        <Sidebar />
        <main className="page-content ml-56" style={{ backgroundColor: COLORS.bg }}>
          <Header />
          <div className="page-main">
            <SkeletonText width="30%" height={24} mb={24} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SkeletonCard lines={4} />
              <SkeletonCard lines={4} />
            </div>
          </div>
        </main>
      </div>
    );
  }

  const session = MOCK_SESSION;
  const evaluations = MOCK_EVALUATIONS;

  return (
    <div className="page-wrapper">
      <Sidebar />
      <main className="page-content ml-56" style={{ backgroundColor: COLORS.bg }}>
        <Header />
        <div className="page-main">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-4 text-sm">
            <Link href="/training" className="text-muted hover:text-primary transition-colors">
              Entraînements
            </Link>
            <ChevronRight size={12} style={{ color: COLORS.faint }} />
            <span className="text-text-strong font-medium" style={{ color: COLORS.textStrong }}>
              Séance du{" "}
              {new Date(session.date_seance).toLocaleDateString("fr-FR", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </span>
          </div>

          {/* Header séance */}
          <div className="card p-6 mb-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="font-data text-xl font-bold" style={{ color: COLORS.textStrong }}>
                    Séance du{" "}
                    {new Date(session.date_seance).toLocaleDateString("fr-FR", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })}
                  </h1>
                  <TrainingStatusBadge statut={session.statut === "realisee" ? "TERMINE" : session.statut === "planifiee" ? "PLANIFIEE" : "EN_COURS"} size="md" />
                </div>
                <div className="flex items-center gap-4 text-sm" style={{ color: COLORS.muted }}>
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {new Date(session.date_seance).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin size={12} />
                    {session.lieu}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users size={12} />
                    {session.equipe}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-center px-4 py-2 rounded-lg" style={{ backgroundColor: COLORS.primarySoft }}>
                  <p className="text-xs uppercase tracking-wider" style={{ color: COLORS.muted }}>
                    Charge prévue
                  </p>
                  <p className="font-data font-bold text-lg" style={{ color: COLORS.primary }}>
                    {session.charge_prevue}%
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Onglets */}
          <div className="tabs mb-6">
            <button
              onClick={() => setActiveTab("details")}
              className={`tab ${activeTab === "details" ? "active" : ""}`}
            >
              <Dumbbell size={16} />
              Détails
            </button>
            <button
              onClick={() => setActiveTab("evaluations")}
              className={`tab ${activeTab === "evaluations" ? "active" : ""}`}
            >
              <Activity size={16} />
              Évaluations
            </button>
            <button
              onClick={() => setActiveTab("synthese")}
              className={`tab ${activeTab === "synthese" ? "active" : ""}`}
            >
              <MessageSquare size={16} />
              Synthèse
            </button>
          </div>

          {/* Contenu */}
          {activeTab === "details" && <TabDetails session={session} />}
          {activeTab === "evaluations" && <TabEvaluations evaluations={evaluations} />}
          {activeTab === "synthese" && <TabSynthèse evaluations={evaluations} />}
        </div>
      </main>
    </div>
  );
}
