"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getOpenOrders, getTrades, cancelOrder } from "@/app/lib/services/tradeApi";
import type { OpenOrder, Fill } from "@/app/lib/interfaces/trade";

export interface UseOpenOrdersResult {
  openOrders: OpenOrder[];
  fills: Fill[];
  loading: boolean;
  refetch: () => void;
  handleCancel: (orderHash: string) => Promise<void>;
  cancelError: string | null;
}

/**
 * Manages open orders list + order history (fills) for a given owner/market.
 */
export function useOpenOrders(
  owner: string,
  market: string
): UseOpenOrdersResult {
  const [openOrders, setOpenOrders] = useState<OpenOrder[]>([]);
  const [fills, setFills] = useState<Fill[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const doFetch = useCallback(async () => {
    if (!owner) return;
    setLoading(true);
    try {
      const [ordersRes, tradesRes] = await Promise.all([
        getOpenOrders(owner),
        market ? getTrades(market) : Promise.resolve({ fills: [] as Fill[] }),
      ]);
      if (mountedRef.current) {
        setOpenOrders(ordersRes.openOrders ?? []);
        setFills(tradesRes.fills ?? []);
      }
    } catch (err) {
      console.error("[Trade] useOpenOrders error", err);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [owner, market]);

  useEffect(() => {
    mountedRef.current = true;
    queueMicrotask(() => {
      if (mountedRef.current) void doFetch();
    });
    return () => {
      mountedRef.current = false;
    };
  }, [doFetch]);

  const handleCancel = useCallback(
    async (orderHash: string) => {
      setCancelError(null);
      // Optimistic removal
      setOpenOrders((prev) => prev.filter((o) => o.orderHash !== orderHash));
      try {
        const result = await cancelOrder(orderHash, owner);
        if (!result.ok) {
          setCancelError(result.message);
          // Revert optimistic update
          doFetch();
        }
      } catch {
        setCancelError("Failed to cancel order.");
        doFetch();
      }
    },
    [owner, doFetch]
  );

  return { openOrders, fills, loading, refetch: doFetch, handleCancel, cancelError };
}
