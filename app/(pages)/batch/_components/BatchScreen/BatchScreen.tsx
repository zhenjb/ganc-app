// =============================================================================
// Batch Screen (FE-06) — BatchScreen orchestrator
// -----------------------------------------------------------------------------
// Owns the page state and orchestrates the whole build → visualize → handoff
// flow. Composes the presentational sub-components and wires the build
// lifecycle (`useBatchBuild`) plus the shared in-memory session
// (`BatchSessionContext`).
//
// Single code path: the screen runs the exact same logic regardless of
// `state.mode` ("mock" | "local") — there is no branch that reads `mode`
// (Req 14.7).
//
// Responsibilities:
//   - Compute the available deposits/withdraws from app state (Req 2.1, 2.2).
//     There is no shared FE-04/FE-05 session-history store in the repo yet, so
//     the history side of the union is an empty array; the available set is
//     simply `union(latest, [])` deduped by id.
//   - Own `selection: BatchSelectionState` (Req 2.7).
//   - Drive the Build button via `isBuildEnabled` (Req 4.1/4.4/4.5) with a
//     visible loading indicator while building (Req 3.2).
//   - Confirm before overwriting an existing session batch (Req 10.1–10.3).
//   - Mark the session stale on user-driven selection changes after a build
//     (Req 10.4) via useEffect watching selection changes after first success.
//   - Render the result sections only when a build has succeeded (Req 12.7),
//     in the locked order: RootTransition → DepositsTable → WithdrawalsTable →
//     CommitmentsCard → WitnessPanel.
//   - Gate the Generate Proof CTA via `canGenerateProof` (Req 9.6, 10.5, 10.6)
//     and hand off to /proof on click (Req 9.1).
//   - Surface the single NormalizedError banner on build failure (Req 12.1,
//     12.2) while keeping the selection intact (Req 12.3).
//
// Requirements: 3.2, 4.1, 4.2, 4.3, 4.4, 4.5, 9.1, 9.5, 9.6, 10.1, 10.2, 10.3,
// 10.4, 10.5, 10.6, 11.1, 12.1, 12.2, 12.3, 12.6, 12.7, 14.7
// =============================================================================

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { AnnouncementBanner } from "@/app/components/AnnouncementBanner/AnnouncementBanner";
import { useBatchSession } from "@/app/lib/contexts/BatchSessionContext";
import type { AppState } from "@/app/lib/interfaces/state";
import type { DepositRecord } from "@/app/lib/interfaces/deposit";
import type { WithdrawRecord } from "@/app/lib/interfaces/withdraw";

import { BatchInputSelector } from "@/app/(pages)/batch/_components/BatchInputSelector/BatchInputSelector";
import { RootTransition } from "@/app/(pages)/batch/_components/RootTransition/RootTransition";
import { DepositsTable } from "@/app/(pages)/batch/_components/DepositsTable/DepositsTable";
import { WithdrawalsTable } from "@/app/(pages)/batch/_components/WithdrawalsTable/WithdrawalsTable";
import { CommitmentsCard } from "@/app/(pages)/batch/_components/CommitmentsCard/CommitmentsCard";
import { WitnessPanel } from "@/app/(pages)/batch/_components/WitnessPanel/WitnessPanel";

import { useBatchBuild } from "@/app/(pages)/batch/_lib/useBatchBuild";
import {
  selectAvailableDeposits,
  selectAvailableWithdraws,
} from "@/app/(pages)/batch/_lib/selectInputs";
import { buildBatchPayload } from "@/app/(pages)/batch/_lib/payload";
import {
  canGenerateProof,
  isBuildEnabled,
  shouldWarnPartialBatch,
} from "@/app/(pages)/batch/_lib/validate";
import { SINGLE_SIDE_BUILD_ENABLED } from "@/app/(pages)/batch/_lib/config";
import type { BatchSelectionState } from "@/app/(pages)/batch/_types";

import styles from "./BatchScreen.module.scss";

export interface BatchScreenProps {
  /** Loaded app state — always non-null at this layer. */
  state: AppState;
  /** Refresh the shared app state (Req 11.1). */
  refresh: () => Promise<void>;
  /** `true` while an app-state fetch is in flight. */
  inFlight: boolean;
}

