"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  useAppState,
  type UseAppStateResult,
} from "@/app/lib/hooks/useAppState";
import { useWalletContext } from "@/app/lib/contexts/WalletContext";
import { ApiError } from "@/app/lib/interfaces/api";

/**
 * Maximum time to wait for the initial `GET /api/state` before treating the
 * call as a failure and surfacing a synthetic NormalizedError (Req 11.2).
 */
const STATE_FETCH_TIMEOUT_MS = 3000;

const AppStateContext = createContext<UseAppStateResult | null>(null);

/**
 * Provider that calls `useAppState(owner)` and exposes its return value
 * via React Context. Only fetches state when a wallet address is available.
 *
 * Adds a 3000 ms watchdog: when a fetch is in-flight and no `AppState`
 * has arrived yet, after `STATE_FETCH_TIMEOUT_MS` a synthetic
 * `ApiError("Internal Server Error", 500)` is surfaced through the
 * context's `error` value so the AppShell can render the NormalizedError
 * banner (Req 10.4, 11.2). The synthetic error is disarmed and cleared
 * as soon as a successful response arrives.
 */
export function AppStateProvider({ children }: { children: ReactNode }) {
  const { address } = useWalletContext();
  const value = useAppState(address);
  const { state, inFlight, error } = value;
  const [timeoutError, setTimeoutError] = useState<ApiError | null>(null);

  useEffect(() => {
    // Only arm the watchdog while a fetch is in flight and no state has
    // been observed yet.
    if (state != null || !inFlight) {
      return;
    }
    const handle = setTimeout(() => {
      console.error("[FE-01] state fetch exceeded 3000ms");
      setTimeoutError(new ApiError("Internal Server Error", 500));
    }, STATE_FETCH_TIMEOUT_MS);
    return () => {
      clearTimeout(handle);
    };
  }, [inFlight, state]);

  const effectiveTimeoutError = state != null ? null : timeoutError;
  const merged: UseAppStateResult = {
    ...value,
    error: error ?? effectiveTimeoutError,
  };

  return (
    <AppStateContext.Provider value={merged}>
      {children}
    </AppStateContext.Provider>
  );
}

/**
 * Hook for consuming the shared `AppState`. Throws when used outside an
 * `<AppStateProvider>` so misconfiguration fails loudly during development.
 */
export function useAppStateContext(): UseAppStateResult {
  const ctx = useContext(AppStateContext);
  if (!ctx) {
    throw new Error(
      "useAppStateContext must be used inside <AppStateProvider>."
    );
  }
  return ctx;
}
