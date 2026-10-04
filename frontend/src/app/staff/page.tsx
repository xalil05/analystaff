"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores";
import { staffApi } from "@/lib/api";
import type { StaffMember } from "@/types";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { Clock, Key, Mail, Search, Shield, Users } from "lucide-react";
import Link from "next/link";

// Les libelles de roles viennent de l'API (GET /clubs/{id}/roles → role_label)
// : la table roles en base ne contient que les 3 roles reellement seedes
// (HEAD_COACH, ASSISTANT_COACH, INTENDANT), pas les 9 du mock.

// Filtres alignés sur StaffMemberStatut : actif | suspendu | parti.
// L'ancien "ACTIF_CONDITIONS" n'existe pas côté backend.
type StaffFilter = "tous" | "actifs" | "suspendus" | "partis";

const STATUT_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  actif: { bg: "var(--primary-soft)", color: "var(--primary-hover)", label: "Actif" },
  suspendu: { bg: "var(--destructive-soft)", color: "var(--destructive)", label: "Suspendu" },
  parti: { bg: "var(--surface-2)", color: "var(--text-muted)", label: "Parti" },
};

const COLORS = {
  bg: "var(--bg)",
  surface: "var(--surface)",
  surface2: "var(--surface-2)",
  border: "var(--border)",
  textStrong: "var(--text-strong)",
  textMuted: "var(--text-muted)",
  textFaint: "var(--text-faint)",
  primary: "var(--primary)",
  primarySoft: "var(--primary-soft)",
  primaryDark: "var(--primary-hover)",
  onPrimary: "var(--on-primary)",
  secondary: "var(--secondary)",
  onSecondary: "var(--on-secondary)",
  accent: "var(--accent)",
  accentSoft: "var(--accent-soft)",
  accentDark: "var(--accent-strong)",
  destructive: "var(--destructive)",
  destructiveSoft: "var(--destructive-soft)",
};

function StaffRow({ member }: { member: StaffMember }) {
  const statusColor = STATUT_COLORS[member.statut] ?? STATUT_COLORS.parti;
  const initials = member.user_nom
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  // StaffMemberResponse ne renvoie pas de dernière connexion : le backend
  // l'expose sur le user, pas sur le membre du staff. On affiche donc la
  // date de rattachement (joined_at) en heures humaines.
  const joined = new Date(member.joined_at).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div
      className="p-4 rounded-lg border flex items-center gap-4 hover:shadow-sm transition-shadow"
      style={{ backgroundColor: COLORS.surface, borderColor: COLORS.border }}
    >
      {/* Avatar */}
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center text-on-primary font-data font-bold text-sm shrink-0"
        style={{ backgroundColor: COLORS.primary, color: COLORS.onPrimary }}
      >
        {initials}
      </div>

      {/* Infos */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-data font-semibold" style={{ color: COLORS.textStrong }}>
            {member.user_nom}
          </h3>
          <span className="badge" style={{ backgroundColor: statusColor.bg, color: statusColor.color }}>
            {statusColor.label}
          </span>
        </div>
        <p className="text-sm mt-0.5" style={{ color: COLORS.textMuted }}>
          {member.role_label}
        </p>
      </div>

      {/* Les permissions individuelles ne sont pas dans la liste :
          elles se gèrent via POST /staff/{id}/permissions/{code} et
          nécessitait un appel par membre. Un bouton par membre mènerait
          à un N+1 — l'écran de permissions reste à faire. */}

      {/* Email */}
      <div className="hidden sm:flex items-center gap-1 text-sm" style={{ color: COLORS.textMuted }}>
        <Mail size={12} />
        {member.user_email}
      </div>

      {/* Last sign in */}
      <div className="hidden lg:flex items-center gap-1 text-xs" style={{ color: COLORS.textFaint }}>
        <Clock size={10} />
        Depuis {joined}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <button className="p-1.5 rounded-md hover:bg-surface2 transition-colors" style={{ color: COLORS.textMuted }}>
          <Shield size={14} />
        </button>
        <button className="p-1.5 rounded-md hover:bg-surface2 transition-colors" style={{ color: COLORS.textMuted }}>
          <Key size={14} />
        </button>
      </div>
    </div>
  );
}

