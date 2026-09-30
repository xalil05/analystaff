/**
 * Analystaff — theme Tailwind v4
 *
 * NOTE : en Tailwind v4, `tailwind.config.js/ts` n'est plus lu par défaut.
 * La config se declare dans le CSS via `@theme`. Le fichier reste ici comme
 * documentation de l'intention de design, mais la source de verite est
 * `src/app/globals.css` (bloc `@theme`).
 *
 * Les couleurs sont des variables CSS (`var(--token)`) definies dans le
 * bloc `:root` de globals.css, chargees depuis CHARTE_VISUELLE_FRONTEND.md.
 * Aucun hex en dur : les composants ne doivent jamais contenir de couleur.
 */

/** Correspondance utilitaire Tailwind -> token CSS, en lecture seule. */
export const colorTokens = {
  bg: "--bg",
  surface: "--surface",
  "surface-2": "--surface-2",
  "text-strong": "--text-strong",
  "text-muted": "--text-muted",
  "text-faint": "--text-faint",
  border: "--border",
  "border-strong": "--border-strong",
  primary: "--primary",
  "primary-hover": "--primary-hover",
  "primary-soft": "--primary-soft",
  "on-primary": "--on-primary",
  secondary: "--secondary",
  "on-dark": "--on-dark",
  "on-dark-dim": "--on-dark-dim",
  accent: "--accent",
  "accent-strong": "--accent-strong",
  destructive: "--destructive",
  info: "--info",
  "pillar-physique": "--pillar-physique",
  "pillar-technique": "--pillar-technique",
  "pillar-tactique": "--pillar-tactique",
  "pillar-mental": "--pillar-mental",
  "pillar-physique-text": "--pillar-physique-text",
  "pillar-technique-text": "--pillar-technique-text",
  "pillar-tactique-text": "--pillar-tactique-text",
  "pillar-mental-text": "--pillar-mental-text",
} as const;

export const spacing = {
  xs: "4px",
  sm: "8px",
  md: "12px",
  lg: "16px",
  xl: "24px",
  "2xl": "32px",
  "3xl": "48px",
  "4xl": "64px",
  gutter: "24px",
  page: "48px",
} as const;
