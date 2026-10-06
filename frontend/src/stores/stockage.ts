import type { PersistStorage, StorageValue } from "zustand/middleware";

/**
 * Stockage local durci, partagé par tous les stores persistés.
 *
 * `createJSONStorage` de zustand ne rattrape rien : une valeur illisible (JSON
 * tronqué, écriture interrompue, valeur saisie à la main) fait lever
 * l'exception dans `getItem`, et `persist` bascule alors dans sa branche
 * `.catch`, qui appelle `onRehydrateStorage(undefined, erreur)`.
 *
 * Le problème n'est pas l'exception, c'est la suite : cette branche ne pose pas
 * `hasHydrated`, et le `set()` de `setHasHydrated` s'exécute alors que l'état du
 * store est encore `undefined` — zustand le remplace alors par un objet ne
 * contenant que `hasHydrated`. Mesuré sur le store auth : la page restait vide,
 * sur toutes les routes, y compris après une reconnexion. Une application
 * incapable de revenir de ce cas.
 *
 * Ici `getItem` renvoie `null` au lieu de lever : une valeur illisible est
 * traitée comme une absence, l'hydratation se termine normalement, et
 * l'utilisateur est simplement renvoyé vers /login — ou, pour la file
 * d'attente hors ligne, repart d'une file vide.
 *
 * `onEchecEcriture` est appelé quand l'écriture échoue (quota atteint,
 * stockage refusé). Le store de session s'en passe : perdre une session vaut
 * mieux qu'une application qui casse. La file d'attente hors ligne, elle, ne
 * peut pas se permettre d'ignorer un échec d'écriture — une note saisie au
 * stade qui disparaît au rechargement est une perte silencieuse.
 *
 * Une seule des trois méthodes teste `typeof window`. Les deux autres s'en
 * dispensent : sans `window`, `window.localStorage` lève, et le `try/catch`
 * autour rend exactement le même résultat que le retour anticipé qu'il
 * remplacerait — `null` en lecture, un silence en purge. Une garde que la
 * couverture ne peut pas distinguer de son absence n'est pas une garantie, c'est
 * du code que personne ne pourra jamais tester.
 *
 * `setItem` est l'exception parce que son `catch` a une action : sans la garde,
 * le rendu serveur déclencherait `onEchecEcriture`, et la file d'attente
 * announce une écriture perdue alors que personne n'a rien demandé.
 */
export function stockageDurci<T>(
  onEchecEcriture?: () => void
): PersistStorage<T> {
  return {
    getItem: (nom): StorageValue<T> | null => {
      try {
        const brut = window.localStorage.getItem(nom);
        if (brut === null) return null;
        const lu: unknown = JSON.parse(brut);
        if (lu === null || typeof lu !== "object") return null;
        const { state } = lu as { state?: unknown };
        // Un JSON valide mais inattendu (nombre, tableau, chaîne, ou un objet
        // sans `state`) n'est pas plus exploitable qu'une chaîne cassée : on
        // repart de zéro.
        //
        // `Array.isArray` n'est pas superflu : `typeof []` vaut `"object"`, donc
        // un `{"state":["e1"]}` passait le test ci-dessus et arrivait tel quel au
        // `merge` de `persist`, qui le fusionnait avec l'état courant — la
        // session disparaissait au profit d'une clé `"0"` parasite.
        if (state === null || typeof state !== "object" || Array.isArray(state)) {
          return null;
        }
        return lu as StorageValue<T>;
      } catch {
        return null;
      }
    },
    setItem: (nom, valeur): void => {
      if (typeof window === "undefined") return;
      try {
        window.localStorage.setItem(nom, JSON.stringify(valeur));
      } catch {
        onEchecEcriture?.();
      }
    },
    removeItem: (nom): void => {
      try {
        window.localStorage.removeItem(nom);
      } catch {
        // Sans `window` — rendu serveur — c'est ce `catch` qui avale l'accès au
        // stockage : rien à faire de plus, la valeur en mémoire est déjà purgée.
      }
    },
  };
}