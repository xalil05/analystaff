import type { Match } from "@/types";

/** Bilan d'un club calculé sur ses matchs terminés et scorés. */
export interface Bilan {
  joues: number;
  victoires: number;
  nuls: number;
  defaites: number;
  pour: number;
  contre: number;
}

export const BILAN_VIDE: Bilan = {
  joues: 0,
  victoires: 0,
  nuls: 0,
  defaites: 0,
  pour: 0,
  contre: 0,
};

/**
 * Un match ne compte que s'il est terminé *et* scoré.
 *
 * Un `termine` sans score — match interrompu, saisie partielle — ne doit pas
 * être compté comme une défaite 0-0 : on l'ignore, et il n'apparaît pas non
 * plus dans le total des matchs joués.
 */
export function calculerBilan(matches: Match[]): Bilan {
  const bilan: Bilan = { ...BILAN_VIDE };
  for (const m of matches) {
    if (m.statut !== "termine") continue;
    if (m.score_equipe === null || m.score_adversaire === null) continue;
    bilan.joues += 1;
    bilan.pour += m.score_equipe;
    bilan.contre += m.score_adversaire;
    if (m.score_equipe > m.score_adversaire) bilan.victoires += 1;
    else if (m.score_equipe < m.score_adversaire) bilan.defaites += 1;
    else bilan.nuls += 1;
  }
  return bilan;
}

/** Prochains matchs : non terminés, date à venir, du plus proche au plus lointain. */
export function prochainsMatchs(matches: Match[]): Match[] {
  const maintenant = Date.now();
  return matches
    .filter(
      (m) => m.statut !== "termine" && new Date(m.date_match).getTime() >= maintenant
    )
    .sort((a, b) => +new Date(a.date_match) - +new Date(b.date_match));
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** Nombre de jours calendaires entre aujourd'hui et une date. Négatif si passé. */
export function joursAvant(iso: string): number | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const MS_JOUR = 24 * 60 * 60 * 1000;
  const aujourdhui = new Date();
  const minuit = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), aujourdhui.getDate());
  const cible = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((cible.getTime() - minuit.getTime()) / MS_JOUR);
}