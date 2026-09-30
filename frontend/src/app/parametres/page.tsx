"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores";
import { ponderationsApi } from "@/lib/api";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import {AlertTriangle, Bell, Check, Eye, EyeOff, Lock, Save, Settings, Shield, Sliders, X} from "lucide-react";
import Link from "next/link";

// ── Types ────────────────────────────────────────────────────────────────────────

interface Ponderation {
  poste: string;
  physique: number;
  technique: number;
  tactique: number;
  mental: number;
}

interface ClubSettings {
  nom: string;
  ville: string;
  stade: string;
  championnat: string;
}

interface NotifSettings {
  label: string;
  desc: string;
  checked: boolean;
}

// ── Données mockées ──────────────────────────────────────────────────────────────

const DEFAULT_PONDERATIONS: Ponderation[] = [
  { poste: "GARDIEN", physique: 20, technique: 30, tactique: 30, mental: 20 },
  { poste: "DEFENSEUR_CENTRAL", physique: 30, technique: 20, tactique: 30, mental: 20 },
  { poste: "LATERAL_DROIT", physique: 30, technique: 25, tactique: 25, mental: 20 },
  { poste: "LATERAL_GAUCHE", physique: 30, technique: 25, tactique: 25, mental: 20 },
  { poste: "MILIEU_DEFENSIF", physique: 25, technique: 25, tactique: 30, mental: 20 },
  { poste: "MILIEU_CENTRAL", physique: 20, technique: 30, tactique: 30, mental: 20 },
  { poste: "MILIEU_OFFENSIF", physique: 15, technique: 35, tactique: 30, mental: 20 },
  { poste: "AILIER_DROIT", physique: 20, technique: 35, tactique: 25, mental: 20 },
  { poste: "AILIER_GAUCHE", physique: 20, technique: 35, tactique: 25, mental: 20 },
  { poste: "ATTAQUANT", physique: 25, technique: 30, tactique: 25, mental: 20 },
  { poste: "POLYVALENT", physique: 25, technique: 25, tactique: 25, mental: 25 },
];

const CLUB_DEFAULT: ClubSettings = {
  nom: "AS Dakar",
  ville: "Dakar",
  stade: "Stade Lat-Dior",
  championnat: "Ligue 1 Sénégal",
};

const NOTIF_DEFAULT: NotifSettings[] = [
  { label: "Nouveau match programmé", desc: "Alerte quand un match est ajouté", checked: true },
  { label: "Rappel composition", desc: "24h avant chaque match", checked: true },
  { label: "Blessure joueur", desc: "Notification en cas de blessure", checked: true },
  { label: "Rapport post-match", desc: "Rappel de saisie du rapport après match", checked: false },
];

const PILLAR_COLORS = {
  physique: "#E53935",
  technique: "#1E88E5",
  tactique: "#8E24AA",
  mental: "#F59E0B",
};

const PILLAR_LABELS = {
  physique: "Physique",
  technique: "Technique",
  tactique: "Tactique",
  mental: "Mental",
};

const COLORS = {
  bg: "#F8FAFC",
  surface: "#FFFFFF",
  surface2: "#F1F5F9",
  border: "#E2E8F0",
  textStrong: "#1E293B",
  textMuted: "#64748B",
  textFaint: "#94A3B8",
  primary: "#10B981",
  primarySoft: "#D1FAE5",
  primaryDark: "#059669",
  onPrimary: "#FFFFFF",
  accent: "#F59E0B",
  accentSoft: "#FEF3C7",
  accentDark: "#B45309",
  destructive: "#DC2626",
  destructiveSoft: "#FEE2E2",
  technique: "#1E88E5",
  techniqueSoft: "#DBEAFE",
  tactique: "#8E24AA",
  tactiqueSoft: "#EDE7F6",
};

