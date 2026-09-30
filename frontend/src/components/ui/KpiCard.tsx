// ─── Carte KPI (dashboard) ──────────────────────────────────────────────────────────
import { TrendingUp, TrendingDown } from "lucide-react";

type KpiCardProps = {
  label: string;
  value: string | number;
  icon: React.ElementType;
  delta?: string;
  deltaUp?: boolean;
  deltaDown?: boolean;
  variant?: "default" | "high-priority";
  iconBg?: string;
  iconColor?: string;
};

export function KpiCard({
  label,
  value,
  icon: Icon,
  delta,
  deltaUp = false,
  deltaDown = false,
  variant = "default",
  iconBg = "var(--primary-soft)",
  iconColor = "var(--primary-dark)",
}: KpiCardProps) {
  return (
    <div
      className={`card card-sm p-4 ${variant === "high-priority" ? "border-primary" : ""}`}
      style={
        variant === "high-priority"
          ? { backgroundColor: "var(--primary-soft)", borderColor: "var(--primary)" }
          : undefined
      }
    >
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center mb-3 shrink-0"
        style={{ backgroundColor: iconBg, color: iconColor }}
      >
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p
            className="num-lg text-text-strong"
            style={{
              fontFamily: "var(--font-data)",
              fontSize: "30px",
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {value}
          </p>
          <p className="text-tiny font-medium uppercase tracking-wider text-muted mt-2">
            {label}
          </p>
        </div>
        {delta && (
          <div className="flex items-center gap-0.5 shrink-0">
            {deltaUp ? (
              <TrendingUp className="w-3 h-3 text-primary-dark" />
            ) : deltaDown ? (
              <TrendingDown className="w-3 h-3 text-destructive" />
            ) : null}
            <span
              className="text-tiny font-medium tabular-nums"
              style={{
                color: deltaUp
                  ? "var(--primary-dark)"
                  : deltaDown
                  ? "var(--destructive)"
                  : "var(--text-muted)",
              }}
            >
              {delta}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
