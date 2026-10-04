"use client";

import { useState } from "react";

// ─── Notes du staff (banc de touche) ─────────────────────────────────────────────────
// Composant signature de la v2 — voir CHARTE_VISUELLE_FRONTEND.md §5.2
// Avatar initiales + nom + rôle + heure humaine + texte court concret.

type StaffNoteProps = {
  auteur: string;
  role: string;
  texte: string;
  heure: string;
  joueur?: string;
  initiales?: string;
};

export function StaffNote({
  auteur,
  role,
  texte,
  heure,
  joueur,
  initiales,
}: StaffNoteProps) {
  const initialsVal = initiales ?? auteur
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="note-card">
      {/* Avatar */}
      <div
        className="note-avatar"
        style={{ backgroundColor: "var(--primary)" }}
      >
        {initialsVal}
      </div>

      {/* Contenu */}
      <div className="note-content">
        {/* En-tête */}
        <div className="note-author">
          <span className="font-data font-medium text-text-strong text-sm">{auteur}</span>
          <span className="text-xxs text-muted ml-1">· {role}</span>
        </div>
        <p className="text-xxs text-faint mt-0.5">{heure}</p>

        {/* Texte */}
        <p className="note-text text-sm text-text mt-2">{texte}</p>

        {/* Joueur concerné (optionnel) */}
        {joueur && (
          <p className="text-xs text-muted mt-1.5">
            concernant <span className="font-medium text-text-strong">{joueur}</span>
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Note globale avec snapshot tooltip ─────────────────────────────────────────────
type NoteGlobaleWithSnapshotProps = {
  note: number | null;
  snapshot: {
    poidsPhysique: number;
    poidsTechnique: number;
    poidsTactique: number;
    poidsMental: number;
  } | null;
};

export function NoteGlobaleWithSnapshot({
  note,
  snapshot,
}: NoteGlobaleWithSnapshotProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  if (note == null) return null;

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Note principale */}
      <span
        className="font-data text-3xl font-bold text-text-strong cursor-help"
        style={{
          fontFamily: "var(--font-data)",
          fontSize: "34px",
          fontWeight: 700,
          lineHeight: 1,
          letterSpacing: "-0.02em",
          fontVariantNumeric: "tabular-nums",
          borderBottom: "2px dotted var(--text-faint)",
        }}
      >
        {note.toFixed(1)}
      </span>

      {/* Tooltip snapshot */}
      {showTooltip && snapshot && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 z-50"
          style={{
            marginBottom: 8,
            padding: "8px 12px",
            backgroundColor: "var(--secondary)",
            color: "var(--on-dark)",
            borderRadius: "var(--radius-md)",
            fontSize: 11,
            whiteSpace: "nowrap",
            boxShadow: "var(--shadow-pop)",
          }}
        >
          <p
            className="font-medium text-on-dark-dim mb-1"
            style={{ fontFamily: "var(--font-data)", textTransform: "uppercase", letterSpacing: "0.05em" }}
          >
            Snapshot pondération
          </p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <span className="text-on-dark-dim">Physique</span>
                            <span className="text-on-dark text-right font-mono">{snapshot.poidsPhysique}%</span>

            <span className="text-on-dark-dim">Technique</span>
                            <span className="text-on-dark text-right font-mono">{snapshot.poidsTechnique}%</span>

            <span className="text-on-dark-dim">Tactique</span>
                            <span className="text-on-dark text-right font-mono">{snapshot.poidsTactique}%</span>

            <span className="text-on-dark-dim">Mental</span>
                            <span className="text-on-dark text-right font-mono">{snapshot.poidsMental}%</span>
          </div>
        </div>
      )}
    </div>
  );
}
