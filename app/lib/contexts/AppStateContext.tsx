"use client";

import { createContext, useContext, type ReactNode } from "react";
import {
  useAppState,
  type UseAppStateResult,
} from "@/app/lib/hooks/useAppState";

const AppStateContext = createContext<UseAppStateResult | null>(null);

/**
 * Provider that calls `useAppState()` once and exposes its return value
 * via React Context. Mount this at `app/layout.tsx` so every page in
 * `app/(pages)/*` shares the same race-free `getState()` consumption (Req 7.9, 7.10).
 */
export function AppStateProvider({ children }: { children: ReactNode }) {
  const value = useAppState();
  return (
    <AppStateContext.Provider value={value}>
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
