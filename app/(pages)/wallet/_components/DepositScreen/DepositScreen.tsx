// =============================================================================
// Deposit Screen (FE-04 / FE-14) — DepositScreen
// -----------------------------------------------------------------------------
// Layout orchestrator that composes all deposit sub-components:
//   1. Explanation banner (always visible)
//   2. Two-column layout:
//      - Left: UserBalancePanel
//      - Right: FormTabs (Deposit | Withdraw tab)
//   3. DepositResultCard (conditional — shown after a successful deposit)
//   4. BalanceDiff (conditional — shown after a successful deposit)
//   5. History tables: Deposit tab → DepositHistoryList,
//                      Withdraw tab → DepositHistoryList + WithdrawRequestHistory
//
// Wires the useDepositForm and useWithdrawForm hooks and passes props to child
// components. "After" balance values come from the current state prop (refreshed
// after deposit) while "before" values come from the hook's balanceSnapshot.
// =============================================================================

"use client";

import { useCallback, useEffect, useState } from "react";
import type { AppState } from "@/app/lib/interfaces/state";
import { useWalletContext } from "@/app/lib/contexts/WalletContext";
import { useDepositForm } from "@/app/(pages)/wallet/_lib/useDepositForm";
import { useDepositHistory } from "@/app/(pages)/wallet/_lib/useDepositHistory";
import { useWithdrawForm } from "@/app/(pages)/wallet/_lib/useWithdrawForm";
import { useWithdrawHistory } from "@/app/(pages)/wallet/_lib/useWithdrawHistory";
import { UserBalanceCard } from "@/app/(pages)/wallet/_components/UserBalanceCard/UserBalanceCard";
import { ModuleBalanceCard } from "@/app/(pages)/wallet/_components/ModuleBalanceCard/ModuleBalanceCard";
import { FormTabs, type TabId } from "@/app/(pages)/wallet/_components/FormTabs/FormTabs";
import { DepositForm } from "@/app/(pages)/wallet/_components/DepositForm/DepositForm";
import { WithdrawRequestForm } from "@/app/components/WithdrawRequestForm/WithdrawRequestForm";
import { DepositResultCard } from "@/app/(pages)/wallet/_components/DepositResultCard/DepositResultCard";
import { BalanceDiff } from "@/app/(pages)/wallet/_components/BalanceDiff/BalanceDiff";
import { DepositHistoryList } from "@/app/(pages)/wallet/_components/DepositHistoryList/DepositHistoryList";
import { WithdrawRequestHistory } from "@/app/components/WithdrawRequestHistory/WithdrawRequestHistory";
import styles from "./DepositScreen.module.scss";

export interface DepositScreenProps {
  state: AppState;
  refresh: () => Promise<void>;
  inFlight: boolean;
}

/**
 * DepositScreen — layout orchestrator for the /deposit page.
 * Composes the explanation banner, tabbed forms, result card, balance diff,
 * and history tables.
 */
