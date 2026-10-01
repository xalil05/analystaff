"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores";
import { aiApi } from "@/lib/api";
import {AlertCircle, Brain, Check, Clock, FileText, Goal, Loader2, RefreshCw, User, Users, X} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────────

type IaActionStatus = "idle" | "loading" | "done" | "error";
type SuggestionStatus = "pending" | "accepted" | "modified" | "rejected";

interface Suggestion {
  id: string;
  action_key: string;
  statut: SuggestionStatus;
  contenu: string;
  date: string;
  charge: string;
}

// ── Actions IA disponibles ──────────────────────────────────────────────────────

const IA_ACTIONS = [
  {
    key: "SUGGEST_TRAINING_SESSION",
    label: "Suggérer une séance d'entraînement",
    description: "Propose une séance adaptée au contexte de la semaine et aux joueurs disponibles.",
    icon: Brain,
    example: "Séance technique : finition (45 min)\n- Travail d'équipe en jeu réduit (15 min)\n- Finition en situation réelle (20 min)\n- Retour au calme (10 min)",
    permission: "IA",
  },
  {
    key: "SUGGEST_LINEUP",
    label: "Suggérer une composition",
    description: "Prend en compte la forme du moment, les blessures, et le match à venir.",
    icon: Users,
    example: "Titulaire :\n- GK : Mendy\n- DF : Koulibaly, Gueye, Sarr, Mané\n- MF : ...",
    permission: "COACH",
  },
  {
    key: "ANALYZE_FATIGUE",
    label: "Analyser la fatigue du groupe",
    description: "Détecte les signaux de surendetraînement à partir des charges de travail et des évaluations récentes.",
    icon: AlertCircle,
    example: "Joueurs à surveiller :\n- Mendy : charge 7j = 85 pts (seuil critique)\n- Gueye : RPE moyen = 8.2 (hausse)",
    permission: "COACH",
  },
  {
    key: "SUMMARIZE_WEEK",
    label: "Résumer la semaine",
    description: "Synthèse complète des évaluations, charges, et signaux importants de la semaine.",
    icon: FileText,
    example: "Semaine récapitulatif :\n- 4 évaluations réalisées\n- Moyenne équipe : 7.2/10\n- 2 signaux de fatigue détectés",
    permission: "COACH",
  },
  {
    key: "PREPARE_PRE_MATCH",
    label: "Préparer l'avant-match",
    description: "Synthèse avant match : forme des joueurs, composition suggérée, points tactiques.",
    icon: Goal,
    example: "Avant-match vs Génération Foot :\n- 3 joueurs en forme\n- 1 blessure récente (à surveiller)\n- Composition suggérée disponible",
    permission: "COACH",
  },
];

// ── Données mockées ──────────────────────────────────────────────────────────────

const MOCK_SUGGESTIONS: Suggestion[] = [
  {
    id: "s1",
    action_key: "ANALYZE_FATIGUE",
    statut: "accepted",
    contenu: "3 joueurs présentent des signaux de surendetraînement. Mendy (charge 7j = 85 pts), Gueye (RPE élevé), et Sarr (charge cumulée élevée). Recommandation : réduire la charge de 20% pour Mendy cette semaine.",
    date: "2026-08-14",
    charge: "Il y a 1 jour",
  },
  {
    id: "s2",
    action_key: "SUGGEST_LINEUP",
    statut: "pending",
    contenu: "Composition suggérée pour Génération Foot (Samedi 17/08) :\nTitulaire : ... (4-3-3)\nRemplaçants : ...",
    date: "2026-08-14",
    charge: "Suggestion en attente",
  },
];

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
  primaryDark: "var(--primary-hover)",
  accent: "var(--accent)",
  accentSoft: "var(--accent-soft)",
  accentDark: "var(--accent-strong)",
  destructive: "var(--destructive)",
  destructiveSoft: "var(--destructive-soft)",
  onPrimary: "var(--on-primary)",
  secondary: "var(--secondary)",
  onSecondary: "var(--on-secondary)",
};

