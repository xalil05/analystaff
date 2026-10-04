"use client";

import { useState, useRef, useCallback } from "react";

// ── Types ───────────────────────────────────────────────────────────────────────
// Alignés sur le backend : LineupPlayerResponse (ids en number) et
// LineupPlayerInput dont position_x / position_y sont des Decimal 0-100.
type CodeFormation = "4-4-2" | "4-3-3" | "4-2-3-1" | "4-1-4-1" | "3-5-2" | "3-4-3" | "5-3-2" | "5-4-1";

interface PlayerMini {
  id: number;
  nom: string;
  prenom: string | null;
  numero: number | null;
}

export interface LineupPlayer {
  id: number;
  player_id: number;
  is_starting: boolean;
  is_captain: boolean;
  is_goalkeeper: boolean;
  tactical_role: string | null;
  position_x: number | null;
  position_y: number | null;
  substitute_order: number | null;
  /** Rempli par la page depuis GET /players : le plateau n'a pas le nom. */
  player?: PlayerMini;
}

interface TacticalBoardProps {
  formation: CodeFormation;
  joueurs: LineupPlayer[];
  onPlayerMove?: (playerId: number, x: number, y: number) => void;
  onValidate?: () => void;
  onSaveDraft?: () => void;
  isEditable?: boolean;
}

interface PlayerDotProps {
  player: LineupPlayer;
  onDrag?: (id: number, x: number, y: number) => void;
  isEditable: boolean;
}

// ── Données ──────────────────────────────────────────────────────────────────────
const FORMATIONS_POSITIONS: Record<CodeFormation, { x: number; y: number; role: string }[]> = {
  "4-4-2": [
    { x: 50, y: 90, role: "GK" },
    { x: 20, y: 70, role: "DC" },
    { x: 40, y: 70, role: "DC" },
    { x: 60, y: 70, role: "DC" },
    { x: 80, y: 70, role: "DC" },
    { x: 20, y: 45, role: "MC" },
    { x: 40, y: 45, role: "MC" },
    { x: 60, y: 45, role: "MC" },
    { x: 80, y: 45, role: "MC" },
    { x: 35, y: 20, role: "ST" },
    { x: 65, y: 20, role: "ST" },
  ],
  "4-3-3": [
    { x: 50, y: 90, role: "GK" },
    { x: 20, y: 70, role: "DC" },
    { x: 40, y: 70, role: "DC" },
    { x: 60, y: 70, role: "DC" },
    { x: 80, y: 70, role: "DC" },
    { x: 30, y: 45, role: "MC" },
    { x: 50, y: 45, role: "MC" },
    { x: 70, y: 45, role: "MC" },
    { x: 20, y: 20, role: "LW" },
    { x: 50, y: 15, role: "ST" },
    { x: 80, y: 20, role: "RW" },
  ],
  "4-2-3-1": [
    { x: 50, y: 90, role: "GK" },
    { x: 20, y: 70, role: "DC" },
    { x: 40, y: 70, role: "DC" },
    { x: 60, y: 70, role: "DC" },
    { x: 80, y: 70, role: "DC" },
    { x: 35, y: 50, role: "CDM" },
    { x: 65, y: 50, role: "CDM" },
    { x: 20, y: 30, role: "LAM" },
    { x: 50, y: 30, role: "CAM" },
    { x: 80, y: 30, role: "RAM" },
    { x: 50, y: 10, role: "ST" },
  ],
  "4-1-4-1": [
    { x: 50, y: 90, role: "GK" },
    { x: 20, y: 70, role: "DC" },
    { x: 40, y: 70, role: "DC" },
    { x: 60, y: 70, role: "DC" },
    { x: 80, y: 70, role: "DC" },
    { x: 50, y: 55, role: "CDM" },
    { x: 20, y: 35, role: "LM" },
    { x: 40, y: 35, role: "CM" },
    { x: 60, y: 35, role: "CM" },
    { x: 80, y: 35, role: "RM" },
    { x: 50, y: 12, role: "ST" },
  ],
  "3-5-2": [
    { x: 50, y: 90, role: "GK" },
    { x: 30, y: 70, role: "CB" },
    { x: 50, y: 70, role: "CB" },
    { x: 70, y: 70, role: "CB" },
    { x: 15, y: 45, role: "LWB" },
    { x: 35, y: 45, role: "CM" },
    { x: 50, y: 50, role: "CAM" },
    { x: 65, y: 45, role: "CM" },
    { x: 85, y: 45, role: "RWB" },
    { x: 35, y: 18, role: "ST" },
    { x: 65, y: 18, role: "ST" },
  ],
  "3-4-3": [
    { x: 50, y: 90, role: "GK" },
    { x: 30, y: 70, role: "CB" },
    { x: 50, y: 70, role: "CB" },
    { x: 70, y: 70, role: "CB" },
    { x: 20, y: 45, role: "LM" },
    { x: 40, y: 45, role: "CM" },
    { x: 60, y: 45, role: "CM" },
    { x: 80, y: 45, role: "RM" },
    { x: 20, y: 18, role: "LW" },
    { x: 50, y: 12, role: "ST" },
    { x: 80, y: 18, role: "RW" },
  ],
  "5-3-2": [
    { x: 50, y: 90, role: "GK" },
    { x: 15, y: 65, role: "LWB" },
    { x: 33, y: 72, role: "CB" },
    { x: 50, y: 75, role: "CB" },
    { x: 67, y: 72, role: "CB" },
    { x: 85, y: 65, role: "RWB" },
    { x: 30, y: 45, role: "CM" },
    { x: 50, y: 45, role: "CM" },
    { x: 70, y: 45, role: "CM" },
    { x: 35, y: 18, role: "ST" },
    { x: 65, y: 18, role: "ST" },
  ],
  "5-4-1": [
    { x: 50, y: 90, role: "GK" },
    { x: 15, y: 65, role: "LWB" },
    { x: 33, y: 72, role: "CB" },
    { x: 50, y: 75, role: "CB" },
    { x: 67, y: 72, role: "CB" },
    { x: 85, y: 65, role: "RWB" },
    { x: 20, y: 42, role: "LM" },
    { x: 40, y: 42, role: "CM" },
    { x: 60, y: 42, role: "CM" },
    { x: 80, y: 42, role: "RM" },
    { x: 50, y: 15, role: "ST" },
  ],
};

