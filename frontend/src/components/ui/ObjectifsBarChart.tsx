"use client";

// ─── Barres d'objectifs d'entraînement ──────────────────────────────────────────────
import { useState } from "react";
import type { Objectif } from "@/types";

type ObjectifsBarChartProps = {
  objectifs: Objectif[];
  barColor?: string;
  barHeight?: number;
  showLabels?: boolean;
  size?: "sm" | "md";
};

export function ObjectifsBarChart({
  objectifs,
  barColor = "var(--primary)",
  barHeight = 8,
  showLabels = true,
  size = "md",
}: ObjectifsBarChartProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const max = Math.max(...objectifs.map((o) => o.complet ? 100 : 0), 100);

  return (
    <div className="space-y-2">
      {objectifs.map((obj) => {
        const isExpanded = expandedId === obj.id;
        const pct = ((obj.complet ? 100 : 0) / max) * 100;

        return (
          <div key={obj.id}>
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setExpandedId(isExpanded ? null : obj.id)}
            >
              <div className="flex items-center gap-2">
                {showLabels && (
                  <span className="text-xs font-data font-medium text-text-muted truncate max-w-[160px]">
                    {obj.label}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {obj.complet ? (
                  <Check className="w-3 h-3 text-primary" />
                ) : (
                  <span className="text-xs text-muted">{obj.progression}%</span>
                )}
                <svg
                  className={`w-3 h-3 text-muted transition-transform ${isExpanded ? "rotate-180" : ""}`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            </div>

            {isExpanded && (
              <div className="mt-1 ml-5 pl-3 border-l-2 border-border space-y-1">
                <div className="text-xs text-muted">{obj.description}</div>
                <div
                  className="h-2 rounded-full bg-surface-2 overflow-hidden"
                  style={{ height: `${barHeight}px` }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: barColor,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
