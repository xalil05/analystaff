// ─── Skeleton handlers ──────────────────────────────────────────────────────────────
export function SkeletonText({ width = "100%", height = 14, mb = 8 }: {
  width?: string;
  height?: number;
  mb?: number;
}) {
  return (
    <div
      className="skeleton"
      style={{ width, height, marginBottom: mb }}
    />
  );
}

export function SkeletonHeading({ width = "40%", mb = 16 }: {
  width?: string;
  mb?: number;
}) {
  return (
    <div
      className="skeleton"
      style={{ width, height: 24, marginBottom: mb }}
    />
  );
}

export function SkeletonAvatar({ size = 40 }: { size?: number }) {
  return (
    <div
      className="skeleton rounded-full"
      style={{
        width: size,
        height: size,
      }}
    />
  );
}

export function SkeletonCard({
  lines = 3,
  avatar = true,
  padding = 24,
}: {
  lines?: number;
  avatar?: boolean;
  padding?: number;
}) {
  return (
    <div
      className="skeleton rounded-lg"
      style={{
        padding,
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
      }}
    >
      {avatar && <SkeletonAvatar />}
      <div style={{ marginLeft: avatar ? 60 : 0, marginTop: avatar ? -50 : 0 }}>
        {[...Array(lines)].map((_, i) => (
          <SkeletonText
            key={i}
            width={i === lines - 1 ? "60%" : "100%"}
            height={14}
            mb={i === lines - 1 ? 0 : 8}
          />
        ))}
      </div>
    </div>
  );
}
