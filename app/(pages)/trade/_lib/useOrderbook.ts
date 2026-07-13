"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { getOrderbook } from "@/app/lib/services/tradeApi";
import type { OrderbookSnapshot } from "@/app/lib/interfaces/trade";

const POLL_INTERVAL_MS = 2000;

export interface UseOrderbookResult {
  orderbook: OrderbookSnapshot | null;
  loading: boolean;
}

/**
 * Polls the order book for the given market every 2s.
 * Stops polling when market is empty or component unmounts.
 */
export function useOrderbook(market: string): UseOrderbookResult {
  const [orderbook, setOrderbook] = useState<OrderbookSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  const fetchBook = useCallback(async () => {
    if (!market) return;
    try {
      const snap = await getOrderbook(market);
      if (mountedRef.current) setOrderbook(snap);
    } catch (err) {
      console.error("[Trade] useOrderbook error", err);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [market]);

  useEffect(() => {
    if (!market) return;
    mountedRef.current = true;

    // Defer initial fetch to avoid synchronous setState in the effect body
    queueMicrotask(() => {
      if (mountedRef.current) void fetchBook();
    });

    const intervalId = setInterval(() => {
      if (mountedRef.current) void fetchBook();
    }, POLL_INTERVAL_MS);

    return () => {
      mountedRef.current = false;
      clearInterval(intervalId);
    };
  }, [market, fetchBook]);

  return { orderbook, loading };
}
