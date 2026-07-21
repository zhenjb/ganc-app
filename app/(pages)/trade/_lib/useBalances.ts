"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { getReservedBalances } from "@/app/lib/services/tradeApi";
import { useAppStateContext } from "@/app/lib/contexts/AppStateContext";
import type { ReservedBalance } from "@/app/lib/interfaces/trade";

export interface UseBalancesResult {
  balances: ReservedBalance[];
  loading: boolean;
  refetch: () => void;
}

/**
 * Convert AppState.moduleAccountBalance (Record<denom, amount>) into
 * ReservedBalance[] so the Balances component can render them.
 * Module balance represents the trading pool — all shown as "available".
 */
function deriveBalancesFromModuleAccount(
  moduleAccountBalance: Record<string, string> | undefined,
  owner: string
): ReservedBalance[] {
  if (!moduleAccountBalance) return [];
  const result: ReservedBalance[] = [];
  for (const [denom, amount] of Object.entries(moduleAccountBalance)) {
    result.push({ owner, denom, available: amount, reserved: "0" });
  }
  return result;
}

/**
 * Fetches reserved balances for the given owner.
 * Falls back to deriving balances from AppState.userBalances when the
 * backend doesn't support the reserved balances endpoint (cosmos mode).
 * Exposes refetch for post-action refresh.
 */
export function useBalances(owner: string): UseBalancesResult {
  const { state } = useAppStateContext();
  const [balances, setBalances] = useState<ReservedBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [useFallback, setUseFallback] = useState(false);
  const mountedRef = useRef(true);

  const doFetch = useCallback(async () => {
    if (!owner) return;
    setLoading(true);
    try {
      const res = await getReservedBalances(owner);
      if (mountedRef.current) {
        const reserved = res.reservedBalances ?? [];
        if (reserved.length > 0) {
          setBalances(reserved);
          setUseFallback(false);
        } else {
          // Backend returned empty reservedBalances — use AppState fallback
          setUseFallback(true);
        }
      }
    } catch {
      // Endpoint not supported or errored — use AppState fallback
      if (mountedRef.current) setUseFallback(true);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [owner]);

  useEffect(() => {
    mountedRef.current = true;
    queueMicrotask(() => {
      if (mountedRef.current) void doFetch();
    });
    return () => {
      mountedRef.current = false;
    };
  }, [doFetch]);

  // Derive balances from AppState.moduleAccountBalance when fallback is active
  const fallbackBalances = useMemo(
    () => deriveBalancesFromModuleAccount(state?.moduleAccountBalance, owner),
    [state?.moduleAccountBalance, owner]
  );

  const effectiveBalances = useFallback ? fallbackBalances : balances;

  return { balances: effectiveBalances, loading, refetch: doFetch };
}