const COLORS = {
  primary: "var(--primary)",
  secondary: "var(--secondary)",
  goalkeeper: "var(--goalkeeper)",
  onGoalkeeper: "var(--on-goalkeeper)",
  onPrimary: "var(--on-primary)",
  onSecondary: "var(--on-secondary)",
};

// ── Composant Joueur ─────────────────────────────────────────────────────────────
function PlayerDot({ player, onDrag, isEditable }: PlayerDotProps) {
  const dotRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!isEditable || !onDrag) return;
      e.preventDefault();
      setDragging(true);

      const handleMouseMove = (ev: MouseEvent) => {
        if (!dotRef.current) return;
        const parent = dotRef.current.parentElement;
        if (!parent) return;
        const rect = parent.getBoundingClientRect();
        const x = ((ev.clientX - rect.left) / rect.width) * 100;
        const y = ((ev.clientY - rect.top) / rect.height) * 100;
        const clampedX = Math.max(3, Math.min(97, x));
        const clampedY = Math.max(3, Math.min(97, y));
        onDrag(player.player_id, clampedX, clampedY);
      };

      const handleMouseUp = () => {
        setDragging(false);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [isEditable, onDrag, player.player_id]
  );

  // Le fond ET le texte de la pastille viennent de tokens : en sombre le
  // primaire s'éclaircit, un texte blanc dessus deviendrait illisible.
  const bgColor = player.is_goalkeeper
    ? COLORS.goalkeeper
    : player.is_starting
    ? COLORS.primary
    : COLORS.secondary;

  const fgColor = player.is_goalkeeper
    ? COLORS.onGoalkeeper
    : player.is_starting
    ? COLORS.onPrimary
    : COLORS.onSecondary;

  const borderStyle = `2px solid ${player.is_captain ? "var(--on-pitch)" : "var(--pitch-ring)"}`;

  const boxShadow = player.is_captain
    ? "0 0 0 2px var(--primary)"
    : dragging
    ? "var(--shadow-drag)"
    : undefined; // repos et survol : gérés par `.tactical-player` dans globals.css,
    // sinon une valeur inline écraserait la transition `box-shadow` 150ms.

  const initials = player.player
    ? `${player.player.prenom?.[0] ?? ""}${player.player.nom?.[0] ?? ""}`.toUpperCase()
    : player.tactical_role ?? "?";

  return (
    <div
      ref={dotRef}
      className="tactical-player"
      style={{
        left: `${player.position_x}%`,
        top: `${player.position_y}%`,
        // Pas de `transform` inline : le centrage translate(-50%, -50%) et le
        // scale(1.1) de survol vivent dans `.tactical-player` (globals.css).
        // Un `transform` inline l'emporterait et le scale ne s'appliquerait
        // jamais. `left`/`top` restent en inline : c'est le drag-and-drop,
        // un direct manipulation qui doit coller au pointeur, sans transition.
        backgroundColor: bgColor,
        color: fgColor,
        border: borderStyle,
        boxShadow,
        cursor: isEditable ? "grab" : "default",
        zIndex: dragging ? 10 : 1,
      }}
      onMouseDown={handleMouseDown}
      title={
        player.player
          ? `${player.player.prenom} ${player.player.nom} (${player.tactical_role ?? ""})`
          : player.tactical_role ?? ""
      }
    >
      {player.player?.numero != null ? player.player.numero : initials}
    </div>
  );
}

