/**
 * src/shared/lib/apiClient.ts
 *
 * Two Axios clients:
 *  - apiClient: tenant-aware (attaches X-Org-Id if currentOrgId exists)
 *  - sysClient: system-only (NEVER attaches X-Org-Id)
 *
 * Both:
 *  - attach Authorization if token exists
 *  - normalize errors to ApiError
 *  - detect HTML responses
 *  - clear auth + redirect to /login on 401
 */

import axios, {
  type AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios";
import { useAuthStore } from "../store/authStore";
import type { ApiError } from "../../auth/api";

/**
 * Backend mounted at /api
 * Service URLs should NOT repeat /api if baseURL includes /api.
 */
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080/api";

/* -----------------------------------------------------
   Clients
----------------------------------------------------- */

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30_000,
});

export const sysClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30_000,
});

/* -----------------------------------------------------
   Helpers
----------------------------------------------------- */

function looksLikeHtml(data: unknown): boolean {
  if (typeof data !== "string") return false;
  const t = data.trim().toLowerCase();
  return (
    t.startsWith("<!doctype") ||
    t.startsWith("<html") ||
    t.includes("<head") ||
    t.includes("<body")
  );
}

function fullUrl(config?: AxiosRequestConfig): string | undefined {
  const base = config?.baseURL;
  const url = config?.url;
  if (!base && !url) return undefined;
  if (!base) return url ? String(url) : undefined;
  if (!url) return base ? String(base) : undefined;

  return `${String(base).replace(/\/+$/, "")}/${String(url).replace(
    /^\/+/,
    ""
  )}`;
}

/**
 * IMPORTANT:
 * ApiError.details: Record<string, string | string[]>
 * Never include undefined values.
 */
function buildDetails(params: {
  url?: string;
  method?: string;
  htmlSnippet?: string;
}): Record<string, string | string[]> | undefined {
  const d: Record<string, string | string[]> = {};
  if (params.url) d.url = params.url;
  if (params.method) d.method = params.method;
  if (params.htmlSnippet) d.htmlSnippet = params.htmlSnippet;
  return Object.keys(d).length ? d : undefined;
}

/* -----------------------------------------------------
   Error normalization
----------------------------------------------------- */

function normalizeAxiosError(err: unknown): ApiError {
  if (!axios.isAxiosError(err)) {
    return { message: (err as any)?.message ?? String(err) };
  }

  const aerr = err as AxiosError;
  const status = aerr.response?.status;
  const data = aerr.response?.data;

  // canceled requests
  if (
    aerr.code === "ERR_CANCELED" ||
    aerr.message?.toLowerCase().includes("canceled")
  ) {
    return { message: "Request cancelled" };
  }

  // HTML instead of JSON
  if (looksLikeHtml(data)) {
    const details = buildDetails({
      url: fullUrl(aerr.config),
      method: aerr.config?.method,
      htmlSnippet: typeof data === "string" ? data.slice(0, 300) : undefined,
    });

    return {
      status,
      message:
        "API returned HTML instead of JSON. This usually means a wrong endpoint, a dev-server fallback, or an authentication redirect.",
      ...(details ? { details } : {}),
    };
  }

  // JSON error payload
  if (data && typeof data === "object") {
    const anyData = data as any;
    return {
      status,
      code: anyData.code ?? anyData.errorCode ?? undefined,
      message:
        anyData.message ??
        anyData.error ??
        aerr.message ??
        "Server returned an error",
      details: anyData.details ?? anyData.fieldErrors ?? undefined,
    };
  }

  // plain text
  if (typeof data === "string") {
    return { status, message: data };
  }

  return { status, message: aerr.message || "Network or server error" };
}

function handle401(apiErr: ApiError) {
  if (apiErr.status === 401) {
    try {
      useAuthStore.getState().clearAuth();
    } catch {}

    if (window.location.pathname !== "/login") {
      window.location.href = "/login";
    }
  }
}

/* -----------------------------------------------------
   Attach interceptors to a client
----------------------------------------------------- */

function attachInterceptors(
  client: typeof apiClient,
  opts: { tenantAware: boolean }
) {
  // Request interceptor
  client.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const headers: Record<string, string> = { ...(config.headers as any) };

      try {
        const { token, currentOrgId } = useAuthStore.getState();

        if (token) headers.Authorization = `Bearer ${token}`;

        // ✅ only tenant client may attach org header
        if (opts.tenantAware && currentOrgId) {
          headers["X-Org-Id"] = currentOrgId;
        }
      } catch {
        // noop
      }

      (config.headers as any) = headers;
      return config;
    },
    (err) => Promise.reject(normalizeAxiosError(err))
  );

  // Response interceptor
  client.interceptors.response.use(
    (resp) => {
      // Guard: HTML returned with success status (200/302)
      if (looksLikeHtml(resp.data)) {
        const details = buildDetails({
          url: fullUrl(resp.config),
          htmlSnippet:
            typeof resp.data === "string" ? resp.data.slice(0, 300) : undefined,
        });

        const apiErr: ApiError = {
          status: resp.status,
          message:
            "API returned HTML instead of JSON (wrong endpoint or dev-server fallback).",
          ...(details ? { details } : {}),
        };

        return Promise.reject(apiErr);
      }

      return resp;
    },
    (err) => {
      const apiErr = normalizeAxiosError(err);
      handle401(apiErr);
      return Promise.reject(apiErr);
    }
  );
}

attachInterceptors(apiClient, { tenantAware: true });
attachInterceptors(sysClient, { tenantAware: false });

/* -----------------------------------------------------
   Utilities
----------------------------------------------------- */

export function getWithSignal<T = any>(
  url: string,
  config?: AxiosRequestConfig & { signal?: AbortSignal }
) {
  return apiClient.get<T>(url, config);
}

export type { AxiosRequestConfig, AxiosError };
