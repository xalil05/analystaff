import { RadarChart } from "@/components/radar/RadarChart";
import type { PillarNote } from "@/types";

type PlayerRadarProps = {
  pillars: PillarNote[];
  clubMoyenne: PillarNote[] | null;
  size?: number;
  noteGlobale?: number | null;
};

export default function PlayerRadarCard({
  pillars,
  clubMoyenne,
  size = 200,
  noteGlobale,
}: PlayerRadarProps) {
  return (
    <div className="flex flex-col items-center gap-4">
      <RadarChart
        pillars={pillars}
        clubMoyenne={clubMoyenne}
        size={size}
      />
      {noteGlobale !== null && (
        <div className="num-xl text-text-strong font-data font-bold tabular-nums">
          {noteGlobale.toFixed(1)}
        </div>
      )}
    </div>
  );
}
