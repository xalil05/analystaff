import { describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useApiData, useApiList } from "@/hooks/useApiData";
import { ApiError } from "@/lib/api-client";

/** Promesse dont la résolution reste sous le contrôle du test. */
function enAttente<T>() {
  let resoudre!: (valeur: T) => void;
  let rejeter!: (raison: unknown) => void;
  const promesse = new Promise<T>((resolve, reject) => {
    resoudre = resolve;
    rejeter = reject;
  });
  return { promesse, resoudre, rejeter };
}

describe("useApiData", () => {
  it("expose le résultat puis passe en chargement à chaque refetch", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({ data: ["un"] })
      .mockImplementation(() => enAttente().promesse);

    const { result } = renderHook(() => useApiData<string[]>(fetcher));

    await waitFor(() => expect(result.current.data).toEqual(["un"]));
    expect(result.current.isLoading).toBe(false);

    act(() => result.current.refetch());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it("expose le message d'une ApiError et vide les données", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({ data: ["un"] })
      .mockRejectedValue(new ApiError("numero : trop grand", 422, null));

    const { result } = renderHook(() => useApiData<string[]>(fetcher));
    await waitFor(() => expect(result.current.data).toEqual(["un"]));

    act(() => result.current.refetch());

    await waitFor(() => expect(result.current.error).toBe("numero : trop grand"));
    expect(result.current.data).toBeNull();
  });

  it("retombe sur un message générique pour une erreur inconnue", async () => {
    const fetcher = vi.fn().mockRejectedValue("panne");

    const { result } = renderHook(() => useApiData(fetcher));

    await waitFor(() =>
      expect(result.current.error).toBe("Une erreur est survenue.")
    );
  });

  it("n'écrit pas la réponse d'une requête annulée", async () => {
    const premiere = enAttente<{ data: string }>();
    const seconde = enAttente<{ data: string }>();
    const fetcher = vi
      .fn()
      .mockReturnValueOnce(premiere.promesse)
      .mockReturnValueOnce(seconde.promesse);

    const { result } = renderHook(() => useApiData<string>(fetcher));

    act(() => result.current.refetch());
    // La première requête n'a jamais répondu et a été abandonnée : sa valeur ne
    // doit pas apparaître, sinon la page afficherait l'effectif précédent.
    act(() => premiere.resoudre({ data: "effectif périmé" }));
    await Promise.resolve();

    expect(result.current.data).toBeNull();

    act(() => seconde.resoudre({ data: "effectif à jour" }));
    await waitFor(() => expect(result.current.data).toBe("effectif à jour"));
  });

  it("ne lance rien tant que enabled est false", async () => {
    const fetcher = vi.fn().mockResolvedValue({ data: [] });

    renderHook(() => useApiData(fetcher, { enabled: false }));

    await Promise.resolve();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("applique transform avant de stocker", async () => {
    const fetcher = vi.fn().mockResolvedValue({ data: [{ nom: "Ba" }] });

    const { result } = renderHook(() =>
      useApiData(fetcher, {
        transform: (brut) => (brut as { nom: string }[]).map((j) => j.nom),
      })
    );

    await waitFor(() => expect(result.current.data).toEqual(["Ba"]));
  });

  it("useApiList renvoie un tableau même quand le chargement échoue", async () => {
    const fetcher = vi.fn().mockRejectedValue(new ApiError("réseau", 0, null));

    const { result } = renderHook(() => useApiList(fetcher));

    await waitFor(() => expect(result.current.error).toBe("réseau"));
    expect(result.current.items).toEqual([]);
  });
});