export function DepositScreen({
  state,
  refresh: _refresh,
  inFlight: _inFlight,
}: DepositScreenProps): React.JSX.Element {
  const { address } = useWalletContext();
  const noWallet = !address;
  const [activeTab, setActiveTab] = useState<TabId>("deposit");

  // --- Deposit form hook ---
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

  // --- Withdraw form hook (request + resumable claim) ---
  const {
    formState: wdFormState,
    errors: wdErrors,
    warnings: wdWarnings,
    submitting: wdSubmitting,
    submitError: wdSubmitError,
    lastResult: wdLastResult,
    history: wdSessionHistory,
    setField: wdSetField,
    handleSubmit: wdHandleSubmit,
    claim: wdClaim,
    claimingId: wdClaimingId,
    claimError: wdClaimError,
  } = useWithdrawForm();

  // Persisted withdraw history (survives refresh / tab switch), scoped to the
  // connected wallet. Merged with this session's just-submitted requests.
  const wdRemote = useWithdrawHistory(address);
  const wdMergedHistory = (() => {
    const byId = new Map<string, (typeof wdSessionHistory)[number]>();
    for (const r of wdRemote.remoteEntries) byId.set(r.id, r);
    for (const r of wdSessionHistory) byId.set(r.id, r); // session wins (latest local status)
    return [...byId.values()].sort((a, b) =>
      (b.createdAt ?? "").localeCompare(a.createdAt ?? "")
    );
  })();

  // Re-fetch persisted withdraw history after a new request settles into it.
  useEffect(() => {
    if (wdLastResult) {
      wdRemote.refetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wdLastResult]);

  const handleWithdrawClaim = useCallback(
    async (record: (typeof wdSessionHistory)[number]) => {
      const ok = await wdClaim(record);
      if (ok) await wdRemote.refetch();
    },
    [wdClaim, wdRemote]
  );

  const { remoteEntries, loading: historyLoading, refetch: refetchHistory } = useDepositHistory();

  // Merge session history (newest first) with remote history, de-duplicating by deposit id.
  const mergedHistory = (() => {
    const sessionIds = new Set(history.map((e) => e.deposit.id));
    const remoteOnly = remoteEntries.filter((e) => !sessionIds.has(e.deposit.id));
    return [...history, ...remoteOnly];
  })();

  // Re-fetch remote deposit history after a successful deposit.
  useEffect(() => {
    if (lastResult) {
      refetchHistory();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastResult]);

  // Compute "after" balance values from the current state (post-refresh).
  const afterBalance = lastResult
    ? {
        userBalance:
          state.userBalances[
            `${formState.depositor}/${formState.denom}`
          ] ?? "0",
        moduleBalance:
          state.moduleAccountBalance[formState.denom] ?? "0",
      }
    : null;

  return (
    <div className={styles.screen}>
      {/* Three-column layout: User Balance | Module Balance | Form */}
      <div className={styles.columns}>
        <div className={styles.column}>
          <UserBalanceCard userBalances={state.userBalances} owner={address} />
        </div>
        <div className={styles.column}>
          <ModuleBalanceCard moduleBalances={state.moduleAccountBalance} />
        </div>
        <div className={styles.column}>
          <FormTabs
            onTabChange={setActiveTab}
            depositContent={
              <DepositForm
                formState={formState}
                errors={errors}
                warnings={warnings}
                submitting={submitting}
                disabled={noWallet}
                onFieldChange={setField}
                onSubmit={handleSubmit}
                submitError={submitError}
                denoms={state.denoms}
              />
            }
            withdrawContent={
              <WithdrawRequestForm
                formState={wdFormState}
                errors={wdErrors}
                warnings={wdWarnings}
                submitting={wdSubmitting}
                disabled={noWallet}
                onFieldChange={wdSetField}
                onSubmit={wdHandleSubmit}
                submitError={wdSubmitError}
                denoms={state.denoms}
              />
            }
          />
        </div>
      </div>

      {/* 3. Result card — shown after successful deposit (deposit tab only) */}
      {activeTab === "deposit" && lastResult != null && (
        <DepositResultCard
          deposit={lastResult}
          isMockMode={state.mode === "mock"}
        />
      )}

      {/* 4. Balance diff — shown after successful deposit (deposit tab only) */}
      {activeTab === "deposit" && lastResult != null && (
        <BalanceDiff
          before={balanceSnapshot}
          after={afterBalance}
          amount={lastResult.amount}
          denom={lastResult.denom}
          refreshError={refreshError}
        />
      )}

      {/* 5. History tables — controlled by active tab */}
      {activeTab === "deposit" && (
        <DepositHistoryList entries={mergedHistory} loading={historyLoading} />
      )}

      {activeTab === "withdraw" && (
        <>
          <p
            role="note"
            style={{
              fontSize: "0.8125rem",
              color: "var(--color-muted, #667085)",
              margin: "4px 2px 10px",
              lineHeight: 1.5,
            }}
          >
            Withdrawing debits your balance immediately and <b>auto-claims</b>{" "}
            once the withdrawal settles. If you cancel the signing popup (or it
            hasn&apos;t settled yet), the funds are <b>held, not lost</b> — finish
            it anytime with the <b>Claim</b> button below.
          </p>
          {wdClaimError && (
            <p
              role="alert"
              style={{ fontSize: "0.8125rem", color: "#b42318", margin: "0 2px 10px" }}
            >
              {wdClaimError}
            </p>
          )}
          <WithdrawRequestHistory
            entries={wdMergedHistory}
            onClaim={handleWithdrawClaim}
            claimingId={wdClaimingId}
          />
        </>
      )}
    </div>
  );
}

export default DepositScreen;
