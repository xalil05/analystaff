import { afterEach, describe, expect, it, vi } from "vitest";
import { BILAN_VIDE, calculerBilan, formatDate, joursAvant, prochainsMatchs } from "@/lib/stats";
import type { Match, MatchStatut } from "@/types";

function match(partiel: Partial<Match> & { id: number }): Match {
  return {
    club_id: 1,
    team_id: null,
    season_id: null,
    adversaire: "Jaraaf",
    competition: null,
    is_domicile: true,
    date_match: "2026-03-14T18:00:00Z",
    lieu: null,
    score_equipe: null,
    score_adversaire: null,
    statut: "programme" as MatchStatut,
    ...partiel,
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("calculerBilan", () => {
  it("renvoie un bilan vide pour une liste sans match", () => {
    expect(calculerBilan([])).toEqual(BILAN_VIDE);
  });

  it("ne mute pas le bilan vide partagé", () => {
    calculerBilan([match({ id: 1, statut: "termine", score_equipe: 3, score_adversaire: 0 })]);
    expect(BILAN_VIDE).toEqual({
      joues: 0,
      victoires: 0,
      nuls: 0,
      defaites: 0,
      pour: 0,
      contre: 0,
    });
  });

  it("classe victoires, nuls et défaites selon le score", () => {
    const bilan = calculerBilan([
      match({ id: 1, statut: "termine", score_equipe: 2, score_adversaire: 0 }),
      match({ id: 2, statut: "termine", score_equipe: 1, score_adversaire: 1 }),
      match({ id: 3, statut: "termine", score_equipe: 0, score_adversaire: 2 }),
    ]);

    expect(bilan).toEqual({
      joues: 3,
      victoires: 1,
      nuls: 1,
      defaites: 1,
      pour: 3,
      contre: 3,
    });
  });

  it("ignore un match terminé mais non scoré au lieu de le compter 0-0", () => {
    const bilan = calculerBilan([
      match({ id: 1, statut: "termine", score_equipe: null, score_adversaire: null }),
    ]);

    expect(bilan.joues).toBe(0);
    expect(bilan.nuls).toBe(0);
  });

  it("ignore un match terminé dont un seul score est renseigné", () => {
    const bilan = calculerBilan([
      match({ id: 1, statut: "termine", score_equipe: 1, score_adversaire: null }),
    ]);

    expect(bilan.joues).toBe(0);
  });

  it("ignore les matchs non terminés même s'ils portent un score", () => {
    const bilan = calculerBilan([
      match({ id: 1, statut: "programme", score_equipe: 5, score_adversaire: 0 }),
      match({ id: 2, statut: "brouillon", score_equipe: 2, score_adversaire: 0 }),
      match({ id: 3, statut: "archive", score_equipe: 1, score_adversaire: 0 }),
    ]);

    expect(bilan.joues).toBe(0);
  });

  it("cumule les buts sur l'ensemble des matchs retenus", () => {
    const bilan = calculerBilan([
      match({ id: 1, statut: "termine", score_equipe: 4, score_adversaire: 1 }),
      match({ id: 2, statut: "termine", score_equipe: 0, score_adversaire: 0 }),
      match({ id: 3, statut: "termine", score_equipe: 0, score_adversaire: 3 }),
    ]);

    expect(bilan.pour).toBe(4);
    expect(bilan.contre).toBe(4);
  });
});

describe("prochainsMatchs", () => {
  it("garde les matchs à venir du plus proche au plus lointain", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-14T12:00:00Z"));

    const retenu = prochainsMatchs([
      match({ id: 1, date_match: "2026-03-20T18:00:00Z" }),
      match({ id: 2, date_match: "2026-03-16T18:00:00Z" }),
    ]);

    expect(retenu.map((m) => m.id)).toEqual([2, 1]);
  });

  it("exclut les matchs déjà terminés et ceux dont la date est passée", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-14T12:00:00Z"));

    const retenu = prochainsMatchs([
      match({ id: 1, date_match: "2026-03-20T18:00:00Z", statut: "termine" }),
      match({ id: 2, date_match: "2026-03-01T18:00:00Z" }),
      match({ id: 3, date_match: "2026-03-15T18:00:00Z" }),
    ]);

    expect(retenu.map((m) => m.id)).toEqual([3]);
  });

  it("renvoie une liste vide quand plus aucun match n'est à venir", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-14T12:00:00Z"));

    expect(prochainsMatchs([match({ id: 1, date_match: "2020-01-01T18:00:00Z" })])).toEqual([]);
  });
});

describe("formatDate", () => {
  it("formate une date ISO au format français", () => {
    expect(formatDate("2026-03-14T18:00:00Z")).toBe("14/03/2026");
  });

  it("affiche un tiret pour une date absente", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDate(undefined)).toBe("—");
    expect(formatDate("")).toBe("—");
  });

  it("affiche un tiret pour une date illisible plutôt que Invalid Date", () => {
    expect(formatDate("14/03/2026")).toBe("—");
  });
});

describe("joursAvant", () => {
  it("compte les jours calendaires jusqu'à une date future", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-14T21:30:00Z"));

    expect(joursAvant("2026-03-18T10:00:00Z")).toBe(4);
  });

  it("compte zéro pour la date du jour", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-14T08:00:00Z"));

    expect(joursAvant("2026-03-14T23:00:00Z")).toBe(0);
  });

  it("renvoie un nombre négatif pour une date passée", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-14T12:00:00Z"));

    expect(joursAvant("2026-03-10T12:00:00Z")).toBe(-4);
  });

  it("renvoie null pour une date illisible", () => {
    expect(joursAvant("bientôt")).toBeNull();
  });
});