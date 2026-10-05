import next from "eslint-config-next";

/**
 * ESLint 9, format plat. `next lint` a été retiré de Next 16 : la commande
 * interprétait « lint » comme un dossier et sortait sur « Invalid project
 * directory ». Le lint passe maintenant par le binaire eslint, d'où `eslint .`
 * dans package.json.
 */
export default [
  {
    ignores: [".next/**", "node_modules/**", "next-env.d.ts"],
  },
  ...next,
  {
    rules: {
      // Avertissement assumé, pas une correction.
      //
      // Les cinq signalements sont le même motif : indiquer le chargement puis
      // aller chercher la donnée dans un effet.
      //   src/hooks/useApiData.ts:82      setIsLoading(true) avant le fetch
      //   src/app/staff/page.tsx:140      setLoading(true) avant le fetch
      //   src/app/ai/page.tsx:197         setIsLoading(true) avant le fetch
      //   src/app/parametres/page.tsx:501 setLoadingPond(true) avant le fetch
      //   src/app/parametres/page.tsx:112 report des matrices reçues en prop
      //
      // Poser l'état de chargement au début d'une requête n'a pas d'alternative
      // sans passer par une bibliothèque de données ou un Server Component :
      // c'est exactement la forme documentée par React pour un fetch déclenché
      // au montage. Rendre l'état derivé du rendu supprimerait le « Chargement… »
      // affiché avant que la promesse ne soit créée. On garde donc la règle en
      // avertissement pour que le motif reste visible dans la sortie du lint.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
];