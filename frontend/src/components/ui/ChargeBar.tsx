// ─── Barre de progression de charge ─────────────────────────────────────────────────
type ChargeBarProps = {
  value: number; // 0-100
  max?: number;
  showLabel?: boolean;
  size?: "sm" | "md";
  colorOverride?: string;
};

const CHARGE_THRESHOLDS = {
  low: { max: 70, color: "var(--primary)", bgLight: "var(--primary-soft)" },
  medium: { max: 85, color: "var(--accent)", bgLight: "var(--accent-soft)" },
  high: { max: 100, color: "var(--destructive)", bgLight: "bg-destructive-soft" },
};

function getChargeColor(value: number): { color: string; bgLight: string } {
  if (value > 85) {
    return { color: CHARGE_THRESHOLDS.high.color, bgLight: CHARGE_THRESHOLDS.high.bgLight };
  }
  if (value > 70) {
    return { color: CHARGE_THRESHOLDS.medium.color, bgLight: CHARGE_THRESHOLDS.medium.bgLight };
  }
  return { color: CHARGE_THRESHOLDS.low.color, bgLight: CHARGE_THRESHOLDS.low.bgLight };
}

export function ChargeBar({
  value,
  max = 100,
  showLabel = true,
  size = "md",
  colorOverride,
}: ChargeBarProps) {
  const pct = Math.min((value / max) * 100, 100);
  const { color } = colorOverride
    ? { color: colorOverride }
    : getChargeColor(value);

  const barHeight = size === "sm" ? 6 : 8;
  const labelSize = size === "sm" ? "text-tiny" : "text-sm";

  return (
    <div className="flex items-center gap-3">
      {showLabel && (
        <span className={`font-data font-medium text-sm shrink-0 ${labelSize}`} style={{ color: "var(--text-muted)" }}>
          {value}%
        </span>
      )}
      <div
        className="flex-1 h-2 md:h-2 bg-surface-2 rounded-full overflow-hidden"
        style={{ height: barHeight }}
      >
        <div
          className="h-full rounded-full transition-transform duration-300"
          style={{
            transform: `scaleX(${pct / 100})`,
            transformOrigin: "left",
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  );
}
