import type { WithdrawRecord } from "@/app/lib/interfaces/withdraw";

/**
 * SessionStorage key under which the withdraw request history is persisted.
 * History survives page refreshes within the same tab but is cleared when
 * the tab is closed (sessionStorage semantics).
 */
export const STORAGE_KEY = "withdraw-request-history";

/**
 * Returns true when sessionStorage is reachable in the current environment.
 * Guards against SSR / no-window contexts where `window` is undefined, and
 * against environments where accessing `sessionStorage` throws (e.g. disabled
 * storage or sandboxed iframes).
 */
function isSessionStorageAvailable(): boolean {
  try {
    return typeof window !== "undefined" && !!window.sessionStorage;
  } catch {
    // Accessing window.sessionStorage can throw in restricted contexts.
    return false;
  }
}

/**
 * Reads the withdraw request history from sessionStorage.
 *
 * Returns an empty array on any failure: missing key, malformed JSON,
 * non-array payload, or sessionStorage being unavailable (SSR / disabled).
 *
 * @returns The persisted history, or an empty array when unavailable.
 */
export function loadHistory(): WithdrawRecord[] {
  if (!isSessionStorageAvailable()) {
    return [];
  }

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      return [];
    }

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed as WithdrawRecord[];
  } catch {
    // Malformed JSON or read failure — fall back to an empty history.
    return [];
  }
}

/**
 * Serializes the given records and writes them to sessionStorage.
 *
 * Failures (quota exceeded, serialization error, storage unavailable) are
 * swallowed so callers never have to handle storage errors — the in-memory
 * history remains the source of truth for the current render.
 *
 * @param records - The full history list to persist.
 */
export function saveHistory(records: WithdrawRecord[]): void {
  if (!isSessionStorageAvailable()) {
    return;
  }

  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    // Quota exceeded or serialization error — fail silently.
  }
}

/**
 * Prepends a new record to the existing history (most-recent-first),
 * persists the resulting list, and returns it.
 *
 * @param record - The newly created withdraw record to add.
 * @returns The new history array with `record` at the front.
 */
export function appendToHistory(record: WithdrawRecord): WithdrawRecord[] {
  const current = loadHistory();
  const next = [record, ...current];
  saveHistory(next);
  return next;
}
