// ─── Barre de pourcentage (piliers) ──────────────────────────────────────────────────
// Utilisée pour visualiser les notes par pilier (physique, technique, tactique, mental).

type PillarBarProps = {
  label: string;
  value: number; // 0-10
  max?: number;
  color: string;
  showValue?: boolean;
  size?: "sm" | "md";
  barHeight?: number;
};

export function PillarBar({
  label,
  value,
  max = 10,
  color,
  showValue = true,
  size = "md",
  barHeight = 6,
}: PillarBarProps) {
  const pct = Math.min((value / max) * 100, 100);
  const labelSize = size === "sm" ? "text-xs" : "text-sm";
  const valueSize = size === "sm" ? "text-xs" : "text-sm";

  return (
    <div className="pillar-bar">
      <span className={`pillar-barlabel ${labelSize} text-text-medium`} style={{ width: size === "sm" ? 60 : 80 }}>
        {label}
      </span>
      <div
        className="pillar-bar-track"
        style={{
          flex: 1,
          height: `${barHeight}px`,
          backgroundColor: "var(--surface-2)",
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        <div
          className="pillar-bar-fill"
          style={{
            height: "100%",
            backgroundColor: color,
            borderRadius: 3,
            width: `${pct}%`,
          }}
        />
      </div>
      {showValue && (
        <span
          className={`pillar-bar-value font-data font-bold tabular-nums ${valueSize}`}
          style={{ color: "var(--text-strong)", width: size === "sm" ? 24 : 32, textAlign: "right" }}
        >
          {value.toFixed(1)}
        </span>
      )}
    </div>
  );
}
