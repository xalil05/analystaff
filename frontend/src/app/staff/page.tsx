"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores";
import { staffApi } from "@/lib/api";
import { Calendar, Clock, Filter, Key, List, Mail, Plus, Search, Shield, User, Users } from "lucide-react";
import Link from "next/link";

// ── Types ────────────────────────────────────────────────────────────────────────

type StaffRole =
  | "HEAD_COACH"
  | "ASSISTANT_COACH"
  | "FITNESS_COACH"
  | "GOALKEEPER_COACH"
  | "ANALYST"
  | "MEDICAL_STAFF"
  | "PSYCHOLOGIST"
  | "KIT_MANAGER"
  | "ADMIN_CLUB";

interface StaffMember {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  role: StaffRole;
  photo_url: string | null;
  permissions: string[];
  statut: string;
  dernier_sign_in: string;
}

// ── Données mockées ──────────────────────────────────────────────────────────────

const MOCK_STAFF: StaffMember[] = [
  { id: "1", prenom: "Aliou", nom: "Cissé", email: "coach@analistaff.sn", role: "HEAD_COACH", photo_url: null, permissions: ["*"], statut: "ACTIF", dernier_sign_in: "2026-08-14T21:14:00Z" },
  { id: "2", prenom: "Régis", nom: "Le Bris", email: "adj@analistaff.sn", role: "ASSISTANT_COACH", photo_url: null, permissions: ["EVALUER_ENTRAINEMENT"], statut: "ACTIF", dernier_sign_in: "2026-08-14T18:40:00Z" },
  { id: "3", prenom: "Dr.", nom: "Diallo", email: "med@analistaff.sn", role: "MEDICAL_STAFF", photo_url: null, permissions: ["VOIR_DONNEES_MEDICALES"], statut: "ACTIF", dernier_sign_in: "2026-08-13T09:20:00Z" },
  { id: "4", prenom: "Moussa", nom: "Diop", email: "fitness@analistaff.sn", role: "FITNESS_COACH", photo_url: null, permissions: ["VOIR_DONNEES_PHYSIQUES"], statut: "ACTIF", dernier_sign_in: "2026-08-12T16:30:00Z" },
];

const ROLE_LABELS: Record<StaffRole, string> = {
  HEAD_COACH: "Entraîneur principal",
  ASSISTANT_COACH: "Entraîneur adjoint",
  FITNESS_COACH: "Préparateur physique",
  GOALKEEPER_COACH: "Entraîneur gardiens",
  ANALYST: "Analyste",
  MEDICAL_STAFF: "Staff médical",
  PSYCHOLOGIST: "Psychologue",
  KIT_MANAGER: "Intendant",
  ADMIN_CLUB: "Administrateur",
};

const STATUT_COLORS: Record<string, { bg: string; color: string }> = {
  ACTIF: { bg: "var(--primary-soft)", color: "var(--primary-hover)" },
  ACTIF_CONDITIONS: { bg: "var(--accent-soft)", color: "var(--accent-strong)" },
  SUSPENDU: { bg: "var(--destructive-soft)", color: "var(--destructive)" },
  INACTIF: { bg: "var(--surface-2)", color: "var(--text-muted)" },
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
};

