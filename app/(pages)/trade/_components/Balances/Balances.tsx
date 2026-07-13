"use client";

import { useState, useMemo } from "react";
import type { ReservedBalance } from "@/app/lib/interfaces/trade";
import { getDenomInfo } from "@/app/(pages)/trade/_lib/denomConfig";
import styles from "./Balances.module.scss";

interface BalancesProps {
  balances: ReservedBalance[];
  loading: boolean;
}

export function Balances({ balances, loading }: BalancesProps) {
  const [search, setSearch] = useState("");
  const [hideZero, setHideZero] = useState(false);

  const filtered = useMemo(() => {
    let list = balances;
    if (hideZero) {
      list = list.filter(
        (b) => parseFloat(b.available) > 0 || parseFloat(b.reserved) > 0
      );
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((b) => {
        const info = getDenomInfo(b.denom);
        return (
          info.symbol.toLowerCase().includes(q) ||
          info.name.toLowerCase().includes(q) ||
          b.denom.toLowerCase().includes(q)
        );
      });
    }
    return list;
  }, [balances, hideZero, search]);

  // Estimated total (sum of available + reserved, simplified)
  const estimatedTotal = useMemo(() => {
    return balances.reduce(
      (sum, b) => sum + parseFloat(b.available || "0") + parseFloat(b.reserved || "0"),
      0
    );
  }, [balances]);

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <span className={styles.title}>Balances</span>
        <label className={styles.hideZero}>
          <input
            type="checkbox"
            className={styles.hideZeroCheckbox}
            checked={hideZero}
            onChange={(e) => setHideZero(e.target.checked)}
          />
          Hide 0
        </label>
      </div>

      {/* Search */}
      <div className={styles.searchBox}>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Search asset"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search assets"
        />
      </div>

      {/* Total balance box */}
      <div className={styles.totalBox}>
        <div className={styles.totalLabel}>Estimated Total Balance</div>
        <div className={styles.totalValue}>
          {loading ? "…" : estimatedTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}
        </div>
      </div>

      {/* Balance list */}
      <div className={styles.list}>
        {filtered.map((b) => {
          const info = getDenomInfo(b.denom);
          return (
            <div key={b.denom} className={styles.row}>
              <div className={styles.coinInfo}>
                <div
                  className={styles.coinIcon}
                  style={{ background: info.color }}
                >
                  {info.symbol.slice(0, 3)}
                </div>
                <div>
                  <div className={styles.coinName}>{info.symbol}</div>
                  <div className={styles.coinSub}>{info.name}</div>
                </div>
              </div>
              <div className={styles.amounts}>
                <div className={styles.available}>{b.available}</div>
                <div className={styles.locked}>Locked {b.reserved}</div>
              </div>
            </div>
          );
        })}
        {!loading && filtered.length === 0 && (
          <div className={styles.row}>
            <span style={{ color: "var(--muted-foreground)", fontSize: 13 }}>
              No assets found.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default Balances;
