// ─── Badge de statut match ──────────────────────────────────────────────────────────
type MatchStatus = "PLANIFIE" | "EN_COURS" | "TERMINE" | "ANNULE";

type MatchStatusBadgeProps = {
  statut: MatchStatus;
  size?: "sm" | "md";
};

const MATCH_STATUS_CONFIG: Record<
  MatchStatus,
  { label: string; bg: string; color: string }
> = {
  PLANIFIE: {
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

export function MatchStatusBadge({ statut, size = "md" }: MatchStatusBadgeProps) {
  const config = MATCH_STATUS_CONFIG[statut] ?? MATCH_STATUS_CONFIG.PLANIFIE;
  const sizeClass = size === "sm" ? "text-tiny px-2 py-0.5" : "text-xs px-3 py-1";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium uppercase tracking-wider border ${sizeClass} ${config.bg}`}
    >
      {config.label}
    </span>
  );
}
