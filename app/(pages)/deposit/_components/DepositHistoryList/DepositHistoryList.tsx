// =============================================================================
// Deposit Screen — DepositHistoryList
// -----------------------------------------------------------------------------
// Renders the session-only deposit history as a chronological list (newest
// first). Shows an empty state when no deposits have been made yet.
//
// Data is NOT persisted across page reload — managed by the useDepositForm hook.
//
// Requirements: 5.1, 5.2, 5.3
// =============================================================================

import type { DepositHistoryEntry } from "@/app/(pages)/deposit/_types";
import { shortenHex, formatAmount } from "@/app/lib/services/format";
import styles from "./DepositHistoryList.module.scss";

export interface DepositHistoryListProps {
  entries: DepositHistoryEntry[];
}

/**
 * Formats an ISO 8601 timestamp into a human-readable local string.
 */
function formatTimestamp(iso: string): string {
  try {
    const date = new Date(iso);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  } catch {
    return iso;
  }
}

/**
 * Safely formats amount+denom, returning "—" on RangeError.
 */
function safeFormatAmount(amount: string, denom: string): string {
  try {
    return formatAmount(amount, denom);
  } catch (err) {
    if (err instanceof RangeError) {
      return "—";
    }
    throw err;
  }
}

export function DepositHistoryList({
  entries,
}: DepositHistoryListProps): React.JSX.Element {
  return (
    <section className={styles.container}>
      <h2 className={styles.heading}>Deposit History</h2>

      {entries.length === 0 ? (
        <p className={styles.empty}>No deposits yet</p>
      ) : (
        <ul className={styles.list}>
          {entries.map((entry) => {
            const { deposit, timestamp } = entry;
            return (
              <li key={deposit.id} className={styles.entry}>
                <div className={styles.entryHeader}>
                  <span className={styles.txHash} title={deposit.txHash}>
                    {shortenHex(deposit.txHash)}
                  </span>
                  <span className={styles.timestamp}>
                    {formatTimestamp(timestamp)}
                  </span>
                </div>
                <div className={styles.entryBody}>
                  <span className={styles.amount}>
                    {safeFormatAmount(deposit.amount, deposit.denom)}
                  </span>
                  <span className={styles.id}>ID: {deposit.id}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export default DepositHistoryList;
