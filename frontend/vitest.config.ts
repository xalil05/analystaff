import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

// Les tests de dates (stats.ts, formatDate) doivent être indépendants du fuseau
// de la machine qui les lance : `toLocaleDateString("fr-FR")` décale la date
// d'un jour vers l'ouest de Greenwich. On fige UTC avant tout import de test.
process.env.TZ = "UTC";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});