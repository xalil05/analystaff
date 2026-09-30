// ─── Badge de statut entraînement ───────────────────────────────────────────────────
type TrainingStatus = "PLANIFIEE" | "EN_COURS" | "TERMINE" | "ANNULE";

type TrainingStatusBadgeProps = {
  statut: TrainingStatus;
  size?: "sm" | "md";
};

const TRAINING_STATUS_CONFIG: Record<
  TrainingStatus,
  { label: string; bg: string; color: string }
> = {
  PLANIFIEE: {
    label: "Planifié",
    bg: "bg-info-soft text-info",
    color: "text-info",
  },
  EN_COURS: {
    label: "En cours",
    bg: "bg-accent-soft text-accent-dark",
    color: "text-accent-dark",
  },
  TERMINE: {
    label: "Terminé",
    bg: "bg-primary-soft text-primary-dark",
    color: "text-primary-dark",
  },
  ANNULE: {
    label: "Annulé",
    bg: "bg-surface-2 text-muted",
    color: "text-muted",
  },
};

export function TrainingStatusBadge({ statut, size = "md" }: TrainingStatusBadgeProps) {
  const config = TRAINING_STATUS_CONFIG[statut] ?? TRAINING_STATUS_CONFIG.PLANIFIEE;
  const sizeClass = size === "sm" ? "text-tiny px-2 py-0.5" : "text-xs px-3 py-1";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium uppercase tracking-wider border ${sizeClass} ${config.bg}`}
    >
      {config.label}
    </span>
  );
}
