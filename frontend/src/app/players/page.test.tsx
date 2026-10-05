import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PlayersPage from "@/app/players/page";
import { useAuthStore } from "@/stores";
import type { Joueur } from "@/types";

function joueur(partiel: Partial<Joueur> & { id: number }): Joueur {
  return {
    club_id: 1,
    team_id: null,
    nom: "Ba",
    prenom: "Ousmane",
    photo_url: null,
    poste: "ATTAQUANT",
    numero: 10,
    date_naissance: "1998-02-11",
    statut: "actif",
    is_archived: false,
    ...partiel,
  };
}

function reponse(donnees: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: `statut ${status}`,
    json: async () => donnees,
    text: async () => JSON.stringify(donnees),
  } as unknown as Response;
}

function sessionOuverte(clubId: string | null = "1"): void {
  useAuthStore.setState({
    isAuthenticated: true,
    hasHydrated: true,
    token: "jeton-1",
    user:
      clubId === null
        ? null
        : {
            id: "1",
            email: "test@analystaff.com",
            nom: "Test",
            prenom: "Pilote",
            role: "HEAD_COACH",
            club_id: clubId,
            club_nom: "Club Test Pilote",
            permissions: [],
          },
  });
}

/** Promesse dont la résolution reste sous le contrôle du test. */
function enAttente<T>() {
  let resoudre!: (valeur: T) => void;
  const promesse = new Promise<T>((resolve) => {
    resoudre = resolve;
  });
  return { promesse, resoudre };
}

beforeEach(() => {
  useAuthStore.setState({
    token: null,
    user: null,
    isAuthenticated: false,
    hasHydrated: true,
  });
  globalThis.fetch = vi.fn(async () => reponse([])) as unknown as typeof fetch;
});

describe("page Effectif — chargement", () => {
  it("affiche un squelette et la mention Chargement pendant la requête", async () => {
    sessionOuverte();
    const { promesse, resoudre } = enAttente<Response>();
    vi.mocked(fetch).mockReturnValue(promesse);

    const { container } = render(<PlayersPage />);

    expect(screen.getByText("Chargement...")).toBeInTheDocument();
    expect(container.querySelectorAll(".skeleton").length).toBeGreaterThan(0);

    resoudre(reponse([joueur({ id: 1 })]));
    await waitFor(() =>
      expect(screen.getByText("1 joueur · 1 actif")).toBeInTheDocument()
    );
  });

  it("interroge le club de la session", async () => {
    sessionOuverte("42");

    render(<PlayersPage />);

    await waitFor(() =>
      expect(vi.mocked(fetch).mock.calls[0][0]).toBe(
        "http://localhost:3000/api/v1/clubs/42/players"
      )
    );
  });

  it("n'appelle pas l'API tant que la session n'est pas résolue", () => {
    sessionOuverte(null);

    render(<PlayersPage />);

    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
    expect(screen.getByText("Club non résolu")).toBeInTheDocument();
  });
});

describe("page Effectif — erreur", () => {
  it("affiche le message de l'API et un bouton Réessayer", async () => {
    sessionOuverte();
    vi.mocked(fetch).mockResolvedValue(
      reponse({ detail: "Club non résolu pour cet utilisateur" }, 403)
    );

    render(<PlayersPage />);

    expect(await screen.findByText("Effectif indisponible")).toBeInTheDocument();
    expect(
      screen.getByText("Club non résolu pour cet utilisateur")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Réessayer/ })).toBeInTheDocument();
  });

  it("ne présente jamais une panne réseau comme un effectif vide", async () => {
    sessionOuverte();
    vi.mocked(fetch).mockResolvedValue(reponse({}, 500));

    render(<PlayersPage />);

    await screen.findByText("Effectif indisponible");
    expect(screen.queryByText("Aucun joueur trouvé")).not.toBeInTheDocument();
  });

  it("relance la requête au clic sur Réessayer", async () => {
    sessionOuverte();
    vi.mocked(fetch)
      .mockResolvedValueOnce(reponse({ detail: "Panne reseau" }, 503))
      .mockResolvedValueOnce(reponse([joueur({ id: 3, nom: "Sarr" })]));

    render(<PlayersPage />);
    await userEvent.click(await screen.findByRole("button", { name: /Réessayer/ }));

    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2);
    expect(await screen.findByText("1 joueur · 1 actif")).toBeInTheDocument();
    expect(screen.queryByText("Effectif indisponible")).not.toBeInTheDocument();
  });
});

