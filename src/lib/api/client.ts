/**
 * API client: base URL from NEXT_PUBLIC_API_URL, JSON, Bearer token.
 * Central error handling: 401 → toast "Session expired", clear token, redirect; 429 → toast; network → toast "Check your connection".
 */

import { toast } from "sonner";
import { endpoints } from "./endpoints";

const getBaseUrl = () => {
  if (typeof window === "undefined") {
    return process.env.NEXT_PUBLIC_API_URL ?? "";
  }
  return process.env.NEXT_PUBLIC_API_URL ?? "";
};

export type ApiErrorPayload = {
  status: number;
  message: string;
};

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("tracex_token");
}

export function setAuthToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("tracex_token", token);
}

export function clearAuthToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("tracex_token");
}

function handleErrorResponse(
  response: Response,
  body: { success?: boolean; error?: string }
): never {
  const message = body?.error ?? response.statusText ?? "Request failed";
  const payload: ApiErrorPayload = { status: response.status, message };

  if (response.status === 401) {
    if (typeof window !== "undefined") toast.error("Session expired");
    clearAuthToken();
    if (typeof window !== "undefined") {
      window.location.href = "/signin";
    }
    throw payload;
  }

  if (response.status === 429) {
    const retryAfter = response.headers.get("Retry-After");
    if (retryAfter) {
      const secs = parseInt(retryAfter, 10);
      if (!Number.isNaN(secs)) {
        payload.message = `Too many requests. Retry in ${secs}s.`;
      } else {
        payload.message = `Too many requests. Retry after ${retryAfter}.`;
      }
    } else {
      payload.message = "Too many requests. Please try again later.";
    }
    if (typeof window !== "undefined") toast.error(payload.message);
    throw payload;
  }

  throw payload;
}

async function request<T>(
  path: string,
  options: RequestInit & {
    params?: Record<string, string | number | undefined>;
  } = {}
): Promise<T> {
  const { params, ...init } = options;
  const base = getBaseUrl().replace(/\/$/, "");
  const url = new URL(path.startsWith("/") ? path : `/${path}`, base);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
    });
  }

  const token = getToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      ...init,
      headers,
    });
  } catch {
    if (typeof window !== "undefined") toast.error("Check your connection");
    throw new Error("Network error");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  let body: {
    success?: boolean;
    data?: T;
    error?: string;
    user?: unknown;
    token?: string;
  };
  const contentType = response.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    body = (await response.json()) as typeof body;
  } else {
    body = {};
  }

  if (!response.ok) {
    handleErrorResponse(response, body);
  }

  if ("data" in body && body.success === true) {
    if ("count" in body) return body as T;
    return body.data as T;
  }
  if ("user" in body && "token" in body && body.success === true) {
    return { user: body.user, token: body.token } as T;
  }
  return body as T;
}

export interface ListResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

async function requestList<T>(
  path: string,
  params?: Record<string, string | number | undefined>
): Promise<ListResponse<T>> {
  const base = getBaseUrl().replace(/\/$/, "");
  const url = new URL(path.startsWith("/") ? path : `/${path}`, base);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
    });
  }
  const token = getToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(url.toString(), { method: "GET", headers });
  } catch {
    if (typeof window !== "undefined") toast.error("Check your connection");
    throw new Error("Network error");
  }
  const body = (await response.json()) as {
    success?: boolean;
    data?: T[];
    pagination?: ListResponse<T>["pagination"];
    error?: string;
  };

  if (!response.ok) {
    handleErrorResponse(response, body);
  }

  if (body.success === true && Array.isArray(body.data) && body.pagination) {
    return { data: body.data, pagination: body.pagination };
  }
  throw { status: response.status, message: body?.error ?? "Invalid response" };
}

/**
 * Export expenses as CSV (blob download). Params: format=csv required; from, to, category optional.
 * On 400 shows toast with error message and throws.
 */
export async function exportExpensesCsv(
  from?: string,
  to?: string,
  category?: string
): Promise<void> {
  const base = getBaseUrl().replace(/\/$/, "");
  const url = new URL(endpoints.expenseExport, base);
  url.searchParams.set("format", "csv");
  if (from) url.searchParams.set("from", from);
  if (to) url.searchParams.set("to", to);
  if (category?.trim()) url.searchParams.set("category", category.trim());
  const token = getToken();
  const headers: HeadersInit = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(url.toString(), { method: "GET", headers });
  } catch {
    if (typeof window !== "undefined") toast.error("Check your connection");
    throw new Error("Network error");
  }

  if (!response.ok) {
    const text = await response.text();
    let message = "Export failed";
    try {
      const json = JSON.parse(text) as { error?: string };
      if (json?.error) message = json.error;
    } catch {
      if (text) message = text;
    }
    if (response.status === 400 && typeof window !== "undefined")
      toast.error(message);
    throw { status: response.status, message };
  }

  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition");
  const filenameMatch = disposition?.match(/filename="?([^";\n]+)"?/);
  const filename = filenameMatch?.[1] ?? "expenses.csv";
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

/** GET without Authorization (e.g. public budget by slug). */
export async function getPublic<T>(
  path: string,
  params?: Record<string, string | number | undefined>
): Promise<T> {
  const base = getBaseUrl().replace(/\/$/, "");
  const url = new URL(path.startsWith("/") ? path : `/${path}`, base);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
    });
  }
  const response = await fetch(url.toString(), {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    throw {
      status: response.status,
      message: body?.error ?? response.statusText,
    };
  }
  const body = (await response.json()) as T;
  return body as T;
}

export const api = {
  get: <T>(
    path: string,
    params?: Record<string, string | number | undefined>
  ) => request<T>(path, { method: "GET", params }),

  getList: <T>(
    path: string,
    params?: Record<string, string | number | undefined>
  ) => requestList<T>(path, params),

  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }),

  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),

  /** DELETE with JSON body (e.g. bulk delete with ids). */
  deleteWithBody: <T>(path: string, body: unknown) =>
    request<T>(path, {
      method: "DELETE",
      body: JSON.stringify(body),
    }),
};