function ActionButton({
  action,
  onAction,
  status,
}: {
  action: typeof IA_ACTIONS[0];
  onAction: (key: string) => void;
  status: IaActionStatus;
}) {
  const Icon = action.icon;
  const isDisabled = status === "loading";

  return (
    <button
      onClick={() => onAction(action.key)}
      disabled={isDisabled}
      className="flex items-start gap-4 p-5 rounded-xl border text-left transition-all w-full group"
      style={{
        backgroundColor: COLORS.surface,
        borderColor: COLORS.surface2,
        cursor: isDisabled ? "wait" : "pointer",
        opacity: isDisabled ? 0.7 : 1,
      }}
    >
      <div
        className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform"
        style={{ backgroundColor: COLORS.primarySoft, color: COLORS.primaryDark }}
      >
        <Icon size={22} />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-data font-semibold text-base" style={{ color: COLORS.textStrong }}>
          {action.label}
        </h4>
        <p className="text-sm mt-1" style={{ color: COLORS.textMuted }}>
          {action.description}
        </p>
        <pre className="mt-2 text-xs font-mono leading-relaxed whitespace-pre-line" style={{ color: COLORS.textFaint }}>
          {action.example}
        </pre>
      </div>
      {action.permission === "COACH" && (
        <span className="badge badge-info shrink-0">
          Coach
        </span>
      )}
    </button>
  );
}

