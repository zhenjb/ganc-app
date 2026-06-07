// =============================================================================
// Overview Screen (FE-03) — OverviewScreen
// -----------------------------------------------------------------------------
// Pure display orchestrator for the /overview dashboard.
// Receives all data via props — no hooks, no context access.
//
// Layout:
//   Top row (2 cols on desktop):
//     Col 1: RootCard + BalanceTable
//     Col 2: StatusPanel (4× StatusBadge) + CtaSuggestion
//   Bottom row (3 cols on desktop):
//     Col 1: DepositCardContent
//     Col 2: WithdrawCardContent
//     Col 3: BatchCardContent
//
// Special case: when mode === "local" and all latest* fields are null,
// renders a syncing hint above the Latest Events row.
//
// Requirements: 3.1, 9.2, 9.3, 9.5, 10.1
// =============================================================================

import type { AppState } from "@/app/lib/interfaces/state";
import RootCard from "@/app/(pages)/overview/_components/RootCard/RootCard";
import BalanceTable from "@/app/(pages)/overview/_components/BalanceTable/BalanceTable";
import StatusBadge from "@/app/components/StatusBadge/StatusBadge";
import DepositCardContent from "@/app/(pages)/overview/_components/LatestEventCard/DepositCardContent";
import WithdrawCardContent from "@/app/(pages)/overview/_components/LatestEventCard/WithdrawCardContent";
import BatchCardContent from "@/app/(pages)/overview/_components/LatestEventCard/BatchCardContent";
import CtaSuggestion from "@/app/(pages)/overview/_components/CtaSuggestion/CtaSuggestion";
import ReferenceStrip from "@/app/(pages)/overview/_components/ReferenceStrip/ReferenceStrip";
import styles from "./OverviewScreen.module.scss";

export interface OverviewScreenProps {
  /** Full pipeline state — all panels derive their data from this. */
  state: AppState;
  /** Callback to trigger a manual data refresh. */
  refresh: () => void;
  /** True while a refresh request is in-flight. */
  inFlight: boolean;
}

/**
 * OverviewScreen — layout orchestrator for the /overview dashboard.
 * Pure display component: no hooks, no context reads.
 */
export function OverviewScreen({
  state,
  refresh: _refresh,
  inFlight: _inFlight,
}: OverviewScreenProps): React.JSX.Element {
  // Determine whether to show the "indexer syncing" hint.
  // Condition: mode is "local" AND all latest* fields are null/undefined.
  const isRealWithNoData =
    state.mode === "local" &&
    (state.latestDeposit == null) &&
    (state.latestWithdrawRequest == null) &&
    (state.latestBatchCommitments == null);

  return (
    <div className={styles.screen}>
      {/* ── Top row: 2 columns ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Col 1: State Root + Balances */}
        <div className={styles.column}>
          <RootCard
            currentStateRoot={state.currentStateRoot}
            mode={state.mode}
          />
          <BalanceTable
            userBalances={state.userBalances}
            moduleAccountBalance={state.moduleAccountBalance}
          />
        </div>

        {/* Col 2: Status Panel + CTA */}
        <div className={styles.column}>
          <section className={styles.statusPanel} aria-label="Pipeline status">
            <h2 className={styles.statusHeading}>Pipeline Status</h2>
            <div className={styles.statusBadges}>
              <StatusBadge pipelineName="Deposit" status={state.depositStatus} />
              <StatusBadge pipelineName="Withdraw" status={state.withdrawStatus} />
              <StatusBadge pipelineName="Proof" status={state.proofStatus} />
              <StatusBadge pipelineName="Batch" status={state.batchStatus} />
            </div>
          </section>
          <CtaSuggestion state={state} />
        </div>

      </div>

      {/* ── Bottom row: Latest Events (3 columns) ── */}
      {isRealWithNoData && (
        <p className={styles.syncingHint} role="status" aria-live="polite">
          Indexer may still be syncing
        </p>
      )}
      <div className="flex flex-col gap-6">
        <DepositCardContent latestDeposit={state.latestDeposit} />
        <WithdrawCardContent latestWithdraw={state.latestWithdrawRequest} />
        <BatchCardContent batchCommitments={state.latestBatchCommitments} />
      </div>

      {/* Reference strip — static, always visible */}
      <div className={styles.referenceStripWrapper}>
        <ReferenceStrip />
      </div>
    </div>
  );
}

export default OverviewScreen;
