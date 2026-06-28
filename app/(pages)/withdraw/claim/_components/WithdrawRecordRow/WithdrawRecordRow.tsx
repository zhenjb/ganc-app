// =============================================================================
// Claim Screen (FE-09) — WithdrawRecordRow
// -----------------------------------------------------------------------------
// Renders a single WithdrawRecord as a table row with:
//   - Columns: withdrawId, owner (shortened), amount, denom, destination
//     (shortened + tooltip), status badge
//   - Claim button: disabled when claiming or already claimed
//   - Inline loading spinner when claim is in-flight
//   - Inline error message with optional Retry button
//
// Requirements: 1.2, 2.2, 2.4, 5.4
// =============================================================================

"use client";

import type { WithdrawRecord } from "@/app/lib/interfaces/withdraw";
import styles from "./WithdrawRecordRow.module.scss";

export interface WithdrawRecordRowProps {
  /** The withdraw record to display. */
  record: WithdrawRecord;
  /** Callback triggered when user clicks the Claim button. */
  onClaim: (withdrawId: string) => void;
  /** Callback triggered when user clicks the Retry button after an error. */
  onRetry: (withdrawId: string) => void;
  /** Whether a claim transaction is currently in-flight for this row. */
  claiming: boolean;
  /** Error message to display inline, or null if no error. */
  error: string | null;
  /** Whether this record has already been claimed. */
  claimed: boolean;
}

/**
 * Shortens an address string to show first 10 and last 4 characters.
 * Example: "cosmos1abcdefghijklmn" → "cosmos1abc...klmn"
 */
function shortenAddress(address: string): string {
  if (address.length <= 14) return address;
  return `${address.slice(0, 10)}...${address.slice(-4)}`;
}

/**
 * Returns the BEM modifier class for a given status.
 */
function badgeClass(status: WithdrawRecord["status"]): string {
  switch (status) {
    case "pending":
      return styles["badge--pending"];
    case "processed":
      return styles["badge--processed"];
    case "claimed":
      return styles["badge--claimed"];
    case "rejected":
      return styles["badge--rejected"];
    default:
      return "";
  }
}

/**
 * Determines whether to show the Retry button.
 * Retry is offered for network/server errors but NOT for user cancellations.
 */
function shouldShowRetry(error: string | null): boolean {
  if (!error) return false;
  // "Transaction cancelled" is a user-initiated action — no retry needed
  if (error === "Transaction cancelled") return false;
  return true;
}

export function WithdrawRecordRow({
  record,
  onClaim,
  onRetry,
  claiming,
  error,
  claimed,
}: WithdrawRecordRowProps): React.JSX.Element {
  const isDisabled = claiming || claimed;

  return (
    <>
      {/* Main data row */}
      <tr className={styles.row} aria-busy={claiming}>
        {/* Withdraw ID */}
        <td className={`${styles.td} ${styles.mono}`}>{record.id}</td>

        {/* Owner (destination shortened — used as "owner" column) */}
        <td className={`${styles.td} ${styles.mono}`} title={record.destination}>
          {shortenAddress(record.destination)}
        </td>

        {/* Amount */}
        <td className={styles.td}>{record.amount}</td>

        {/* Denom */}
        <td className={styles.td}>{record.denom}</td>

        {/* Destination (shortened + full address in title tooltip) */}
        <td className={`${styles.td} ${styles.mono}`} title={record.destination}>
          {shortenAddress(record.destination)}
        </td>

        {/* Status badge */}
        <td className={styles.td}>
          <span className={`${styles.badge} ${badgeClass(record.status)}`}>
            {record.status}
          </span>
        </td>

        {/* Action: Claim button */}
        <td className={styles.td}>
          <button
            type="button"
            className={styles.claimButton}
            disabled={isDisabled}
            aria-disabled={isDisabled}
            onClick={() => onClaim(record.id)}
          >
            {claiming && <span className={styles.spinner} aria-hidden="true" />}
            {claiming ? "Claiming..." : "Claim"}
          </button>
        </td>
      </tr>

      {/* Error row — rendered below the data row when error is present */}
      {error && (
        <tr className={styles.errorRow}>
          <td className={styles.errorCell} colSpan={7}>
            <div className={styles.errorContent} role="alert">
              <span className={styles.errorText}>{error}</span>
              {shouldShowRetry(error) && (
                <button
                  type="button"
                  className={styles.retryButton}
                  onClick={() => onRetry(record.id)}
                >
                  Retry
                </button>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default WithdrawRecordRow;
