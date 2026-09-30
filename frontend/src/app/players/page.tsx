"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { PlayerCard } from "@/components/player/PlayerCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {ChevronDown, Filter, Grid3X3, List, Plus, Search, User, Users, X} from "lucide-react";
import Link from "next/link";
import type { Joueur, PlayerStatut } from "@/types";

// ── Interface ────────────────────────────────────────────────────────────────────
type ViewMode = "grid" | "list";
type FilterMode = PlayerStatut | "tous";

const STATUT_FILTERS: { value: PlayerStatut | "tous"; label: string }[] = [
  { value: "tous", label: "Tous" },
  { value: "ACTIF", label: "Actifs" },
  { value: "BLESSE", label: "Blessés" },
  { value: "REPRISE", label: "Reprise" },
  { value: "SUSPENDU", label: "Suspensions" },
  { value: "INDISPONIBLE", label: "Indisponibles" },
  { value: "ARCHIVE", label: "Archives" },
];

// ── Données mockées (MVP — alignées SCHÉMA_SQL.md) ──────────────────────────────
const MOCK_JOUEURS: Joueur[] = [
  {
    id: "j1",
    club_id: "c1",
    prenom: "Sadio",
    nom: "Mané",
    poste_principal: "ATTAQUANT",
    postes_secondaires: ["AILIER_GAUCHE"],
    numero_maillot: 10,
    photo_url: null,
    statut: "ACTIF",
    date_naissance: "1992-04-10",
    taille: 174,
    poids: 69,
    charge_travail: 642,
  },
  {
    id: "j2",
    club_id: "c1",
    prenom: "Kalidou",
    nom: "Koulibaly",
    poste_principal: "DEFENSEUR_CENTRAL",
    postes_secondaires: [],
    numero_maillot: 6,
    photo_url: null,
    statut: "ACTIF",
    date_naissance: "1991-06-20",
    taille: 186,
    poids: 88,
    charge_travail: 720,
  },
  {
    id: "j3",
    club_id: "c1",
    prenom: "Idrissa",
    nom: "Gueye",
    poste_principal: "MILIEU_CENTRAL",
    postes_secondaires: ["MILIEU_DEFENSIF"],
    numero_maillot: 8,
    photo_url: null,
    statut: "ACTIF",
    date_naissance: "1995-09-15",
    taille: 185,
    poids: 78,
    charge_travail: 584,
  },
  {
    id: "j4",
    club_id: "c1",
    prenom: "Édouard",
    nom: "Mendy",
    poste_principal: "GARDIEN",
    postes_secondaires: [],
    numero_maillot: 1,
    photo_url: null,
    statut: "ACTIF",
    date_naissance: "1992-03-19",
    taille: 189,
    poids: 82,
    charge_travail: 510,
  },
  {
    id: "j5",
    club_id: "c1",
    prenom: "Ismaïla",
    nom: "Sarr",
    poste_principal: "AILIER_DROIT",
    postes_secondaires: ["ATTAQUANT"],
    numero_maillot: 12,
    photo_url: null,
    statut: "BLESSE",
    date_naissance: "1993-03-22",
    taille: 178,
    poids: 72,
    charge_travail: 420,
  },
  {
    id: "j6",
    club_id: "c1",
    prenom: "Famara",
    nom: "Diédhiou",
    poste_principal: "MILIEU_CENTRAL",
    postes_secondaires: [],
    numero_maillot: 17,
    photo_url: null,
    statut: "ACTIF",
    date_naissance: "1991-12-19",
    taille: 187,
    poids: 83,
    charge_travail: 603,
  },
  {
    id: "j7",
    club_id: "c1",
    prenom: "Pape",
    nom: "Alberto",
    poste_principal: "DEFENSEUR_LATERAL",
    postes_secondaires: ["LATERAL_GAUCHE"],
    numero_maillot: 2,
    photo_url: null,
    statut: "ACTIF",
    date_naissance: "1994-06-23",
    taille: 175,
    poids: 70,
    charge_travail: 488,
  },
  {
    id: "j8",
    club_id: "c1",
    prenom: "Lamine",
    nom: "Garde",
    poste_principal: "ATTAQUANT",
    postes_secondaires: ["AILIER_GAUCHE"],
    numero_maillot: 19,
    photo_url: null,
    statut: "SUSPENDU",
    date_naissance: "1995-12-20",
    taille: 178,
    poids: 73,
    charge_travail: 320,
  },
  {
    id: "j9",
    club_id: "c1",
    prenom: "Abdou",
    nom: "Diallo",
    poste_principal: "GARDIEN",
    postes_secondaires: [],
    numero_maillot: 16,
    photo_url: null,
    statut: "REPRISE",
    date_naissance: "1990-05-30",
    taille: 191,
    poids: 85,
    charge_travail: 120,
  },
  {
    id: "j10",
    club_id: "c1",
    prenom: "Nicolas",
    nom: "Jallow",
    poste_principal: "AILIER_DROIT",
    postes_secondaires: ["ATTAQUANT"],
    numero_maillot: 11,
    photo_url: null,
    statut: "ACTIF",
    date_naissance: "1996-02-14",
    taille: 176,
    poids: 71,
    charge_travail: 556,
  },
  {
    id: "j11",
    club_id: "c1",
    prenom: "Boubacar",
    nom: "Barry",
    poste_principal: "DEFENSEUR_CENTRAL",
    postes_secondaires: [],
    numero_maillot: 4,
    photo_url: null,
    statut: "INDISPONIBLE",
    date_naissance: "1998-07-04",
    taille: 184,
    poids: 80,
    charge_travail: 432,
  },
  {
    id: "j12",
    club_id: "c1",
    prenom: "Khady",
    nom: "Toure",
    poste_principal: "MILIEU_OFFENSIF",
    postes_secondaires: ["MILIEU_CENTRAL"],
    numero_maillot: 15,
    photo_url: null,
    statut: "ACTIF",
    date_naissance: "2001-11-11",
    taille: 172,
    poids: 67,
    charge_travail: 518,
  },
];

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
  const statutLabel =
    joueur.statut === "ACTIF"
      ? "Actif"
      : joueur.statut === "BLESSE"
      ? "Blessé"
      : joueur.statut === "REPRISE"
      ? "Reprise"
      : joueur.statut === "SUSPENDU"
      ? "Suspendu"
      : joueur.statut === "INDISPONIBLE"
      ? "Indisponible"
      : "Archivé";

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
          {joueur.prenom} {joueur.nom}
        </p>
        <p className="text-xs truncate" style={{ color: COLORS.muted }}>
          {POSTES_LABELS[joueur.poste_principal] ?? joueur.poste_principal}
        </p>
      </div>

      {/* Numéro */}
      {joueur.numero_maillot && (
        <span
          className="text-xs font-data font-bold tabular-nums bg-surface2 px-2 py-0.5 rounded-full shrink-0"
          style={{ color: COLORS.muted }}
        >
          N°{joueur.numero_maillot}
        </span>
      )}

      {/* Taille / Poids */}
      <div className="text-xs tabular-nums shrink-0 hidden sm:block" style={{ color: COLORS.muted }}>
        {joueur.taille ?? "—"}cm / {joueur.poids ?? "—"}kg
      </div>

      {/* Charge */}
      <div className="text-xs font-data font-semibold tabular-nums shrink-0 hidden md:block" style={{ color: COLORS.primary }}>
        {joueur.charge_travail ?? 0}
      </div>

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
  const { isAuthenticated } = useAuthStore();

  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [filterMode, setFilterMode] = useState<FilterMode>("tous");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!isAuthenticated) router.push("/login");
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;

  // Filtrage
  const filtered = useMemo(() => {
    let result = MOCK_JOUEURS;

    // Filtre statut
    if (filterMode !== "tous") {
      result = result.filter((j) => j.statut === filterMode);
    }

    // Recherche
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (j) =>
          `${j.prenom} ${j.nom}`.toLowerCase().includes(q) ||
          (j.poste_principal ?? "").toLowerCase().includes(q) ||
          String(j.numero_maillot).includes(q)
      );
    }

    return result;
  }, [filterMode, search]);

  // Stats
  const stats = useMemo(() => {
    const total = MOCK_JOUEURS.length;
    const actifs = MOCK_JOUEURS.filter((j) => j.statut === "ACTIF").length;
    const blesses = MOCK_JOUEURS.filter((j) => j.statut === "BLESSE").length;
    const autres = total - actifs - blesses;
    return { total, actifs, blesses, autres };
  }, []);

  return (
    <div className="page-wrapper">
      <Sidebar />
      <main className="page-content ml-56" style={{ backgroundColor: COLORS.bg }}>
        <Header />
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
      </main>
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
