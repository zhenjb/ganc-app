"use client";

import { useState, useMemo } from "react";
import { getDenomInfo } from "@/app/(pages)/trade/_lib/denomConfig";
import styles from "./UserBalanceCard.module.scss";

export interface UserBalanceCardProps {
  /** Record<"address/denom", amount> from AppState.userBalances */
  userBalances: Record<string, string>;
  /**
   * Connected wallet address. "User Balance" shows ONLY this owner's balances;
   * without it the card would sum every account and mirror "Module Balance".
   */
  owner?: string | null;
}

function parseKey(key: string): { address: string; denom: string } | null {
  const slashIdx = key.lastIndexOf("/");
  if (slashIdx <= 0) return null;
  return { address: key.slice(0, slashIdx), denom: key.slice(slashIdx + 1) };
}

export function UserBalanceCard({ userBalances, owner }: UserBalanceCardProps) {
  const [search, setSearch] = useState("");
  const [hideZero, setHideZero] = useState(false);

  // Keep ONLY the connected owner's balances. userBalances is a global map keyed
  // "{address}/{denom}" spanning every account; without this filter the card
  // renders everyone and becomes identical to Module Balance (the total).
  const entries = useMemo(() => {
    const connected = owner?.trim() ?? "";
    if (connected === "") return [];
    return Object.entries(userBalances).flatMap(([key, amount]) => {
      const parsed = parseKey(key);
      if (!parsed || parsed.address !== connected) return [];
      return [{ key, denom: parsed.denom, amount }];
    });
  }, [userBalances, owner]);

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
    <div className={styles.card} aria-label="User Balance">
      {/* Header */}
      <div className={styles.header}>
        <h2 className={styles.title}>User Balance</h2>
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
          aria-label="Search user assets"
        />
      </div>

      {/* Total */}
      <div className={styles.totalBox}>
        <div className={styles.totalLabel}>Total User Balance</div>
        <div className={styles.totalValue}>{total.toString()}</div>
      </div>

      {/* List */}
      <div className={styles.list}>
        {filtered.length === 0 ? (
          <div className={styles.emptyRow}>
            {owner ? "No user balance" : "Connect a wallet to see your balance"}
          </div>
        ) : (
          filtered.map((entry) => {
            const info = getDenomInfo(entry.denom);
            return (
              <div key={entry.key} className={styles.row}>
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

export default UserBalanceCard;
