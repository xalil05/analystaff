import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import { LinkMock, pathname, router } from "@/test/navigation-mock";

// `next/link` et `next/navigation` s'appuient sur le contexte App Router, absent
// hors de `next dev`. Les enregistrer ici les rend disponibles à tous les tests
// de rendu sans que chaque fichier ait à les redéclarer.
vi.mock("next/link", () => ({ default: LinkMock }));
vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
  useRouter: () => router,
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
  notFound: vi.fn(),
}));

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});