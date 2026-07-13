// =============================================================================
// DepositResultCard — displays deposit info after a successful submission.
// -----------------------------------------------------------------------------
// Shows: txHash (shortened), id, amount, denom, createdAt.
// Displays mock mode label when isMockMode is true.
// Warns about suspicious txHash when validation fails.
//
// Requirements covered: 3.3, 6.3, 7.1, 7.2
// =============================================================================

import type { DepositRecord } from "@/app/lib/interfaces/deposit";
import { formatAmount, shortenHex } from "@/app/lib/services/format";
import { validateTxHash } from "@/app/(pages)/wallet/_lib/validate";
import styles from "./DepositResultCard.module.scss";

export interface DepositResultCardProps {
  deposit: DepositRecord;
  isMockMode: boolean;
}

/**
 * Renders a green-accented card with deposit transaction details.
 * Includes a mock mode indicator and suspicious txHash warning when applicable.
 */
export function DepositResultCard({
  deposit,
  isMockMode,
}: DepositResultCardProps): React.ReactElement {
  const txHashWarning = validateTxHash(deposit.txHash);
  const isPending = deposit.id === "";

  return (
    <section className={styles.card} aria-label="Deposit result">
      {isMockMode && (
        <span className={styles.mockLabel}>(mock) Simulated transaction</span>
      )}

      {isPending && (
        <span className={styles.pendingLabel} role="status">
          Pending on-chain indexing
        </span>
      )}

      <dl className={styles.info}>
        <div className={styles.row}>
          <dt className={styles.label}>Tx Hash</dt>
          <dd className={styles.value}>{shortenHex(deposit.txHash)}</dd>
        </div>
        {!isPending && (
          <div className={styles.row}>
            <dt className={styles.label}>ID</dt>
            <dd className={styles.value}>{deposit.id}</dd>
          </div>
        )}
        <div className={styles.row}>
          <dt className={styles.label}>Amount</dt>
          <dd className={styles.value}>
            {formatAmount(deposit.amount, deposit.denom)}
          </dd>
        </div>
        <div className={styles.row}>
          <dt className={styles.label}>Denom</dt>
          <dd className={styles.value}>{deposit.denom}</dd>
        </div>
        <div className={styles.row}>
          <dt className={styles.label}>Created At</dt>
          <dd className={styles.value}>{deposit.createdAt}</dd>
        </div>
      </dl>

      {txHashWarning != null && (
        <span className={styles.warning} role="alert">
          Suspicious tx hash
        </span>
      )}
    </section>
  );
}

export default DepositResultCard;
