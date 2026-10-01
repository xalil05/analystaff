"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/stores";
import { joueursApi } from "@/lib/api";
import type { CreateJoueurData } from "@/types";
import { ArrowLeft, Save } from "lucide-react";

// Postes alignés sur les valeurs réellement stockées par l'API
// (constat sur GET /clubs/1/players : "poste": "MILIEU_CENTRAL").
const POSTES = [
  { value: "GARDIEN", label: "Gardien" },
  { value: "DEFENSEUR_CENTRAL", label: "Défenseur central" },
  { value: "DEFENSEUR_LATERAL", label: "Défenseur latéral" },
  { value: "MILIEU_DEFENSIF", label: "Milieu défensif" },
  { value: "MILIEU_CENTRAL", label: "Milieu central" },
  { value: "MILIEU_OFFENSIF", label: "Milieu offensif" },
  { value: "AILIER_DROIT", label: "Ailier droit" },
  { value: "AILIER_GAUCHE", label: "Ailier gauche" },
  { value: "ATTAQUANT", label: "Attaquant" },
  { value: "POLYVALENT", label: "Polyvalent" },
] as const;

// Champs du backend PlayerCreate : nom (obligatoire), prenom, poste, numero
// (1-99), date_naissance, statut. team_id est ignoré en mode pilote.
type FieldErrors = Partial<Record<"nom" | "prenom" | "numero" | "date_naissance", string>>;

export default function NewPlayerPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const clubId = user?.club_id ?? null;

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  function validate(formData: FormData): FieldErrors {
    const errors: FieldErrors = {};
    const nom = String(formData.get("nom") ?? "").trim();
    const numeroRaw = String(formData.get("numero") ?? "").trim();

    if (!nom) errors.nom = "Le nom est obligatoire.";
    if (numeroRaw) {
      const n = Number(numeroRaw);
      if (!Number.isInteger(n) || n < 1 || n > 99) {
        errors.numero = "Le numéro doit être un entier entre 1 et 99.";
      }
    }
    return errors;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const errors = validate(formData);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    if (!clubId) {
      setError("Club non résolu : reconnectez-vous pour créer un joueur.");
      return;
    }

    // Construit sans les champs vides : le backend distingue null (non
    // renseigné) d'une chaîne vide.
    const body: CreateJoueurData = { nom: String(formData.get("nom")).trim() };
    const prenom = String(formData.get("prenom") ?? "").trim();
    const poste = String(formData.get("poste") ?? "");
    const numeroRaw = String(formData.get("numero") ?? "").trim();
    const dateNaissance = String(formData.get("date_naissance") ?? "");

    if (prenom) body.prenom = prenom;
    if (poste) body.poste = poste;
    if (numeroRaw) body.numero = Number(numeroRaw);
    if (dateNaissance) body.date_naissance = dateNaissance;

    setSaving(true);
    try {
      const { data } = await joueursApi.create(clubId, body);
      router.push(`/players/${data.id}`);
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : "Création impossible."
      );
      setSaving(false);
    }
  }

  return (
    <div className="page-main">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/players"
          className="inline-flex items-center gap-1 text-sm"
          style={{ color: "var(--text-muted)" }}
        >
          <ArrowLeft size={14} />
          Effectif
        </Link>
      </div>

      <h1 className="font-data text-xl font-bold mb-1" style={{ color: "var(--text-strong)" }}>
        Nouveau joueur
      </h1>
      <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
        Nom obligatoire. Le reste est complétable plus tard.
      </p>

      {error && (
        <div className="alert alert-error mb-4" role="alert">
          <span className="alert-text">{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="card p-6 space-y-4" noValidate>
        <div className="input-group">
          <label className="input-label" htmlFor="nom">
            Nom
          </label>
          <input
            id="nom"
            name="nom"
            required
            autoComplete="off"
            placeholder="Mané"
            className={`input ${fieldErrors.nom ? "input-error" : ""}`}
            aria-invalid={Boolean(fieldErrors.nom)}
            aria-describedby={fieldErrors.nom ? "nom-error" : undefined}
          />
          {fieldErrors.nom && (
            <p className="input-error-text" id="nom-error">
              {fieldErrors.nom}
            </p>
          )}
        </div>

        <div className="input-group">
          <label className="input-label" htmlFor="prenom">
            Prénom
          </label>
          <input
            id="prenom"
            name="prenom"
            autoComplete="off"
            placeholder="Sadio"
            className="input"
          />
        </div>

        <div className="input-group">
          <label className="input-label" htmlFor="poste">
            Poste
          </label>
          <select id="poste" name="poste" defaultValue="" className="select">
            <option value="">Non renseigné</option>
            {POSTES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="input-group">
            <label className="input-label" htmlFor="numero">
              Numéro de maillot
            </label>
            <input
              id="numero"
              name="numero"
              type="number"
              min={1}
              max={99}
              inputMode="numeric"
              placeholder="10"
              className={`input font-data tabular-nums ${
                fieldErrors.numero ? "input-error" : ""
              }`}
              aria-invalid={Boolean(fieldErrors.numero)}
              aria-describedby={fieldErrors.numero ? "numero-error" : undefined}
            />
            {fieldErrors.numero && (
              <p className="input-error-text" id="numero-error">
                {fieldErrors.numero}
              </p>
            )}
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="date_naissance">
              Date de naissance
            </label>
            <input
              id="date_naissance"
              name="date_naissance"
              type="date"
              className="input font-data tabular-nums"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
          <Link
            href="/players"
            className="btn btn-secondary justify-center"
          >
            Annuler
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="btn btn-primary justify-center gap-2"
          >
            <Save size={14} />
            {saving ? "Création..." : "Créer le joueur"}
          </button>
        </div>
      </form>
    </div>
  );
}