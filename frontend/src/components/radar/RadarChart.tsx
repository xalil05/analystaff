"use client";

// ─── Graphique radar (4 piliers) ────────────────────────────────────────────────────
// Voir CHARTE_VISUELLE_FRONTEND.md §5.1
// Radar remplissage émeraude semi-transparent, trait 2px, moyenne club en pointillés,
// note globale en Space Grotesk 34-44px au centre, légende avec valeurs et barres.

import { useMemo } from "react";
import type { PillarNote } from "@/types";

type RadarChartProps = {
  pillars: PillarNote[];
  clubMoyenne: PillarNote[] | null;
  size?: number;
  showLegend?: boolean;
  noteGlobale?: number | null;
};

const PILLAR_CONFIG = {
  physique: { label: "Physique", color: "var(--pillar-physique)", textColor: "var(--pillar-physique-text)" },
  technique: { label: "Technique", color: "var(--pillar-technique)", textColor: "var(--pillar-technique-text)" },
  tactique: { label: "Tactique", color: "var(--pillar-tactique)", textColor: "var(--pillar-tactique-text)" },
  mental: { label: "Mental", color: "var(--pillar-mental)", textColor: "var(--pillar-mental-text)" },
} as const;

function getPoints(
  pillars: PillarNote[],
  maxR: number,
  cx: number,
  cy: number
): { x: number; y: number }[] {
  const pillarMap = new Map(pillars.map((p) => [p.pilier, p.note]));
  const indices = ["physique", "technique", "tactique", "mental"] as const;
  return indices.map((_, i) => {
    const angle = (Math.PI * 2 * i) / 4 - Math.PI / 2;
    const val = pillarMap.get(indices[i]) ?? 0;
    const r = (val / 10) * maxR;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  });
}

export function RadarChart({
  pillars,
  clubMoyenne,
  size = 160,
  showLegend = true,
  noteGlobale,
}: RadarChartProps) {
  const { points, clubPoints, maxR, cx, cy } = useMemo(() => {
    const maxR = 60;
    const cx = size / 2;
    const cy = size / 2;
    return {
      points: getPoints(pillars, maxR, cx, cy),
      clubPoints: clubMoyenne ? getPoints(clubMoyenne, maxR, cx, cy) : [],
      maxR,
      cx,
      cy,
    };
  }, [pillars, clubMoyenne, size]);

  const levels = 4;

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-label="Radar 4 piliers">
        {/* Grille concentrique */}
        {Array.from({ length: levels }).map((_, l) => {
          const points = [0, 1, 2, 3].map((i) => {
            const angle = (Math.PI * 2 * i) / 4 - Math.PI / 2;
            const r = (maxR * (l + 1)) / levels;
            return `${(cx + r * Math.cos(angle)).toFixed(1)},${(cy + r * Math.sin(angle)).toFixed(1)}`;
          });
          return (
            <polygon
              key={l}
              points={points.join(" ")}
              fill="none"
              stroke="var(--border)"
              strokeWidth={1}
            />
          );
        })}

        {/* Axes */}
        {[0, 1, 2, 3].map((i) => {
          const angle = (Math.PI * 2 * i) / 4 - Math.PI / 2;
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={cx + maxR * Math.cos(angle)}
              y2={cy + maxR * Math.sin(angle)}
              stroke="var(--border)"
              strokeWidth={1}
            />
          );
        })}

        {/* Club moyenne (pointillés) */}
        {clubMoyenne && (
          <polygon
            points={clubPoints.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")}
            fill="none"
            stroke="var(--text-faint)"
            strokeWidth={1}
            strokeDasharray="4,3"
            opacity={0.7}
          />
        )}

        {/* Polygone joueur */}
        <polygon
          points={points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")}
          fill="oklch(0.69 0.15 165 / 0.14)"
          stroke="var(--primary)"
          strokeWidth={2}
        />

        {/* Points joueur */}
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={3} fill="var(--primary)" />
        ))}

        {/* Labels axes */}
        {(["physique", "technique", "tactique", "mental"] as const).map((pilier, i) => {
          const angle = (Math.PI * 2 * i) / 4 - Math.PI / 2;
          const labelR = maxR + 18;
          const x = cx + labelR * Math.cos(angle);
          const y = cy + labelR * Math.sin(angle);
          const config = PILLAR_CONFIG[pilier];
          return (
            <text
              key={pilier}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={8}
              fontWeight={600}
              fill={config.textColor}
              style={{ fontFamily: "var(--font-data)" }}
            >
              {config.label.toUpperCase()}
            </text>
          );
        })}
      </svg>

      {/* Note globale */}
      {noteGlobale != null && (
        <div
          className="num-xl text-text-strong mt-1"
          style={{
            fontFamily: "var(--font-data)",
            fontSize: "34px",
            fontWeight: 700,
            lineHeight: 1,
            letterSpacing: "-0.02em",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {noteGlobale.toFixed(1)}
        </div>
      )}

      {/* Légende */}
      {showLegend && (
        <div className="flex flex-col gap-1.5 mt-3 w-full max-w-[120px]">
          {pillars.map((p) => (
            <div key={p.pilier} className="flex items-center justify-between gap-2">
              <span
                className="w-2 h-2 rounded-sm"
                style={{ backgroundColor: PILLAR_CONFIG[p.pilier].color }}
              />
              <span className="text-xs font-data font-medium text-text-strong tabular-nums">
                {p.note.toFixed(1)}
              </span>
              <span className="text-xs text-muted" style={{ fontFamily: "var(--font-data)" }}>
                {PILLAR_CONFIG[p.pilier].label}
              </span>
            </div>
          ))}
          {/* Commentaire terrain */}
          <div className="mt-2 pt-2 border-t border-border">
            <p className="text-xs text-muted italic">Moyenne club en pointillés</p>
          </div>
        </div>
      )}
    </div>
  );
}