export default function StaffPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const clubId = user?.club_id ?? null;

  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<StaffFilter>("tous");
  const [search, setSearch] = useState("");

  const loadStaff = useCallback(async () => {
    if (!isAuthenticated) return;
    if (!clubId) {
      setLoading(false);
      setError("Club non résolu : reconnectez-vous pour charger le staff.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data } = await staffApi.list(clubId);
      setStaff(Array.isArray(data) ? data : []);
    } catch (err) {
      setStaff([]);
      setError(
        err instanceof Error && err.message
          ? err.message
          : "Impossible de charger le staff."
      );
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, clubId]);

  useEffect(() => {
    if (!isAuthenticated) router.push("/login");
  }, [isAuthenticated, router]);

  useEffect(() => {
    void loadStaff();
  }, [loadStaff]);

  const counts = useMemo(
    () => ({
      tous: staff.length,
      actifs: staff.filter((m) => m.statut === "actif").length,
      suspendus: staff.filter((m) => m.statut === "suspendu").length,
      partis: staff.filter((m) => m.statut === "parti").length,
    }),
    [staff]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return staff.filter((m) => {
      const matchFilter =
        filter === "tous" || (filter === "actifs" && m.statut === "actif") ||
        (filter === "suspendus" && m.statut === "suspendu") ||
        (filter === "partis" && m.statut === "parti");
      if (!matchFilter) return false;
      if (!q) return true;
      return (
        m.user_nom.toLowerCase().includes(q) ||
        m.user_email.toLowerCase().includes(q) ||
        m.role_label.toLowerCase().includes(q) ||
        m.role_code.toLowerCase().includes(q)
      );
    });
  }, [staff, filter, search]);

  return (
    <div className="page-main">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-data text-xl font-bold" style={{ color: COLORS.textStrong }}>
              Staff
            </h1>
            <p className="text-sm" style={{ color: COLORS.textMuted }}>
              Gestion de l'encadrement technique
            </p>
          </div>
          {/*
            Le bouton « Ajouter un membre » a été retiré : il n'avait aucun
            gestionnaire. POST /clubs/{id}/staff rattache un utilisateur
            EXISTANT (le backend répond NOT_FOUND sinon), ce qui exige une
            liste de comptes à proposer — un sélecteur, pas un bouton muet.
          */}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Total", count: counts.tous, color: COLORS.primary, bg: COLORS.primarySoft },
            { label: "Actifs", count: counts.actifs, color: COLORS.primaryDark, bg: COLORS.primarySoft },
            { label: "Suspendus", count: counts.suspendus, color: COLORS.accentDark, bg: COLORS.accentSoft },
            { label: "Partis", count: counts.partis, color: COLORS.textFaint, bg: COLORS.surface2 },
          ].map((stat) => (
            <div
              key={stat.label}
              className="card card-sm p-3 text-center"
              style={{ backgroundColor: COLORS.surface }}
            >
              <p className="font-data font-bold text-2xl tabular-nums" style={{ color: stat.color }}>
                {stat.count}
              </p>
              <p className="text-xs uppercase tracking-wider mt-0.5" style={{ color: COLORS.textMuted }}>
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {/* Filtres */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <input
              type="search"
              placeholder="Rechercher dans l'équipe..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input input-with-icon"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: COLORS.textFaint }} />
          </div>
          <div className="flex gap-1">
            {(["tous", "actifs", "suspendus", "partis"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all border"
                style={{
                  backgroundColor: filter === f ? COLORS.primary : "transparent",
                  color: filter === f ? COLORS.onPrimary : COLORS.textMuted,
                  borderColor: filter === f ? COLORS.primary : COLORS.border,
                }}
              >
                {f === "tous"
                  ? "Tous"
                  : f === "actifs"
                  ? "Actifs"
                  : f === "suspendus"
                  ? "Suspendus"
                  : "Partis"}
                <span className="ml-1" style={{ opacity: 0.6 }}>({counts[f]})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Erreur — avec retry (charte §7) */}
        {error && (
          <div className="card p-6 mb-4" role="alert">
            <p className="text-sm mb-3" style={{ color: COLORS.destructive }}>
              {error}
            </p>
            <button
              onClick={() => void loadStaff()}
              className="btn"
              style={{
                backgroundColor: COLORS.primary,
                color: COLORS.onPrimary,
                borderColor: COLORS.primary,
              }}
            >
              Réessayer
            </button>
          </div>
        )}

        {/* Chargement — skeleton, jamais un écran blanc */}
        {loading ? (
          <div className="space-y-2">
            <SkeletonCard avatar lines={2} />
            <SkeletonCard avatar lines={2} />
            <SkeletonCard avatar lines={2} />
          </div>
        ) : filtered.length === 0 ? (
          <div
            className="card p-8 text-center"
            style={{ backgroundColor: COLORS.surface, borderColor: COLORS.border }}
          >
            <Users size={32} style={{ color: COLORS.textFaint }} />
            <p className="text-sm mt-3" style={{ color: COLORS.textMuted }}>
              {search || filter !== "tous"
                ? "Aucun membre ne correspond à ce filtre."
                : "Aucun membre dans le staff."}
            </p>
            <p className="text-xs mt-1" style={{ color: COLORS.textFaint }}>
              {search || filter !== "tous"
                ? "Modifiez la recherche ou le filtre."
                : "Rattachez un utilisateur existant à votre club pour lui donner un rôle."}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((member) => <StaffRow key={member.id} member={member} />)}
          </div>
        )}
    </div>
  );
}

