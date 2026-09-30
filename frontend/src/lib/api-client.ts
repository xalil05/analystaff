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

async function apiClient<T>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<ApiResponse<T>> {
  const { method = "GET", body, headers = {}, params } = options;

  // Normaliser les slashes multiples
  const cleanPath = path.replace(/\\/g, "/");
  const url = new URL(BASE_URL + cleanPath);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const token =
    typeof window !== "undefined"
      ? (window as any).__analystaff_token__
      : undefined;

  const fetchHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...headers,
  };

  if (token) {
    fetchHeaders["Authorization"] = `Bearer ${token}`;
  }

  const fetchBody =
    body !== undefined && body !== null
      ? JSON.stringify(body)
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
    const detail =
      (errorData as { detail?: string })?.detail ||
      `HTTP ${response.status}`;
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
