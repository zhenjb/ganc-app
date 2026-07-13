"use client";

import { useState, useMemo } from "react";
import { getDenomInfo } from "@/app/(pages)/trade/_lib/denomConfig";
import styles from "./ModuleBalanceCard.module.scss";

export interface ModuleBalanceCardProps {
  /** Record<denom, amount> from AppState.moduleAccountBalance */
  moduleBalances: Record<string, string>;
}

export function ModuleBalanceCard({ moduleBalances }: ModuleBalanceCardProps) {
  const [search, setSearch] = useState("");
  const [hideZero, setHideZero] = useState(false);

  const entries = useMemo(() => {
    return Object.entries(moduleBalances).map(([denom, amount]) => ({
      denom,
      amount,
    }));
  }, [moduleBalances]);

  const filtered = useMemo(() => {
    let list = entries;
    if (hideZero) {
      list = list.filter((e) => BigInt(e.amount) > 0n);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((e) => {
        const info = getDenomInfo(e.denom);
        return (
          info.symbol.toLowerCase().includes(q) ||
          info.name.toLowerCase().includes(q) ||
          e.denom.toLowerCase().includes(q)
        );
      });
    }
    return list;
  }, [entries, hideZero, search]);

  const total = useMemo(
    () => entries.reduce((sum, e) => sum + BigInt(e.amount), 0n),
    [entries]
  );

  return (
    <div className={styles.card} aria-label="Module Balance">
      {/* Header */}
      <div className={styles.header}>
        <h2 className={styles.title}>Module Balance</h2>
        <label className={styles.hideZero}>
          <input
            type="checkbox"
            className={styles.checkbox}
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
          aria-label="Search module assets"
        />
      </div>

      {/* Total */}
      <div className={styles.totalBox}>
        <div className={styles.totalLabel}>Total Module Balance</div>
        <div className={styles.totalValue}>{total.toString()}</div>
      </div>

      {/* List */}
      <div className={styles.list}>
        {filtered.length === 0 ? (
          <div className={styles.emptyRow}>No module balance</div>
        ) : (
          filtered.map((entry) => {
            const info = getDenomInfo(entry.denom);
            return (
              <div key={entry.denom} className={styles.row}>
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
                <div className={styles.amount}>{entry.amount}</div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default ModuleBalanceCard;
