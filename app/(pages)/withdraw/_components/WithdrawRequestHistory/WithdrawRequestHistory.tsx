// =============================================================================
// WithdrawRequestHistory — session-scoped list of withdraw requests.
// -----------------------------------------------------------------------------
// Renders all withdraw requests created during the current session. Entries are
// already ordered newest-first by appendToHistory (sessionHistory.ts), so this
// component renders them in the order received.
//
// Each entry shows: shortened id (full id in tooltip), amount + denom, a status
// badge (pending | processed | claimed | rejected), and a readable createdAt
// timestamp. Shows an empty state when there are no requests yet.
//
// Persistence (sessionStorage) is handled by sessionHistory.ts + the form hook;
// this component is purely presentational and displays the passed entries.
//
// Requirements covered: 5.1, 5.2, 5.3
// =============================================================================

import type { WithdrawRecord } from "@/app/lib/interfaces/withdraw";
import { formatAmount } from "@/app/lib/services/format";
import styles from "./WithdrawRequestHistory.module.scss";

export interface WithdrawRequestHistoryProps {
  entries: WithdrawRecord[];
}

/**
 * Maps a WithdrawRecord status to its corresponding badge style class.
 */
const STATUS_CLASS: Record<WithdrawRecord["status"], string> = {
  pending: styles.statusPending,
  processed: styles.statusProcessed,
  claimed: styles.statusClaimed,
  rejected: styles.statusRejected,
};

/**
 * Formats an ISO 8601 timestamp into a human-readable local string.
 * Falls back to the raw value on parse failure.
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
 * Safely formats amount+denom, returning "—" on RangeError (invalid amount).
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

/**
 * Visually truncates a UUID for compact display. The full id remains available
 * via the title tooltip on the element.
 */
function shortenId(id: string): string {
  if (id.length <= 13) return id;
  return `${id.slice(0, 8)}…${id.slice(-4)}`;
}

export function WithdrawRequestHistory({
  entries,
}: WithdrawRequestHistoryProps): React.JSX.Element {
  return (
    <section className={styles.container}>
      <h2 className={styles.heading}>Withdraw Request History</h2>

      {entries.length === 0 ? (
        <p className={styles.empty}>No withdraw requests yet</p>
      ) : (
        <ul className={styles.list}>
          {entries.map((entry) => (
            <li key={entry.id} className={styles.entry}>
              <div className={styles.entryHeader}>
                <span className={styles.id} title={entry.id}>
                  {shortenId(entry.id)}
                </span>
                <span
                  className={`${styles.statusBadge} ${STATUS_CLASS[entry.status]}`}
                >
                  {entry.status}
                </span>
              </div>
              <div className={styles.entryBody}>
                <span className={styles.amount}>
                  {safeFormatAmount(entry.amount, entry.denom)}
                </span>
                <span className={styles.timestamp}>
                  {formatTimestamp(entry.createdAt)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default WithdrawRequestHistory;
