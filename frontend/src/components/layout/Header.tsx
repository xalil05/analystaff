"use client";

import { useAuthStore } from "@/stores";

export default function Header() {
  const { user } = useAuthStore();

  const today = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const clubNom = user?.club_nom ? user.club_nom : "Mon Club";

  return (
    <header className="page-header">
      {/* `min-w-0` + `truncate` sur le nom du club, `shrink-0` sur la date :
          sans cela un nom de club long pushing la date hors de l'écran à
          390px. `truncate` ne coupe que ce qui ne tient plus. */}
      <div className="page-header-title min-w-0">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ color: "var(--text-muted)" }}
        >
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
        <span className="font-data text-sm font-medium text-text-strong truncate">
          {clubNom}
        </span>
      </div>
      <div className="page-header-actions shrink-0">
        <span className="text-xs text-muted tabular-nums whitespace-nowrap">
          {today}
        </span>
      </div>
    </header>
  );
}
