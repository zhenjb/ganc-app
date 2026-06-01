import type { BatchBuildInput } from "@/app/lib/interfaces";
import type { BatchSelectionState } from "@/app/(pages)/batch/_types";

/**
 * Map the page-private selection state onto the backend `BatchBuildInput`
 * payload.
 *
 * The mapping is intentionally narrow: `selectedDepositIds` becomes
 * `pendingDepositIds` and `selectedWithdrawIds` becomes `pendingWithdrawIds`.
 * Only these two fields are emitted — never `depositIds` / `withdrawIds`
 * (Req 2.5).
 *
 * @param selection - Current batch selection state.
 * @returns A `BatchBuildInput` carrying exactly the two pending-id arrays.
 */
export function buildBatchPayload(selection: BatchSelectionState): BatchBuildInput {
  return {
    pendingDepositIds: selection.selectedDepositIds,
    pendingWithdrawIds: selection.selectedWithdrawIds,
  };
}

/**
 * Pretty-print a `BatchBuildInput` payload for the JSON preview surface.
 *
 * Uses 2-space indentation so the preview renders as readable, monospace
 * JSON (Req 2.4).
 *
 * @param payload - The payload to serialize.
 * @returns A 2-space indented JSON string.
 */
export function previewJson(payload: BatchBuildInput): string {
  return JSON.stringify(payload, null, 2);
}
