import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Sidebar from "@/components/layout/Sidebar";
import { useAuthStore } from "@/stores";
import { router, setPathname } from "@/test/navigation-mock";

/** Chaque route servie par l'app doit être atteignable depuis la navigation. */
const ROUTES_SERVIES = [
  "/",
  "/equipe",
  "/players",
  "/matches",
  "/training",
  "/planning",
  "/ai",
  "/analyse",
  "/staff",
  "/parametres",
];

beforeEach(() => {
  setPathname("/");
  useAuthStore.setState({
    token: "jeton-1",
    isAuthenticated: true,
    hasHydrated: true,
    user: null,
  });
  globalThis.fetch = vi.fn(async () => ({
    ok: true,
    status: 204,
    statusText: "",
    json: async () => null,
    text: async () => "",
  })) as unknown as typeof fetch;
});

describe("Sidebar — couverture de la navigation", () => {
  it.each(ROUTES_SERVIES)("expose un lien vers %s", (href) => {
    render(<Sidebar />);

    const liens = screen.getAllByRole("link").map((a) => a.getAttribute("href"));
    expect(liens).toContain(href);
  });

  it("nomme chaque entrée en français", () => {
    render(<Sidebar />);

    // Le pied de page renvoie aussi vers /parametres : on interroge le <nav>
    // pour ne pas compter cette seconde occurrence.
    const nav = within(screen.getByRole("navigation"));

    for (const libelle of [
      "Tableau de bord",
      "Mon équipe",
      "Effectif",
      "Matchs",
      "Entraînements",
      "Planification",
      "IA",
      "Analyse",
      "Staff",
      "Paramètres",
    ]) {
      expect(nav.getByText(libelle)).toBeInTheDocument();
    }
  });

  it("décline la déconnexion dans le pied de page", () => {
    render(<Sidebar />);

    expect(
      screen.getByRole("button", { name: "Déconnexion" })
    ).toBeInTheDocument();
  });
});

describe("Sidebar — état actif", () => {
  it("marque l'entrée de la route courante", () => {
    setPathname("/matches");
    render(<Sidebar />);

    expect(screen.getByText("Matchs").closest("a")).toHaveClass("active");
    expect(screen.getByText("Effectif").closest("a")).not.toHaveClass("active");
  });

  it("ne marque pas la racine sur une sous-route", () => {
    setPathname("/players/12");
    render(<Sidebar />);

    expect(screen.getByText("Tableau de bord").closest("a")).not.toHaveClass("active");
    expect(screen.getByText("Effectif").closest("a")).toHaveClass("active");
  });

  it("ne marque que la racine sur le tableau de bord", () => {
    setPathname("/");
    render(<Sidebar />);

    expect(screen.getByText("Tableau de bord").closest("a")).toHaveClass("active");
  });
});

describe("Sidebar — déconnexion", () => {
  it("vide le store avant de naviguer, sinon /login repousse vers /", async () => {
    render(<Sidebar />);

    await userEvent.click(screen.getByText("Déconnexion"));

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().token).toBeNull();
    expect(router.push).toHaveBeenCalledWith("/login");
  });

  it("n'attend pas la réponse du serveur pour rediriger", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("réseau coupé"));
    render(<Sidebar />);

    await userEvent.click(screen.getByText("Déconnexion"));

    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/login"));
    expect(router.refresh).toHaveBeenCalled();
  });
});