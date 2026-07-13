// =============================================================================
// Deposit Screen (FE-04) — BalanceDiff
// -----------------------------------------------------------------------------
// Displays a before/after comparison of user balance and module account balance
// after a successful deposit. Shows a visual cue indicating how much was moved
// into the module account.
//
// When refreshError is true, renders a fallback message instead of balances.
// When before or after is null, renders nothing.
//
// Requirements: 4.1, 4.2, 4.3, 4.4
// =============================================================================

import { formatAmount } from "@/app/lib/services/format";
import styles from "./BalanceDiff.module.scss";

export interface BalanceDiffProps {
  before: { userBalance: string; moduleBalance: string } | null;
  after: { userBalance: string; moduleBalance: string } | null;
  amount: string;
  denom: string;
  refreshError: boolean;
}

/**
 * Formats an amount+denom pair via formatAmount, returning "—" on RangeError.
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

export function BalanceDiff({
  before,
  after,
  amount,
  denom,
  refreshError,
}: BalanceDiffProps): React.JSX.Element | null {
  // Refresh error: show fallback message
  if (refreshError) {
    return (
      <section className={styles.container} aria-label="Balance difference">
        <p className={styles.errorMessage}>
          Unable to fetch updated balances
        </p>
      </section>
    );
  }

  // No data available: render nothing
  if (!before || !after) {
    return null;
  }

  return (
    <section className={styles.container} aria-label="Balance difference">
      {/* User Balance row */}
      <div className={styles.row}>
        <span className={styles.label}>User Balance</span>
        <span className={styles.values}>
          <span className={styles.before}>
            {safeFormat(before.userBalance, denom)}
          </span>
          <span className={styles.arrow} aria-hidden="true">→</span>
          <span className={`${styles.after} ${styles.decrease}`}>
            {safeFormat(after.userBalance, denom)}
          </span>
        </span>
      </div>

      {/* Module Balance row */}
      <div className={styles.row}>
        <span className={styles.label}>Module Balance</span>
        <span className={styles.values}>
          <span className={styles.before}>
            {safeFormat(before.moduleBalance, denom)}
          </span>
          <span className={styles.arrow} aria-hidden="true">→</span>
          <span className={`${styles.after} ${styles.increase}`}>
            {safeFormat(after.moduleBalance, denom)}
          </span>
        </span>
      </div>

      {/* Visual cue message */}
      <p className={styles.cue}>
        {amount} {denom} moved into the module account
      </p>
    </section>
  );
}

export default BalanceDiff;
