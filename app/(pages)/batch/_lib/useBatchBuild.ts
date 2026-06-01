"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { postBatchBuild } from "@/app/lib/services/api";
import { ApiError } from "@/app/lib/interfaces/api";
import type {
  BatchBuildInput,
  BatchBuildResponse,
} from "@/app/lib/interfaces/batch";

/**
 * Dependencies injected into {@link useBatchBuild}.
 *
 * The hook orchestrates the two post-success side effects (save session +
 * refresh app state) but stays decoupled from their concrete implementations:
 * the orchestrator (`BatchScreen`) supplies them so the hook remains focused
 * and unit-testable in isolation.
 */
export interface UseBatchBuildOptions {
  /**
   * Refresh the shared app state after a successful build. Invoked exactly
   * once per success, AFTER the result has been committed to the DOM, so state
   * propagation never blocks rendering the batch result (Req 11.1). A rejected
   * refresh is swallowed and never affects the displayed result (Req 11.3).
   */
  refresh: () => Promise<void>;
  /**
   * Called synchronously when a build succeeds, before the post-render
   * refresh. `BatchScreen` uses this to store the freshly built batch into the
   * shared in-memory session (which also clears the stale flag). It is never
   * called when a build fails (Req 11.4, 12.7).
   */
  onSuccess?: (response: BatchBuildResponse) => void;
}

/**
 * Public surface of {@link useBatchBuild}.
 */
export interface UseBatchBuildResult {
  /** `true` while a `postBatchBuild` call is in flight. */
  building: boolean;
  /** Latest successful response, or `null` before any successful build. */
  result: BatchBuildResponse | null;
  /** `true` when the last build failed — drives the NormalizedError banner. */
  buildError: boolean;
  /** Trigger a build for the given payload. */
  build: (payload: BatchBuildInput) => Promise<void>;
  /** Hide the error banner (e.g. before issuing a new request, Req 12.6). */
  clearError: () => void;
}

/**
 * Manages the Batch screen build lifecycle (FE-06).
 *
 * Guarantees:
 *   - `build()` returns early while a build is already in flight, so only one
 *     request runs at a time (Req 3.3) and `postBatchBuild` is called exactly
 *     once per accepted invocation (Req 3.1).
 *   - Sets `building = true` and clears any prior error before the request
 *     (Req 12.6).
 *   - On success: stores the response in `result`, sets `building = false`
 *     (Req 3.4), saves the session via `onSuccess`, then calls `refresh()`
 *     exactly once AFTER render (Req 11.1); a failing `refresh()` does not clear
 *     the result (Req 11.3).
 *   - On failure (normalized `ApiError`): sets `building = false` (Req 3.5,
 *     12.5) and `buildError = true`, renders no result (Req 12.7), does not call
 *     `refresh()` (Req 11.4), and never touches the selection (Req 12.3 — the
 *     selection lives in `BatchScreen`, so it is simply left alone).
 *
 * The hook reaches the backend only through `postBatchBuild`; it never calls
 * `fetch` directly (Req 3.6).
 */
export function useBatchBuild(
  options: UseBatchBuildOptions,
): UseBatchBuildResult {
  const { refresh, onSuccess } = options;

  const [building, setBuilding] = useState(false);
  const [result, setResult] = useState<BatchBuildResponse | null>(null);
  const [buildError, setBuildError] = useState(false);

  // Synchronous in-flight guard. React state updates are async, so `building`
  // can lag behind two `build()` calls fired within the same tick (e.g. a rapid
  // double-click). This ref flips synchronously and is the authoritative gate
  // for the single-in-flight invariant (Req 3.3).
  const inFlightRef = useRef(false);

  // Monotonic counter bumped on each successful build. The effect below watches
  // it to fire `refresh()` exactly once per success, AFTER the committed render
  // so state propagation never blocks showing the result (Req 11.1).
  const [successTick, setSuccessTick] = useState(0);

  // Keep the latest injected callbacks in refs so `build` keeps a stable
  // identity and the post-render effect always sees the current functions
  // without re-subscribing when the caller passes new closures each render.
  const refreshRef = useRef(refresh);
  const onSuccessRef = useRef(onSuccess);
  useEffect(() => {
    refreshRef.current = refresh;
    onSuccessRef.current = onSuccess;
  }, [refresh, onSuccess]);

  useEffect(() => {
    // Skip the initial mount; only react to real successes.
    if (successTick === 0) {
      return;
    }
    // Fire-and-forget refresh. A rejected refresh must not clear the result or
    // the session that are already displayed (Req 11.3), so swallow it here.
    void refreshRef.current().catch(() => {
      // Intentionally ignored — refresh failure does not affect the build
      // result that is already on screen (Req 11.3).
    });
  }, [successTick]);

  const build = useCallback(async (payload: BatchBuildInput): Promise<void> => {
    // Single in-flight guard: ignore the call entirely when a build is already
    // running (Req 3.3).
    if (inFlightRef.current) {
      return;
    }
    inFlightRef.current = true;

    // Start a fresh attempt: show the spinner and hide any prior error banner
    // before issuing the request (Req 12.6).
    setBuilding(true);
    setBuildError(false);

    try {
      // Exactly one backend call per invocation, only via the typed wrapper
      // (Req 3.1, 3.6).
      const response = await postBatchBuild(payload);

      // Success: surface the result and stop the spinner (Req 3.4).
      setResult(response);
      setBuilding(false);

      // Save the freshly built batch into the session (clears stale). This is
      // synchronous and batches with the result update, so it does not block
      // rendering the result.
      onSuccessRef.current?.(response);

      // Schedule the single post-render `refresh()` (Req 11.1).
      setSuccessTick((tick) => tick + 1);
    } catch (err) {
      // The HTTP layer normalizes every failure to `ApiError`. On failure: stop
      // the spinner (Req 3.5, 12.5) and raise the error banner (Req 12.1). The
      // result is left untouched so no result section for this failed build is
      // rendered (Req 12.7); `refresh()` is never called (Req 11.4); the
      // selection (owned by BatchScreen) is never reset (Req 12.3).
      if (!(err instanceof ApiError)) {
        // Defensive: surface unexpected throwables to developers only.
        console.error("[FE-06] unexpected batch build error", err);
      }
      setBuilding(false);
      setBuildError(true);
    } finally {
      inFlightRef.current = false;
    }
  }, []);

  const clearError = useCallback(() => {
    setBuildError(false);
  }, []);

  return { building, result, buildError, build, clearError };
}
