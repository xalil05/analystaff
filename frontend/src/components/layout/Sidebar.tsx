"use client";

import {Dumbbell, BarChart3, Brain, Calendar, Goal, LayoutDashboard, LogOut, Settings, Shield, User, Users} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/stores";
import { authApi } from "@/lib/api";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
};

const navItems: NavItem[] = [
  { href: "/", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/players", label: "Effectif", icon: Users },
  { href: "/matches", label: "Matchs", icon: Goal },
  { href: "/training", label: "Entraînements", icon: Dumbbell },
  { href: "/planning", label: "Planification", icon: Calendar },
  { href: "/ai", label: "IA", icon: Brain },
  { href: "/analyse", label: "Analyse", icon: BarChart3 },
  { href: "/staff", label: "Staff", icon: Shield },
  { href: "/parametres", label: "Paramètres", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  // Un simple <Link href="/login"> ne suffit pas : le store garde
  // isAuthenticated=true, et login/page.tsx (l.16-19) redirige alors
  // immediatement vers "/" — la deconnexion se transformait en aller-retour
  // dashboard. Il faut vider le store avant de naviguer.
  // Le POST /auth/logout revoque le refresh token cote serveur ; on n'attend
  // pas sa reponse pour rediriger (l'utilisateur ne doit pas attendre).
  const handleLogout = () => {
    logout();
    void authApi.logout().catch(() => undefined);
    router.push("/login");
    router.refresh();
  };

  return (
    <aside className="page-sidebar">
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="sidebar-brand-logo">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon
              points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2"
            />
            <line x1="12" y1="22" x2="12" y2="15.5" />
            <polyline points="22 8.5 12 15.5 2 8.5" />
          </svg>
        </div>
        <span className="sidebar-brand-text">Analystaff</span>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navItems.map((item: NavItem) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-nav-item ${active ? "active" : ""}`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <Link
          href="/parametres"
          className="sidebar-footer-item"
        >
          <Settings className="w-4 h-4" />
          <span>Paramètres</span>
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className="sidebar-footer-item w-full text-left cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Déconnexion</span>
        </button>
      </div>
    </aside>
  );
}
