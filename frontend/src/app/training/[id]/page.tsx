"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/stores";
import { SkeletonCard, SkeletonText } from "@/components/ui/Skeleton";
import Link from "next/link";
import {
  Activity,
  AlertCircle,
  Calendar,
  CheckCircle,
  ChevronRight,
  ClipboardList,
  Clock,
  Dumbbell,
  MapPin,
  MessageSquare,
  Plus,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useApiData, useApiList } from "@/hooks/useApiData";
import { trainingApi, joueursApi } from "@/lib/api";
import type {
  Joueur,
  PlayerMini,
  PillarNote,
  TrainingEvaluation,
  TrainingSession,
} from "@/types";

// ── Types ────────────────────────────────────────────────────────────────────────
type TabKey = "details" | "evaluations" | "synthese";

// Couleurs des piliers : tokens de la charte §2.2 (app/globals.css).
const PILLAR_COLORS: Record<string, string> = {
  physique: "var(--pillar-physique)",
  technique: "var(--pillar-technique)",
  tactique: "var(--pillar-tactique)",
  mental: "var(--pillar-mental)",
};

const STATUT_LABELS: Record<string, string> = {
  planifiee: "Planifiée",
  realisee: "Réalisée",
  annulee: "Annulée",
};

const STATUT_COLORS: Record<string, { bg: string; color: string }> = {
  planifiee: { bg: "var(--info-soft)", color: "var(--info)" },
  realisee: { bg: "var(--primary-soft)", color: "var(--primary-hover)" },
  annulee: { bg: "var(--surface-2)", color: "var(--text-muted)" },
};

const ASSIDUITE_LABELS: Record<string, string> = {
  present: "Présent",
  absent: "Absent",
  retard: "En retard",
};

const COLORS = {
  surface: "var(--surface)",
  surface2: "var(--surface-2)",
  border: "var(--border)",
  textStrong: "var(--text-strong)",
  textMuted: "var(--text-muted)",
  textFaint: "var(--text-faint)",
  faint: "var(--text-faint)",
  primary: "var(--primary)",
  primarySoft: "var(--primary-soft)",
  accent: "var(--accent)",
  accentSoft: "var(--accent-soft)",
  destructive: "var(--destructive)",
  // Alias historiques dans cette page
  muted: "var(--text-muted)",
  line: "var(--border)",
  text: "var(--text)",
  onPrimary: "var(--on-primary)",
};

/** Note d'un pilier : le backend range les notes dans `pillars`. */
function noteDe(evaluation: TrainingEvaluation, pilier: string): number | null {
  return evaluation.pillars?.find((p) => p.pilier === pilier)?.note ?? null;
}

/** `objectifs` est un texte libre : on découpe sur les lignes. */
function ObjectifsEnListe(objectifs: string | null): string[] {
  if (!objectifs) return [];
  return objectifs
    .split("\n")
    .map((l) => l.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean);
}


