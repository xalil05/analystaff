import type { ReactNode } from "react";
import type { Metadata } from "next";
import ClientLayout from "./ClientLayout";
import "./globals.css";

export const metadata: Metadata = {
  title: "Analystaff — Le banc technique",
  description:
    "Plateforme de gestion de la performance des footballeurs pour le staff technique. Radar 4 piliers, suivi d'entraînement, évaluations match, suggestions IA.",
  manifest: "/manifest.json",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // `suppressHydrationWarning` : le script ci-dessous pose `data-theme` sur
    // <html> avant le premier rendu, l'attribut diffère donc de celui du HTML
    // produit par le serveur. C'est le seul écart toléré ici.
    <html lang="fr" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
        <link rel="manifest" href="/manifest.json" />
        {/* Exception charte : le meta theme-color est lu par le navigateur, hors du
    cascade CSS — une var(--) n'y serait pas résolue. */}
        <meta name="theme-color" content="#1E3A5F" />
      </head>
      <body className="bg-bg text-text font-ui min-h-screen">
        {/* Amorçage du thème, PREMIER élément du body pour qu'il s'exécute avant
            le premier rendu et que la page claire ne flash pas (charte §2.3).
            Tout le dark mode vit dans les variables de globals.css : ce script
            ne fait que poser l'attribut qui les active, aucun composant ne
            connaît le thème. Choix persisté dans localStorage, sinon
            préférence système.
            Un `<script>` brut dans le `<head>` serait retiré par le rendu
            App Router : d'où sa place ici. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var p=localStorage.getItem("analystaff-theme");if(p!=="dark"&&p!=="light"){p=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";}document.documentElement.dataset.theme=p;}catch(e){document.documentElement.dataset.theme="light";}})();`,
          }}
        />
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
