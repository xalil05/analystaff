import { create } from "zustand";
import { persist } from "zustand/middleware";
import { stockageDurci } from "@/stores/stockage";
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
 * Stockage de la session : `stockageDurci`, sans callback d'échec d'écriture.
 *
 * Le mécanisme — pourquoi `getItem` renvoie `null` au lieu de lever, et ce que
 * cela évite à l'hydratation — est documenté dans `stores/stockage.ts`.
 *
 * La seule différence avec le comportement par défaut : ici un échec
 * d'écriture reste silencieux. Perdre une session vaut mieux qu'une
 * application qui casse ; la file d'attente hors ligne, elle, ne peut pas
 * s'en passer et passe son propre callback.
 */
const stockage = stockageDurci<EtatPersiste>();

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
