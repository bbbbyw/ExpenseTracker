import { env } from "@/lib/env";
import { getTokens, setTokens, type AuthTokens } from "@/lib/authTokens";

type ApiErrorBody = { error?: string; message?: string; details?: unknown };

export class ApiError extends Error {
  status: number;
  body?: ApiErrorBody;

  constructor(status: number, message: string, body?: ApiErrorBody) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

async function readJsonSafe(res: Response) {
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) return undefined;
  try {
    return (await res.json()) as unknown;
  } catch {
    return undefined;
  }
}

export async function apiFetch<T>(
  path: string,
  opts?: RequestInit & { auth?: boolean; _retry?: boolean }
): Promise<T> {
  const auth = opts?.auth !== false;
  const headers = new Headers(opts?.headers);
  if (!headers.has("Content-Type") && opts?.body) {
    headers.set("Content-Type", "application/json");
  }

  if (auth) {
    const tokens = getTokens();
    if (tokens?.accessToken) {
      headers.set("Authorization", `Bearer ${tokens.accessToken}`);
    }
  }

  const res = await fetch(`${env.apiBaseUrl}${path}`, {
    ...opts,
    headers,
  });

  if (res.ok) {
    // handle csv / blobs elsewhere
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) return (await res.json()) as T;
    return (await res.text()) as unknown as T;
  }

  const body = (await readJsonSafe(res)) as ApiErrorBody | undefined;
  const msg =
    body?.error ||
    body?.message ||
    `Request failed (${res.status}) ${res.statusText}`;

  // If token is invalid/expired, try a single refresh before failing
  if (res.status === 401 && !opts?._retry) {
    const tokens = getTokens();
    if (tokens?.refreshToken) {
      try {
        const refreshed = await authRefresh(tokens.refreshToken);
        const nextTokens: AuthTokens = {
          accessToken: refreshed.accessToken,
          refreshToken: tokens.refreshToken,
        };
        setTokens(nextTokens);
        return apiFetch<T>(path, { ...opts, _retry: true });
      } catch {
        // fall through to clear tokens and throw error
      }
    }
    setTokens(null);
  }

  throw new ApiError(res.status, msg, body);
}

export async function apiDownloadCsv(
  path: string,
  body: unknown,
  filename: string
) {
  const tokens = getTokens();
  const res = await fetch(`${env.apiBaseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(tokens?.accessToken
        ? { Authorization: `Bearer ${tokens.accessToken}` }
        : {}),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = (await readJsonSafe(res)) as ApiErrorBody | undefined;
    throw new ApiError(
      res.status,
      errBody?.error ||
        errBody?.message ||
        `Download failed (${res.status}) ${res.statusText}`,
      errBody
    );
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function authLogin(payload: {
  email: string;
  password: string;
}): Promise<AuthTokens> {
  const data = await apiFetch<{
    accessToken: string;
    refreshToken: string;
  }>("/api/v1/auth/login", {
    method: "POST",
    auth: false,
    body: JSON.stringify(payload),
  });
  return { accessToken: data.accessToken, refreshToken: data.refreshToken };
}

export async function authRegister(payload: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}) {
  return apiFetch("/api/v1/auth/register", {
    method: "POST",
    auth: false,
    body: JSON.stringify(payload),
  });
}

export async function authMe() {
  return apiFetch<{
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    createdAt: string;
  }>("/api/v1/auth/me");
}

export async function authRefresh(refreshToken: string) {
  return apiFetch<{ accessToken: string }>("/api/v1/auth/refresh", {
    method: "POST",
    auth: false,
    body: JSON.stringify({ refreshToken }),
  });
}

export async function authLogout(refreshToken: string | null | undefined) {
  if (!refreshToken) return;
  try {
    await apiFetch("/api/v1/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    });
  } catch {
    // ignore logout errors
  }
}