"use client";

import { useState, useCallback, useMemo } from "react";
import type { Market } from "@/app/lib/interfaces/trade";
import { useMarkets } from "@/app/(pages)/trade/_lib/useMarkets";
import { useOrderbook } from "@/app/(pages)/trade/_lib/useOrderbook";
import { useBalances } from "@/app/(pages)/trade/_lib/useBalances";
import { useOpenOrders } from "@/app/(pages)/trade/_lib/useOpenOrders";
import { OrderForm } from "@/app/(pages)/trade/_components/OrderForm/OrderForm";
import { Balances } from "@/app/(pages)/trade/_components/Balances/Balances";
import { OrderBook } from "@/app/(pages)/trade/_components/OrderBook/OrderBook";
import { OpenOrders } from "@/app/(pages)/trade/_components/OpenOrders/OpenOrders";
import { CandleChart } from "@/app/(pages)/trade/_components/CandleChart/CandleChart";
import styles from "./TradeScreen.module.scss";

interface TradeScreenProps {
  owner: string;
}

export function TradeScreen({ owner }: TradeScreenProps) {
  const { markets, loading: marketsLoading } = useMarkets();

  // Currently selected market
  const [selectedMarketStr, setSelectedMarketStr] = useState<string>("");

  // Auto-select first market once loaded
  const selectedMarket: Market | null = useMemo(() => {
    if (selectedMarketStr) {
      return markets.find((m) => m.market === selectedMarketStr) ?? null;
    }
    if (markets.length > 0) {
      // Set state lazily
      return markets[0];
    }
    return null;
  }, [markets, selectedMarketStr]);

  // Effective market string for API calls
  const marketStr = selectedMarket?.market ?? "";

  // Hooks
  const { orderbook, loading: obLoading } = useOrderbook(marketStr);
  const { balances, loading: balLoading, refetch: refetchBalances } = useBalances(owner);
  const {
    openOrders,
    fills,
    loading: ordersLoading,
    refetch: refetchOrders,
    handleCancel,
    cancelError,
  } = useOpenOrders(owner, marketStr);

  // After placing an order, refresh balances + orders
  const handleOrderPlaced = useCallback(() => {
    refetchBalances();
    refetchOrders();
  }, [refetchBalances, refetchOrders]);

  // Market selector change handler
  const handleMarketChange = useCallback(
    (market: string) => {
      setSelectedMarketStr(market);
    },
    []
  );

  // Market options for the OrderBook dropdown
  const marketOptions = useMemo(
    () =>
      markets.map((m) => ({
        market: m.market,
        disabled: m.status === "market_inactive",
      })),
    [markets]
  );

  return (
    <div className={styles.wrapper}>
      {/* 3-column grid */}
      <div className={styles.grid}>
        {/* Column 1: Order Form */}
        <div className={styles.card}>
          <OrderForm
            owner={owner}
            market={selectedMarket}
            balances={balances}
            onOrderPlaced={handleOrderPlaced}
          />
        </div>

        {/* Column 2: Balances */}
        <div className={styles.card}>
          <Balances balances={balances} loading={balLoading} />
        </div>

        {/* Column 3: Order Book (includes market selector) */}
        <div className={`${styles.card} ${styles.rightCard}`}>
          <OrderBook
            orderbook={orderbook}
            loading={obLoading}
            marketPair={marketStr || "—"}
            markets={marketOptions}
            marketsLoading={marketsLoading}
            onMarketChange={handleMarketChange}
          />
        </div>
      </div>

      {/* Bottom: Open Orders */}
      <div className={`${styles.card} ${styles.bottomCard}`}>
        <OpenOrders
          openOrders={openOrders}
          fills={fills}
          owner={owner}
          market={marketStr}
          loading={ordersLoading}
          cancelError={cancelError}
          onCancel={handleCancel}
        />
      </div>
    </div>
  );
}

export default TradeScreen;
