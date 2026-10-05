import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient, ApiError } from "@/lib/api-client";
import { joueursApi, matchesApi, staffApi, aiApi } from "@/lib/api";

/**
 * Réponse HTTP minimaliste. On ne construit pas un vrai `Response` : le client
 * n'utilise que `ok`, `status`, `json()` et `text()`, et une doublure évite de
 * dépendre de l'implémentation `fetch` de Node dans jsdom.
 */
function reponse(donnees: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: `statut ${status}`,
    json: async () => donnees,
    text: async () =>
      typeof donnees === "string" ? donnees : JSON.stringify(donnees),
  } as unknown as Response;
}

function headerDe(init: RequestInit | undefined, nom: string): string | undefined {
  const headers = init?.headers as Record<string, string> | undefined;
  const cle = Object.keys(headers ?? {}).find(
    (k) => k.toLowerCase() === nom.toLowerCase()
  );
  return cle ? headers?.[cle] : undefined;
}

function sessionPersistee(token: string | null): void {
  window.localStorage.setItem(
    "analystaff-auth",
    JSON.stringify({
      state: { token, user: null, isAuthenticated: token !== null },
      version: 0,
    })
  );
}

beforeEach(() => {
  globalThis.fetch = vi.fn(async () => reponse({})) as unknown as typeof fetch;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("apiClient — jeton et en-têtes", () => {
  it("envoie le jeton persisté du store Zustand dans Authorization", async () => {
    sessionPersistee("jeton-abc");
    vi.mocked(fetch).mockResolvedValue(reponse({ ok: true }));

    await apiClient("/api/v1/auth/me");

    const init = vi.mocked(fetch).mock.calls[0][1];
    expect(headerDe(init, "Authorization")).toBe("Bearer jeton-abc");
    expect(headerDe(init, "Accept")).toBe("application/json");
  });

  it("n'envoie aucun en-tête Authorization quand le store est vide", async () => {
    await apiClient("/api/v1/ai/actions");

    const init = vi.mocked(fetch).mock.calls[0][1];
    expect(headerDe(init, "Authorization")).toBeUndefined();
  });

  it("traite une session illisible comme absente au lieu de lever", async () => {
    window.localStorage.setItem("analystaff-auth", "{ tronqué");

    await expect(apiClient("/api/v1/ai/actions")).resolves.toEqual({ data: {} });
    expect(headerDe(vi.mocked(fetch).mock.calls[0][1], "Authorization")).toBeUndefined();
  });

  it("ignore une session dont l'objet state est absent", async () => {
    window.localStorage.setItem("analystaff-auth", JSON.stringify({ version: 0 }));

    await apiClient("/api/v1/ai/actions");

    expect(headerDe(vi.mocked(fetch).mock.calls[0][1], "Authorization")).toBeUndefined();
  });

  it("laisse un en-tête fourni par l'appelant écraser la valeur par défaut", async () => {
    vi.mocked(fetch).mockResolvedValue(reponse(null, 204));

    await apiClient("/api/v1/players", {
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: {},
    });

    expect(headerDe(vi.mocked(fetch).mock.calls[0][1], "Content-Type")).toBe(
      "application/json; charset=utf-8"
    );
  });

  it("résout un chemin relatif contre l'origine courante", async () => {
    vi.mocked(fetch).mockResolvedValue(reponse({}));

    await apiClient("/api/v1/auth/me");

    expect(vi.mocked(fetch).mock.calls[0][0]).toBe(
      "http://localhost:3000/api/v1/auth/me"
    );
  });

  it("sérialise le corps en JSON et pose Content-Type", async () => {
    vi.mocked(fetch).mockResolvedValue(reponse({ id: 7 }));

    await apiClient("/api/v1/clubs/1/players", {
      method: "POST",
      body: { nom: "Ba" },
    });

    const init = vi.mocked(fetch).mock.calls[0][1];
    expect(init?.body).toBe('{"nom":"Ba"}');
    expect(headerDe(init, "Content-Type")).toBe("application/json");
  });

  it("ne pose pas Content-Type sur un FormData et transmet l'instance intacte", async () => {
    vi.mocked(fetch).mockResolvedValue(reponse({ importes: 1 }));
    const fichier = new File(["nom,prenom\n"], "effectif.csv", { type: "text/csv" });
    const formData = new FormData();
    formData.append("fichier", fichier);

    await apiClient("/api/v1/clubs/1/players/import", { method: "POST", body: formData });

    const init = vi.mocked(fetch).mock.calls[0][1];
    expect(headerDe(init, "Content-Type")).toBeUndefined();
    expect(init?.body).toBe(formData);
  });

  it("ajoute les paramètres en query string et écarte les valeurs nulles", async () => {
    vi.mocked(fetch).mockResolvedValue(reponse([]));

    await apiClient("/api/v1/ai/suggestions", {
      params: { ready_only: false, limit: 20, absent: undefined as never },
    });

    const url = new URL(vi.mocked(fetch).mock.calls[0][0] as string);
    expect(url.searchParams.get("ready_only")).toBe("false");
    expect(url.searchParams.get("limit")).toBe("20");
    expect(url.searchParams.has("absent")).toBe(false);
  });

  it("renvoie data null sur un 204 sans tenter de lire un corps", async () => {
    const corps = { json: vi.fn() };
    vi.mocked(fetch).mockResolvedValue({
      ...reponse(null, 204),
      json: corps.json,
    } as unknown as Response);

    await expect(
      apiClient("/api/v1/clubs/1/players/3", { method: "DELETE" })
    ).resolves.toEqual({ data: null });
    expect(corps.json).not.toHaveBeenCalled();
  });

  it("respecte la méthode HTTP demandée", async () => {
    vi.mocked(fetch).mockResolvedValue(reponse({}));

    await apiClient("/api/v1/clubs/1/matches/5", { method: "PATCH", body: {} });

    expect(vi.mocked(fetch).mock.calls[0][1]?.method).toBe("PATCH");
  });
});

describe("apiClient — erreurs FastAPI", () => {
  it("formate le detail d'un 422 en une seule phrase lisible", async () => {
    vi.mocked(fetch).mockResolvedValue(
      reponse(
        {
          detail: [
            {
              loc: ["body", "numero"],
              msg: "Input should be less than or equal to 99",
              type: "less_than_equal",
            },
          ],
        },
        422
      )
    );

    const erreur = await apiClient("/api/v1/clubs/1/players", {
      method: "POST",
      body: { numero: 120 },
    }).catch((e: unknown) => e);

    expect(erreur).toBeInstanceOf(ApiError);
    expect((erreur as ApiError).message).toBe(
      "numero : Input should be less than or equal to 99"
    );
    expect((erreur as ApiError).status).toBe(422);
    expect((erreur as ApiError).data).toMatchObject({ detail: expect.any(Array) });
  });

  it("joint plusieurs erreurs de validation et retire le préfixe body", async () => {
    vi.mocked(fetch).mockResolvedValue(
      reponse(
        {
          detail: [
            { loc: ["body", "joueur", "nom"], msg: "Field required" },
            { loc: ["body", "date_naissance"], msg: "Invalid date" },
          ],
        },
        422
      )
    );

    const erreur = (await apiClient("/api/v1/clubs/1/players", {
      method: "POST",
      body: {},
    }).catch((e: unknown) => e)) as ApiError;

    expect(erreur.message).toBe(
      "joueur.nom : Field required · date_naissance : Invalid date"
    );
  });

  it("reprend tel quel un detail texte", async () => {
    vi.mocked(fetch).mockResolvedValue(reponse({ detail: "Not authenticated" }, 401));

    const erreur = (await apiClient("/api/v1/clubs/1/players").catch(
      (e: unknown) => e
    )) as ApiError;

    expect(erreur.message).toBe("Not authenticated");
    expect(erreur.status).toBe(401);
  });

  it("retombe sur le statut HTTP quand le corps n'apporte aucun detail", async () => {
    vi.mocked(fetch).mockResolvedValue(reponse({}, 500));

    const erreur = (await apiClient("/api/v1/ai/actions").catch(
      (e: unknown) => e
    )) as ApiError;

    expect(erreur.message).toBe("HTTP 500");
  });

  it("retombe sur le statut HTTP quand le corps n'est pas du JSON", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 502,
      statusText: "Bad Gateway",
      json: async () => {
        throw new SyntaxError("Unexpected token < in JSON");
      },
      text: async () => "<html>502</html>",
    } as unknown as Response);

    const erreur = (await apiClient("/api/v1/ai/actions").catch(
      (e: unknown) => e
    )) as ApiError;

    expect(erreur.message).toBe("HTTP 502");
    expect(erreur.data).toBe("<html>502</html>");
  });
});

