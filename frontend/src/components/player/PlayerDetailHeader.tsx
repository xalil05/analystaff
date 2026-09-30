"use client";

import { RadarChart } from "@/components/radar/RadarChart";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import type { Player, Evaluation, PillarNote, ChargeJour } from "@/types";

interface PlayerDetailHeaderProps {
  joueur: Player;
  evaluations: Evaluation[];
  clubMoyenne: PillarNote[] | null;
  charge7Jours: ChargeJour[];
  onEvaluer: () => void;
}

interface PlayerDetailHeaderState {
  imageError: boolean;
}

const PILLAR_LABELS: Record<string, string> = {
  physique: "Physique",
  technique: "Technique",
  tactique: "Tactique",
  mental: "Mental",
};

const PILLAR_COLORS: Record<string, string> = {
  physique: "#E53935",
  technique: "#1E88E5",
  tactique: "#8E24AA",
  mental: "#F59E0B",
};

function PlayerDetailHeader({
  joueur,
  evaluations,
  clubMoyenne,
  charge7Jours,
  onEvaluer,
}: PlayerDetailHeaderProps) {
  const [state, setState] = useState<PlayerDetailHeaderState>({
    imageError: false,
  });

  // Note globale moyenne des 5 dernières évaluations
  const noteGlobale: number | null = useMemo(() => {
    const evals = evaluations.filter(
      (e: Evaluation) => e.note_globale != null
    ).slice(-5);
    if (evals.length === 0) return null;
    const sum = evals.reduce((acc: number, e: Evaluation) => acc + e.note_globale!, 0);
    return sum / evals.length;
  }, [evaluations]);

  // Piliers moyens
  const pillars: PillarNote[] = useMemo(() => {
    const notes: Record<string, number[]> = {
      physique: [],
      technique: [],
      tactique: [],
      mental: [],
    };

    evaluations.forEach((eval: Evaluation) => {
      if (eval.note_physique !== null) notes.physique.push(eval.note_physique);
      if (eval.note_technique !== null) notes.technique.push(eval.note_technique);
      if (eval.note_tactique !== null) notes.tactique.push(eval.note_tactique);
      if (eval.note_mental !== null) notes.mental.push(eval.note_mental);
    });

    const avg = (arr: number[]) =>
      arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

    return [
      { pilier: "physique" as const, note: avg(notes.physique) },
      { pilier: "technique" as const, note: avg(notes.technique) },
      { pilier: "tactique" as const, note: avg(notes.tactique) },
      { pilier: "mental" as const, note: avg(notes.mental) },
    ];
  }, [evaluations]);

  useEffect(() => {
    setState((prev) => ({
      ...prev,
    }));
  }, []);

  const initials =
    `${joueur.prenom?.[0] ?? ""}${joueur.nom?.[0] ?? ""}`
      .toUpperCase() || "?";

  const statusBadgeClass = {
    ACTIF: "badge-fit",
    BLESSE: "badge-injured",
    REPRISE: "badge-reserve",
    SUSPENDU: "badge-info",
    INDISPONIBLE: "badge-neutral",
    ARCHIVE: "badge-neutral",
  }[joueur.statut] ?? "badge-neutral";

  return (
    <div className="space-y-6">
      {/* Header joueur */}
      <div className="card p-6">
        <div className="flex flex-col md:flex-row gap-6 items-start">
          {/* Avatar */}
          <div
            className="avatar-initials lg shrink-0"
            style={{ backgroundColor: "var(--primary)" }}
          >
            {joueur.photo_url && !state.imageError ? (
              <img
                src={joueur.photo_url}
                alt=""
                className="w-full h-full rounded-full object-cover"
                onError={() => setState({ imageError: true })}
              />
            ) : (
              <span className="text-on-primary text-lg font-data font-bold">
                {initials}
              </span>
            )}
          </div>

          {/* Titre */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="font-data text-2xl text-text-strong font-bold">
                {joueur.prenom} {joueur.nom}
              </h1>
              <span className={`badge ${statusBadgeClass}`}>
                {joueur.statut}
              </span>
            </div>

            <p className="text-lg text-muted font-data font-medium">
              {POSTES_LABELS[joueur.poste_principal] ?? joueur.poste_principal}
              {joueur.postes_secondaires?.length ? (
                <>
                  {" "}
                  <span className="text-muted">·</span>{" "}
                  <span className="text-muted">
                    {joueur.postes_secondaires
                      .map((p) => POSTES_LABELS[p] ?? p)
                      .join(", ")}
                  </span>
                </>
              ) : null}
            </p>

            {joueur.numero_maillot && (
              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-primary-soft text-primary font-data font-bold text-sm rounded-lg">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="2" x2="12" y2="22" />
                  <path d="M5 12l7-7 7 7" />
                </svg>
                Maillot N°{joueur.numero_maillot}
              </div>
            )}
          </div>

          <Link
            href={`/joueurs/${joueur.id}/edit`}
            className="btn btn-secondary gap-2 shrink-0"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Modifier
          </Link>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Date de naissance */}
        <div className="card card-sm flex items-center gap-3">
          <div className="kpi-icon bg-primary-soft text-primary">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <div>
            <p className="text-muted text-tiny font-medium uppercase tracking-wider">
              Date de naissance
            </p>
            <p className="font-data font-semibold text-text-strong text-sm">
              {joueur.date_naissance
                ? new Date(joueur.date_naissance).toLocaleDateString("fr-FR", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })
                : "Non renseignée"}
            </p>
          </div>
        </div>

        {/* Taille / Poids */}
        {(joueur.taille || joueur.poids) && (
          <div className="card card-sm flex items-center gap-3">
            <div className="kpi-icon bg-primary-soft text-primary">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 3h16v13H4z" />
                <path d="M4 19v3h16v-3" />
                <path d="M8 10h2" />
              </svg>
            </div>
            <div>
              <p className="text-muted text-tiny font-medium uppercase tracking-wider">
                Morphologie
              </p>
              <p className="font-data font-semibold text-text-strong text-sm tabular-nums">
                {joueur.taille ? `${joueur.taille} cm` : "?"} / {/* Précédent */}
                {joueur.poids ? `${joueur.poids} kg` : "?"}
              </p>
            </div>
          </div>
        )}

        {/* Charge 7 jours */}
        {charge7Jours && charge7Jours.length > 0 && (
          <div className="card card-sm flex items-center gap-3">
            <div
              className="kpi-icon"
              style={{
                backgroundColor: "oklch(0.78 0.15 75 / 0.1)",
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--accent-strong)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </div>
            <div>
              <p className="text-muted text-tiny font-medium uppercase tracking-wider">
                Charge 7 jours
              </p>
              <p className="font-data font-semibold text-text-strong text-sm tabular-nums">
                {charge7Jours.reduce((s, c) => s + c.valeur, 0)}{" "}
                pts
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Radar + Notes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radar 4 piliers */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--primary)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon
                points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2"
              />
              <line x1="12" y1="22" x2="12" y2="15.5" />
              <polyline points="22 8.5 12 15.5 2 8.5" />
            </svg>
            <h2 className="font-data text-lg font-semibold text-text-strong">
              Profil 4 piliers
            </h2>
          </div>

          <div className="radar-container">
            <RadarChart
              pillars={pillars}
              clubMoyenne={clubMoyenne}
              size={160}
            />
            <div className="radar-legend space-y-2">
              {pillars.map((p) => (
                <div key={p.pilier} className="radar-legend-item">
                  <span
                    className="radar-legend-dot"
                    style={{
                      backgroundColor:
                        PILLAR_COLORS[p.pilier] ||
                        "var(--pillar-" + p.pilier + ")",
                    }}
                  />
                  <span className="radar-legend-label text-sm text-text">
                    {PILLAR_LABELS[p.pilier]}
                  </span>
                  <span className="radar-legend-value text-text-strong font-data font-bold tabular-nums">
                    {p.note.toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Commentaire terrain: affichage de la note moyenne des 5 dernières évaluations */}
          <div className="mt-4 pt-3 border-t border-border">
            {noteGlobale !== null && (
              <p className="text-muted text-sm">
                Note moyenne :{" "}
                <span className="font-data font-bold text-text-strong tabular-nums">
                  {noteGlobale.toFixed(1)}</span> / 10
                sur les 5 dernières évaluations
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={onEvaluer}
          className="btn btn-primary gap-2"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          Évaluer ce joueur
        </button>
      </div>
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
};

export { PlayerDetailHeader };