function PonderationsTab({ ponderations, onSave, saving }: { ponderations: Ponderation[]; onSave: () => void; saving: boolean }) {
  const [local, setLocal] = useState<Ponderation[]>(ponderations);

  const update = (poste: string, field: keyof Ponderation, value: number) => {
    setLocal((prev) =>
      prev.map((p) => (p.poste === poste ? { ...p, [field]: value } : p))
    );
  };

  const totals = local.map((p) => ({
    ...p,
    total: p.physique + p.technique + p.tactique + p.mental,
  }));

  const invalid = totals.filter((t) => t.total !== 100);

  const handleSave = () => {
    if (invalid.length > 0) return;
    onSave();
  };

  return (
    <div className="space-y-4">
      {totals.map((pond) => {
        const isInvalid = pond.total !== 100;
        return (
          <div
            key={pond.poste}
            className="p-4 rounded-xl border"
            style={{
              backgroundColor: isInvalid ? COLORS.destructiveSoft : COLORS.surface,
              borderColor: isInvalid ? COLORS.destructive : COLORS.border,
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-data font-semibold" style={{ color: COLORS.textStrong }}>
                  {POSTES_LABELS[pond.poste] ?? pond.poste}
                </h3>
              </div>
              <span
                className="badge text-xs font-medium"
                style={{
                  backgroundColor: isInvalid ? COLORS.destructiveSoft : COLORS.surface2,
                  color: isInvalid ? COLORS.destructive : COLORS.textFaint,
                }}
              >
                Total : {pond.total}%{isInvalid ? " ⚠" : ""}
              </span>
            </div>

            {isInvalid && (
              <div className="flex items-center gap-2 text-xs" style={{ color: COLORS.destructive }}>
                <AlertTriangle size={12} />
                Le total doit être exactement 100%
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {(["physique", "technique", "tactique", "mental"] as const).map((critere) => (
                <div key={critere}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span style={{ color: COLORS.textMuted }}>
                      {PILLAR_LABELS[critere]}
                    </span>
                    <span className="font-data font-semibold tabular-nums" style={{ color: COLORS.textStrong }}>
                      {pond[critere]}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={pond[critere]}
                    onChange={(e) => update(pond.poste, critere, parseInt(e.target.value))}
                    className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                    style={{
                      backgroundColor: COLORS.surface2,
                      accentColor: PILLAR_COLORS[critere],
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t" style={{ borderColor: COLORS.border }}>
        {invalid.length > 0 && (
          <p className="text-sm" style={{ color: COLORS.destructive }}>
            {invalid.length} poste(s) ne totalisent pas 100%
          </p>
        )}
        <button
          onClick={handleSave}
          disabled={saving || invalid.length > 0}
          className="btn"
          style={{
            backgroundColor: COLORS.primary,
            color: COLORS.onPrimary,
            borderColor: COLORS.primary,
          }}
        >
          {saving ? (
            <>
              <Save size={14} className="animate-pulse" />
              Enregistrement...
            </>
          ) : (
            <>
              <Save size={14} />
              Enregistrer
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function ClubTab({ club, onSave }: { club: ClubSettings; onSave: () => void }) {
  const [local, setLocal] = useState<ClubSettings>(club);

  const handleSave = () => {
    setLocal(local);
    onSave();
  };

  return (
    <div className="space-y-4">
      <div className="card p-5" style={{ backgroundColor: COLORS.surface, borderColor: COLORS.border }}>
        <div className="space-y-4">
          {(["nom", "ville", "stade", "championnat"] as const).map((field) => (
            <div key={field} className="input-group">
              <label className="input-label">
                {field === "nom" ? "Nom du club" : field === "ville" ? "Ville" : field === "stade" ? "Stade" : "Championnat"}
              </label>
              <input
                type="text"
                value={local[field]}
                onChange={(e) => setLocal({ ...local, [field]: e.target.value })}
                className="input"
              />
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-end">
        <button onClick={handleSave} className="btn btn-primary gap-2" style={{ backgroundColor: COLORS.primary, color: COLORS.onPrimary, borderColor: COLORS.primary }}>
          <Save size={14} />
          Enregistrer
        </button>
      </div>
    </div>
  );
}

function NotificationsTab({ settings, onToggle, onSave }: { settings: NotifSettings[]; onToggle: (i: number) => void; onSave: () => void }) {
  const [local, setLocal] = useState<NotifSettings[]>(settings);

  const handleToggle = (index: number) => {
    setLocal((prev) => prev.map((n, i) => (i === index ? { ...n, checked: !n.checked } : n)));
    onToggle(index);
  };

  return (
    <div className="space-y-4">
      {local.map((n, i) => (
        <div
          key={i}
          className="flex items-center justify-between p-4 rounded-lg"
          style={{ backgroundColor: COLORS.surface, borderColor: COLORS.border }}
        >
          <div>
            <p className="font-data font-medium" style={{ color: COLORS.textStrong }}>
              {n.label}
            </p>
            <p className="text-xs mt-0.5" style={{ color: COLORS.textMuted }}>
              {n.desc}
            </p>
          </div>
          <button
            onClick={() => handleToggle(i)}
            className="relative w-10 h-5 rounded-full transition-colors cursor-pointer"
            style={{
              backgroundColor: n.checked ? COLORS.primary : COLORS.surface2,
              border: `1px solid ${n.checked ? COLORS.primary : COLORS.border}`,
            }}
          >
            <span
              className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform"
              style={{
                transform: n.checked ? "translateX(1.25rem)" : "translateX(0)",
                boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
              }}
            />
          </button>
        </div>
      ))}
      <div className="flex items-center justify-end">
        <button onClick={onSave} className="btn btn-primary gap-2" style={{ backgroundColor: COLORS.primary, color: COLORS.onPrimary, borderColor: COLORS.primary }}>
          <Save size={14} />
          Enregistrer
        </button>
      </div>
    </div>
  );
}

function SecurityTab() {
  const [current, setCurrent] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleChange = () => {
    if (newPw !== confirm) {
      setMessage({ type: "error", text: "Les mots de passe ne correspondent pas" });
      return;
    }
    if (newPw.length < 6) {
      setMessage({ type: "error", text: "Le mot de passe doit faire au moins 6 caractères" });
      return;
    }
    setMessage({ type: "success", text: "Mot de passe changé avec succès" });
    setCurrent("");
    setNewPw("");
    setConfirm("");
  };

  return (
    <div className="space-y-4">
      <div className="card p-5" style={{ backgroundColor: COLORS.surface, borderColor: COLORS.border }}>
        <div className="flex items-center gap-2 mb-4">
          <Lock size={16} style={{ color: COLORS.textMuted }} />
          <h3 className="font-data font-semibold" style={{ color: COLORS.textStrong }}>
            Changer le mot de passe
          </h3>
        </div>

        <div className="space-y-3">
          <div className="input-group">
            <label className="input-label">Mot de passe actuel</label>
            <div className="relative">
              <input
                type={showCurrent ? "text" : "password"}
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                className="input pr-10"
                placeholder="Votre mot de passe actuel"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted"
              >
                {showCurrent ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Nouveau mot de passe</label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                className="input pr-10"
                placeholder="Nouveau mot de passe"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted"
              >
                {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Confirmer le nouveau mot de passe</label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="input pr-10"
                placeholder="Confirmer le mot de passe"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted"
              >
                {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <button
            onClick={handleChange}
            className="btn btn-primary w-full justify-center gap-2"
            style={{ backgroundColor: COLORS.primary, color: COLORS.onPrimary, borderColor: COLORS.primary }}
          >
            <Lock size={14} />
            Changer le mot de passe
          </button>
        </div>
      </div>

      {message && (
        <div
          className="p-3 rounded-lg flex items-center gap-2 text-sm"
          style={{
            backgroundColor: message.type === "success" ? COLORS.primarySoft : COLORS.destructiveSoft,
            color: message.type === "success" ? COLORS.primaryDark : COLORS.destructive,
          }}
        >
          {message.type === "success" ? <Check size={14} /> : <AlertTriangle size={14} />}
          {message.text}
        </div>
      )}

      <div className="card p-4 flex items-center gap-4" style={{ backgroundColor: COLORS.surface, borderColor: COLORS.border }}>
        <div className="w-10 h-10 rounded-full bg-destructiveSoft flex items-center justify-center">
          <AlertTriangle size={18} style={{ color: COLORS.destructive }} />
        </div>
        <div>
          <p className="font-data font-medium" style={{ color: COLORS.textStrong }}>
            Deux facteurs (2FA)
          </p>
          <p className="text-xs" style={{ color: COLORS.textMuted }}>
            Disponible dans la prochaine version
          </p>
        </div>
        <button className="btn btn-secondary btn-sm ml-auto">
          <Lock size={12} />
          Activer
        </button>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────────

const TABS = [
  { id: "ponderations", label: "Pondérations", icon: Sliders },
  { id: "club", label: "Club", icon: Shield },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "securite", label: "Sécurité", icon: Lock },
] as const;

export default function ParametresPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) router.push("/login");
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;

  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]["id"]>("ponderations");
  const [ponderations, setPonderations] = useState<Ponderation[]>(DEFAULT_PONDERATIONS);
  const [saving, setSaving] = useState(false);
  const [club, setClub] = useState<ClubSettings>(CLUB_DEFAULT);
  const [notifSettings, setNotifSettings] = useState<NotifSettings[]>(NOTIF_DEFAULT);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSavePonderations = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await new Promise((r) => setTimeout(r, 500));
      setPonderations(ponderations);
      setMessage({ type: "success", text: "Pondérations enregistrées avec succès" });
    } catch {
      setMessage({ type: "error", text: "Erreur lors de l'enregistrement" });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveClub = () => {
    setMessage({ type: "success", text: "Informations du club mises à jour" });
  };

  const handleNotifToggle = (index: number) => {
    setNotifSettings((prev) =>
      prev.map((n, i) => (i === index ? { ...n, checked: !n.checked } : n))
    );
    setMessage({ type: "success", text: "Préférences de notification mises à jour" });
  };

  const tab = TABS.find((t) => t.id === activeTab);
  const Icon = tab?.icon;

  return (
    <div className="page-wrapper">
      <Sidebar />
      <main className="page-content ml-56" style={{ backgroundColor: COLORS.bg }}>
        <Header />
        <div className="page-main">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="font-data text-xl font-bold" style={{ color: COLORS.textStrong }}>
                Paramètres
              </h1>
              <p className="text-sm" style={{ color: COLORS.textMuted }}>
                Configurez votre application Analystaff
              </p>
            </div>
          </div>

          {/* Onglets */}
          <div className="flex gap-1 p-1 bg-surface2 rounded-xl mb-6" style={{ backgroundColor: COLORS.surface2 }}>
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex-1 justify-center"
                  style={{
                    backgroundColor: active ? COLORS.surface : "transparent",
                    color: active ? COLORS.primaryDark : COLORS.textMuted,
                    boxShadow: active ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                  }}
                >
                  <Icon size={15} />
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* Message global */}
          {message && (
            <div
              className="mb-4 rounded-lg p-3 flex items-center gap-2 text-sm"
              style={{
                backgroundColor: message.type === "success" ? COLORS.primarySoft : COLORS.destructiveSoft,
                color: message.type === "success" ? COLORS.primaryDark : COLORS.destructive,
              }}
            >
              {message.type === "success" ? <Check size={14} /> : <AlertTriangle size={14} />}
              {message.text}
            </div>
          )}

          {/* Contenu des onglets */}
          {activeTab === "ponderations" && (
            <PonderationsTab
              ponderations={ponderations}
              onSave={handleSavePonderations}
              saving={saving}
            />
          )}

          {activeTab === "club" && <ClubTab club={club} onSave={handleSaveClub} />}

          {activeTab === "notifications" && (
            <NotificationsTab
              settings={notifSettings}
              onToggle={handleNotifToggle}
              onSave={() => {}}
            />
          )}

          {activeTab === "securite" && <SecurityTab />}
        </div>
      </main>
    </div>
  );
}

const POSTES_LABELS: Record<string, string> = {
  GARDIEN: "Gardien",
  DEFENSEUR_CENTRAL: "Défenseur central",
  LATERAL_DROIT: "Latéral droit",
  LATERAL_GAUCHE: "Latéral gauche",
  MILIEU_DEFENSIF: "Milieu défensif",
  MILIEU_CENTRAL: "Milieu central",
  MILIEU_OFFENSIF: "Milieu offensif",
  AILIER_DROIT: "Ailier droit",
  AILIER_GAUCHE: "Ailier gauche",
  ATTAQUANT: "Attaquant",
  POLYVALENT: "Polyvalent",
};
