"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import {FileText, Shield, Target, Trophy, User, Users} from "lucide-react";
import Link from "next/link";

export default function EquipePage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;

  const stats = [
    {
      label: "Matchs joués",
      value: 12,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="17" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      ),
      color: "text-primary",
      bg: "bg-primary-soft",
    },
    {
      label: "Victoires",
      value: 8,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="8" r="7" />
          <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
        </svg>
      ),
      color: "text-pillar-physique-text",
      bg: "bg-pillar-physique-soft",
    },
    {
      label: "Nuls",
      value: 2,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="2" x2="12" y2="22" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      ),
      color: "text-accent-strong",
      bg: "bg-accent-soft",
    },
    {
      label: "Défaites",
      value: 2,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
          <polyline points="17 6 23 12 17 18" />
        </svg>
      ),
      color: "text-destructive",
      bg: "bg-destructive-soft",
    },
  ];

  const joueursCles = [
    {
      nom: "Sadio Mané",
      poste: "Ailier gauche",
      statistiques: [{ label: "Buts", value: 6 }, { label: "Passes décisives", value: 4 }],
    },
    {
      nom: "Kalidou Koulibaly",
      poste: "Défenseur central",
      statistiques: [{ label: "Clean sheets", value: 5 }, { label: "Interceptions", value: 45 }],
    },
    {
      nom: "Idrissa Gueye",
      poste: "Milieu défensif",
      statistiques: [{ label: "Passes clés", value: 32 }, { label: "Récupérations", value: 68 }],
    },
  ];

  const prochainsMatchs = [
    { adv: "Casa Sports", date: "10/08/2026", lieu: "Extérieur", comp: "Ligue 1" },
    { adv: "Génération Foot", date: "17/08/2026", lieu: "Domicile", comp: "Coupe du Sénégal" },
    { adv: "Teungueth FC", date: "24/08/2026", lieu: "Extérieur", comp: "Ligue 1" },
  ];

  return (
    <div className="page-wrapper min-h-screen">
      <Sidebar />
      <main className="page-content ml-56">
        <Header />
        <div className="page-main animate-fade-in">
          <div className="space-y-6">
            {/* Titre */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-data text-lg font-semibold text-text-strong">
                  Mon Équipe
                </h1>
                <p className="text-muted text-sm">Vue d'ensemble de votre club</p>
              </div>
              <Link
                href="/joueurs"
                className="btn btn-secondary gap-2"
              >
                <Users size={16} />
                Effectif
              </Link>
            </div>

            {/* Banner club */}
            <div className="card p-6 bg-gradient-to-r from-primary to-primary-hover text-on-primary" style={{ backgroundColor: "var(--primary)" }}>
              <div className="flex flex-col md:flex-row items-start md:items-center gap-5">
                <div className="w-20 h-20 rounded-xl flex items-center justify-center bg-white/10 backdrop-blur-sm shrink-0">
                  <Shield width="32" height="32" style={{ color: "var(--on-primary)" }} />
                </div>
                <div className="flex-1">
                  <h2 className="font-data text-2xl font-bold text-on-primary">
                    {user?.club_nom || "Votre Club"}
                  </h2>
                  <div className="flex flex-wrap items-center gap-4 mt-1 text-on-primary/80 text-sm">
                    <span className="flex items-center gap-1">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                      Dakar, Sénégal
                    </span>
                    <span className="flex items-center gap-1">
                      <Trophy width="14" height="14" />
                      Ligue 1 Sénégal
                    </span>
                    <span className="flex items-center gap-1">
                      <Users width="14" height="14" />
                      25 joueurs
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-data text-4xl font-bold text-on-primary leading-none">
                    8<sup className="text-lg">ème</sup>
                  </p>
                  <p className="text-on-primary/70 text-xs uppercase tracking-wider mt-1">
                    Classement actuel
                  </p>
                </div>
              </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {stats.map((stat) => (
                <div key={stat.label} className="card card-sm">
                  <div
                    className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center mb-3`}
                  >
                    <span className={stat.color}>{stat.icon}</span>
                  </div>
                  <p className="font-data text-2xl font-bold text-text-strong tabular-nums">
                    {stat.value}
                  </p>
                  <p className="text-muted text-tiny uppercase tracking-wider">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>

            {/* Joueurs clés + Prochains matchs */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Joueurs clés */}
              <div className="card p-6">
                <h2 className="font-data text-lg font-semibold text-text-strong mb-4 flex items-center gap-2">
                  <Users width="16" height="16" className="text-primary" />
                  Joueurs clés
                </h2>
                <div className="space-y-2">
                  {joueursCles.map((j, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-surface-2 rounded-md">
                      <div
                        className="avatar-initials sm shrink-0"
                        style={{ backgroundColor: "var(--primary-soft)", color: "var(--primary)" }}
                      >
                        {j.nom
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-data font-medium text-text-strong text-sm truncate">
                          {j.nom}
                        </p>
                        <p className="text-tiny text-muted">{j.poste}</p>
                      </div>
                      <div className="text-right shrink-0">
                        {j.statistiques.map((s) => (
                          <div key={s.label} className="text-right">
                            <p className="font-data font-bold text-text-strong tabular-nums">
                              {s.value}
                            </p>
                            <p className="text-tiny text-muted">{s.label}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Prochains matchs */}
              <div className="card p-6">
                <h2 className="font-data text-lg font-semibold text-text-strong mb-4 flex items-center gap-2">
                  <FileText width="16" height="16" className="text-primary" />
                  Prochains matchs
                </h2>
                <div className="space-y-2">
                  {prochainsMatchs.map((m, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 bg-surface-2 rounded-md"
                    >
                      <div>
                        <p className="font-data font-medium text-text-strong">
                          vs {m.adv}
                        </p>
                        <p className="text-tiny text-muted">
                          {m.comp} · {m.lieu}
                        </p>
                      </div>
                      <span className="font-data font-medium text-text-strong tabular-nums text-sm">
                        {m.date}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
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
};
