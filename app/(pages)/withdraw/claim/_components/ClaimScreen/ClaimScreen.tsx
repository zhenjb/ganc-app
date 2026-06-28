// =============================================================================
// Claim Screen (FE-09) — ClaimScreen
// -----------------------------------------------------------------------------
// Layout orchestrator that composes all claim sub-components:
//   1. Explanation banner (always visible)
//   2. Wallet connection prompt (real mode, informational)
//   3. Empty state (when no claimable records)
//   4. WithdrawRecordRow table (per unclaimed record)
//   5. ClaimResultCard (conditional — shown after a successful claim)
//   6. BalancesDiff (conditional — shown after a successful claim)
//   7. ClaimSummary (when all records claimed)
//
// Loads records from withdraw session history or fallback state.latestWithdrawRecords.
// Wires the useClaimAction hook and manages balance snapshots for diff display.
//
// Requirements: 1.1, 1.3, 1.4, 1.5, 2.5, 7.1
// =============================================================================

"use client";

import { useMemo, useRef } from "react";
import Link from "next/link";
import type { AppState } from "@/app/lib/interfaces/state";
import type { WithdrawRecord } from "@/app/lib/interfaces/withdraw";
import { loadHistory } from "@/app/(pages)/withdraw/_lib/sessionHistory";
import { useClaimAction } from "@/app/(pages)/withdraw/claim/_lib/useClaimAction";
import { computeBalanceDiff } from "@/app/(pages)/withdraw/claim/_lib/balanceMath";
import { WithdrawRecordRow } from "@/app/(pages)/withdraw/claim/_components/WithdrawRecordRow/WithdrawRecordRow";
import { ClaimResultCard } from "@/app/(pages)/withdraw/claim/_components/ClaimResultCard/ClaimResultCard";
import { BalancesDiff } from "@/app/(pages)/withdraw/claim/_components/BalancesDiff/BalancesDiff";
import { ClaimSummary } from "@/app/(pages)/withdraw/claim/_components/ClaimSummary/ClaimSummary";
import styles from "./ClaimScreen.module.scss";

export interface ClaimScreenProps {
  state: AppState;
  refresh: () => Promise<void>;
  inFlight: boolean;
}

/**
 * Filters records to only include those that are not yet claimed.
 * Exported for property-based testing.
 */
export function filterUnclaimedRecords(
  records: WithdrawRecord[],
): WithdrawRecord[] {
  return records.filter((r) => r.status !== "claimed");
}

/**
 * Determines whether all records have been claimed (either from original
 * status or from successful claim results in this session).
 * Exported for property-based testing.
 */
export function allRecordsClaimed(
  records: WithdrawRecord[],
  claimedIds: Set<string>,
): boolean {
  if (records.length === 0) return false;
  return records.every(
    (r) => r.status === "claimed" || claimedIds.has(r.id),
  );
}

/**
 * ClaimScreen — layout orchestrator for the /withdraw/claim page.
 * Composes the banner, wallet prompt, records table, result card,
 * balance diff, and completion summary.
 */
