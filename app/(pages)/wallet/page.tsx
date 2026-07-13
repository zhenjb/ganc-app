// =============================================================================
// Deposit Page (FE-04) — client shell
// -----------------------------------------------------------------------------
// Thin client shell: reads shared state from AppStateContext, then delegates
// all rendering to the DepositScreen component once state is available.
// Shows a loading skeleton while state is null.
//
// Requirements: 9.1, 9.2
// =============================================================================

"use client";

import { useAppStateContext } from "@/app/lib/contexts/AppStateContext";
import { DepositScreen } from "@/app/(pages)/wallet/_components/DepositScreen/DepositScreen";
import styles from "./page.module.scss";

/**
 * DepositPage — client shell for /deposit.
 *
 * Responsibilities:
 *  1. Read { state, refresh, inFlight } from AppStateContext.
 *  2. Render loading skeleton when state is null.
 *  3. Render <DepositScreen> when state is ready.
 */
export default function DepositPage(): React.JSX.Element {
  const { state, refresh, inFlight } = useAppStateContext();

  return (
    <div className={styles.page}>
      {state != null ? (
        <DepositScreen state={state} refresh={refresh} inFlight={inFlight} />
      ) : (
        <div
          className={styles.loadingSkeleton}
          role="status"
          aria-live="polite"
        >
          <span className={styles.srOnly}>Loading wallet…</span>
          <div className={styles.skeletonBlock} />
          <div className={styles.skeletonBlock} />
          <div className={styles.skeletonBlockShort} />
        </div>
      )}
    </div>
  );
}
