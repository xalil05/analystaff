"use client";

import type { ReactNode } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { useAuthStore } from "@/stores";
import { usePathname } from "next/navigation";

type LayoutProps = {
  children: ReactNode;
  withoutSidebar?: boolean;
};

export default function Layout({
  children,
  withoutSidebar = false,
}: LayoutProps) {
  const pathname = usePathname();
  const { isAuthenticated } = useAuthStore();

  const showShell =
    isAuthenticated &&
    pathname !== "/login" &&
    pathname !== "/register" &&
    !pathname.startsWith("/auth/") &&
    !withoutSidebar;

  return (
    <div className="page-wrapper min-h-screen">
      {showShell && <Sidebar />}
      <main
        className={`page-content ${showShell ? "ml-[232px]" : "w-full"}`}
      >
        {showShell && <Header />}
        {showShell ? (
          <div className="page-main">{children}</div>
        ) : (
          <div className="p-6 max-w-3xl mx-auto">{children}</div>
        )}
      </main>
    </div>
  );
}