// ── Onglets ──────────────────────────────────────────────────────────────────────
function TabDetails({ session }: { session: TrainingSession }) {
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
                  {session.lieu ?? "Non renseigné"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Activity size={14} style={{ color: COLORS.muted }} />
              <div>
                <p className="text-xs uppercase tracking-wider" style={{ color: COLORS.muted }}>Charge prévue</p>
                <p className="font-data font-medium text-sm" style={{ color: COLORS.primary }}>
                  {session.charge_prevue != null ? `${session.charge_prevue} AU` : "—"}
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
            {ObjectifsEnListe(session.objectifs).map((obj, i) => (
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

function TabEvaluations({
  evaluations,
  parId,
}: {
  evaluations: TrainingEvaluation[];
  parId: Record<number, PlayerMini>;
}) {
  const presents = evaluations.filter((e) => e.assiduite === "present").length;
  const absents = evaluations.filter((e) => e.assiduite === "absent").length;
  const retards = evaluations.filter((e) => e.assiduite === "retard").length;
  // Les notes par pilier vivent dans `pillars`, pas en champs plats
  // (TrainingEvaluationResponse).
  const moyenne = (pilier: string): number | null => {
    const notes = evaluations
      .map((e) => noteDe(e, pilier))
      .filter((n): n is number => n != null);
    return notes.length > 0 ? notes.reduce((a, b) => a + b, 0) / notes.length : null;
  };
  const phyM = moyenne("physique");
  const techM = moyenne("technique");
  const tacM = moyenne("tactique");
  const mentM = moyenne("mental");

  const rpes = evaluations
    .map((e) => e.charge_percue_rpe)
    .filter((n): n is number => n != null);
  const rpeMoyen = rpes.length > 0 ? rpes.reduce((a, b) => a + b, 0) / rpes.length : null;

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
                        {parId[ev.player_id]?.numero ?? "?"}
                      </div>
                      <span className="font-data font-medium text-sm" style={{ color: COLORS.textStrong }}>
                        {parId[ev.player_id]?.prenom?.[0]}. {parId[ev.player_id]?.nom}
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
                    {ev.charge_percue_rpe != null ? ev.charge_percue_rpe.toFixed(0) : "—"}
                  </td>
                  <td className="font-data font-bold tabular-nums" style={{ color: PILLAR_COLORS.physique }}>
                    {(noteDe(ev, "physique") ?? NaN).toFixed(1)}
                  </td>
                  <td className="font-data font-bold tabular-nums" style={{ color: PILLAR_COLORS.technique }}>
                    {(noteDe(ev, "technique") ?? NaN).toFixed(1)}
                  </td>
                  <td className="font-data font-bold tabular-nums" style={{ color: PILLAR_COLORS.tactique }}>
                    {(noteDe(ev, "tactique") ?? NaN).toFixed(1)}
                  </td>
                  <td className="font-data font-bold tabular-nums" style={{ color: PILLAR_COLORS.mental }}>
                    {(noteDe(ev, "mental") ?? NaN).toFixed(1)}
                  </td>
                  <td className="text-sm max-w-[200px] truncate" style={{ color: COLORS.muted }}>
                    {ev.contexte_saisie.replace(/_/g, " ")}
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

function TabSynthèse({ evaluations }: { evaluations: TrainingEvaluation[] }) {
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
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const clubId = user?.club_id ?? null;
  const sessionId = params.id;

  const [activeTab, setActiveTab] = useState<TabKey>("details");

  const chargerSession = useCallback(
    () => trainingApi.get(clubId as string, sessionId),
    [clubId, sessionId]
  );
  const chargerEvaluations = useCallback(
    () => trainingApi.listEvaluations(clubId as string, sessionId),
    [clubId, sessionId]
  );
  const chargerEffectif = useCallback(
    () => joueursApi.list(clubId as string),
    [clubId]
  );

  const actif = isAuthenticated && clubId !== null;

  const sessionRes = useApiData<TrainingSession>(chargerSession, { enabled: actif });
  const evalRes = useApiList<TrainingEvaluation>(chargerEvaluations, { enabled: actif });
  const effectifRes = useApiList<Joueur>(chargerEffectif, { enabled: actif });

  useEffect(() => {
    if (!isAuthenticated) router.push("/login");
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;

  if (sessionRes.isLoading) {
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

  if (sessionRes.error || !sessionRes.data) {
    return (
      <div className="page-main">
        <div className="card p-6" role="alert">
          <p
            className="font-data font-semibold mb-1"
            style={{ color: COLORS.textStrong }}
          >
            Séance introuvable
          </p>
          <p className="text-sm mb-4" style={{ color: COLORS.textMuted }}>
            {sessionRes.error ?? "Cette séance n'existe pas ou n'appartient pas à ce club."}
          </p>
          <Link href="/training" className="btn btn-secondary justify-center">
            Retour aux entraînements
          </Link>
        </div>
      </div>
    );
  }

  const session = sessionRes.data;
  const evaluations = evalRes.items;

  // Le backend ne renvoie que des player_id dans les evaluations : la page
  // construit la table id -> joueur depuis GET /players.
  const parId: Record<number, PlayerMini> = Object.fromEntries(
    effectifRes.items.map((j) => [
      j.id,
      { id: j.id, nom: j.nom, prenom: j.prenom, numero: j.numero },
    ])
  );

  return (
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
                <span
                  className="badge"
                  style={{
                    backgroundColor: STATUT_COLORS[session.statut]?.bg,
                    color: STATUT_COLORS[session.statut]?.color,
                  }}
                >
                  {STATUT_LABELS[session.statut]}
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm" style={{ color: COLORS.muted }}>
                <span className="flex items-center gap-1">
                  <Clock size={12} />
                  {new Date(session.date_seance).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                </span>
                {session.lieu && (
                  <span className="flex items-center gap-1">
                    <MapPin size={12} />
                    {session.lieu}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-center px-4 py-2 rounded-lg" style={{ backgroundColor: COLORS.primarySoft }}>
                <p className="text-xs uppercase tracking-wider" style={{ color: COLORS.muted }}>
                  Charge prévue
                </p>
                <p className="font-data font-bold text-lg" style={{ color: COLORS.primary }}>
                  {session.charge_prevue != null ? `${session.charge_prevue} AU` : "—"}
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
{activeTab === "evaluations" && <TabEvaluations evaluations={evaluations} parId={parId} />}
{activeTab === "synthese" && <TabSynthèse evaluations={evaluations} />}
      </div>
  );
}
