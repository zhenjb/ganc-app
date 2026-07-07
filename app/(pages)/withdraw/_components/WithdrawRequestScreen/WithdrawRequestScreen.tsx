// =============================================================================
// Withdraw Request Screen (FE-05) — WithdrawRequestScreen
// -----------------------------------------------------------------------------
// Layout orchestrator that composes all withdraw request sub-components:
//   1. Explanation banner (always visible)
//   2. Reference / side panel (available off-chain balance + test-vector hint)
//   3. WithdrawRequestForm (controlled form)
//   4. WithdrawRequestCard (conditional — shown after a successful submit)
//   5. WithdrawRequestHistory (always visible)
//
// Wires the useWithdrawRequestForm hook and passes props to child components.
// The hook reads { state, refresh } internally from AppStateContext (matching
// the DepositScreen / useDepositForm convention), so it takes no arguments.
//
// Requirements: 6.1, 6.2, 6.3
// =============================================================================

"use client";

import type { AppState } from "@/app/lib/interfaces/state";
import type { WithdrawRecord } from "@/app/lib/interfaces/withdraw";
import { useWithdrawRequestForm } from "@/app/(pages)/withdraw/_lib/useWithdrawRequestForm";
import { WithdrawRequestForm } from "@/app/(pages)/withdraw/_components/WithdrawRequestForm/WithdrawRequestForm";
import { WithdrawRequestCard } from "@/app/(pages)/withdraw/_components/WithdrawRequestCard/WithdrawRequestCard";
import { WithdrawRequestHistory } from "@/app/(pages)/withdraw/_components/WithdrawRequestHistory/WithdrawRequestHistory";
import { formatAmount } from "@/app/lib/services/format";
import styles from "./WithdrawRequestScreen.module.scss";

export interface WithdrawRequestScreenProps {
  state: AppState;
  refresh: () => Promise<void>;
  inFlight: boolean;
}

/**
 * Pure predicate for the "Continue to Batch" CTA.
 *
 * Returns true if and only if at least one record has status === "pending".
 * Exported so it can be exercised directly by property-based tests.
 */
export function hasPendingRequest(records: WithdrawRecord[]): boolean {
  return records.some((r) => r.status === "pending");
}

/**
 * WithdrawRequestScreen — layout orchestrator for the /withdraw page.
 * Composes the banner, reference panel, form, result card, history, and CTA.
 *
 * Note: `refresh` is accepted as a prop for parity with the page shell's
 * WithdrawRequestScreenProps contract, but the form hook reads `refresh` from
 * AppStateContext itself (mirroring useDepositForm), so it is not forwarded.
 */
export function WithdrawRequestScreen({
  state,
  inFlight,
}: WithdrawRequestScreenProps): React.JSX.Element {
  const {
    formState,
    errors,
    warnings,
    submitting,
    submitError,
    lastResult,
    refreshError,
    history,
    setField,
    handleSubmit,
  } = useWithdrawRequestForm();

  // Compute the available off-chain balance for the current destination/denom
  // pair, if it is present in the AppState balances map.
  const balanceKey = `${formState.destination}/${formState.denom}`;
  const availableBalanceRaw = state.userBalances[balanceKey];
  const availableBalance =
    availableBalanceRaw !== undefined
      ? formatAmount(availableBalanceRaw, formState.denom)
      : null;

  return (
    <div className={styles.screen}>
      {/* 1. Explanation banner — always visible */}
      <p className={styles.banner} role="note">
        This is an off-chain withdraw request. Funds are only released after
        Submit Proof + Claim.
      </p>

      {/* 2. Reference / side panel — balance + test-vector hint */}
      <aside className={styles.referencePanel} aria-label="Reference info">
        <div className={styles.referenceItem}>
          <span className={styles.referenceLabel}>
            Available off-chain balance
          </span>
          <span className={styles.referenceValue}>
            {availableBalance ?? "—"}
          </span>
        </div>
        <p className={styles.hint}>
          For the standard test vector, max withdraw is 40 (Alice).
        </p>
      </aside>

      {/* 3. Withdraw request form — disabled during a global state refresh */}
      <WithdrawRequestForm
        formState={formState}
        errors={errors}
        warnings={warnings}
        submitting={submitting}
        disabled={inFlight}
        onFieldChange={setField}
        onSubmit={handleSubmit}
        submitError={submitError}
      />

      {/* 4. Result card — shown after a successful submit */}
      {lastResult !== null && <WithdrawRequestCard record={lastResult} />}

      {/* 4b. Non-blocking notice when the post-submit refresh failed. The
          request still succeeded, so the result card above stays visible. */}
      {lastResult !== null && refreshError && (
        <p className={styles.refreshNotice} role="status">
          Request created, but the global state could not be refreshed. Values
          shown may be slightly out of date.
        </p>
      )}

      {/* 5. Withdraw request history — always visible */}
      <WithdrawRequestHistory entries={history} />
    </div>
  );
}

export default WithdrawRequestScreen;
