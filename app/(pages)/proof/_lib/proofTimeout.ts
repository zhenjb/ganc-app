import type { ProofTimeoutResult } from "../_types";

/**
 * Creates an AbortController paired with a timeout.
 * After `ms` milliseconds the controller will abort automatically.
 * Call `clear()` to cancel the timeout early (e.g. when the API responds).
 */
export function createProofTimeout(ms: number): ProofTimeoutResult {
  const controller = new AbortController();
  const handle = setTimeout(() => controller.abort(), ms);

  return {
    signal: controller.signal,
    clear: () => clearTimeout(handle),
  };
}
