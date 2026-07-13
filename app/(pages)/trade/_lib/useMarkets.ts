"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getMarkets } from "@/app/lib/services/tradeApi";
import type { Market } from "@/app/lib/interfaces/trade";

export interface UseMarketsResult {
  markets: Market[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Fetches market metadata once on mount. Caches until refetch is called.
 */
export function useMarkets(): UseMarketsResult {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const doFetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getMarkets();
      if (mountedRef.current) setMarkets(res.markets ?? []);
    } catch (err) {
      console.error("[Trade] useMarkets error", err);
      if (mountedRef.current) setError("Failed to load markets.");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    queueMicrotask(() => {
      if (mountedRef.current) void doFetch();
    });
    return () => {
      mountedRef.current = false;
    };
  }, [doFetch]);

  return { markets, loading, error, refetch: doFetch };
}
