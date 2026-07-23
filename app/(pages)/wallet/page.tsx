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
import { useWalletContext } from "@/app/lib/contexts/WalletContext";
import { DepositScreen } from "@/app/(pages)/wallet/_components/DepositScreen/DepositScreen";
import type { AppState } from "@/app/lib/interfaces/state";
import styles from "./page.module.scss";

/** Empty state used when wallet is not connected. */
const EMPTY_STATE: AppState = {
  mode: "local",
  currentStateRoot: null,
  userBalances: {},
  moduleAccountBalance: {},
  depositStatus: "none",
  withdrawStatus: "none",
  proofStatus: "idle",
  batchStatus: "none",
  latestDeposit: null,
  latestWithdrawRequest: null,
  latestSettlement: null,
  latestBatchCommitments: null,
  latestProof: null,
  latestWithdrawRecords: null,
};

export default function DepositPage(): React.JSX.Element {
  const { state, refresh, inFlight, loading } = useAppStateContext();
  const { address } = useWalletContext();

  // Show skeleton only while actively loading (wallet connected, fetch in progress)
  if (address && loading && !state) {
    return (
      <div className={styles.page}>
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
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <DepositScreen
        state={state ?? EMPTY_STATE}
        refresh={refresh}
        inFlight={inFlight}
      />
    </div>
  );
}
