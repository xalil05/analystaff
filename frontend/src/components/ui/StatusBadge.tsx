// ─── Badge de statut joueur ────────────────────────────────────────────────────────
// Les statuts viennent de l'API : minuscules (PlayerStatut dans app/core/enums.py).
// Les couleurs utilisent des tokens sémantiques — les classes utilitaires
// bg-primary-soft / text-accent-dark / bg-info-soft n'existent pas dans
// tailwind.config.ts, d'où les var(--) explicites.
import type { PlayerStatut } from "@/types";

type StatusBadgeProps = {
  statut: PlayerStatut;
  size?: "sm" | "md";
  showDot?: boolean;
};

const STATUS_CONFIG: Record<
  PlayerStatut,
  { label: string; bg: string; color: string; dotColor: string }
> = {
  actif: {
    label: "Actif",
    bg: "var(--primary-soft)",
    color: "var(--primary-hover)",
    dotColor: "var(--primary)",
  },
  blesse: {
    label: "Blessé",
    bg: "var(--destructive-soft)",
    color: "var(--destructive)",
    dotColor: "var(--destructive)",
  },
  suspendu: {
    label: "Suspendu",
    bg: "var(--info-soft)",
    color: "var(--info)",
    dotColor: "var(--info)",
  },
  parti: {
    label: "Parti",
    bg: "var(--surface-2)",
    color: "var(--text-muted)",
    dotColor: "var(--text-muted)",
  },
  archive: {
    label: "Archivé",
    bg: "var(--surface-2)",
    color: "var(--text-muted)",
    dotColor: "var(--text-muted)",
  },
};

export function StatusBadge({ statut, size = "md", showDot = true }: StatusBadgeProps) {
  const config = STATUS_CONFIG[statut] ?? STATUS_CONFIG.actif;
  const sizeClass = size === "sm" ? "text-tiny px-2 py-0.5" : "text-xs px-3 py-1";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium uppercase tracking-wider border ${sizeClass}`}
      style={{ backgroundColor: config.bg, color: config.color }}
    >
      {showDot && (
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: config.dotColor }}
        />
      )}
      {config.label}
    </span>
  );
}