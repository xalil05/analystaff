"use client";

// ─── Chargement de données côté API ─────────────────────────────────────────────
// Remplace les useCallback + useEffect + try/catch + quatre useState que chaque
// page réimplémentait. Un seul endroit gère le chargement, l'erreur, l'annulation
// et le rechargement.
//
// Trois exigences que les pages n-respectaient pas avant :
//
// 1. **Annulation.** Sans AbortController, un rechargement déclenché pendant
//    qu'une requête est en vol peut faire écrire une réponse périmée : le
//    composant affiche l'effectif de l'utilisateur précédent.
//
// 2. **Clés de dépendance stables.** Le fetcher doit être mémorisé par
//    l'appelant (`useCallback`) ou défini hors du composant. Passer une arrow
//    function inline change d'identité à chaque rendu et déclenche une boucle
//    de requêtes — c'est ce qui arriverait avec un useEffect naïf.
//
// 3. **Erreur normalisée.** `ApiError` porte le message de l'API ; le reste
//    tombe sur un message par défaut. Une page n'affiche jamais « HTTP 500 ».

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/api-client";

export type UseApiDataOptions = {
  /** Ne lance rien tant que false (typiquement avant l'authentification). */
  enabled?: boolean;
  /** Transformer la réponse avant de la stocker. Doit être stable. */
  transform?: (data: unknown) => unknown;
};

export type UseApiDataResult<T> = {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  /** Relance la requête. C'est ce qui alimente le bouton « Réessayer ». */
  refetch: () => void;
};

export function useApiData<T>(
  fetcher: () => Promise<{ data: T }>,
  options: UseApiDataOptions = {}
): UseApiDataResult<T> {
  const { enabled = true, transform } = options;

  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // `fetcher` et `transform` changent d'identité à chaque rendu si l'appelant
  // ne les mémorise pas. On les lit par une ref pour que le useEffect ne
  // dépende que de l'identifiant de la requête : une boucle de requêtes
  // serait bien pire qu'une fermeture périmée.
  const fetcherRef = useRef(fetcher);
  const transformRef = useRef(transform);
  fetcherRef.current = fetcher;
  transformRef.current = transform;

  const [tick, setTick] = useState(0);
  const refetch = useCallback(() => setTick((n) => n + 1), []);

  // Annulation : à la demande suivante ou au démontage, la réponse en vol est
  // ignorée et non écrite dans l'état.
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!enabled) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setError(null);

    (async () => {
      try {
        const reponse = await fetcherRef.current();
        if (controller.signal.aborted) return;
        const brut = transformRef.current
          ? transformRef.current(reponse.data)
          : reponse.data;
        setData(brut as T);
      } catch (err) {
        if (controller.signal.aborted) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        setData(null);
        setError(messageDe(err));
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    })();

    return () => controller.abort();
  }, [enabled, tick]);

  return { data, isLoading, error, refetch };
}

function messageDe(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error && err.message) return err.message;
  return "Une erreur est survenue.";
}

/**
 * Raccourci pour les listes : renvoie toujours un tableau, jamais null.
 *
 * Évite le `data ?? []` répétitif qui masque le cas « chargement échoué »
 * derrière une liste vide : sans ça, une panne réseau s'affiche comme un
 * effectif vide.
 */
export function useApiList<T>(
  fetcher: () => Promise<{ data: T[] }>,
  options: UseApiDataOptions = {}
): UseApiDataResult<T[]> & { items: T[] } {
  const resultat = useApiData<T[]>(fetcher, options);
  return { ...resultat, items: resultat.data ?? [] };
}