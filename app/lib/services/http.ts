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

  // 4. Status check. Surface the backend's error message ({ error: "..." })
  // and its real status instead of a generic 500 — callers show it to the user.
  if (!response.ok) {
    let serverMessage: string | undefined;
    try {
      const body = (await response.clone().json()) as { error?: unknown };
      if (typeof body?.error === "string" && body.error.trim() !== "") {
        serverMessage = body.error.trim();
      }
    } catch {
      /* body was not JSON */
    }
    // Only log genuinely unexpected failures (no server-provided reason). A
    // well-formed 4xx like "insufficient off-chain balance" is an expected user
    // error the UI surfaces — logging it would spam and trigger the dev overlay.
    if (!serverMessage) {
      console.error("[FE-02] HTTP error", { method, url, status: response.status });
    }
    throw new ApiError(serverMessage ?? "Internal Server Error", response.status);
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
  // Benign aborts (React StrictMode double-mount, a newer refresh superseding an
  // in-flight one, or component unmount) reject the fetch with AbortError. These
  // are NOT failures — the superseding/surviving request still resolves. Logging
  // them is misleading, and Next.js dev surfaces every console.error as a red
  // "Console Error" overlay, so a harmless abort looks fatal. Log real failures
  // only; callers already drop aborted results via ApiError.aborted.
  if (!isAbort) {
    console.error("[FE-02] fetch failure", { method, url, err });
  }
  throw new ApiError("Internal Server Error", 500, isAbort);
}
