import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { stockageDurci } from "@/stores/stockage";

/** Forme d'état plausible pour une file d'attente hors ligne. */
interface Ecriture {
  id: string;
  note: string;
}

const NOM = "analystaff-file";

function valeur(id: string): { state: Ecriture; version: number } {
  return { state: { id, note: "sortie en pressing" }, version: 0 };
}

beforeEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ─── getItem ─────────────────────────────────────────────────────────────────────

describe("stockageDurci — lecture", () => {
  it("rend la valeur écrite, clé comprise", () => {
    const stockage = stockageDurci<Ecriture>();
    stockage.setItem(NOM, valeur("e1"));

    // `PersistStorage.getItem` est typé comme pouvant rendre une promesse ; on
    // compare l'ensemble plutôt que d'aller lire `.state`, ce qui exigerait un
    // rétrécissement et laisserait passer une promesse inerte dans les assertions.
    expect(stockage.getItem(NOM)).toEqual(valeur("e1"));
  });

  it("rend l'absence pour une clé jamais écrite", () => {
    const stockage = stockageDurci<Ecriture>();

    expect(stockage.getItem(NOM)).toBeNull();
  });

  it.each([
    ["un JSON tronqué", '{"state":{"id":"e1"'],
    ["une chaîne", '"analystaff"'],
    ["un nombre", "42"],
    ["un tableau", '["e1"]'],
    ["du vide", "null"],
    ["un objet sans state", '{"version":0}'],
    ["un state nul", '{"state":null}'],
    ["un state qui n'est pas un objet", '{"state":"e1"}'],
    ["un state tableau", '{"state":["e1"],"version":0}'],
  ])("traite %s comme une absence, au lieu de lever", (_cas, contenu) => {
    window.localStorage.setItem(NOM, contenu);
    const stockage = stockageDurci<Ecriture>();

    // Le contrat tient en une promesse : `getItem` ne lève jamais. Lever ici
    // ferait basculer `persist` dans sa branche `.catch`, qui laisse l'état du
    // store non fusionné — pour la file d'attente, une écriture déjà partie
    // deviendrait invisible après un rechargement.
    expect(() => stockage.getItem(NOM)).not.toThrow();
    expect(stockage.getItem(NOM)).toBeNull();
  });

  it("traite une lecture qui lève comme une absence", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("SecurityError");
    });
    const stockage = stockageDurci<Ecriture>();

    expect(stockage.getItem(NOM)).toBeNull();
  });

  it("rend l'absence pendant le rendu serveur, sans chercher à lever", () => {
    const stockage = stockageDurci<Ecriture>();

    // Contrat, pas preuve de garde : `getItem` n'a plus de retour anticipé sur
    // `window`, son `catch` suffit à rendre le même résultat. Une assertion du
    // type « le stockage n'a pas été sollicité » passerait aussi sans la garde,
    // donc elle ne prouverait rien — seul le résultat observable est asserté.
    vi.stubGlobal("window", undefined);

    expect(() => stockage.getItem(NOM)).not.toThrow();
    expect(stockage.getItem(NOM)).toBeNull();
  });
});

// ─── setItem ─────────────────────────────────────────────────────────────────────

describe("stockageDurci — écriture", () => {
  it("écrit l'état sérialisé sous la clé demandée", () => {
    const stockage = stockageDurci<Ecriture>();

    stockage.setItem(NOM, valeur("e1"));

    const brut = JSON.parse(window.localStorage.getItem(NOM) as string);
    expect(brut.state.note).toBe("sortie en pressing");
  });

  it("ne signale rien quand l'écriture aboutit", () => {
    const onEchecEcriture = vi.fn();
    const stockage = stockageDurci<Ecriture>(onEchecEcriture);

    stockage.setItem(NOM, valeur("e1"));

    expect(onEchecEcriture).not.toHaveBeenCalled();
  });

  it("signale l'échec quand le stockage refuse la valeur", () => {
    const onEchecEcriture = vi.fn();
    const stockage = stockageDurci<Ecriture>(onEchecEcriture);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("QuotaExceededError");
    });

    stockage.setItem(NOM, valeur("e1"));

    // C'est tout l'intérêt du paramètre : une note saisie au bord du terrain qui
    // n'arrive pas à se persister doit remonter, pas disparaître au rechargement.
    expect(onEchecEcriture).toHaveBeenCalledTimes(1);
  });

  it("ne lève pas quand l'écriture échoue et qu'aucun callback n'est fourni", () => {
    const stockage = stockageDurci<Ecriture>();
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("QuotaExceededError");
    });

    expect(() => stockage.setItem(NOM, valeur("e1"))).not.toThrow();
  });

  it("signale l'échec quand la valeur ne peut pas être sérialisée", () => {
    const onEchecEcriture = vi.fn();
    const stockage = stockageDurci<{ soi?: unknown }>(onEchecEcriture);
    const circulaire: { soi?: unknown } = {};
    circulaire.soi = circulaire;

    // `JSON.stringify` échoue sur un cycle et tombe dans le même `catch` que le
    // quota. Le signaler est le bon comportement : la valeur n'est pas sur disque,
    // elle sera donc perdue au rechargement, et l'écrire ailleurs serait le seul
    // moyen de la sauver.
    expect(() => stockage.setItem(NOM, { state: circulaire })).not.toThrow();
    expect(onEchecEcriture).toHaveBeenCalledTimes(1);
  });

  it("ne déclenche aucun faux signalement d'échec pendant le rendu serveur", () => {
    const onEchecEcriture = vi.fn();
    const stockage = stockageDurci<Ecriture>(onEchecEcriture);
    const ecriture = vi.spyOn(Storage.prototype, "setItem");

    vi.stubGlobal("window", undefined);

    expect(() => stockage.setItem(NOM, valeur("e1"))).not.toThrow();
    expect(ecriture).not.toHaveBeenCalled();
    // C'est cette assertion qui rend la garde de `window` testable. Les deux
    // précédentes passent sans elle : sans la garde, le `catch` avale l'absence
    // de `window` et appelle quand même le callback — la file d'attente
    // annoncerait une écriture perdue alors que personne n'a rien demandé.
    expect(onEchecEcriture).not.toHaveBeenCalled();
  });
});

// ─── removeItem ──────────────────────────────────────────────────────────────────

describe("stockageDurci — purge", () => {
  it("retire la clé du stockage", () => {
    const stockage = stockageDurci<Ecriture>();
    stockage.setItem(NOM, valeur("e1"));

    stockage.removeItem(NOM);

    expect(window.localStorage.getItem(NOM)).toBeNull();
  });

  it("ne lève pas quand la purge échoue", () => {
    const stockage = stockageDurci<Ecriture>();
    stockage.setItem(NOM, valeur("e1"));
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new DOMException("SecurityError");
    });

    expect(() => stockage.removeItem(NOM)).not.toThrow();
  });

  it("absorbe l'absence de window au rendu serveur", () => {
    const stockage = stockageDurci<Ecriture>();

    // Contrat, pas preuve de garde : comme pour `getItem`, c'est le `catch` qui
    // fait le travail, la garde a été retirée parce qu'aucune assertion ne
    // pouvait la distinguer de son absence.
    vi.stubGlobal("window", undefined);

    expect(() => stockage.removeItem(NOM)).not.toThrow();
  });
});