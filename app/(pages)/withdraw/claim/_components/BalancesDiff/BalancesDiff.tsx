// =============================================================================
// Claim Screen (FE-09) — BalancesDiff
// -----------------------------------------------------------------------------
// Displays a before/after comparison of user balance and module account balance
// after a successful claim. Shows visual diffs and yellow warnings when:
//   - Post-claim balances do not match the standard test vector
//   - Module balance data is unavailable
//
// Requirements: 4.1, 4.2, 5.5
// =============================================================================

"use client";

import { formatAmount } from "@/app/lib/services/format";
import styles from "./BalancesDiff.module.scss";

export interface BalancesDiffProps {
  before: { userBalance: string; moduleBalance: string } | null;
  after: { userBalance: string; moduleBalance: string } | null;
  amount: string;
  denom: string;
  testVectorMismatch: boolean;
  moduleBalanceUnavailable: boolean;
}

/**
 * Safely formats an amount+denom pair via formatAmount.
 * Returns "—" on RangeError (invalid amount string).
 */
function safeFormat(amount: string, denom: string): string {
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
 * Computes the signed diff between two BigInt-safe numeric strings.
 * Returns a formatted string like "(+40)" or "(-40)".
 * Returns null if either value is not a valid BigInt.
 */
function computeDiff(afterVal: string, beforeVal: string): string | null {
  try {
    const diff = BigInt(afterVal) - BigInt(beforeVal);
    if (diff >= 0n) {
      return `(+${diff.toString()})`;
    }
    return `(${diff.toString()})`;
  } catch {
    return null;
  }
}

export function BalancesDiff({
  before,
  after,
  amount,
  denom,
  testVectorMismatch,
  moduleBalanceUnavailable,
}: BalancesDiffProps): React.JSX.Element | null {
  // If no after data, nothing meaningful to display
  if (!after) {
    return null;
  }

  const hasWarnings = testVectorMismatch || moduleBalanceUnavailable;

  return (
    <section className={styles.container} aria-label="Balance changes">
      <h3 className={styles.heading}>Balance Changes</h3>

      {/* User Balance row */}
      <div className={styles.row}>
        <span className={styles.label}>User Balance</span>
        <span className={styles.values}>
          {before ? (
            <>
              <span className={styles.before}>
                {safeFormat(before.userBalance, denom)}
              </span>
              <span className={styles.arrow} aria-hidden="true">→</span>
            </>
          ) : null}
          <span className={`${styles.after} ${styles.increase}`}>
            {safeFormat(after.userBalance, denom)}
          </span>
          {before && (
            <span className={`${styles.diff} ${styles.increase}`}>
              {computeDiff(after.userBalance, before.userBalance)}
            </span>
          )}
        </span>
      </div>

      {/* Module Balance row */}
      <div className={styles.row}>
        <span className={styles.label}>Module Balance</span>
        <span className={styles.values}>
          {before ? (
            <>
              <span className={styles.before}>
                {safeFormat(before.moduleBalance, denom)}
              </span>
              <span className={styles.arrow} aria-hidden="true">→</span>
            </>
          ) : null}
          <span className={`${styles.after} ${styles.decrease}`}>
            {safeFormat(after.moduleBalance, denom)}
          </span>
          {before && (
            <span className={`${styles.diff} ${styles.decrease}`}>
              {computeDiff(after.moduleBalance, before.moduleBalance)}
            </span>
          )}
        </span>
      </div>

      {/* Yellow warning banners */}
      {hasWarnings && (
        <div className={styles.warnings}>
          {testVectorMismatch && (
            <div className={styles.warning} role="alert">
              <span className={styles.warningIcon} aria-hidden="true">⚠</span>
              <span>Final balance differs from the standard test vector</span>
            </div>
          )}
          {moduleBalanceUnavailable && (
            <div className={styles.warning} role="alert">
              <span className={styles.warningIcon} aria-hidden="true">⚠</span>
              <span>Module balance unavailable</span>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export default BalancesDiff;