// ── Composant Principal ──────────────────────────────────────────────────────────
export function TacticalBoard({
  formation,
  joueurs,
  onPlayerMove,
  onValidate,
  onSaveDraft,
  isEditable = true,
}: TacticalBoardProps) {
  const [localPlayers, setLocalPlayers] = useState<LineupPlayer[]>(joueurs);

  const handlePlayerMove = useCallback(
    (playerId: number, x: number, y: number) => {
      setLocalPlayers((prev) =>
        prev.map((p) => (p.player_id === playerId ? { ...p, position_x: x, position_y: y } : p))
      );
      onPlayerMove?.(playerId, x, y);
    },
    [onPlayerMove]
  );

  const startingPlayers = localPlayers.filter((p) => p.is_starting || p.is_goalkeeper);
  const substitutePlayers = localPlayers.filter((p) => !p.is_starting && !p.is_goalkeeper);

  return (
    <div className="space-y-4">
      {/* Terrain */}
      <div className="tactical-board">
        {/* Badge formation */}
        <div className="tactical-formation-badge">{formation}</div>

        {/* Ligne centrale */}
        <div
          className="tactical-board-line"
          style={{ left: "0%", top: "50%", width: "100%", height: "1px" }}
        />
        {/* Cercle central */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            width: "60px",
            height: "60px",
            borderRadius: "50%",
            border: "1px solid var(--pitch-area-line)",
          }}
        />

        {/* Surface de réparation haut */}
        <div
          className="tactical-board-penalty-area"
          style={{ left: "20%", top: "0%", width: "60%", height: "16%" }}
        />
        {/* Surface de réparation bas */}
        <div
          className="tactical-board-penalty-area"
          style={{ left: "20%", top: "84%", width: "60%", height: "16%" }}
        />

        {/* Joueurs */}
        {startingPlayers.map((p) => (
          <PlayerDot
            key={p.id}
            player={p}
            onDrag={handlePlayerMove}
            isEditable={isEditable}
          />
        ))}
      </div>

      {/* Remplaçants */}
      {substitutePlayers.length > 0 && (
        <div className="card p-4">
          <h3 className="font-data font-semibold text-sm text-text-strong mb-3" style={{ color: "var(--text-strong)" }}>
            Remplaçants
          </h3>
          <div className="flex flex-wrap gap-2">
            {substitutePlayers.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: "var(--surface-2)",
                  color: "var(--text-strong)",
                  border: "1px solid var(--border)",
                }}
              >
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center text-on-secondary font-data font-bold text-[10px]"
                  style={{ backgroundColor: "var(--secondary)" }}
                >
                  {p.player?.numero ?? "?"}
                </span>
                {p.player && `${p.player.prenom} ${p.player.nom}`}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      {/* `flex-wrap` : « Enregistrer brouillon » + « Valider la composition »
          faisaient 328px à 390px et débordaient en dessous de 360px. */}
      {(onValidate || onSaveDraft) && (
        <div className="flex items-center justify-end gap-2 flex-wrap">
          {onSaveDraft && (
            <button
              onClick={onSaveDraft}
              className="btn btn-secondary btn-sm gap-1"
            >
              Enregistrer brouillon
            </button>
          )}
          {onValidate && (
            <button
              onClick={onValidate}
              className="btn btn-primary btn-sm gap-1"
              style={{ backgroundColor: "var(--primary)", color: "var(--on-primary)", borderColor: "var(--primary)" }}
            >
              Valider la composition
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export { FORMATIONS_POSITIONS };
export type { CodeFormation };
