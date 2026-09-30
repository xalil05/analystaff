// ─── Composant de tableau de bord (layout standard) ─────────────────────────────────
// Utilisé comme wrapper pour le contenu central d'une page avec sidebar+header.

export function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="page-main">{children}</div>;
}
