"use client";

// ── Import d'un effectif depuis un CSV ──────────────────────────────────────────
// Le club fournit sa liste de joueurs. Le format de référence est
// template_import_joueurs.csv ; le backend tolère les accents, la casse, le
// point-virgule et le BOM d'Excel (voir app/players/importer.py).
//
// L'écran montre le détail du refus ligne par ligne : c'est le seul moyen
// pour le coach de savoir quoi corriger dans son fichier. Un simple
// « import échoué » le renverrait à l'aveugle.

import { useRef, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/stores";
import { joueursApi } from "@/lib/api";
import type { ImportEffectif } from "@/types";
import { AlertTriangle, ArrowLeft, Check, FileSpreadsheet, Upload } from "lucide-react";

const TAILLE_MAX = 2 * 1024 * 1024;

const COLORS = {
  surface: "var(--surface)",
  border: "var(--border)",
  textStrong: "var(--text-strong)",
  textMuted: "var(--text-muted)",
  textFaint: "var(--text-faint)",
  primary: "var(--primary)",
  primarySoft: "var(--primary-soft)",
  onPrimary: "var(--on-primary)",
  destructive: "var(--destructive)",
  destructiveSoft: "var(--destructive-soft)",
  accent: "var(--accent)",
  accentSoft: "var(--accent-soft)",
  accentStrong: "var(--accent-strong)",
};

export default function ImportPlayersPage() {
  const user = useAuthStore((s) => s.user);
  const clubId = user?.club_id ?? null;
  const inputRef = useRef<HTMLInputElement>(null);

  const [fichier, setFichier] = useState<File | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [resultat, setResultat] = useState<ImportEffectif | null>(null);

  function choisir(e: React.ChangeEvent<HTMLInputElement>) {
    const fichier = e.target.files?.[0] ?? null;
    setErreur(null);
    setResultat(null);
    if (fichier && fichier.size > TAILLE_MAX) {
      setFichier(null);
      setErreur(
        `Fichier trop volumineux (${Math.round(fichier.size / 1024 / 1024)} Mo, max 2 Mo).`
      );
      return;
    }
    setFichier(fichier);
  }

  async function envoyer() {
    if (!fichier) return;
    if (!clubId) {
      setErreur("Club non résolu : reconnectez-vous pour importer.");
      return;
    }
    setEnvoi(true);
    setErreur(null);
    try {
      const { data } = await joueursApi.importCsv(clubId, fichier);
      setResultat(data);
    } catch (err) {
      setErreur(
        err instanceof Error && err.message
          ? err.message
          : "Import impossible."
      );
    } finally {
      setEnvoi(false);
    }
  }

  const termine = resultat !== null;

  return (
    <div className="page-main">
      <Link
        href="/players"
        className="inline-flex items-center gap-1 text-sm mb-4"
        style={{ color: COLORS.textMuted }}
      >
        <ArrowLeft size={14} />
        Effectif
      </Link>

      <h1
        className="font-data text-xl font-bold mb-1"
        style={{ color: COLORS.textStrong }}
      >
        Importer un effectif
      </h1>
      <p className="text-sm mb-6" style={{ color: COLORS.textMuted }}>
        Fichier CSV. Colonnes reconnues : Nom, Prénom, Date de naissance, Poste,
        Numéro. Format de date JJ/MM/AAAA.
      </p>

      {erreur && (
        <div className="alert alert-error mb-4" role="alert">
          <span className="alert-text">{erreur}</span>
        </div>
      )}

      {/* Choix du fichier — masqué après l'envoi pour ne pas laisser
          importer un second fichier par-dessus un résultat affiché. */}
      {!termine && (
        <div className="card p-6 mb-4">
          <label htmlFor="fichier" className="input-label">
            Fichier CSV
          </label>
          <input
            id="fichier"
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={choisir}
            className="input mt-2"
            style={{ padding: "6px" }}
          />
          {fichier && (
            <p
              className="text-xs mt-2 flex items-center gap-1"
              style={{ color: COLORS.textMuted }}
            >
              <FileSpreadsheet size={12} />
              {fichier.name} · {Math.round(fichier.size / 1024)} Ko
            </p>
          )}

          <div
            className="flex justify-end gap-3 mt-6 pt-4 border-t"
            style={{ borderColor: COLORS.border }}
          >
            <Link href="/players" className="btn btn-secondary justify-center">
              Annuler
            </Link>
            <button
              type="button"
              onClick={envoyer}
              disabled={!fichier || envoi}
              className="btn btn-primary justify-center gap-2"
            >
              <Upload size={14} />
              {envoi ? "Import..." : "Importer"}
            </button>
          </div>
        </div>
      )}

      {resultat && (
        <>
          {/* Bilan */}
          <div
            className="card p-6 mb-4"
            style={{
              backgroundColor:
                resultat.rejetes.length === 0
                  ? COLORS.primarySoft
                  : COLORS.accentSoft,
            }}
          >
            <div className="flex items-center gap-3">
              {resultat.rejetes.length === 0 ? (
                <Check size={20} style={{ color: COLORS.primary }} />
              ) : (
                <AlertTriangle size={20} style={{ color: COLORS.accentStrong }} />
              )}
              <div>
                <p
                  className="font-data font-semibold"
                  style={{ color: COLORS.textStrong }}
                >
                  {resultat.importes} joueur{resultat.importes > 1 ? "s" : ""}{" "}
                  importé{resultat.importes > 1 ? "s" : ""}
                  {resultat.rejetes.length > 0 &&
                    ` · ${resultat.rejetes.length} ligne${
                      resultat.rejetes.length > 1 ? "s" : ""
                    } à corriger`}
                </p>
                <p className="text-xs mt-0.5" style={{ color: COLORS.textMuted }}>
                  {resultat.rejetes.length === 0
                    ? "Toutes les lignes du fichier ont été reprises."
                    : "Les lignes refusées n'ont pas été importées. Corrigez le fichier et relancez l'import."}
                </p>
              </div>
            </div>
          </div>

          {/* Colonnes écartées : attendu, pas une erreur */}
          {resultat.colonnes_ignorees.length > 0 && (
            <div
              className="card p-4 mb-4 text-sm"
              style={{ backgroundColor: COLORS.surface, borderColor: COLORS.border }}
            >
              <p style={{ color: COLORS.textStrong }}>
                Colonnes non utilisées :{" "}
                {resultat.colonnes_ignorees.join(", ")}
              </p>
              <p className="text-xs mt-1" style={{ color: COLORS.textMuted }}>
                Ces colonnes ne sont pas stockées pour l'instant. Le reste du
                fichier a bien été importé.
              </p>
            </div>
          )}

          {/* Colonnes inconnues : probablement une faute de frappe */}
          {resultat.colonnes_inconnues.length > 0 && (
            <div
              className="card p-4 mb-4 text-sm"
              style={{ backgroundColor: COLORS.accentSoft }}
            >
              <p style={{ color: COLORS.accentStrong }}>
                Colonnes non reconnues :{" "}
                {resultat.colonnes_inconnues.join(", ")}
              </p>
              <p className="text-xs mt-1" style={{ color: COLORS.textMuted }}>
                L'en-tête ne correspond à aucune colonne connue. Vérifiez
                l'orthographe dans votre fichier.
              </p>
            </div>
          )}

          {/* Détail des rejets — le cœur de l'écran */}
          {resultat.rejetes.length > 0 && (
            <div
              className="card overflow-hidden mb-4"
              style={{ backgroundColor: COLORS.surface, borderColor: COLORS.border }}
            >
              <div className="card-head p-4">
                <p
                  className="font-data font-semibold"
                  style={{ color: COLORS.textStrong }}
                >
                  Lignes à corriger
                </p>
                <p className="text-xs" style={{ color: COLORS.textMuted }}>
                  Numéros conformes à votre fichier, en-tête compris.
                </p>
              </div>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ textAlign: "right" }}>Ligne</th>
                      <th>Joueur</th>
                      <th>Motif du refus</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultat.rejetes.map((r) => (
                      <tr key={r.ligne}>
                        <td
                          className="font-data tabular-nums"
                          style={{ color: COLORS.textMuted, textAlign: "right" }}
                        >
                          {r.ligne}
                        </td>
                        <td style={{ color: COLORS.textStrong }}>
                          {r.nom || "—"}
                        </td>
                        <td style={{ color: COLORS.destructive }}>
                          {r.raison}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Link href="/players" className="btn btn-secondary justify-center">
              Retour à l'effectif
            </Link>
            <button
              type="button"
              onClick={() => {
                setResultat(null);
                setFichier(null);
                if (inputRef.current) inputRef.current.value = "";
              }}
              className="btn btn-primary justify-center"
            >
              Importer un autre fichier
            </button>
          </div>
        </>
      )}
    </div>
  );
}