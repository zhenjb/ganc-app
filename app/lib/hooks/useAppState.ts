"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getState } from "@/app/lib/services/api";
import { ApiError } from "@/app/lib/interfaces/api";
import type { AppState } from "@/app/lib/interfaces/state";

export interface UseAppStateResult {
  state: AppState | null;
  /** True only on the first fetch; flips to `false` after it settles. */
  loading: boolean;
  error: ApiError | null;
  /** True whenever any `getState()` call is in flight. */
  inFlight: boolean;
  refresh: () => Promise<void>;
}

export function useAppState(): UseAppStateResult {
  const [state, setState] = useState<AppState | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [inFlight, setInFlight] = useState<boolean>(false);

  const currentCtrlRef = useRef<AbortController | null>(null);
  const mountedRef = useRef<boolean>(true);

  const refresh = useCallback(async (): Promise<void> => {
    // Abort any previous in-flight call before issuing a new one (Req 7.4).
    currentCtrlRef.current?.abort();
    const ctrl = new AbortController();
    currentCtrlRef.current = ctrl;

    if (mountedRef.current) setInFlight(true);

    try {
      const next = await getState({ signal: ctrl.signal });
      // Drop stale results from aborted controllers (Req 7.4, 9.5).
      if (ctrl.signal.aborted || !mountedRef.current) return;
      setState(next);
      setError(null);
    } catch (e: unknown) {
      if (ctrl.signal.aborted || !mountedRef.current) return;
      if (e instanceof ApiError && e.aborted) {
        // Aborted by the hook itself: do not surface an error.
        return;
      }
      const apiErr =
        e instanceof ApiError ? e : new ApiError("Internal Server Error", 500);
      // Preserve previous `state` on failure (Req 7.6).
      setError(apiErr);
    } finally {
      // Only the latest controller flips `inFlight` and `loading` off (Req 7.5).
      if (mountedRef.current && currentCtrlRef.current === ctrl) {
        setInFlight(false);
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    // Defer the first call so the effect body itself does not trigger
    // setState synchronously (`react-hooks/set-state-in-effect`). The
    // race-free contract is unchanged: only the latest controller commits.
    queueMicrotask(() => {
      if (mountedRef.current) void refresh();
    });
    return () => {
      mountedRef.current = false;
      currentCtrlRef.current?.abort();
    };
    // `refresh` is stable (empty dep array via useCallback).
  }, [refresh]);

  return { state, loading, error, inFlight, refresh };
}
