import { ApiError } from "@/app/lib/interfaces/api";

const DEFAULT_DEV_BASE_URL = "http://localhost:8080";
const DEFAULT_TIMEOUT_MS = 15_000;

export interface RequestOptions extends RequestInit {
  /** Optional client-side timeout in ms. Defaults to 15s. */
  timeoutMs?: number;
  /** External AbortSignal (composed with the internal timeout signal). */
  signal?: AbortSignal;
}

export function getApiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (raw && raw.length > 0) {
    return raw.replace(/\/+$/, "");
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "NEXT_PUBLIC_API_BASE_URL is required for production builds."
    );
  }
  return DEFAULT_DEV_BASE_URL;
}

export async function request<T>(
  path: string,
  init?: RequestOptions
): Promise<T> {
  // 1. Compose URL and headers.
  const url = `${getApiBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  const method = (init?.method ?? "GET").toUpperCase();
  const headers = new Headers(init?.headers);
  if (method !== "GET" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  // 2. Compose abort signals: caller's signal + internal timeout signal.
  const timeoutCtrl = new AbortController();
  const timeoutMs = init?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const timeoutHandle = setTimeout(() => timeoutCtrl.abort(), timeoutMs);
  const signal = composeSignals(init?.signal, timeoutCtrl.signal);

  // 3. Fire fetch with cache=no-store on GET.
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      method,
      headers,
      signal,
      cache: method === "GET" ? "no-store" : init?.cache,
    });
  } catch (err: unknown) {
    clearTimeout(timeoutHandle);
    return throwNormalized(err, method, url);
  }
  clearTimeout(timeoutHandle);

  // 4. Status check.
  if (!response.ok) {
    let body: unknown = undefined;
    try {
      body = await response.clone().json();
    } catch {
      /* swallow */
    }
    console.error("[FE-02] HTTP error", {
      method,
      url,
      status: response.status,
      body,
    });
    throw new ApiError("Internal Server Error", 500);
  }

  // 5. Parse JSON.
  try {
    return (await response.json()) as T;
  } catch (err: unknown) {
    console.error("[FE-02] JSON parse error", { method, url, err });
    throw new ApiError("Internal Server Error", 500);
  }
}

function composeSignals(
  external: AbortSignal | undefined,
  internal: AbortSignal
): AbortSignal {
  if (!external) return internal;
  const composite = new AbortController();
  const onAbort = () => composite.abort();
  if (external.aborted || internal.aborted) {
    composite.abort();
  } else {
    external.addEventListener("abort", onAbort, { once: true });
    internal.addEventListener("abort", onAbort, { once: true });
  }
  return composite.signal;
}

function throwNormalized(err: unknown, method: string, url: string): never {
  const isAbort = err instanceof DOMException && err.name === "AbortError";
  console.error("[FE-02] fetch failure", { method, url, err });
  throw new ApiError("Internal Server Error", 500, isAbort);
}
