// ─── Client API central ──────────────────────────────────────────────────────────
// Toutes les requêtes HTTP passent par ce module.
// Base URL configurable via NEXT_PUBLIC_API_URL.
// En production : "" (Next.js proxy vers backend)
// En dev : http://localhost:8000/api (ou URL du backend FastAPI)

interface ApiRequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  body?: unknown;
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean>;
}

interface ApiResponse<T> {
  data: T;
}

class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

// ─── Fetch client ───────────────────────────────────────────────────────────────

const BASE_URL = (typeof window !== "undefined" && (window as any).__analystaff_api_url__) || "";

/**
 * Recupere le jeton d'authentification depuis le store Zustand persiste.
 * Le store ecrit sous la cle `analystaff-auth` (voir stores/index.ts) avec
 * la forme { state: { token, user, isAuthenticated }, version: n }.
 */
function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("analystaff-auth");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      state?: { token?: string | null };
    };
    return parsed.state?.token ?? null;
  } catch {
    return null;
  }
}

async function apiClient<T>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<ApiResponse<T>> {
  const { method = "GET", body, headers = {}, params } = options;

  // Normaliser les slashes multiples
  const cleanPath = path.replace(/\\/g, "/");
  // `new URL()` exige une URL absolue. Sans base, on résout le chemin contre
  // l'origine courante : sinon le premier appel echoue avec
  // "Failed to construct 'URL': Invalid URL" et aucun login ne fonctionne.
  const base = BASE_URL || (typeof window !== "undefined" ? window.location.origin : "");
  const url = new URL(cleanPath, base || undefined);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  // Le jeton vit dans le store Zustand persiste (`analystaff-auth`).
  // `window.__analystaff_token__` n'etait defini nulle part : l'entete
  // Authorization n'etait donc jamais envoyee et tout appel authentifie
  // echouait en 401 apres le login.
  const token = getStoredToken();

  // Un FormData porte sa propre frontière multipart : fixer
  // Content-Type ferait échouer l'envoi (le boundary manque) et c'est le
  // navigateur qui doit l'écrire.
  const estFormData = typeof FormData !== "undefined" && body instanceof FormData;

  const fetchHeaders: Record<string, string> = {
    Accept: "application/json",
    ...(estFormData ? {} : { "Content-Type": "application/json" }),
    ...headers,
  };

  if (token) {
    fetchHeaders["Authorization"] = `Bearer ${token}`;
  }

  const fetchBody =
    body !== undefined && body !== null
      ? estFormData
        ? (body as FormData)
        : JSON.stringify(body)
      : undefined;

  const response = await fetch(url.toString(), {
    method,
    headers: fetchHeaders,
    body: fetchBody,
    credentials: "same-origin",
  });

  if (!response.ok) {
    let errorData: unknown;
    try {
      errorData = await response.json();
    } catch {
      errorData = await response.text().catch(() => response.statusText);
    }
    const corps = (errorData ?? {}) as {
      detail?: unknown;
      message?: unknown;
      error_code?: unknown;
    };
    // Deux formats d'erreur coexistent côté backend :
    //
    // - `detail`, par la validation FastAPI (422) : une chaîne, ou une liste
    //   d'objets pour les champs :
    //   [{ loc: ["body","numero"], msg: "Input should be less than or equal to 99" }]
    //   Sans ce cas, le message affichait « [object Object] » à l'utilisateur.
    //
    // - `message`, par app/core/errors.py pour toute erreur métier (401, 403,
    //   404, 409, 422) : { error_code, message }. Ce format était ignoré, et le
    //   coach lisait « HTTP 409 » au lieu de « Ce joueur a déjà une évaluation
    //   pour ce match. » — précisément le message qui explique un conflit de
    //   saisie, donc impossible à traiter côté file d'attente hors ligne.
    const brut = corps.detail ?? corps.message;
    let detail: string;
    if (typeof brut === "string") {
      detail = brut;
    } else if (Array.isArray(brut)) {
      detail = brut
        .map((d: { loc?: unknown[]; msg?: string }) => {
          const field = Array.isArray(d.loc)
            ? d.loc.filter((p) => p !== "body").join(".")
            : "";
          const msg = d.msg ?? "valeur invalide";
          return field ? `${field} : ${msg}` : msg;
        })
        .join(" · ");
    } else {
      detail = `HTTP ${response.status}`;
    }
    throw new ApiError(detail, response.status, errorData);
  }

  if (response.status === 204) {
    return { data: null as unknown as T };
  }

  const json = await response.json();
  return { data: json as T };
}

export { apiClient, ApiError };
export type { ApiRequestOptions, ApiResponse };
export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
