import { createElement } from "react";
import { vi } from "vitest";

// ─── Doublures de routage Next ───────────────────────────────────────────────────
// Les pages utilisent `usePathname`, `useRouter` et `next/link`, qui untienent un
// contexte App Router. Hors de `next dev`, ce contexte n'existe pas : sans ces
// doublures, le rendu d'une page lève avant d'atteindre son premier état.

export const router = {
  push: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  prefetch: vi.fn(() => Promise.resolve()),
};

export let pathname = "/";

/** Change la route vue par `usePathname` avant un rendu. */
export function setPathname(valeur: string): void {
  pathname = valeur;
}

export function LinkMock(props: {
  href: string;
  children?: React.ReactNode;
  [cle: string]: unknown;
}) {
  const { href, children, ...reste } = props;
  return createElement("a", { href, ...reste }, children);
}

export function resetNavigationMocks(): void {
  pathname = "/";
  for (const fn of Object.values(router)) {
    if (typeof fn === "function" && "mockClear" in fn) fn.mockClear();
  }
}