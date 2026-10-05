"use client";

// ─── Garde d'authentification ────────────────────────────────────────────────────
// Douze pages dupliquaient `useEffect(() => { if (!isAuthenticated)
// router.push("/login") }, [isAuthenticated, router])`, et la plupart en
//chaînaient `if (!isAuthenticated) return null`. Douze copies d'une règle qui
// a une exception à connaître : sans l'exception, la garde transforme un
// chargement dur en redirection.
//
// L'exception : au premier rendu client, `isAuthenticated` vaut TOUJOURS false,
// même avec une session valide dans le localStorage. zustand branche
// `getInitialState()` (l'état d'avant `persist`) sur le `getServerSnapshot` de
// `useSyncExternalStore`, et React s'en sert pour le rendu d'hydratation comme
// pour les effets qui suivent. Le `useEffect` de la page tournait donc avec une
// closure périmée et poussait `/login` ; `/login`, à son tour, voyait alors
// `isAuthenticated === true` et repoussait vers `/`. Résultat mesuré : un lien
// profond vers `/players/5` arrivait sur le dashboard, après être passé par
// `/login`.
//
// `hasHydrated` est la sortie : il n'est vrai qu'une fois `persist` avoir relu
// le stockage, et il suit le même chemin que `isAuthenticated` (il est dans
// l'état, pas dans une ref), donc il vaut `false` au moment exact où la valeur
// périmée circule. Aucune temporisation : le drapeau vient de l'événement
// d'hydratation lui-même.

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores";

/**
 * Renvoie `true` quand la page a le droit de s'afficher, c'est-à-dire quand
 * l'hydratation est terminée ET qu'une session existe.
 *
 * Tant que c'est `false`, la page ne rend rien : soit l'hydratation est en
 * cours, soit la redirection vers `/login` est partie.
 */
export function useRequireAuth(): boolean {
  const router = useRouter();
  const { isAuthenticated, hasHydrated } = useAuthStore();

  useEffect(() => {
    if (hasHydrated && !isAuthenticated) {
      router.push("/login");
    }
  }, [hasHydrated, isAuthenticated, router]);

  return hasHydrated && isAuthenticated;
}