/** English UI strings (English-only UI per product rules). */
const OVERWRITE_CONFIRM =
  "This will overwrite the current batch in your session. Continue?";
const STALE_WARNING =
  "Selection changed — rebuild the batch before generating a proof.";
const MISSING_DATA = "Missing data — cannot continue to Proof.";
const NORMALIZED_ERROR = "Internal Server Error";

/** Empty selection used as the initial state (Req 2.7). */
const EMPTY_SELECTION: BatchSelectionState = {
  selectedDepositIds: [],
  selectedWithdrawIds: [],
};

// No shared FE-04/FE-05 session-history store exists in the repo, so the
// history side of the available-input union is always empty. These stable
// module-level references avoid recomputing the union on every render.
const NO_DEPOSIT_HISTORY: DepositRecord[] = [];
const NO_WITHDRAW_HISTORY: WithdrawRecord[] = [];

/**
 * BatchScreen — orchestrator for the /batch page.
 */
export function BatchScreen({
  state,
  refresh,
  // `inFlight` is part of the orchestrator contract but does not gate the
  // Build button (that is driven by `building` from useBatchBuild, per
  // Req 4.x), so it is intentionally unused here.
  inFlight: _inFlight,
}: BatchScreenProps): React.JSX.Element {
  const router = useRouter();
  const session = useBatchSession();

  // User-selected ids (Req 2.7). This is the single source of truth the screen
  // owns; it is never reset on error (Req 12.3).
  const [selection, setSelection] = useState<BatchSelectionState>(EMPTY_SELECTION);

  // Track whether a build has succeeded at least once. Used by the stale-
  // detection effect to avoid marking stale on the initial selection state.
  const hasBuiltRef = useRef(false);

  // Build lifecycle. On success the hook stores the batch into the session
  // (which clears the stale flag) and calls refresh() exactly once after render
  // (Req 11.1). On failure it raises `buildError` without touching selection.
  const { building, result, buildError, build, clearError } = useBatchBuild({
    refresh,
    onSuccess: (response) => {
      session.setBatch({
        commitments: response.commitments,
        witness: response.witness,
      });
      // Mark that at least one build has succeeded so the stale-detection
      // effect can start watching selection changes.
      hasBuiltRef.current = true;
    },
  });

  // Available inputs = union(latest, []) deduped by id (Req 2.1, 2.2).
  const availableDeposits = useMemo(
    () => selectAvailableDeposits(state.latestDeposit, NO_DEPOSIT_HISTORY),
    [state.latestDeposit],
  );
  const availableWithdraws = useMemo(
    () => selectAvailableWithdraws(state.latestWithdrawRequest, NO_WITHDRAW_HISTORY),
    [state.latestWithdrawRequest],
  );

  // Resolve the FE records for the current selection. The tables read from the
  // FE-selected records, never from BatchBuildResponse (Req 6.4).
  const selectedDeposits = useMemo(
    () =>
      availableDeposits.filter((deposit) =>
        selection.selectedDepositIds.includes(deposit.id),
      ),
    [availableDeposits, selection.selectedDepositIds],
  );
  const selectedWithdraws = useMemo(
    () =>
      availableWithdraws.filter((withdraw) =>
        selection.selectedWithdrawIds.includes(withdraw.id),
      ),
    [availableWithdraws, selection.selectedWithdrawIds],
  );

  // Stale detection via useEffect: after the first successful build, any
  // selection change marks the session stale (Req 10.4). The effect skips the
  // initial render and only fires when `selection` changes after `hasBuiltRef`
  // has been set to true.
  const selectionRef = useRef(selection);
  useEffect(() => {
    // Skip the very first render (selection hasn't changed yet).
    if (selectionRef.current === selection) {
      return;
    }
    selectionRef.current = selection;

    // Only mark stale after at least one successful build.
    if (hasBuiltRef.current && session.commitments !== null) {
      session.markStale();
    }
  }, [selection, session]);

  // Result data, defensively narrowed so a response missing `commitments` or
  // `witness` (Req 9.5) renders the available parts plus a missing-data note.
  const commitments = result?.commitments ?? null;
  const witness = result?.witness ?? null;

  const buildDisabled = !isBuildEnabled(
    selection,
    state !== null,
    building,
    SINGLE_SIDE_BUILD_ENABLED,
  );
  const partialWarning = shouldWarnPartialBatch(
    selection,
    SINGLE_SIDE_BUILD_ENABLED,
  );
  const proofDisabled = !canGenerateProof(session);

  /**
   * Handle a user-driven selection change. Updates the selection state which
   * triggers the stale-detection useEffect above (Req 10.4).
   */
  function handleSelectionChange(next: BatchSelectionState): void {
    setSelection(next);
  }

  /**
   * Handle a Build button click. The button is disabled while `building`, but
   * we still guard defensively. When the session already holds a batch, confirm
   * the overwrite before issuing the request (Req 10.1–10.3). Any existing error
   * banner is hidden before the new request (Req 12.6).
   */
  function handleBuildClick(): void {
    if (building) {
      return;
    }

    if (session.commitments !== null) {
      const confirmed = window.confirm(OVERWRITE_CONFIRM);
      if (!confirmed) {
        // Cancelled: do not call postBatchBuild; keep the session untouched
        // (Req 10.3).
        return;
      }
    }

    // Hide any existing NormalizedError banner before issuing a new request
    // (Req 12.6), then build with the current selection.
    clearError();
    void build(buildBatchPayload(selection));
  }

  /**
   * Handle the Generate Proof CTA. Navigation happens only when the session is
   * ready (Req 9.6); the batch is (re)saved into the session before navigating
   * (Req 9.1).
   */
  function handleGenerateProof(): void {
    if (!canGenerateProof(session)) {
      return;
    }
    session.setBatch({
      commitments: session.commitments,
      witness: session.witness,
    });
    router.push("/proof");
  }

  return (
    <div className={styles.screen}>
      {/* Single NormalizedError banner on build failure (Req 12.1, 12.2).
          Does not expose backend-specific text — always "Internal Server Error". */}
      {buildError && (
        <AnnouncementBanner variant="error" message={NORMALIZED_ERROR} />
      )}

      {/* Input selection + payload preview + partial-batch warning.
          The BatchInputSelector renders the partial-batch warning internally
          when `partialWarning` is true (Req 4.2, 4.3). */}
      <BatchInputSelector
        availableDeposits={availableDeposits}
        availableWithdraws={availableWithdraws}
        selection={selection}
        disabled={building}
        partialWarning={partialWarning}
        onChange={handleSelectionChange}
      />

      {/* Build action with a visible loading indicator while building (Req 3.2). */}
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.buildButton}
          disabled={buildDisabled}
          aria-busy={building}
          onClick={handleBuildClick}
        >
          {building ? (
            <>
              <span className={styles.spinner} aria-hidden="true" />
              <span>Building…</span>
            </>
          ) : (
            "Build Batch"
          )}
        </button>
      </div>

      {/* Result sections — rendered only after a successful build (Req 12.7),
          in the locked order RootTransition → DepositsTable → WithdrawalsTable
          → CommitmentsCard → WitnessPanel. */}
      {result !== null && (
        <div className={styles.results}>
          {commitments !== null ? (
            <RootTransition publicInputs={commitments.publicInputs} />
          ) : (
            // Missing commitments — cannot show the root transition / card
            // (Req 9.5).
            <p className={styles.missingData} role="status">
              {MISSING_DATA}
            </p>
          )}

          {/* Tables always come from the FE selection, not the response. */}
          <DepositsTable deposits={selectedDeposits} />
          <WithdrawalsTable withdrawals={selectedWithdraws} />

          {commitments !== null && (
            <CommitmentsCard commitments={commitments} />
          )}

          {witness !== null ? (
            <WitnessPanel witness={witness} />
          ) : (
            // Missing witness (Req 9.5).
            <p className={styles.missingData} role="status">
              {MISSING_DATA}
            </p>
          )}
        </div>
      )}

      {/* Handoff: stale warning (Req 10.5) + Generate Proof CTA (Req 9.1, 9.6).
          Only rendered when the session is ready (commitments + witness present). */}
      {!proofDisabled && (
        <div className={styles.cta}>
          {session.stale && (
            <p className={styles.staleWarning} role="alert">
              {STALE_WARNING}
            </p>
          )}

          <button
            type="button"
            className={styles.generateButton}
            onClick={handleGenerateProof}
          >
            Generate Proof
          </button>
        </div>
      )}
    </div>
  );
}

export default BatchScreen;
