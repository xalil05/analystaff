"use client";

import { useCallback, useEffect, useState } from "react";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { aiApi } from "@/lib/api";
import type { AiFeedbackAction, AiSuggestion } from "@/types";
import { SkeletonCard } from "@/components/ui/Skeleton";
import {
  AlertCircle,
  Brain,
  Check,
  Loader2,
  RefreshCw,
  Sparkles,
  X,
} from "lucide-react";

// ── Couleurs ────────────────────────────────────────────────────────────────────

const COLORS = {
  surface: "var(--surface)",
  surface2: "var(--surface-2)",
  border: "var(--border)",
  textStrong: "var(--text-strong)",
  textMuted: "var(--text-muted)",
  textFaint: "var(--text-faint)",
  primary: "var(--primary)",
  primarySoft: "var(--primary-soft)",
  onPrimary: "var(--on-primary)",
  destructive: "var(--destructive)",
  destructiveSoft: "var(--destructive-soft)",
  accent: "var(--accent)",
  accentSoft: "var(--accent-soft)",
};

// ── Libellés ────────────────────────────────────────────────────────────────────

/**
 * Libellés lisibles. Les clés viennent de ACTIONS (app/ai/actions.py) ; le
 * backend n'expose ni nom ni description, seulement la liste des clés.
 */
const ACTION_LABELS: Record<string, string> = {
  SUGGEST_TRAINING_SESSION: "Suggérer une séance",
  SUGGEST_LINEUP: "Suggérer une composition",
  ANALYZE_FATIGUE: "Analyser la fatigue du groupe",
  SUMMARIZE_WEEK: "Résumer la semaine",
  ADAPT_WORKLOAD: "Adapter les charges",
  PREPARE_PRE_MATCH: "Préparer l'avant-match",
  ORGANIZE_WEEK: "Organiser la semaine",
  BALANCE_WORKLOAD: "Équilibrer les charges",
  PARSE_UPLOADED_SESSION: "Analyser une séance importée",
};

const ACTION_HINTS: Record<string, string> = {
  SUGGEST_TRAINING_SESSION: "Séance adaptée au contexte de la semaine",
  SUGGEST_LINEUP: "Composition selon la forme du moment",
  ANALYZE_FATIGUE: "Signaux de surentraînement",
  SUMMARIZE_WEEK: "Synthèse évaluations et charges",
  ADAPT_WORKLOAD: "Charge par joueur",
  PREPARE_PRE_MATCH: "Synthèse avant match",
  ORGANIZE_WEEK: "Répartition de la semaine",
  BALANCE_WORKLOAD: "Équilibre entre joueurs",
  PARSE_UPLOADED_SESSION: "Séance du jour importée",
};

const STATUT_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  pending: { label: "À scorer", bg: COLORS.surface2, color: COLORS.textMuted },
  ready: { label: "À scorer", bg: COLORS.surface2, color: COLORS.textMuted },
  accepted: { label: "Acceptée", bg: COLORS.primarySoft, color: COLORS.primary },
  modified: { label: "Modifiée", bg: COLORS.accentSoft, color: COLORS.accent },
  rejected: { label: "Rejetée", bg: COLORS.destructiveSoft, color: COLORS.destructive },
};

function libelleStatut(statut: string) {
  return (
    STATUT_CONFIG[statut] ?? {
      label: statut,
      bg: COLORS.surface2,
      color: COLORS.textMuted,
    }
  );
}

/**
 * `suggestion_content` est un objet structuré par action. Le rendre en JSON
 * indenté est honnête : l'écran n'invente pas de mise en forme par type, il
 * montre ce que l'IA a réellement produit.
 */
function Contenu({ suggestion }: { suggestion: AiSuggestion }) {
  const contenu = suggestion.suggestion_content;
  const texte =
    contenu && typeof contenu === "object" && Object.keys(contenu).length > 0
      ? JSON.stringify(contenu, null, 2)
      : "Suggestion vide";

  return (
    <pre
      className="text-xs font-mono leading-relaxed whitespace-pre-wrap break-words overflow-x-auto p-3 rounded-md"
      style={{ backgroundColor: COLORS.surface2, color: COLORS.textStrong }}
    >
      {texte}
    </pre>
  );
}

