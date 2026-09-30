"use client";

// ─── Carte joueur (liste + détail) ─────────────────────────────────────────────────
import type { Player } from "@/types";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/StatusBadge";

type PlayerCardProps = {
  joueur: Player;
  index?: number;
  showPhoto?: boolean;
};

export function PlayerCard({ joueur, index = 0, showPhoto = true }: PlayerCardProps) {
  const initials = `${joueur.prenom?.[0] ?? ""}${joueur.nom?.[0] ?? ""}`.toUpperCase() || "?";

  return (
    <Link
      href={`/joueurs/${joueur.id}`}
      className="card block p-4 hover:shadow-lift transition-shadow group cursor-pointer"
    >
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-white font-data font-bold text-sm shrink-0"
          style={{ backgroundColor: "var(--primary)" }}
        >
          {joueur.photo_url && showPhoto ? (
            <img
              src={joueur.photo_url}
              alt=""
              className="w-full h-full rounded-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            initials
          )}
        </div>

        {/* Infos */}
        <div className="flex-1 min-w-0">
          <h3 className="font-data font-semibold text-text-strong text-base truncate group-hover:text-primary transition-colors">
            {joueur.prenom} {joueur.nom}
          </h3>
          <p className="text-xs text-muted mt-0.5 truncate">
            {POSTES_LABELS[joueur.poste_principal] ?? joueur.poste_principal}
            {joueur.postes_secondaires.length > 0 && (
              <> · {joueur.postes_secondaires.map((p) => POSTES_LABELS[p] ?? p).join(", ")}</>
            )}
          </p>
        </div>

        {/* Statut + Numéro */}
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge statut={joueur.statut} size="sm" />
          {joueur.numero_maillot && (
            <span className="text-xs font-data font-bold text-muted tabular-nums bg-surface-2 px-2 py-0.5 rounded-full">
              N°{joueur.numero_maillot}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

const POSTES_LABELS: Record<string, string> = {
  GARDIEN: "Gardien",
  DEFENSEUR_CENTRAL: "Défenseur central",
  DEFENSEUR_LATERAL: "Défenseur latéral",
  MILIEU_CENTRAL: "Milieu central",
  MILIEU_OFFENSIF: "Milieu offensif",
  ATTAQUANT: "Attaquant",
  POLYVALENT: "Polyvalent",
};