describe("page Effectif — liste", () => {
  it("affiche les joueurs reçus et les compteurs d'effectif", async () => {
    sessionOuverte();
    vi.mocked(fetch).mockResolvedValue(
      reponse([
        joueur({ id: 1 }),
        joueur({ id: 2, nom: "Diop", prenom: "Moussa", statut: "blesse" }),
        joueur({ id: 3, nom: "Fall", prenom: "Pape", statut: "suspendu" }),
      ])
    );

    render(<PlayersPage />);

    expect(await screen.findByText("3 joueurs · 1 actif")).toBeInTheDocument();
    expect(screen.getByText("Ousmane Ba")).toBeInTheDocument();
  });

  it("filtre sur la saisie de recherche", async () => {
    sessionOuverte();
    vi.mocked(fetch).mockResolvedValue(
      reponse([joueur({ id: 1 }), joueur({ id: 2, nom: "Diop", prenom: "Moussa" })])
    );
    render(<PlayersPage />);
    await screen.findByText("Ousmane Ba");

    await userEvent.type(
      screen.getByPlaceholderText("Rechercher par nom, poste, numéro…"),
      "diop"
    );

    await waitFor(() => expect(screen.queryByText("Ousmane Ba")).not.toBeInTheDocument());
    expect(screen.getByText("Moussa Diop")).toBeInTheDocument();
  });

  it("filtre sur le statut sélectionné", async () => {
    sessionOuverte();
    vi.mocked(fetch).mockResolvedValue(
      reponse([joueur({ id: 1 }), joueur({ id: 2, nom: "Diop", statut: "blesse" })])
    );
    render(<PlayersPage />);
    await screen.findByText("Ousmane Ba");

    await userEvent.selectOptions(screen.getByRole("combobox"), "blesse");

    await waitFor(() => expect(screen.queryByText("Ousmane Ba")).not.toBeInTheDocument());
  });
});

describe("page Effectif — état vide", () => {
  it("propose d'importer ou de créer un joueur quand l'effectif est vide", async () => {
    sessionOuverte();
    vi.mocked(fetch).mockResolvedValue(reponse([]));

    render(<PlayersPage />);

    expect(await screen.findByText("Aucun joueur trouvé")).toBeInTheDocument();
    expect(
      screen.getByText("Importez votre effectif (CSV) ou créez un joueur")
    ).toBeInTheDocument();
    const actions = screen.getAllByRole("link", { name: /Importer un CSV|Ajouter un joueur/ });
    expect(actions.length).toBeGreaterThan(0);
  });

  it("oriente vers les filtres quand la recherche ne donne rien", async () => {
    sessionOuverte();
    vi.mocked(fetch).mockResolvedValue(reponse([joueur({ id: 1 })]));
    render(<PlayersPage />);
    await screen.findByText("Ousmane Ba");

    await userEvent.type(
      screen.getByPlaceholderText("Rechercher par nom, poste, numéro…"),
      "zzzzz"
    );

    expect(
      await screen.findByText("Modifiez votre recherche ou vos filtres")
    ).toBeInTheDocument();
  });
});

describe("page Effectif — garde d'authentification", () => {
  it("ne rend rien tant que l'hydratation n'est pas terminée", () => {
    useAuthStore.setState({ isAuthenticated: true, hasHydrated: false });

    const { container } = render(<PlayersPage />);

    expect(container).toBeEmptyDOMElement();
  });

  it("ne rend rien et ne requête pas sans session", () => {
    const { container } = render(<PlayersPage />);

    expect(container).toBeEmptyDOMElement();
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });
});