function SuggestionCard({
  suggestion,
  onFeedback,
  busy,
}: {
  suggestion: AiSuggestion;
  onFeedback?: (id: number, action: AiFeedbackAction) => void;
  busy?: boolean;
}) {
  const st = libelleStatut(suggestion.statut);
  const actionKey = suggestion.action_key;
  const enAttente = suggestion.statut === "pending" || suggestion.statut === "ready";

  return (
    <article
      className="card p-4"
      style={{ borderColor: COLORS.border, backgroundColor: COLORS.surface }}
    >
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="text-xs font-medium uppercase tracking-wider"
            style={{ color: COLORS.primary }}
          >
            {ACTION_LABELS[actionKey] ?? actionKey.replace(/_/g, " ")}
          </span>
          {suggestion.pre_generated && (
            <span
              className="badge"
              style={{ backgroundColor: COLORS.surface2, color: COLORS.textMuted }}
            >
              Pré-générée
            </span>
          )}
        </div>
        <span
          className="badge shrink-0"
          style={{ backgroundColor: st.bg, color: st.color }}
        >
          {st.label}
        </span>
      </div>

      <Contenu suggestion={suggestion} />

      {onFeedback && enAttente && (
        <div className="flex gap-2 mt-3 flex-wrap">
          <button
            onClick={() => onFeedback(suggestion.id, "accepted")}
            disabled={busy}
            className="btn btn-primary btn-sm"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Accepter
          </button>
          <button
            onClick={() => onFeedback(suggestion.id, "modified")}
            disabled={busy}
            className="btn btn-secondary btn-sm"
          >
            <RefreshCw size={14} />
            Modifier
          </button>
          <button
            onClick={() => onFeedback(suggestion.id, "rejected")}
            disabled={busy}
            className="btn btn-ghost btn-sm"
          >
            <X size={14} />
            Rejeter
          </button>
        </div>
      )}
    </article>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────────

export default function AiPage() {
  const autorise = useRequireAuth();

  const [actions, setActions] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<AiSuggestion[]>([]);
  const [enCours, setEnCours] = useState<string | null>(null);
  const [feedbackEnCours, setFeedbackEnCours] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = useCallback(async () => {
    setErreur(null);
    setIsLoading(true);
    try {
      // Les deux routes sont sous /api/v1/ai, sans club_id : le backend
      // résout le club depuis le jeton.
      const [{ data: actionsDispo }, { data: suggestionsServeur }] =
        await Promise.all([aiApi.actions(), aiApi.suggestions()]);
      setActions(actionsDispo);
      setSuggestions(suggestionsServeur);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Chargement impossible");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!autorise) return;
    void charger();
  }, [autorise, charger]);

  const declencher = async (actionKey: string) => {
    setEnCours(actionKey);
    setErreur(null);
    try {
      // SUGGEST_LINEUP est la seule action qui refuse de tourner sans
      // match_id côté service : on ne l'active que si un match est fourni,
      // ce qui n'est pas le cas de cet écran.
      const { data } = await aiApi.trigger(actionKey);
      setSuggestions((prev) => [data, ...prev]);
    } catch (e) {
      setErreur(
        e instanceof Error ? e.message : "Impossible de déclencher l'action IA"
      );
    } finally {
      setEnCours(null);
    }
  };

  const noter = async (id: number, action: AiFeedbackAction) => {
    setFeedbackEnCours(id);
    setErreur(null);
    try {
      const { data } = await aiApi.feedback(id, action);
      // On remplace par la suggestion renvoyée : le statut fait foi côté
      // serveur, pas l'optimisme local.
      setSuggestions((prev) => prev.map((s) => (s.id === id ? data : s)));
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Feedback non enregistré");
    } finally {
      setFeedbackEnCours(null);
    }
  };

  if (!autorise) return null;

  const enAttente = suggestions.filter(
    (s) => s.statut === "pending" || s.statut === "ready"
  );
  const traitees = suggestions.filter(
    (s) => s.statut !== "pending" && s.statut !== "ready"
  );
  // Les actions disponibles sont celles que le backend accepte. SUGGEST_LINEUP
  // est masquée : elle exige un match_id, absent de cet écran.
  const actionsAffiches = actions.filter((a) => a !== "SUGGEST_LINEUP");

  return (
    <div className="page-main">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1
            className="font-data text-xl font-bold"
            style={{ color: COLORS.textStrong }}
          >
            Assistant IA
          </h1>
          <p className="text-sm" style={{ color: COLORS.textMuted }}>
            Suggestions métier basées sur vos données — validation humaine
            requise
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="flex items-center gap-1 text-xs"
            style={{ color: COLORS.textMuted }}
          >
            <Sparkles size={12} style={{ color: COLORS.primary }} />
            {actions.length} action{actions.length > 1 ? "s" : ""} disponible
            {actions.length > 1 ? "s" : ""}
          </span>
          <button
            onClick={charger}
            className="btn btn-ghost btn-sm"
            disabled={isLoading}
            aria-label="Recharger les suggestions"
          >
            <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {erreur && (
        <div
          className="mb-4 rounded-lg p-3 text-sm flex items-start gap-2"
          style={{
            backgroundColor: COLORS.destructiveSoft,
            color: COLORS.destructive,
          }}
          role="alert"
        >
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          {erreur}
        </div>
      )}

      {/* Actions */}
      <section className="mb-6">
        <h2
          className="font-data font-semibold text-lg mb-3 flex items-center gap-2"
          style={{ color: COLORS.textStrong }}
        >
          <Brain size={16} style={{ color: COLORS.primary }} />
          Demander une suggestion
        </h2>

        {isLoading ? (
          <SkeletonCard lines={3} />
        ) : actionsAffiches.length === 0 ? (
          <div className="card p-6 text-center">
            <p className="text-sm" style={{ color: COLORS.textMuted }}>
              Aucune action IA disponible pour votre club.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {actionsAffiches.map((key) => {
              const busy = enCours === key;
              return (
                <button
                  key={key}
                  onClick={() => declencher(key)}
                  disabled={enCours !== null}
                  className="card card-sm p-4 text-left transition-shadow hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: COLORS.surface, borderColor: COLORS.border }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {busy ? (
                      <Loader2 size={14} className="animate-spin shrink-0" style={{ color: COLORS.primary }} />
                    ) : (
                      <Sparkles size={14} className="shrink-0" style={{ color: COLORS.primary }} />
                    )}
                    <span
                      className="font-data font-medium text-sm"
                      style={{ color: COLORS.textStrong }}
                    >
                      {ACTION_LABELS[key] ?? key.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="text-xs" style={{ color: COLORS.textMuted }}>
                    {ACTION_HINTS[key] ?? ""}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* En attente de validation */}
      {enAttente.length > 0 && (
        <section className="mb-6">
          <h2
            className="font-data font-semibold text-lg mb-3"
            style={{ color: COLORS.textStrong }}
          >
            À valider ({enAttente.length})
          </h2>
          <div className="space-y-3">
            {enAttente.map((s) => (
              <SuggestionCard
                key={s.id}
                suggestion={s}
                onFeedback={noter}
                busy={feedbackEnCours === s.id}
              />
            ))}
          </div>
        </section>
      )}

      {/* Historique */}
      <section>
        <h2
          className="font-data font-semibold text-lg mb-3"
          style={{ color: COLORS.textStrong }}
        >
          Historique
        </h2>

        {isLoading ? (
          <SkeletonCard lines={4} />
        ) : suggestions.length === 0 ? (
          <div className="card p-8 text-center">
            <Brain size={32} style={{ color: COLORS.textFaint }} />
            <p className="text-sm mt-3" style={{ color: COLORS.textMuted }}>
              Aucune suggestion générée
            </p>
            <p className="text-xs mt-1" style={{ color: COLORS.textFaint }}>
              Utilisez les boutons ci-dessus pour demander une suggestion
            </p>
          </div>
        ) : traitees.length === 0 ? (
          <div className="card p-6 text-center">
            <p className="text-sm" style={{ color: COLORS.textMuted }}>
              Aucune suggestion traitée pour l&apos;instant.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {traitees.map((s) => (
              <SuggestionCard key={s.id} suggestion={s} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}