export function ClaimScreen({
  state,
  refresh,
}: ClaimScreenProps): React.JSX.Element {
  // -------------------------------------------------------------------------
  // 1. Load records: session history (primary) or fallback state
  // -------------------------------------------------------------------------
  const allRecords = useMemo<WithdrawRecord[]>(() => {
    // Try session history first (withdraw request session)
    const fromSession = loadHistory();
    if (fromSession.length > 0) {
      return fromSession;
    }

    // Fallback: state.latestWithdrawRecords (single record or null)
    if (state.latestWithdrawRecords) {
      return [state.latestWithdrawRecords];
    }

    return [];
  }, [state.latestWithdrawRecords]);

  // -------------------------------------------------------------------------
  // 2. Filter to unclaimed records for display
  // -------------------------------------------------------------------------
  const unclaimedRecords = useMemo(
    () => filterUnclaimedRecords(allRecords),
    [allRecords],
  );

  // -------------------------------------------------------------------------
  // 3. Wire useClaimAction hook
  // -------------------------------------------------------------------------
  const { rowStates, claim, retry } = useClaimAction({
    records: allRecords,
    mode: state.mode,
    refresh,
  });

  // -------------------------------------------------------------------------
  // 4. Balance snapshot: capture "before" on first render
  // -------------------------------------------------------------------------
  const balanceSnapshotRef = useRef<{
    userBalance: string;
    moduleBalance: string;
  } | null>(null);

  if (balanceSnapshotRef.current === null && allRecords.length > 0) {
    // Derive denom from the first record
    const denom = allRecords[0]?.denom ?? "USDT";
    const destination = allRecords[0]?.destination ?? "";
    const userBalKey = `${destination}/${denom}`;

    balanceSnapshotRef.current = {
      userBalance: state.userBalances[userBalKey] ?? "0",
      moduleBalance: state.moduleAccountBalance[denom] ?? "0",
    };
  }

  // -------------------------------------------------------------------------
  // 5. Determine latest successful claim result (most recent across all rows)
  // -------------------------------------------------------------------------
  const latestResult = useMemo(() => {
    let most: { result: NonNullable<(typeof rowStates extends Map<string, infer V> ? V : never)["result"]>; id: string } | null = null;
    for (const [id, rs] of rowStates) {
      if (rs.result) {
        most = { result: rs.result, id };
      }
    }
    return most;
  }, [rowStates]);

  // -------------------------------------------------------------------------
  // 6. Track claimed IDs (from rowStates results)
  // -------------------------------------------------------------------------
  const claimedIds = useMemo(() => {
    const ids = new Set<string>();
    for (const [id, rs] of rowStates) {
      if (rs.result) {
        ids.add(id);
      }
    }
    return ids;
  }, [rowStates]);

  // -------------------------------------------------------------------------
  // 7. All-claimed detection
  // -------------------------------------------------------------------------
  const isAllClaimed = allRecordsClaimed(allRecords, claimedIds);

  // -------------------------------------------------------------------------
  // 8. Compute BalancesDiff props when a result exists
  // -------------------------------------------------------------------------
  const balanceDiffProps = useMemo(() => {
    if (!latestResult) return null;

    const record = latestResult.result.withdrawRecord;
    const denom = record.denom;
    const { userBalances, moduleAccountBalance } = latestResult.result;

    const { testVectorMatch } = computeBalanceDiff(
      userBalances,
      moduleAccountBalance,
      record.amount,
      denom,
    );

    // Derive "after" balances from claim result
    const userKey = Object.keys(userBalances).find((k) =>
      k.endsWith(`/${denom}`),
    );
    const afterUserBalance = userKey ? userBalances[userKey] : "0";
    const afterModuleBalance =
      denom in moduleAccountBalance ? moduleAccountBalance[denom] : "0";

    const moduleBalanceUnavailable =
      Object.keys(moduleAccountBalance).length === 0 ||
      !(denom in moduleAccountBalance);

    return {
      before: balanceSnapshotRef.current,
      after: { userBalance: afterUserBalance, moduleBalance: afterModuleBalance },
      amount: record.amount,
      denom,
      testVectorMismatch: !testVectorMatch,
      moduleBalanceUnavailable,
    };
  }, [latestResult]);

  // -------------------------------------------------------------------------
  // 9. Determine if records list shown should hide already-claimed-this-session
  // -------------------------------------------------------------------------
  const displayRecords = useMemo(() => {
    return unclaimedRecords.filter((r) => !claimedIds.has(r.id));
  }, [unclaimedRecords, claimedIds]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  const isRealMode = state.mode === "local";
  const hasRecords = allRecords.length > 0;
  const hasDisplayRecords = displayRecords.length > 0;

  return (
    <div className={styles.screen}>
      {/* 1. Explanation banner — always visible */}
      <p className={styles.banner} role="note">
        Claim only releases funds based on a record already accepted by a proof.
        It does not change the state root.
      </p>

      {/* 2. Wallet connection notice (real mode only) */}
      {isRealMode && (
        <p className={styles.walletPrompt} role="note">
          Wallet signing will be required to broadcast claim transactions.
          Ensure your wallet (Keplr/Leap) is connected.
        </p>
      )}

      {/* 3. Empty state — no records at all */}
      {!hasRecords && (
        <div className={styles.emptyState}>
          <p className={styles.emptyText}>
            No claimable withdraw records found.
          </p>
          <p className={styles.emptyText}>
            Complete the Submit Proof step first, then return here to claim.
          </p>
          <Link href="/submit-proof" className={styles.emptyLink}>
            Go to Submit Proof
          </Link>
        </div>
      )}

      {/* 4. Records table — shown when there are unclaimed records */}
      {hasDisplayRecords && (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>ID</th>
                <th className={styles.th}>Owner</th>
                <th className={styles.th}>Amount</th>
                <th className={styles.th}>Denom</th>
                <th className={styles.th}>Destination</th>
                <th className={styles.th}>Status</th>
                <th className={styles.th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {displayRecords.map((record) => {
                const rowState = rowStates.get(record.id);
                return (
                  <WithdrawRecordRow
                    key={record.id}
                    record={record}
                    onClaim={claim}
                    onRetry={retry}
                    claiming={rowState?.claiming ?? false}
                    error={rowState?.error ?? null}
                    claimed={
                      record.status === "claimed" || claimedIds.has(record.id)
                    }
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 5. Result card — shown after a successful claim */}
      {latestResult && (
        <ClaimResultCard
          txHash={latestResult.result.txHash}
          record={latestResult.result.withdrawRecord}
          userBalances={latestResult.result.userBalances}
          moduleAccountBalance={latestResult.result.moduleAccountBalance}
        />
      )}

      {/* 6. Balance diff — shown after a successful claim */}
      {balanceDiffProps && <BalancesDiff {...balanceDiffProps} />}

      {/* 7. Completion summary — when all records are claimed */}
      <ClaimSummary allClaimed={isAllClaimed} />
    </div>
  );
}

export default ClaimScreen;
