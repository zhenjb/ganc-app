"use client";

import { useMemo } from "react";
import type { OrderbookSnapshot, OrderBookLevel } from "@/app/lib/interfaces/trade";
import styles from "./OrderBook.module.scss";

interface MarketOption {
  market: string;
  disabled: boolean;
}

interface OrderBookProps {
  orderbook: OrderbookSnapshot | null;
  loading: boolean;
  marketPair: string;
  markets: MarketOption[];
  marketsLoading: boolean;
  onMarketChange: (market: string) => void;
}

/**
 * Calculates cumulative depth percentage for the depth bar visualization.
 * Levels are already sorted from best price outward by the API.
 */
function computeDepthBars(levels: OrderBookLevel[]): number[] {
  if (levels.length === 0) return [];
  let cumulative = 0;
  const cumulatives = levels.map((l) => {
    cumulative += parseFloat(l.qty) || 0;
    return cumulative;
  });
  const maxCum = cumulatives[cumulatives.length - 1] || 1;
  return cumulatives.map((c) => (c / maxCum) * 100);
}

export function OrderBook({
  orderbook,
  loading,
  marketPair,
  markets,
  marketsLoading,
  onMarketChange,
}: OrderBookProps) {
  const bids = useMemo(() => orderbook?.bids ?? [], [orderbook?.bids]);
  const asks = useMemo(() => orderbook?.asks ?? [], [orderbook?.asks]);

  const bidDepths = useMemo(() => computeDepthBars(bids), [bids]);
  const askDepths = useMemo(() => computeDepthBars(asks), [asks]);

  // Spread calculation
  const bestBid = orderbook?.bestBid;
  const bestAsk = orderbook?.bestAsk;
  const spread = useMemo(() => {
    if (!bestBid || !bestAsk) return null;
    const bid = parseFloat(bestBid);
    const ask = parseFloat(bestAsk);
    if (isNaN(bid) || isNaN(ask) || bid === 0) return null;
    const diff = ask - bid;
    const pct = ((diff / bid) * 100).toFixed(2);
    return { diff: diff.toFixed(2), pct };
  }, [bestBid, bestAsk]);

  // Mid price for the banner
  const midPrice = useMemo(() => {
    if (!bestBid || !bestAsk) return "—";
    const bid = parseFloat(bestBid);
    const ask = parseFloat(bestAsk);
    if (isNaN(bid) || isNaN(ask)) return "—";
    return ((bid + ask) / 2).toFixed(2);
  }, [bestBid, bestAsk]);

  if (loading && !orderbook) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <span className={styles.title}>Order Book</span>
          <select
            className={styles.marketSelect}
            value={marketPair}
            onChange={(e) => onMarketChange(e.target.value)}
            disabled={marketsLoading}
            aria-label="Select market"
          >
            {marketsLoading && <option value="">Loading…</option>}
            {markets.map((m) => (
              <option key={m.market} value={m.market} disabled={m.disabled}>
                {m.market} {m.disabled ? "(Inactive)" : ""}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.loading}>Loading order book…</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header with market selector */}
      <div className={styles.header}>
        <span className={styles.title}>Order Book</span>
        <select
          className={styles.marketSelect}
          value={marketPair}
          onChange={(e) => onMarketChange(e.target.value)}
          disabled={marketsLoading}
          aria-label="Select market"
        >
          {marketsLoading && <option value="">Loading…</option>}
          {markets.map((m) => (
            <option key={m.market} value={m.market} disabled={m.disabled}>
              {m.market} {m.disabled ? "(Inactive)" : ""}
            </option>
          ))}
        </select>
      </div>

      {/* Spread banner */}
      <div className={styles.spreadBanner}>
        <span className={styles.spreadPrice}>{midPrice}</span>
        {spread && (
          <span className={styles.spreadLabel}>
            SPREAD {spread.diff} ({spread.pct}%)
          </span>
        )}
      </div>

      {/* Split book grid */}
      <div className={styles.splitBook}>
        {/* Buy (Bids) */}
        <div className={styles.buyCol}>
          <div className={`${styles.colTitle} ${styles.buyTitle}`}>
            <span>Price</span>
            <span>Amount</span>
          </div>
          {bids.slice(0, 10).map((level, idx) => (
            <div key={`bid-${idx}`} className={`${styles.obRow} ${styles.buyRow}`}>
              <div
                className={styles.bg}
                style={{ width: `${bidDepths[idx] ?? 0}%` }}
              />
              <span className={`${styles.cellPrice} ${styles.buyPrice}`}>
                {level.price}
              </span>
              <span className={styles.cellAmt}>{level.qty}</span>
            </div>
          ))}
          {bids.length === 0 && (
            <div className={styles.emptyCol}>No bids</div>
          )}
        </div>

        {/* Sell (Asks) */}
        <div className={styles.sellCol}>
          <div className={`${styles.colTitle} ${styles.sellTitle}`}>
            <span>Price</span>
            <span>Amount</span>
          </div>
          {asks.slice(0, 10).map((level, idx) => (
            <div key={`ask-${idx}`} className={`${styles.obRow} ${styles.sellRow}`}>
              <div
                className={styles.bg}
                style={{ width: `${askDepths[idx] ?? 0}%` }}
              />
              <span className={`${styles.cellPrice} ${styles.sellPrice}`}>
                {level.price}
              </span>
              <span className={styles.cellAmt}>{level.qty}</span>
            </div>
          ))}
          {asks.length === 0 && (
            <div className={styles.emptyCol}>No asks</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default OrderBook;
