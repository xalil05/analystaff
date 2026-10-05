import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PersistStorage, StorageValue } from "zustand/middleware";
import type { AuthUser } from "@/types";

// ─── Store auth ──────────────────────────────────────────────────────────────────

interface AuthStore {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  /**
   * false tant que `persist` n'a pas fini de relire le localStorage.
   *
   * Ce drapeau vit dans l'état du store, et nulle part ailleurs, pour une
   * raison précise : zustand branche `getInitialState()` sur le
   * `getServerSnapshot` de `useSyncExternalStore`, donc React s'en sert pour le
   * rendu d'hydratation ET pour les effets qui l'accompagnent. Concrètement,
   * au premier rendu client d'un chargement dur, `isAuthenticated` vaut
   * *toujours* false — même quand le localStorage contient une session valide —
   * et le `useEffect` de la page voit cette valeur périmée. Un drapeau externe
   * (ref, variable de module) serait déjà à `true` à ce moment et ne
   * protégerait rien ; en passant par l'état, il suit exactement le même chemin
   * que `isAuthenticated`.
   *
   * Volontairement absent de `partialize` : il décrit l'hydratation de cet
   * onglet, il ne doit jamais être écrit sur disque.
   */
  hasHydrated: boolean;
  /** Interne : pose `hasHydrated`, appelé par `onRehydrateStorage`. */
  setHasHydrated: (hasHydrated: boolean) => void;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  setUser: (user: AuthUser) => void;
}

/** Ce que `partialize` accepte d'écrire : jamais les actions, jamais `hasHydrated`. */
type EtatPersiste = Pick<AuthStore, "token" | "user" | "isAuthenticated">;

/**
 * Stockage de la session.
 *
 * `createJSONStorage` de zustand ne rattrape rien : un `analystaff-auth`
 * illisible (JSON tronqué, écriture interrompue, valeur saisie à la main)
 * fait lever l'exception dans `getItem`, et `persist` bascule alors dans sa
 * branche `.catch`, qui appelle `onRehydrateStorage(undefined, erreur)`.
 *
 * Le problème n'est pas l'exception, c'est la suite : cette branche ne pose pas
 * `hasHydrated`, et le `set()` de `setHasHydrated` s'exécute alors que l'état du
 * store est encore `undefined` — zustand le remplace alors par un objet ne
 * contenant que `hasHydrated`. Mesuré : la page restait vide, sur toutes les
 * routes, y compris après une reconnexion. Une application incapable de
 * revenir de ce cas.
 *
 * Ici `getItem` renvoie `null` au lieu de lever : une valeur illisible est
 * traitée comme une session absente, l'hydratation se termine normalement, et
 * l'utilisateur est simplement renvoyé vers /login.
 */
const stockage: PersistStorage<EtatPersiste> = {
  getItem: (nom): StorageValue<EtatPersiste> | null => {
    if (typeof window === "undefined") return null;
    try {
      const brut = window.localStorage.getItem(nom);
      if (brut === null) return null;
      const lu: unknown = JSON.parse(brut);
      if (lu === null || typeof lu !== "object") return null;
      const { state } = lu as { state?: unknown };
      // Un JSON valide mais inattendu (nombre, tableau, chaîne, ou un objet
      // sans `state`) n'est pas plus exploitable qu'une chaîne cassée : on
      // repart de zéro.
      if (state === null || typeof state !== "object") return null;
      return lu as StorageValue<EtatPersiste>;
    } catch {
      return null;
    }
  },
  setItem: (nom, valeur): void => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(nom, JSON.stringify(valeur));
    } catch {
      // Quota atteint ou stockage refusé : la session reste en mémoire pour
      // l'onglet courant, on ne casse pas le login pour autant.
    }
  },
  removeItem: (nom): void => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(nom);
    } catch {
      // Rien à faire : la valeur en mémoire est déjà purgée.
    }
  },
};

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      hasHydrated: false,
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
      login: (token, user) =>
        set({ token, user, isAuthenticated: true }),
      logout: () =>
        set({ token: null, user: null, isAuthenticated: false }),
      setUser: (user) =>
        set({ user, isAuthenticated: true }),
    }),
    {
      name: "analystaff-auth",
      storage: stockage,
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: (state) => () => {
        // `stockage.getItem` ne lève jamais : on arrive donc toujours sur la
        // branche nominale de `persist`, celle qui a déjà fusionné l'état relu
        // — le `set` ci-dessous porte sur un état complet. On tient l'état
        // capturé au début de l'hydratation parce que c'est le seul qui soit
        // garanti non nul ici.
        state.setHasHydrated(true);
      },
    }
  )
);
