// =============================================================================
// Withdraw Request Page (FE-05) — client shell
// -----------------------------------------------------------------------------
// Thin client shell: reads shared state from AppStateContext, then delegates
// all rendering to the WithdrawRequestScreen component once state is available.
// Shows a loading skeleton while state is null.
//
// Requirements: 3.3
// =============================================================================

"use client";

import { useAppStateContext } from "@/app/lib/contexts/AppStateContext";
import { WithdrawRequestScreen } from "@/app/(pages)/withdraw/_components/WithdrawRequestScreen/WithdrawRequestScreen";
import styles from "./page.module.scss";

/**
 * WithdrawPage — client shell for /withdraw.
 *
 * Responsibilities:
 *  1. Read { state, refresh, inFlight } from AppStateContext.
 *  2. Render loading skeleton when state is null.
 *  3. Render <WithdrawRequestScreen> when state is ready.
 */
export default function WithdrawPage(): React.JSX.Element {
  const { state, refresh, inFlight } = useAppStateContext();

  return (
    <div className={styles.page}>
      {state != null ? (
        <WithdrawRequestScreen
          state={state}
          refresh={refresh}
          inFlight={inFlight}
        />
      ) : (
        <div
          className={styles.loadingSkeleton}
          role="status"
          aria-live="polite"
        >
          <span className={styles.srOnly}>Loading withdraw…</span>
          <div className={styles.skeletonBlock} />
          <div className={styles.skeletonBlock} />
          <div className={styles.skeletonBlockShort} />
        </div>
      )}
    </div>
  );
}
