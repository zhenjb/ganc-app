"use client";

import { useState, useMemo } from "react";
import type { OpenOrder, Fill } from "@/app/lib/interfaces/trade";
import styles from "./OpenOrders.module.scss";

interface OpenOrdersProps {
  openOrders: OpenOrder[];
  fills: Fill[];
  owner: string;
  market: string;
  loading: boolean;
  cancelError: string | null;
  onCancel: (orderHash: string) => Promise<void>;
}

type ActiveTab = "open" | "history";

export function OpenOrders({
  openOrders,
  fills,
  owner,
  market,
  loading,
  cancelError,
  onCancel,
}: OpenOrdersProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("open");

  // Filter open orders by current market
  const filteredOrders = useMemo(() => {
    if (!market) return openOrders;
    return openOrders.filter((o) => o.market === market);
  }, [openOrders, market]);

  // Filter fills for the owner
  const filteredFills = useMemo(() => {
    return fills.filter((f) => f.buyer === owner || f.seller === owner);
  }, [fills, owner]);

  return (
    <div className={styles.container}>
      {/* Tabs */}
      <div className={styles.tabs} role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "open"}
          className={`${styles.tab} ${activeTab === "open" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("open")}
        >
          Open orders ({filteredOrders.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "history"}
          className={`${styles.tab} ${activeTab === "history" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("history")}
        >
          Order History
        </button>
      </div>

      {/* Cancel error */}
      {cancelError && (
        <div className={styles.cancelError} role="alert">
          {cancelError}
        </div>
      )}

      {/* Open Orders Tab */}
      {activeTab === "open" && (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Pair</th>
                <th>Type</th>
                <th>Side</th>
                <th>Price</th>
                <th>Amount</th>
                <th>Filled</th>
                <th>Unfilled</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => {
                const filledPct =
                  parseFloat(order.qty) > 0
                    ? (
                        (parseFloat(order.filled) / parseFloat(order.qty)) *
                        100
                      ).toFixed(0)
                    : "0";
                const unfilledPct =
                  parseFloat(order.qty) > 0
                    ? (
                        (parseFloat(order.remaining) / parseFloat(order.qty)) *
                        100
                      ).toFixed(0)
                    : "100";

                return (
                  <tr key={order.orderHash}>
                    <td>{order.market}</td>
                    <td>Limit</td>
                    <td
                      className={
                        order.side === "buy" ? styles.buyTag : styles.sellTag
                      }
                    >
                      {order.side === "buy" ? "Buy" : "Sell"}
                    </td>
                    <td>{order.price}</td>
                    <td>{order.qty}</td>
                    <td>{filledPct}%</td>
                    <td>{unfilledPct}%</td>
                    <td>
                      {order.owner === owner && (
                        <button
                          type="button"
                          className={styles.cancelLink}
                          onClick={() => onCancel(order.orderHash)}
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!loading && filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={8} className={styles.emptyRow}>
                    No open orders
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Order History Tab */}
      {activeTab === "history" && (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Trade ID</th>
                <th>Market</th>
                <th>Side</th>
                <th>Price</th>
                <th>Qty</th>
                <th>Fee</th>
              </tr>
            </thead>
            <tbody>
              {filteredFills.map((fill) => {
                const isBuyer = fill.buyer === owner;
                return (
                  <tr key={fill.tradeId}>
                    <td>{fill.tradeId}</td>
                    <td>{fill.market}</td>
                    <td
                      className={isBuyer ? styles.buyTag : styles.sellTag}
                    >
                      {isBuyer ? "Buy" : "Sell"}
                    </td>
                    <td>{fill.price}</td>
                    <td>{fill.qty}</td>
                    <td>{isBuyer ? fill.takerFee : fill.makerFee}</td>
                  </tr>
                );
              })}
              {filteredFills.length === 0 && (
                <tr>
                  <td colSpan={6} className={styles.emptyRow}>
                    No trade history
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default OpenOrders;
