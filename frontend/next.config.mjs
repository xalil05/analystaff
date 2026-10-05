/**
 * Cible du proxy `/api/*`.
 *
 * L'adresse du backend était figée en dur dans le rewrite, ce qui rendait
 * impossible de pointer le front vers un autre environnement sans modifier une
 * version du fichier. `API_PROXY_TARGET` la surcharge — variables
 * d'environnement injectées au démarrage, et non `NEXT_PUBLIC_*` : le rewrite
 * est évalué côté serveur, la valeur n'a donc aucune raison d'atteindre le
 * bundle client.
 *
 * Valeur par défaut inchangée : nginx du backend Docker sur l'hôte Tailscale.
 * En local : `API_PROXY_TARGET=http://localhost:8000 npm run dev`.
 * Le slash final est retiré : `http://localhost:8000/` produirait sinon
 * `//api/:path*` côté proxy.
 */
const CIBLE_API = (
  process.env.API_PROXY_TARGET || 'http://100.70.168.107'
).replace(/\/+$/, '');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next.js 16.2.12 — PPR CanaryOnlyError si 'experimental.ppr' est défini → ne pas le mettre
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'picsum.photos' },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${CIBLE_API}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
