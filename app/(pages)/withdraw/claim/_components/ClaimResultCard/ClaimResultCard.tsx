// =============================================================================
// ClaimResultCard — displays claim result after a successful transaction.
// -----------------------------------------------------------------------------
// Shows: visual cue (fund movement), txHash (monospace), full WithdrawRecord
// details, and balances (user + module) rendered as-is.
//
// Requirements covered: 3.2, 3.3, 3.5
// =============================================================================

"use client";

import type { WithdrawRecord } from "@/app/lib/interfaces/withdraw";
import styles from "./ClaimResultCard.module.scss";

export interface ClaimResultCardProps {
  txHash: string;
  record: WithdrawRecord;
  userBalances: Record<string, string>;
  moduleAccountBalance: Record<string, string>;
}

/**
 * Renders a green-accented card with claim transaction results.
 * Displays the fund movement cue, txHash in monospace, full record details,
 * and balance snapshots without any transformation (AC 3.5).
 */
export function ClaimResultCard({
  txHash,
  record,
  userBalances,
  moduleAccountBalance,
}: ClaimResultCardProps): React.ReactElement {
  return (
    <section className={styles.card} aria-label="Claim result">
      {/* Title */}
      <h3 className={styles.title}>Claim Successful</h3>

      {/* Visual cue: fund movement description (Req 3.3) */}
      <p className={styles.visualCue}>
        {record.amount} {record.denom} moved from the module account to{" "}
        {record.destination}
      </p>

      {/* Transaction Hash (Req 3.2 — monospace) */}
      <div className={styles.section}>
        <h4 className={styles.sectionLabel}>Transaction Hash</h4>
        <p className={styles.txHash}>{txHash}</p>
      </div>

      {/* Full WithdrawRecord details (Req 3.2) */}
      <div className={styles.section}>
        <h4 className={styles.sectionLabel}>Withdraw Record</h4>
        <dl className={styles.info}>
          <div className={styles.row}>
            <dt className={styles.label}>ID</dt>
            <dd className={styles.value}>{record.id}</dd>
          </div>
          <div className={styles.row}>
            <dt className={styles.label}>Destination</dt>
            <dd className={styles.value}>{record.destination}</dd>
          </div>
          <div className={styles.row}>
            <dt className={styles.label}>Amount</dt>
            <dd className={styles.value}>
              {record.amount} {record.denom}
            </dd>
          </div>
          <div className={styles.row}>
            <dt className={styles.label}>Status</dt>
            <dd className={styles.value}>{record.status}</dd>
          </div>
          {record.claimedAt != null && (
            <div className={styles.row}>
              <dt className={styles.label}>Claimed At</dt>
              <dd className={styles.value}>{record.claimedAt}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* Balances rendered as-is (Req 3.5 — no transformation) */}
      <div className={styles.section}>
        <h4 className={styles.sectionLabel}>Balances</h4>

        {/* User balances */}
        <ul className={styles.balances}>
          {Object.entries(userBalances).map(([key, value]) => (
            <li key={`user-${key}`} className={styles.balanceItem}>
              User: {key} = {value}
            </li>
          ))}
        </ul>

        {/* Module account balance */}
        <ul className={styles.balances}>
          {Object.entries(moduleAccountBalance).map(([key, value]) => (
            <li key={`module-${key}`} className={styles.balanceItem}>
              Module: {key} = {value}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export default ClaimResultCard;
