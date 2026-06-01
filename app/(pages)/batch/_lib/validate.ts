/**
 * Pure predicate helpers for the Batch screen (FE-06).
 *
 * These functions are side-effect free and drive UI gating decisions:
 *   - whether the "Build Batch" button is enabled,
 *   - whether to warn about a partial (single-side) batch,
 *   - whether the "Generate Proof" CTA is enabled.
 *
 * They are intentionally local to the batch page (`_lib/`) and MUST NOT be
 * imported by modules outside the batch page directory.
 */
import type { BatchSelectionState } from "@/app/(pages)/batch/_types";
import type { BatchSession } from "@/app/lib/contexts/BatchSessionContext";

/**
 * Returns whether the current selection is structurally valid for a build.
 *
 * A selection is valid when either:
 *   - both sides have at least one item, or
 *   - exactly one side has items AND single-side build is enabled.
 *
 * An empty selection (neither side has items) is never valid.
 *
 * @param selection - Current batch selection state.
 * @param singleSideEnabled - Whether single-side builds are permitted.
 * @returns `true` when the selection can be built, otherwise `false`.
 */
function isSelectionValid(
  selection: BatchSelectionState,
  singleSideEnabled: boolean,
): boolean {
  const hasDeposits = selection.selectedDepositIds.length >= 1;
  const hasWithdraws = selection.selectedWithdrawIds.length >= 1;

  if (hasDeposits && hasWithdraws) {
    // Both sides selected — always a valid full batch.
    return true;
  }

  if (hasDeposits || hasWithdraws) {
    // Exactly one side selected — only valid when single-side builds are on.
    return singleSideEnabled;
  }

  // Nothing selected — never valid.
  return false;
}

/**
 * Determines whether the "Build Batch" button is enabled (Req 4.1, 4.4, 4.5).
 *
 * Enabled iff app state has loaded AND no build is in flight AND the selection
 * is valid (see {@link isSelectionValid}). This covers the disabled cases: app
 * state not loaded, a build already in flight, an empty selection, and a
 * single-side selection while single-side build is disabled.
 *
 * @param selection - Current batch selection state.
 * @param stateLoaded - `true` once `App_State` has loaded (`state !== null`).
 * @param building - `true` while a `postBatchBuild` call is in flight.
 * @param singleSideEnabled - Whether single-side builds are permitted.
 * @returns `true` when the Build Batch button should be enabled.
 */
export function isBuildEnabled(
  selection: BatchSelectionState,
  stateLoaded: boolean,
  building: boolean,
  singleSideEnabled: boolean,
): boolean {
  return (
    stateLoaded === true &&
    building === false &&
    isSelectionValid(selection, singleSideEnabled)
  );
}

/**
 * Determines whether to show the partial-batch warning (Req 4.2, 4.3).
 *
 * Warns iff single-side build is enabled AND exactly one side is selected (one
 * side has at least one item while the other side is empty). When both sides
 * have items, or both sides are empty, no warning is shown.
 *
 * @param selection - Current batch selection state.
 * @param singleSideEnabled - Whether single-side builds are permitted.
 * @returns `true` when the partial-batch warning should be displayed.
 */
export function shouldWarnPartialBatch(
  selection: BatchSelectionState,
  singleSideEnabled: boolean,
): boolean {
  if (singleSideEnabled !== true) {
    return false;
  }

  const hasDeposits = selection.selectedDepositIds.length >= 1;
  const hasWithdraws = selection.selectedWithdrawIds.length >= 1;

  // Exactly one side selected (XOR): warn about the partial batch.
  return hasDeposits !== hasWithdraws;
}

/**
 * Determines whether the "Generate Proof" CTA is enabled (Req 9.6, 10.5, 10.6).
 *
 * Enabled iff the session holds both `commitments` and `witness` and is not
 * stale. In every other case (missing commitments, missing witness, or stale)
 * the CTA is disabled and navigation to `/proof` must not occur.
 *
 * @param session - The shared in-memory batch session.
 * @returns `true` when the Generate Proof CTA should be enabled.
 */
export function canGenerateProof(session: BatchSession): boolean {
  return (
    session.commitments !== null &&
    session.witness !== null &&
    session.stale === false
  );
}