describe("api — construction des URL", () => {
  it("cible la route joueur du club pour un import CSV", async () => {
    vi.mocked(fetch).mockResolvedValue(reponse({ importes: 3, rejetes: [] }));

    await joueursApi.importCsv(1, new File(["a"], "effectif.csv"));

    const appel = vi.mocked(fetch).mock.calls[0];
    expect(appel[0]).toBe("http://localhost:3000/api/v1/clubs/1/players/import");
    expect(appel[1]?.method).toBe("POST");
  });

  it("utilise PATCH et non PUT pour la mise à jour d'un match", async () => {
    vi.mocked(fetch).mockResolvedValue(reponse({ id: 9 }));

    await matchesApi.update(2, 9, { statut: "termine" });

    expect(vi.mocked(fetch).mock.calls[0][1]?.method).toBe("PATCH");
  });

  it("n'ajoute pas de corps au DELETE de suppression d'un membre du staff", async () => {
    vi.mocked(fetch).mockResolvedValue(reponse({ id: 3 }));

    await staffApi.remove(1, 3);

    const appel = vi.mocked(fetch).mock.calls[0];
    expect(appel[1]?.method).toBe("DELETE");
    expect(appel[1]?.body).toBe(JSON.stringify({}));
  });

  it("déplie entries pour l'historique radar", async () => {
    vi.mocked(fetch).mockResolvedValue(
      reponse({ player_id: 4, entries: [{ evaluation_id: 1 }] })
    );

    const { data } = await import("@/lib/api").then((m) => m.radarApi.history(1, 4));

    expect(data).toHaveLength(1);
  });

  it("renvoie une liste vide quand l'historique ne contient pas entries", async () => {
    vi.mocked(fetch).mockResolvedValue(reponse({ player_id: 4 }));

    const { data } = await import("@/lib/api").then((m) => m.radarApi.history(1, 4));

    expect(data).toEqual([]);
  });

  it("n'envoie pas de corps quand l'action IA n'a pas de paramètre", async () => {
    vi.mocked(fetch).mockResolvedValue(reponse({ id: 1 }));

    await aiApi.trigger("SUMMARIZE_WEEK");

    expect(vi.mocked(fetch).mock.calls[0][1]?.body).toBeUndefined();
  });

  it("envoie le paramètre d'action quand il est fourni", async () => {
    vi.mocked(fetch).mockResolvedValue(reponse({ id: 1 }));

    await aiApi.trigger("SUGGEST_LINEUP", { match_id: 12 });

    expect(vi.mocked(fetch).mock.calls[0][1]?.body).toBe('{"match_id":12}');
  });

  it("passe ready_only en query param pour les suggestions", async () => {
    vi.mocked(fetch).mockResolvedValue(reponse([]));

    await aiApi.suggestions(true);

    const url = new URL(vi.mocked(fetch).mock.calls[0][0] as string);
    expect(url.pathname).toBe("/api/v1/ai/suggestions");
    expect(url.searchParams.get("ready_only")).toBe("true");
  });
});