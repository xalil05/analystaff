"use client";

import { useAuthStore } from "@/stores";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import type { ReactNode } from "react";

export default function ClientLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { isAuthenticated } = useAuthStore();

  const hideSidebar =
    pathname === "/login" || pathname === "/register" || pathname.startsWith("/auth/");

  return (
    <div className="page-wrapper">
      {!hideSidebar && isAuthenticated && <Sidebar />}
      {/* Pas de `ml-*` ici : `.page-sidebar` (232px) est dans le flux flex de
          `.page-wrapper`, et `.page-content` est en `flex: 1`. Ajouter une
          marge deplacementait le contenu d'une seconde fois vers la droite
          (232 + 224 = 456px de decalage au lieu de 232). */}
      <main className="page-content">
        {!hideSidebar && isAuthenticated && <Header />}
        {/* Pas de `page-main` ici : chaque page fournit sa propre racine
            `page-main`. L'imbriquer appliquerait deux fois le padding
            `--space-xl` et le `max-width: 1280px`. */}
        {!hideSidebar && isAuthenticated ? (
          <>{children}</>
        ) : (
          <div className="p-6 max-w-3xl mx-auto">{children}</div>
        )}
      </main>
    </div>
  );
}