function StaffRow({ member }: { member: StaffMember }) {
  const statusColor = STATUT_COLORS[member.statut] ?? STATUT_COLORS.INACTIF;
  const initials = `${(member.prenom?.[0] ?? "")}${(member.nom?.[0] ?? "")}`.toUpperCase() || "?";

  const lastSignIn = member.dernier_sign_in
    ? new Date(member.dernier_sign_in).toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Jamais";

  return (
    <div
      className="p-4 rounded-lg border flex items-center gap-4 hover:shadow-sm transition-shadow"
      style={{ backgroundColor: COLORS.surface, borderColor: COLORS.border }}
    >
      {/* Avatar */}
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center text-white font-data font-bold text-sm shrink-0"
        style={{ backgroundColor: COLORS.primary, color: COLORS.onPrimary }}
      >
        {initials}
      </div>

      {/* Infos */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-data font-semibold" style={{ color: COLORS.textStrong }}>
            {member.prenom} {member.nom}
          </h3>
          <span className="badge" style={{ backgroundColor: statusColor.bg, color: statusColor.color }}>
            {member.statut === "ACTIF_CONDITIONS" ? "Sous conditions" : member.statut}
          </span>
        </div>
        <p className="text-sm mt-0.5" style={{ color: COLORS.textMuted }}>
          {ROLE_LABELS[member.role] ?? member.role}
        </p>
      </div>

      {/* Permissions (mini-badge) */}
      <div className="hidden md:flex items-center gap-1">
        {member.permissions.slice(0, 2).map((p) => (
          <span
            key={p}
            className="text-xs px-1.5 py-0.5 rounded"
            style={{ backgroundColor: COLORS.surface2, color: COLORS.textFaint }}
          >
            {p.split("_").slice(1).join(" ")}
          </span>
        ))}
        {member.permissions.length > 2 && (
          <span className="text-xs" style={{ color: COLORS.textFaint }}>
            +{member.permissions.length - 2}
          </span>
        )}
      </div>

      {/* Email */}
      <div className="hidden sm:flex items-center gap-1 text-sm" style={{ color: COLORS.textMuted }}>
        <Mail size={12} />
        {member.email}
      </div>

      {/* Last sign in */}
      <div className="hidden lg:flex items-center gap-1 text-xs" style={{ color: COLORS.textFaint }}>
        <Clock size={10} />
        {lastSignIn}
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
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) router.push("/login");
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;

  const [staff] = useState<StaffMember[]>(MOCK_STAFF);
  const [filter, setFilter] = useState<keyof typeof counts>("tous");
  const [search, setSearch] = useState("");

  const filtered = staff.filter((m) => {
    const matchFilter =
      filter === "tous" ||
      (filter === "actifs" && m.statut === "ACTIF") ||
      (filter === "conditions" && m.statut === "ACTIF_CONDITIONS") ||
      (filter === "inactive" && m.statut !== "ACTIF");
    const matchSearch =
      !search ||
      `${m.prenom} ${m.nom}`.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase()) ||
      ROLE_LABELS[m.role]?.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const counts = {
    tous: staff.length,
    actifs: staff.filter((m) => m.statut === "ACTIF").length,
    conditions: staff.filter((m) => m.statut === "ACTIF_CONDITIONS").length,
    inactive: staff.filter((m) => m.statut !== "ACTIF").length,
  };

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
          <button
            className="btn"
            style={{ backgroundColor: COLORS.primary, color: COLORS.onPrimary, borderColor: COLORS.primary }}
          >
            <Plus size={16} />
            Ajouter un membre
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Total", count: counts.tous, color: COLORS.primary, bg: COLORS.primarySoft },
            { label: "Actifs", count: counts.actifs, color: COLORS.primaryDark, bg: COLORS.primarySoft },
            { label: "Sous conditions", count: counts.conditions, color: COLORS.accentDark, bg: COLORS.accentSoft },
            { label: "Inactifs", count: counts.inactive, color: COLORS.textFaint, bg: COLORS.surface2 },
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
            {(["tous", "actifs", "conditions", "inactive"] as const).map((f) => (
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
                {f === "tous" ? "Tous" : f === "actifs" ? "Actifs" : f === "conditions" ? "Sous cond." : "Inactifs"}
                <span className="ml-1" style={{ opacity: 0.6 }}>({counts[f]})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Liste */}
        {filtered.length === 0 ? (
          <div
            className="card p-8 text-center"
            style={{ backgroundColor: COLORS.surface, borderColor: COLORS.border }}
          >
            <Users size={32} style={{ color: COLORS.textFaint }} />
            <p className="text-sm mt-3" style={{ color: COLORS.textMuted }}>
              Aucun membre trouvé
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