export default function AiPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) router.push("/login");
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;

  const [loadingActions, setLoadingActions] = useState<Record<string, boolean>>({});
  const [suggestions, setSuggestions] = useState<Suggestion[]>(MOCK_SUGGESTIONS);
  const [error, setError] = useState<string | null>(null);

  const handleAction = async (actionKey: string) => {
    const action = IA_ACTIONS.find((a) => a.key === actionKey);
    if (!action) return;

    setLoadingActions((prev) => ({ ...prev, [actionKey]: true }));
    setError(null);

    try {
      // ⚠️ Dans le vrai MVP, appeler l'API : aiApi[actionKey.toLowerCase()](user?.club_id)
      // Pour le MVP, simulation de réponse
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Ajouter la suggestion mockée
      const newSuggestion: Suggestion = {
        id: Date.now().toString(),
        action_key: actionKey,
        statut: "pending",
        contenu: action.example,
        date: new Date().toISOString().split("T")[0],
        charge: "Vient d'être générée",
      };
      setSuggestions((prev) => [newSuggestion, ...prev]);
    } catch (err) {
      setError("Impossible de contacter l'IA. Vérifiez votre connexion.");
    } finally {
      setLoadingActions((prev) => ({ ...prev, [actionKey]: false }));
    }
  };

  const handleSuggestionAction = (
    suggestionId: string,
    action: "accept" | "modify" | "reject"
  ) => {
    setSuggestions((prev) =>
      prev.map((s) => {
        if (s.id !== suggestionId) return s;
        return {
          ...s,
          statut:
            action === "accept"
              ? "accepted"
              : action === "modify"
              ? "modified"
              : "rejected",
        };
      })
    );
  };

  const suggestionColumns = {
    pending: suggestions.filter((s) => s.statut === "pending"),
    accepted: suggestions.filter((s) => s.statut === "accepted"),
    modified: suggestions.filter((s) => s.statut === "modified"),
    rejected: suggestions.filter((s) => s.statut === "rejected"),
  };

  return (
    <div className="page-main">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-data text-xl font-bold" style={{ color: COLORS.textStrong }}>
              Assistant IA
            </h1>
            <p className="text-sm" style={{ color: COLORS.textMuted }}>
              Suggestions métier basées sur vos données — validation humaine requise
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs" style={{ color: COLORS.textMuted }}>
            <span className="w-2 h-2 rounded-full bg-primary mr-1" />
            IA active · DeepSeek
          </div>
        </div>

        {error && (
          <div
            className="mb-4 rounded-lg p-3 text-sm flex items-start gap-2"
            style={{ backgroundColor: COLORS.destructiveSoft, color: COLORS.destructive }}
          >
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        {/* Suggestion prête (en haut) */}
        {suggestionColumns.pending.length > 0 && (
          <div
            className="mb-6 rounded-xl p-5"
            style={{ backgroundColor: COLORS.secondary, borderColor: COLORS.secondary }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Brain className="w-5 h-5" style={{ color: COLORS.onSecondary }} />
              <h3 className="font-data font-semibold text-sm uppercase tracking-wider" style={{ color: COLORS.onSecondary }}>
                Suggestion prête — à scorer
              </h3>
            </div>
            <div className="space-y-3">
              {suggestionColumns.pending.map((s) => (
                <div key={s.id} className="bg-on-secondary/10 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium uppercase tracking-wider" style={{ color: COLORS.onSecondary }}>
                      {s.action_key.replace(/_/g, " ")}
                    </span>
                    <span className="text-xs" style={{ color: COLORS.onSecondary }}>
                      {s.charge}
                    </span>
                  </div>
                  <pre className="text-xs font-mono leading-relaxed whitespace-pre-line" style={{ color: COLORS.onSecondary }}>
                    {s.contenu}
                  </pre>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => handleSuggestionAction(s.id, "accept")}
                      className="btn btn-primary btn-sm"
                      style={{ backgroundColor: COLORS.primary, color: COLORS.onPrimary, borderColor: COLORS.primary }}
                    >
                      <Check size={14} />
                      Accepter
                    </button>
                    <button
                      onClick={() => handleSuggestionAction(s.id, "modify")}
                      className="btn btn-ghost btn-sm"
                      style={{ color: COLORS.onSecondary, borderColor: COLORS.onSecondary, backgroundColor: "transparent" }}
                    >
                      <RefreshCw size={14} />
                      Modifier
                    </button>
                    <button
                      onClick={() => handleSuggestionAction(s.id, "reject")}
                      className="btn btn-ghost btn-sm"
                      style={{ color: COLORS.onSecondary, borderColor: COLORS.onSecondary, backgroundColor: "transparent" }}
                    >
                      <X size={14} />
                      Rejeter
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Historique des suggestions */}
        <div className="space-y-4">
          <h2 className="font-data font-semibold text-lg" style={{ color: COLORS.textStrong }}>
            Historique
          </h2>

          {/* Acceptés */}
          {suggestionColumns.accepted.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium uppercase tracking-wider flex items-center gap-2" style={{ color: COLORS.primaryDark }}>
                <Check size={14} />
                Acceptés
              </h3>
              {suggestionColumns.accepted.map((s) => (
                <SuggestionCard key={s.id} suggestion={s} />
              ))}
            </div>
          )}

          {/* Modifiés */}
          {suggestionColumns.modified.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium uppercase tracking-wider flex items-center gap-2" style={{ color: COLORS.accentDark }}>
                <RefreshCw size={14} />
                Modifiés
              </h3>
              {suggestionColumns.modified.map((s) => (
                <SuggestionCard key={s.id} suggestion={s} />
              ))}
            </div>
          )}

          {/* Rejetés */}
          {suggestionColumns.rejected.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium uppercase tracking-wider flex items-center gap-2" style={{ color: COLORS.destructive }}>
                <X size={14} />
                Rejetés
              </h3>
              {suggestionColumns.rejected.map((s) => (
                <SuggestionCard key={s.id} suggestion={s} />
              ))}
            </div>
          )}

          {suggestions.length === 0 && (
            <div
              className="card p-8 text-center"
              style={{ backgroundColor: COLORS.surface, borderColor: COLORS.border }}
            >
              <Brain size={32} style={{ color: COLORS.textFaint }} />
              <p className="text-sm mt-3" style={{ color: COLORS.textMuted }}>
                Aucune suggestion générée
              </p>
              <p className="text-xs mt-1" style={{ color: COLORS.textFaint }}>
                Utilisez les boutons ci-dessus pour demander une suggestion
              </p>
            </div>
          )}
        </div>
    </div>
  );
}

function SuggestionCard({ suggestion }: { suggestion: Suggestion }) {
  const statutColors = {
    accepted: { bg: COLORS.primarySoft, color: COLORS.primaryDark },
    modified: { bg: COLORS.accentSoft, color: COLORS.accentDark },
    rejected: { bg: COLORS.destructiveSoft, color: COLORS.destructive },
    pending: { bg: COLORS.surface2, color: COLORS.textMuted },
  };
  const c = statutColors[suggestion.statut as keyof typeof statutColors] ?? statutColors.accepted;

  return (
    <div
      className="flex items-start gap-3 p-4 rounded-lg border"
      style={{ backgroundColor: c.bg, borderColor: c.bg }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium uppercase tracking-wider" style={{ color: c.color }}>
            {suggestion.action_key.replace(/_/g, " ")}
          </span>
          <span className="text-xs" style={{ color: COLORS.textFaint }}>·</span>
          <span className="text-xs" style={{ color: COLORS.textMuted }}>
            {suggestion.date}
          </span>
        </div>
        <pre className="text-xs font-mono leading-relaxed whitespace-pre-line" style={{ color: COLORS.textStrong }}>
          {suggestion.contenu}
        </pre>
      </div>
    </div>
  );
}
