"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores";
import { joueursApi } from "@/lib/api";
import { PlayerCard } from "@/components/player/PlayerCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SkeletonCard } from "@/components/ui/Skeleton";
import {ChevronDown, Filter, Grid3X3, List, Plus, Search, User, Users, X} from "lucide-react";
import Link from "next/link";
import type { Joueur, PlayerStatut } from "@/types";

// ── Interface ────────────────────────────────────────────────────────────────────
type ViewMode = "grid" | "list";
type FilterMode = PlayerStatut | "tous";

const STATUT_FILTERS: { value: PlayerStatut | "tous"; label: string }[] = [
  { value: "tous", label: "Tous" },
  { value: "actif", label: "Actifs" },
  { value: "blesse", label: "Blessés" },
  { value: "suspendu", label: "Suspensions" },
  { value: "parti", label: "Partis" },
  { value: "archive", label: "Archives" },
];

// ── Données mockées (MVP — alignées SCHÉMA_SQL.md) ──────────────────────────────

const COLORS = {
  bg: "var(--bg)",
  surface: "var(--surface)",
  surface2: "var(--surface-2)",
  line: "var(--border)",
  lineStrong: "var(--line-strong)",
  textStrong: "var(--text-strong)",
  text: "var(--text)",
  muted: "var(--text-muted)",
  faint: "var(--text-faint)",
  primary: "var(--primary)",
  primarySoft: "var(--primary-soft)",
  primaryText: "var(--pillar-physique-text)",
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Non renseignée";
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function StatutFilter({
  value,
  onChange,
}: {
  value: PlayerStatut | "tous";
  onChange: (v: PlayerStatut | "tous") => void;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as PlayerStatut | "tous")}
        className="select w-full"
        style={{
          backgroundColor: COLORS.surface,
          borderColor: COLORS.line,
          color: COLORS.text,
          paddingRight: 32,
        }}
      >
        {STATUT_FILTERS.map((f) => (
          <option key={f.value} value={f.value}>
            {f.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={14}
        style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", color: COLORS.muted }}
      />
    </div>
  );
}

function TableRow({ joueur }: { joueur: Joueur }) {
  return (
    <Link
      href={`/players/${joueur.id}`}
      className="flex items-center gap-4 p-3 rounded-lg hover:shadow-sm transition-shadow border-b last:border-b-0"
      style={{ backgroundColor: COLORS.surface, borderColor: COLORS.line }}
    >
      {/* Avatar */}
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-data font-bold text-sm shrink-0"
        style={{ backgroundColor: COLORS.primary }}
      >
        {joueur.prenom?.[0] ?? ""}
        {joueur.nom?.[0] ?? ""}
      </div>

      {/* Infos */}
      <div className="flex-1 min-w-0">
        <p className="font-data font-medium text-sm truncate" style={{ color: COLORS.textStrong }}>
          {joueur.prenom ?? ""} {joueur.nom}
        </p>
        <p className="text-xs truncate" style={{ color: COLORS.muted }}>
          {joueur.poste ? POSTES_LABELS[joueur.poste] ?? joueur.poste : "Poste non renseigné"}
        </p>
      </div>

      {/* Numéro */}
      {joueur.numero && (
        <span
          className="text-xs font-data font-bold tabular-nums bg-surface2 px-2 py-0.5 rounded-full shrink-0"
          style={{ color: COLORS.muted }}
        >
          N°{joueur.numero}
        </span>
      )}

      {/* Taille / poids / charge : absents de la réponse de liste.
          Le profil physique est une ressource séparée
          (/players/{id}/physical) — l'afficher ici imposerait une requête
          par joueur. Ces colonnes sontprevues sur la fiche joueur. */}

      {/* Statut */}
      <StatusBadge statut={joueur.statut} size="sm" />
    </Link>
  );
}

function GridItem({ joueur }: { joueur: Joueur }) {
  return (
    <PlayerCard joueur={joueur} index={0} showPhoto={false} />
  );
}

export default function PlayersPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const clubId = user?.club_id ?? null;

  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [filterMode, setFilterMode] = useState<FilterMode>("tous");
  const [search, setSearch] = useState("");
  const [joueurs, setJoueurs] = useState<Joueur[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadJoueurs = useCallback(async () => {
    if (!isAuthenticated) return;
    if (!clubId) {
      // Sans club résolu (voir /auth/me au login) on ne peut pas requêter.
      setLoading(false);
      setError("Club non résolu : reconnectez-vous pour charger l'effectif.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data } = await joueursApi.list(clubId);
      setJoueurs(Array.isArray(data) ? data : []);
    } catch (err) {
      setJoueurs([]);
      setError(
        err instanceof Error && err.message
          ? err.message
          : "Impossible de charger l'effectif."
      );
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, clubId]);

  useEffect(() => {
    if (!isAuthenticated) router.push("/login");
  }, [isAuthenticated, router]);

  useEffect(() => {
    void loadJoueurs();
  }, [loadJoueurs]);

  // Filtrage
  const filtered = useMemo(() => {
    let result = joueurs;

    // Filtre statut
    if (filterMode !== "tous") {
      result = result.filter((j) => j.statut === filterMode);
    }

    // Recherche
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (j) =>
          `${j.prenom ?? ""} ${j.nom}`.toLowerCase().includes(q) ||
          (j.poste ?? "").toLowerCase().includes(q) ||
          String(j.numero).includes(q)
      );
    }

    return result;
  }, [joueurs, filterMode, search]);

  // Stats
  const stats = useMemo(() => {
    const total = joueurs.length;
    const actifs = joueurs.filter((j) => j.statut === "actif").length;
    const blesses = joueurs.filter((j) => j.statut === "blesse").length;
    const autres = total - actifs - blesses;
    return { total, actifs, blesses, autres };
  }, []);

  return (
    <div className="page-main">
        {/* En-tête */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="font-data text-xl font-bold" style={{ color: COLORS.textStrong }}>
              Effectif
            </h1>
            <p className="text-sm" style={{ color: COLORS.muted }}>
              {stats.total} joueurs · {stats.actifs} actifs
            </p>
          </div>
          <Link
            href="/players/new"
            className="btn btn-primary gap-2"
            style={{ backgroundColor: COLORS.primary, color: "var(--on-primary)", borderColor: COLORS.primary }}
          >
            <Plus size={16} />
            Nouveau joueur
          </Link>
        </div>

        {/* Stats rapides */}
        <div
          className="grid grid-cols-3 gap-4 mb-6 rounded-lg overflow-hidden"
          style={{ backgroundColor: COLORS.surface, border: `1px solid ${COLORS.line}` }}
        >
          <div className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: COLORS.primarySoft }}>
              <Users size={16} style={{ color: COLORS.primary }} />
            </div>
            <div>
              <p className="font-data font-bold text-lg tabular-nums" style={{ color: COLORS.textStrong }}>
                {stats.total}
              </p>
              <p className="text-xs" style={{ color: COLORS.muted }}>Total</p>
            </div>
          </div>
          <div className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: COLORS.primarySoft }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.primary }} />
            </div>
            <div>
              <p className="font-data font-bold text-lg tabular-nums" style={{ color: COLORS.textStrong }}>
                {stats.actifs}
              </p>
              <p className="text-xs" style={{ color: COLORS.muted }}>Actifs</p>
            </div>
          </div>
          <div className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: "var(--destructive-soft)" }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "var(--destructive)" }} />
            </div>
            <div>
              <p className="font-data font-bold text-lg tabular-nums" style={{ color: COLORS.textStrong }}>
                {stats.blesses}
              </p>
              <p className="text-xs" style={{ color: COLORS.muted }}>Blessés</p>
            </div>
          </div>
        </div>

        {/* Barre de filtres */}
        <div
          className="flex items-center gap-3 mb-4 p-3 rounded-lg"
          style={{ backgroundColor: COLORS.surface, border: `1px solid ${COLORS.line}` }}
        >
          <div className="flex-1 relative">
            <Search
              size={15}
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                color: COLORS.muted,
              }}
            />
            <input
              type="text"
              placeholder="Rechercher par nom, poste, numéro…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-8"
              style={{ backgroundColor: COLORS.surface }}
            />
          </div>

          <StatutFilter value={filterMode} onChange={setFilterMode} />

          <div className="flex items-center gap-1 p-1 rounded-lg" style={{ backgroundColor: COLORS.surface2 }}>
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-md transition-all ${viewMode === "grid" ? "bg-surface" : ""}`}
              style={{
                color:
                  viewMode === "grid"
                    ? COLORS.primary
                    : COLORS.muted,
              }}
              aria-label="Vue grille"
            >
              <Grid3X3 size={15} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-md transition-all ${viewMode === "list" ? "bg-surface" : ""}`}
              style={{
                color:
                  viewMode === "list"
                    ? COLORS.primary
                    : COLORS.muted,
              }}
              aria-label="Vue liste"
            >
              <List size={15} />
            </button>
          </div>
        </div>

        {/* Résultats */}
        {filtered.length === 0 ? (
          <div
            className="card card-lg flex flex-col items-center justify-center py-16"
            style={{ backgroundColor: COLORS.surface, textAlign: "center" }}
          >
            <Users
              size={32}
              style={{ color: COLORS.faint, marginBottom: 8 }}
            />
            <p className="font-data font-semibold text-text-strong" style={{ color: COLORS.textStrong }}>
              Aucun joueur trouvé
            </p>
            <p className="text-sm mt-1" style={{ color: COLORS.muted }}>
              {search
                ? "Modifiez votre recherche ou vos filtres"
                : "Importez votre effectif (CSV) ou créez un joueur"}
            </p>
            <div className="flex gap-2 mt-4">
              <Link
                href="/players/new"
                className="btn btn-primary"
                style={{ backgroundColor: COLORS.primary, color: "var(--on-primary)", borderColor: COLORS.primary }}
              >
                <Plus size={14} />
                Ajouter un joueur
              </Link>
            </div>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((joueur) => (
              <GridItem key={joueur.id} joueur={joueur} />
            ))}
          </div>
        ) : (
          <div>
            {filtered.map((joueur) => (
              <TableRow key={joueur.id} joueur={joueur} />
            ))}
          </div>
        )}
    </div>
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
  LATERAL_DROIT: "Latéral droit",
  LATERAL_GAUCHE: "Latéral gauche",
  MILIEU_DEFENSIF: "Milieu défensif",
  AILIER_DROIT: "Ailier droit",
  AILIER_GAUCHE: "Ailier gauche",
};
