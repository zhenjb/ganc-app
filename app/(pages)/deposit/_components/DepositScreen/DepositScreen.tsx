// =============================================================================
// Deposit Screen (FE-04) — DepositScreen
// -----------------------------------------------------------------------------
// Layout orchestrator that composes all deposit sub-components:
//   1. Explanation banner (always visible)
//   2. DepositForm (controlled form)
//   3. DepositResultCard (conditional — shown after successful deposit)
//   4. BalanceDiff (conditional — shown after successful deposit)
//   5. DepositHistoryList (always visible)
//
// Wires the useDepositForm hook and passes props to child components.
// The "after" balance values come from the current state prop (refreshed after
// deposit) while "before" values come from the hook's balanceSnapshot.
//
// Requirements: 3.3, 3.4, 8.1
// =============================================================================

"use client";

import type { AppState } from "@/app/lib/interfaces/state";
import { useDepositForm } from "@/app/(pages)/deposit/_lib/useDepositForm";
import { DepositForm } from "@/app/(pages)/deposit/_components/DepositForm/DepositForm";
import { DepositResultCard } from "@/app/(pages)/deposit/_components/DepositResultCard/DepositResultCard";
import { BalanceDiff } from "@/app/(pages)/deposit/_components/BalanceDiff/BalanceDiff";
import { DepositHistoryList } from "@/app/(pages)/deposit/_components/DepositHistoryList/DepositHistoryList";
import styles from "./DepositScreen.module.scss";

export interface DepositScreenProps {
  state: AppState;
  refresh: () => Promise<void>;
  inFlight: boolean;
}

/**
 * DepositScreen — layout orchestrator for the /deposit page.
 * Composes the explanation banner, form, result card, balance diff, and history.
 */
export function DepositScreen({
  state,
  refresh: _refresh,
  inFlight: _inFlight,
}: DepositScreenProps): React.JSX.Element {
  const {
    formState,
    errors,
    warnings,
    submitting,
    submitError,
    lastResult,
    balanceSnapshot,
    refreshError,
    history,
    setField,
    handleSubmit,
  } = useDepositForm();

  // Compute "after" balance values from the current state (post-refresh)
  const afterBalance = lastResult
    ? {
        userBalance:
          state.balances.userBalances[
            `${formState.depositor}/${formState.denom}`
          ] ?? "0",
        moduleBalance: state.balances.moduleAccountBalance,
      }
    : null;

  return (
    <div className={styles.screen}>
      {/* 1. Explanation banner — always visible */}
      <p className={styles.banner} role="note">
        Deposit only locks funds into the module account. The on-chain
        currentStateRoot does not change until a proof is submitted and accepted.
      </p>

      {/* 2. Deposit form */}
      <DepositForm
        formState={formState}
        errors={errors}
        warnings={warnings}
        submitting={submitting}
        disabled={false}
        onFieldChange={setField}
        onSubmit={handleSubmit}
        submitError={submitError}
      />

      {/* 3. Result card — shown after successful deposit */}
      {lastResult !== null && (
        <DepositResultCard
          deposit={lastResult}
          isMockMode={state.mode === "mock"}
        />
      )}

      {/* 4. Balance diff — shown after successful deposit */}
      {lastResult !== null && (
        <BalanceDiff
          before={balanceSnapshot}
          after={afterBalance}
          amount={lastResult.amount}
          denom={lastResult.denom}
          refreshError={refreshError}
        />
      )}

      {/* 5. Deposit history list — always visible */}
      <DepositHistoryList entries={history} />
    </div>
  );
}

export default DepositScreen;
