"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getReservedBalances } from "@/app/lib/services/tradeApi";
import type { ReservedBalance } from "@/app/lib/interfaces/trade";

export interface UseBalancesResult {
  balances: ReservedBalance[];
  loading: boolean;
  refetch: () => void;
}

/**
 * Fetches reserved balances for the given owner.
 * Exposes refetch for post-action refresh.
 */
export function useBalances(owner: string): UseBalancesResult {
  const [balances, setBalances] = useState<ReservedBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  const doFetch = useCallback(async () => {
    if (!owner) return;
    setLoading(true);
    try {
      const res = await getReservedBalances(owner);
      if (mountedRef.current) setBalances(res.reservedBalances ?? []);
    } catch (err) {
      console.error("[Trade] useBalances error", err);
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

  return { balances, loading, refetch: doFetch };
}
