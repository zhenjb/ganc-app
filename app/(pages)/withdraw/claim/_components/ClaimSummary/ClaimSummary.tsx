// =============================================================================
// ClaimSummary — completion message shown when all withdraw records are claimed.
// -----------------------------------------------------------------------------
// Renders a success banner with a CTA link to the survey page when the user
// has successfully claimed all records, signaling the demo flow is complete.
//
// Requirements covered: 7.1, 7.2
// =============================================================================

"use client";

import Link from "next/link";
import styles from "./ClaimSummary.module.scss";

export interface ClaimSummaryProps {
  allClaimed: boolean;
}

/**
 * Displays a success summary when every WithdrawRecord has been claimed.
 * Returns null when allClaimed is false.
 */
export function ClaimSummary({
  allClaimed,
}: ClaimSummaryProps): React.ReactElement | null {
  if (!allClaimed) return null;

  return (
    <section className={styles.container} aria-label="Claim completion summary">
      <h3 className={styles.heading} role="status">
        ✓ All withdrawals claimed successfully!
      </h3>

      <p className={styles.description}>
        The ZKDEX demo flow is now complete. All funds have been released from
        the module account.
      </p>

      <Link href="/survey" className={styles.cta}>
        Demo complete — share feedback
      </Link>
    </section>
  );
}

export default ClaimSummary;
