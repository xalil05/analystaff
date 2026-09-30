// ─── Fabrique de barres de progression par poste ─────────────────────────────────────
import type { PosteGenre } from "@/types";

type PosteBarChartProps = {
  data: Array<{
    poste: string;
    valeur: number; // 0-100
    max?: number;
  }>;
  barColor?: string;
  barHeight?: number;
  showValues?: boolean;
  size?: "sm" | "md";
};

const DEFAULT_COLORS = ["#10B981", "#0D9488", "#059669", "#047857", "#34D399"];

export function PosteBarChart({
  data,
  barColor,
  barHeight = 8,
  showValues = true,
  size = "md",
}: PosteBarChartProps) {
  return (
    <div className="space-y-3">
      {data.map((item, index) => {
        const pct = Math.min((item.valeur / (item.max ?? 100)) * 100, 100);
        const color =
          barColor ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length];

        return (
          <div key={item.poste} className="flex items-center gap-3">
            <span
              className={`font-data font-medium text-sm shrink-0 w-24 text-right ${
                size === "sm" ? "text-xs" : "text-sm"
              } text-text-muted`}
              style={{ fontFamily: "var(--font-data)" }}
            >
              {item.poste.toUpperCase().slice(0, 8)}
            </span>
            <div
              className="flex-1 h-2 rounded-full bg-surface-2 overflow-hidden"
              style={{
                height: `${barHeight}px`,
                backgroundColor: "var(--surface-2)",
              }}
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
            {showValues && (
              <span
                className={`font-data font-bold text-sm tabular-nums w-10 text-right text-text-strong ${
                  size === "sm" ? "text-xs" : "text-sm"
                }`}
              >
                {item.valeur.toFixed(0)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
