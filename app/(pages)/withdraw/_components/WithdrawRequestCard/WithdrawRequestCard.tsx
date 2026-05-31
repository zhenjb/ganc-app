// =============================================================================
// WithdrawRequestCard — displays withdraw request info after successful submit.
// -----------------------------------------------------------------------------
// Shows: id, nullifier (shortened), destinationHash (shortened), amount + denom,
// status, createdAt. Displays "Off-chain only" badge prominently at the top to
// make it visually clear the request does NOT move coins (Req 4.2).
//
// Requirements covered: 4.1, 4.2, 4.3
// =============================================================================

import type { WithdrawRecord } from "@/app/lib/interfaces/withdraw";
import { formatAmount, shortenHex } from "@/app/lib/services/format";
import styles from "./WithdrawRequestCard.module.scss";

export interface WithdrawRequestCardProps {
  record: WithdrawRecord;
}

/**
 * Renders a blue/indigo-accented card with withdraw request details and a
 * prominent "Off-chain only" badge. Shortened hex values expose the full value
 * in a tooltip (title attribute) on hover.
 */
export function WithdrawRequestCard({
  record,
}: WithdrawRequestCardProps): React.ReactElement {
  return (
    <section className={styles.card} aria-label="Withdraw request result">
      {/* Off-chain only badge — signals this request does NOT move coins. */}
      <span className={styles.badge}>Off-chain only</span>

      <dl className={styles.info}>
        <div className={styles.row}>
          <dt className={styles.label}>ID</dt>
          <dd className={styles.value}>{record.id}</dd>
        </div>
        <div className={styles.row}>
          <dt className={styles.label}>Nullifier</dt>
          <dd className={styles.value}>
            <span className={styles.hexValue} title={record.nullifier}>
              {shortenHex(record.nullifier)}
            </span>
          </dd>
        </div>
        <div className={styles.row}>
          <dt className={styles.label}>Destination Hash</dt>
          <dd className={styles.value}>
            <span className={styles.hexValue} title={record.destinationHash}>
              {shortenHex(record.destinationHash)}
            </span>
          </dd>
        </div>
        <div className={styles.row}>
          <dt className={styles.label}>Amount</dt>
          <dd className={styles.value}>
            {formatAmount(record.amount, record.denom)}
          </dd>
        </div>
        <div className={styles.row}>
          <dt className={styles.label}>Status</dt>
          <dd className={styles.value}>
            <span className={styles.status}>{record.status}</span>
          </dd>
        </div>
        <div className={styles.row}>
          <dt className={styles.label}>Created At</dt>
          <dd className={styles.value}>{record.createdAt}</dd>
        </div>
      </dl>
    </section>
  );
}

export default WithdrawRequestCard;
