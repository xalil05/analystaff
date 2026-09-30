// ─── Badge de statut joueur ────────────────────────────────────────────────────────
type PlayerStatutType = "ACTIF" | "BLESSE" | "REPRISE" | "SUSPENDU" | "INDISPONIBLE" | "ARCHIVE";

type StatusBadgeProps = {
  statut: PlayerStatutType;
  size?: "sm" | "md";
  showDot?: boolean;
};

const STATUS_CONFIG: Record<
  PlayerStatutType,
  { label: string; bg: string; color: string; dotColor: string }
> = {
  ACTIF: {
    label: "Actif",
    bg: "bg-primary-soft text-primary-dark",
    color: "text-primary-dark",
    dotColor: "bg-primary",
  },
  BLESSE: {
    label: "Blessé",
    bg: "bg-destructive-soft text-destructive",
    color: "text-destructive",
    dotColor: "bg-destructive",
  },
  REPRISE: {
    label: "Reprise",
    bg: "bg-accent-soft text-accent-dark",
    color: "text-accent-dark",
    dotColor: "bg-accent",
  },
  SUSPENDU: {
    label: "Suspendu",
    bg: "bg-info-soft text-info",
    color: "text-info",
    dotColor: "bg-info",
  },
  INDISPONIBLE: {
    label: "Indisponible",
    bg: "bg-surface-2 text-muted",
    color: "text-muted",
    dotColor: "bg-muted",
  },
  ARCHIVE: {
    label: "Archivé",
    bg: "bg-surface-2 text-muted",
    color: "text-muted",
    dotColor: "bg-muted",
  },
};

export function StatusBadge({ statut, size = "md", showDot = true }: StatusBadgeProps) {
  const config = STATUS_CONFIG[statut] ?? STATUS_CONFIG.ACTIF;
  const sizeClass = size === "sm" ? "text-tiny px-2 py-0.5" : "text-xs px-3 py-1";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium uppercase tracking-wider border ${sizeClass} ${config.bg}`}
    >
      {showDot && <span className={`w-1.5 h-1.5 rounded-full ${config.dotColor}`} />}
      {config.label}
    </span>
  );
}
