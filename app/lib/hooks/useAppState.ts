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

export function useAppState(owner: string | null): UseAppStateResult {
  const [state, setState] = useState<AppState | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [inFlight, setInFlight] = useState<boolean>(false);

  const currentCtrlRef = useRef<AbortController | null>(null);
  const mountedRef = useRef<boolean>(true);
  const ownerRef = useRef<string | null>(owner);
  ownerRef.current = owner;

  const refresh = useCallback(async (): Promise<void> => {
    const currentOwner = ownerRef.current;
    if (!currentOwner) {
      // No owner — don't call API at all
      return;
    }

    // Abort any previous in-flight call before issuing a new one (Req 7.4).
    currentCtrlRef.current?.abort();
    const ctrl = new AbortController();
    currentCtrlRef.current = ctrl;

    if (mountedRef.current) setInFlight(true);

    try {
      const next = await getState({
        signal: ctrl.signal,
        owner: currentOwner,
      });
      // Drop stale results from aborted controllers (Req 7.4, 9.5).
      if (ctrl.signal.aborted || !mountedRef.current) return;
      setState(next);
      setError(null);
    } catch (e: unknown) {
      if (ctrl.signal.aborted || !mountedRef.current) return;
      if (e instanceof ApiError && e.aborted) {
        return;
      }
      const apiErr =
        e instanceof ApiError ? e : new ApiError("Internal Server Error", 500);
      setError(apiErr);
    } finally {
      if (mountedRef.current && currentCtrlRef.current === ctrl) {
        setInFlight(false);
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    if (!owner) {
      // No owner — no fetch, state stays null
      setLoading(false);
      setState(null);
      return;
    }

    setLoading(true);
    queueMicrotask(() => {
      if (mountedRef.current) void refresh();
    });
    return () => {
      mountedRef.current = false;
      currentCtrlRef.current?.abort();
    };
    // Re-fetch when owner changes
  }, [owner, refresh]);

  return { state, loading, error, inFlight, refresh };
}
