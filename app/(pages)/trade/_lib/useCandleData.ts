"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getTrades } from "@/app/lib/services/tradeApi";
import type { Fill } from "@/app/lib/interfaces/trade";

/** Single OHLC candle for lightweight-charts */
export interface Candle {
  time: number; // Unix timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
}

/** Interval in seconds for each candle bucket */
export type CandleInterval = 60 | 300 | 900 | 3600;

export interface UseCandleDataResult {
  candles: Candle[];
  loading: boolean;
}

/**
 * Fetches trade fills for a market and aggregates them into OHLC candlestick
 * data bucketed by the given interval. Uses the real `timestamp` field on each
 * fill. Polls every 5 seconds for new fills.
 */
export function useCandleData(
  market: string,
  interval: CandleInterval = 60
): UseCandleDataResult {
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  const buildCandles = useCallback(
    (fills: Fill[]): Candle[] => {
      if (fills.length === 0) return [];

      // Group fills by interval bucket using real timestamps
      const buckets = new Map<number, { prices: number[] }>();

      for (const fill of fills) {
        const price = parseFloat(fill.price);
        if (isNaN(price) || !fill.timestamp) continue;

        const bucketTime = Math.floor(fill.timestamp / interval) * interval;
        if (!buckets.has(bucketTime)) {
          buckets.set(bucketTime, { prices: [] });
        }
        buckets.get(bucketTime)!.prices.push(price);
      }

      // Convert buckets to OHLC candles
      const result: Candle[] = [];
      const sortedKeys = [...buckets.keys()].sort((a, b) => a - b);

      for (const bucketTime of sortedKeys) {
        const { prices } = buckets.get(bucketTime)!;
        result.push({
          time: bucketTime,
          open: prices[0],
          high: Math.max(...prices),
          low: Math.min(...prices),
          close: prices[prices.length - 1],
        });
      }

      return result;
    },
    [interval]
  );

  const doFetch = useCallback(async () => {
    if (!market) {
      setCandles([]);
      setLoading(false);
      return;
    }
    try {
      const res = await getTrades(market);
      if (mountedRef.current) {
        setCandles(buildCandles(res.fills ?? []));
      }
    } catch (err) {
      console.error("[Trade] useCandleData error", err);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [market, buildCandles]);

  useEffect(() => {
    mountedRef.current = true;
    setLoading(true);
    void doFetch();

    // Poll every 5s for new trade data
    const timer = setInterval(() => {
      void doFetch();
    }, 5000);

    return () => {
      mountedRef.current = false;
      clearInterval(timer);
    };
  }, [doFetch]);

  return { candles, loading };
}
