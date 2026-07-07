// =============================================================================
// Claim Withdraw Page (FE-09) — client shell
// -----------------------------------------------------------------------------
// Thin client shell: reads shared state from AppStateContext, then delegates
// all rendering to the ClaimScreen component once state is available.
// Shows a loading skeleton while state is null.
//
// Requirements: 1.1
// =============================================================================

"use client";

import { useAppStateContext } from "@/app/lib/contexts/AppStateContext";
import { ClaimScreen } from "@/app/(pages)/withdraw/claim/_components/ClaimScreen/ClaimScreen";
import styles from "./page.module.scss";

/**
 * ClaimPage — client shell for /withdraw/claim.
 *
 * Responsibilities:
 *  1. Read { state, refresh, inFlight } from AppStateContext.
 *  2. Render loading skeleton when state is null.
 *  3. Render <ClaimScreen> when state is ready.
 */
export default function ClaimPage(): React.JSX.Element {
  const { state, refresh, inFlight } = useAppStateContext();

  return (
    <div className={styles.page}>
      {state != null ? (
        <ClaimScreen
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
          <span className={styles.srOnly}>Loading claim…</span>
          <div className={styles.skeletonBlock} />
          <div className={styles.skeletonBlock} />
          <div className={styles.skeletonBlockShort} />
        </div>
      )}
    </div>
  );
}
