import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthUser } from "@/types";

const CLE = "analystaff-auth";

const UTILISATEUR: AuthUser = {
  id: "1",
  email: "test@analystaff.com",
  nom: "Test",
  prenom: "Pilote",
  role: "HEAD_COACH",
  club_id: "1",
  club_nom: "Club Test Pilote",
  permissions: ["VOIR_DONNEES_MATCH"],
};

/** Store neuf : le module relit le localStorage au moment de la création. */
async function importerStore() {
  vi.resetModules();
  return import("@/stores").then((m) => m.useAuthStore);
}

function ecrit(etat: unknown): void {
  window.localStorage.setItem(CLE, JSON.stringify({ state: etat, version: 0 }));
}

beforeEach(() => {
  window.localStorage.clear();
});

// `vi.spyOn(Storage.prototype, …)` otherwise survives into the following tests
// and every write to `analystaff-auth` keeps throwing.
afterEach(() => {
  vi.restoreAllMocks();
});

describe("store auth — état initial", () => {
  it("démarre déconnecté et hydraté quand le stockage est vide", async () => {
    const useAuthStore = await importerStore();
    const etat = useAuthStore.getState();

    expect(etat.token).toBeNull();
    expect(etat.user).toBeNull();
    expect(etat.isAuthenticated).toBe(false);
    expect(etat.hasHydrated).toBe(true);
  });

  it("n'écrit aucune session exploitable tant qu'aucune connexion n'a eu lieu", async () => {
    await importerStore();

    // `persist` écrit l'état dès la création : ce qui atterrit sur disque est un
    // enregistrement explicitement déconnecté, pas une session.
    const brut = JSON.parse(window.localStorage.getItem(CLE) as string);
    expect(brut.state).toEqual({
      token: null,
      user: null,
      isAuthenticated: false,
    });
  });
});

describe("store auth — actions", () => {
  it("login pose le jeton, l'utilisateur et le drapeau de session", async () => {
    const useAuthStore = await importerStore();

    useAuthStore.getState().login("jeton-1", UTILISATEUR);

    const etat = useAuthStore.getState();
    expect(etat.token).toBe("jeton-1");
    expect(etat.user).toEqual(UTILISATEUR);
    expect(etat.isAuthenticated).toBe(true);
  });

  it("setUser remplace l'utilisateur sans écraser le jeton", async () => {
    const useAuthStore = await importerStore();
    useAuthStore.getState().login("jeton-1", UTILISATEUR);

    useAuthStore.getState().setUser({ ...UTILISATEUR, club_id: "7" });

    expect(useAuthStore.getState().token).toBe("jeton-1");
    expect(useAuthStore.getState().user?.club_id).toBe("7");
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it("logout vide jeton, utilisateur et session", async () => {
    const useAuthStore = await importerStore();
    useAuthStore.getState().login("jeton-1", UTILISATEUR);

    useAuthStore.getState().logout();

    const etat = useAuthStore.getState();
    expect(etat.token).toBeNull();
    expect(etat.user).toBeNull();
    expect(etat.isAuthenticated).toBe(false);
  });
});

describe("store auth — persistance", () => {
  it("écrit la session sous la clé analystaff-auth", async () => {
    const useAuthStore = await importerStore();

    useAuthStore.getState().login("jeton-1", UTILISATEUR);

    const brut = JSON.parse(window.localStorage.getItem(CLE) as string);
    expect(brut.state.token).toBe("jeton-1");
    expect(brut.state.user).toEqual(UTILISATEUR);
    expect(brut.state.isAuthenticated).toBe(true);
  });

  it("n'écrit ni les actions ni le drapeau d'hydratation sur disque", async () => {
    const useAuthStore = await importerStore();

    useAuthStore.getState().login("jeton-1", UTILISATEUR);

    const etat = JSON.parse(window.localStorage.getItem(CLE) as string).state;
    expect(Object.keys(etat).sort()).toEqual(["isAuthenticated", "token", "user"]);
    expect(etat.hasHydrated).toBeUndefined();
    expect(etat.login).toBeUndefined();
  });

  it("ne lève pas quand le localStorage refuse l'écriture", async () => {
    const useAuthStore = await importerStore();
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("QuotaExceededError");
    });

    expect(() => useAuthStore.getState().login("jeton-1", UTILISATEUR)).not.toThrow();
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });
});

describe("store auth — hydratation", () => {
  it("retrouve la session écrite par un chargement précédent", async () => {
    ecrit({ token: "jeton-1", user: UTILISATEUR, isAuthenticated: true });

    const useAuthStore = await importerStore();
    const etat = useAuthStore.getState();

    expect(etat.token).toBe("jeton-1");
    expect(etat.user?.email).toBe("test@analystaff.com");
    expect(etat.isAuthenticated).toBe(true);
    expect(etat.hasHydrated).toBe(true);
  });

  it("termine l'hydratation malgré un JSON tronqué", async () => {
    window.localStorage.setItem(CLE, '{"state":{"token":"abc"');

    const useAuthStore = await importerStore();
    const etat = useAuthStore.getState();

    // Sans ce cas, hasHydrated reste false et la garde d'authentification ne
    // redirige jamais : toutes les routes restent bloquées sur un écran vide.
    expect(etat.hasHydrated).toBe(true);
    expect(etat.isAuthenticated).toBe(false);
    expect(etat.token).toBeNull();
  });

  it.each([
    ["une chaîne", '"analystaff"'],
    ["un nombre", "42"],
    ["un tableau", '["jeton"]'],
    ["un objet sans state", '{"version":0}'],
    ["un state qui n'est pas un objet", '{"state":"jeton"}'],
    ["du vide", "null"],
  ])("traite %s comme une session absente", async (_cas, contenu) => {
    window.localStorage.setItem(CLE, contenu);

    const useAuthStore = await importerStore();
    const etat = useAuthStore.getState();

    expect(etat.hasHydrated).toBe(true);
    expect(etat.isAuthenticated).toBe(false);
    expect(etat.token).toBeNull();
  });

  it("reconnaît une session dont le jeton est explicitement nul", async () => {
    ecrit({ token: null, user: null, isAuthenticated: false });

    const useAuthStore = await importerStore();

    expect(useAuthStore.getState().token).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().hasHydrated).toBe(true);
  });

  it("ne laisse pas une session hydratée survivre à un logout suivi d'un rechargement", async () => {
    const useAuthStore = await importerStore();
    useAuthStore.getState().login("jeton-1", UTILISATEUR);
    useAuthStore.getState().logout();

    const recharge = await importerStore();

    expect(recharge.getState().isAuthenticated).toBe(false);
    expect(recharge.getState().token).toBeNull();
  });
});