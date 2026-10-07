// src/api/http.ts
export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

type RequestOptions = {
  method?: HttpMethod;
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;

  /**
   * orgMode:
   * - "auto" (default): attach X-Org-Id only if present
   * - "require": attach X-Org-Id only if present (NO frontend throw)
   * - "none": never attach X-Org-Id (SYSTEM dashboard)
   *
   * NOTE: We intentionally DO NOT throw on missing org context here.
   * Backend should enforce org-required endpoints with 400/403.
   */
  orgMode?: "auto" | "require" | "none";
};

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080/api";

function getToken(): string | null {
  return sessionStorage.getItem("evt.token");
}

export function getOrgId(): string | null {
  return sessionStorage.getItem("evt.currentOrgId");
}

export function setOrgId(orgId: string | null) {
  if (orgId) sessionStorage.setItem("evt.currentOrgId", orgId);
  else sessionStorage.removeItem("evt.currentOrgId");
}

function normalizePath(path: string): string {
  let p = (path ?? "").trim();
  if (!p.startsWith("/")) p = `/${p}`;
  // prevent /api/api mistakes
  if (p === "/api") return "/";
  if (p.startsWith("/api/")) p = p.slice(4);
  return p;
}

function joinUrl(base: string, path: string): string {
  const b = base.replace(/\/+$/, "");
  const p = path.replace(/^\/+/, "");
  return `${b}/${p}`;
}

function looksLikeHtml(text: string) {
  const t = text.trim().toLowerCase();
  return (
    t.startsWith("<!doctype") ||
    t.startsWith("<html") ||
    t.includes("<head") ||
    t.includes("<body")
  );
}

async function readBody(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "";
  }
}

async function parseJsonOrThrow(res: Response): Promise<any> {
  const text = await readBody(res);

  // empty body / 204
  if (!text) return null;

  // HTML guard
  if (looksLikeHtml(text)) {
    const ct = res.headers.get("content-type") ?? "";
    throw new Error(
      `API returned HTML instead of JSON.\nURL: ${res.url}\nStatus: ${
        res.status
      }\nContent-Type: ${ct}\nSnippet: ${text.slice(0, 200)}`
    );
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      `Failed to parse JSON.\nURL: ${res.url}\nStatus: ${
        res.status
      }\nBody: ${text.slice(0, 200)}`
    );
  }
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const token = getToken();
  const orgId = getOrgId();
  const orgMode = opts.orgMode ?? "auto";

  const headers: Record<string, string> = {
    ...(opts.headers ?? {}),
  };

  if (opts.body !== undefined) {
    headers["Content-Type"] = headers["Content-Type"] ?? "application/json";
  }

  if (token) headers.Authorization = `Bearer ${token}`;

  // ✅ org header behavior (NO THROW)
  if (orgMode === "auto") {
    if (orgId) headers["X-Org-Id"] = orgId;
  } else if (orgMode === "require") {
    // still only attach if present; backend will enforce
    if (orgId) headers["X-Org-Id"] = orgId;
    else console.warn("[http] orgMode=require but orgId is missing:", path);
  } else {
    // "none": never attach org header
  }

  const normalized = normalizePath(path);
  const url = joinUrl(API_BASE, normalized);

  console.log("[http]", opts.method ?? "GET", url, `(orgMode=${orgMode})`);

  const res = await fetch(url, {
    method: opts.method ?? "GET",
    headers,
    body:
      opts.body !== undefined
        ? headers["Content-Type"]?.includes("application/json")
          ? JSON.stringify(opts.body)
          : (opts.body as any)
        : undefined,
    signal: opts.signal,
  });

  const data = await parseJsonOrThrow(res);

  if (!res.ok) {
    const msg =
      (data && (data.message || data.error)) ||
      res.statusText ||
      `HTTP ${res.status}`;
    const err = new Error(msg);
    (err as any).status = res.status;
    (err as any).data = data;
    throw err;
  }

  if (res.status === 204) return undefined as T;
  return data as T;
}

export const http = {
  // Default calls (AUTO org header)
  get: <T>(path: string, opts?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...(opts ?? {}), method: "GET" }),
  post: <T>(
    path: string,
    body?: unknown,
    opts?: Omit<RequestOptions, "method" | "body">
  ) => request<T>(path, { ...(opts ?? {}), method: "POST", body }),
  put: <T>(
    path: string,
    body?: unknown,
    opts?: Omit<RequestOptions, "method" | "body">
  ) => request<T>(path, { ...(opts ?? {}), method: "PUT", body }),
  del: <T>(path: string, opts?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...(opts ?? {}), method: "DELETE" }),

  // SYSTEM convenience: never attach org header
  sys: {
    get: <T>(path: string, opts?: Omit<RequestOptions, "method" | "body">) =>
      request<T>(path, { ...(opts ?? {}), method: "GET", orgMode: "none" }),
    post: <T>(
      path: string,
      body?: unknown,
      opts?: Omit<RequestOptions, "method" | "body">
    ) =>
      request<T>(path, {
        ...(opts ?? {}),
        method: "POST",
        body,
        orgMode: "none",
      }),
  },

  // ORG convenience: "require" (but no frontend throw)
  org: {
    get: <T>(path: string, opts?: Omit<RequestOptions, "method" | "body">) =>
      request<T>(path, { ...(opts ?? {}), method: "GET", orgMode: "require" }),
    post: <T>(
      path: string,
      body?: unknown,
      opts?: Omit<RequestOptions, "method" | "body">
    ) =>
      request<T>(path, {
        ...(opts ?? {}),
        method: "POST",
        body,
        orgMode: "require",
      }),
  },
};
