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
      <main className={`page-content ${hideSidebar || !isAuthenticated ? "w-full" : "ml-56"}`}>
        {!hideSidebar && isAuthenticated && <Header />}
        {!hideSidebar && isAuthenticated ? (
          <div className="page-main">{children}</div>
        ) : (
          <div className="p-6 max-w-3xl mx-auto">{children}</div>
        )}
      </main>
    </div>
  );
}
