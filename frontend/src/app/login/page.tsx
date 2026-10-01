"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores";
import { authApi } from "@/lib/api";
import type { AuthUser } from "@/types";
import { Check, Lock, Mail } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated } = useAuthStore();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated, router]);

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center bg-secondary text-on-dark"
            style={{ backgroundColor: "var(--secondary)" }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon
                points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2"
              />
              <line x1="12" y1="22" x2="12" y2="15.5" />
              <polyline points="22 8.5 12 15.5 2 8.5" />
            </svg>
          </div>
          <span className="font-data text-2xl font-bold text-text-strong">
            Analystaff
          </span>
        </div>

        {/* Form */}
        <div className="card p-6">
          <h1 className="font-data text-xl font-bold text-text-strong mb-1">
            Connexion
          </h1>
          <p className="text-muted text-sm mb-6">
            Accédez à votre espace staff
          </p>

          {error && (
            <div className="alert alert-error mb-4" role="alert">
              <span className="alert-text">{error}</span>
            </div>
          )}

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const email = formData.get("email") as string;
              const password = formData.get("password") as string;
              // Pas de club_id : le backend resout le club depuis le compte
              // (app/auth/router.py login -> auto-resout) et LoginRequest
              // n'accepte que email + password.
              try {
                setError(null);
                const { data } = await authApi.login({ email, password });
                // /login renvoie un user minimal (id, email, nom, prenom).
                // club_nom et permissions viennent de /auth/me : sans cet
                // appel le Header affiche "Mon Club" en permanence.
                let me: AuthUser | null = null;
                try {
                  const meRes = await authApi.me();
                  me = meRes.data;
                } catch {
                  me = null;
                }
                login(data.access_token, { ...data.user, ...(me ?? {}) });
                router.push("/");
              } catch (err) {
                // apiClient leve une ApiError (qui extend Error) : err.message
                // contient deja le message renvoye par l'API.
                const message =
                  err instanceof Error && err.message
                    ? err.message
                    : "Identifiants invalides";
                setError(message);
              }
            }}
            className="space-y-4"
          >
            {/* Email */}
            <div className="input-group">
              <label className="input-label" htmlFor="email">
                Email
              </label>
              <div className="relative">
                <Mail
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted w-4 h-4"
                  size={16}
                  aria-hidden="true"
                />
                <input
                  id="email"
                  type="email"
                  name="email"
                  required
                  autoComplete="username"
                  placeholder="coach@club.fr"
                  className="input input-with-icon"
                />
              </div>
            </div>

            {/* Mot de passe */}
            <div className="input-group">
              <label className="input-label" htmlFor="password">
                Mot de passe
              </label>
              <div className="relative">
                <Lock
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted w-4 h-4"
                  size={16}
                  aria-hidden="true"
                />
                <input
                  id="password"
                  type="password"
                  name="password"
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="input input-with-icon"
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="btn btn-primary w-full justify-center gap-2"
            >
              <Check size={16} />
              Se connecter
            </button>
          </form>

          {/* Footer */}
          <p className="mt-5 text-center text-xs text-muted">
            Pas encore de compte ? Contactez votre administrateur club.
          </p>
        </div>

        {/* Credit */}
        <p className="mt-4 text-center text-tiny text-muted opacity-60">
          Analystaff — Le banc technique
        </p>
      </div>
    </div>
  );
}
