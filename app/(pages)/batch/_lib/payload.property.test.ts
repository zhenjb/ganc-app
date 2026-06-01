import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { buildBatchPayload, previewJson } from "@/app/(pages)/batch/_lib/payload";
import type { BatchSelectionState } from "@/app/(pages)/batch/_types";

/**
 * Property-based tests for the batch payload mapping + JSON preview helpers.
 *
 * Feature: batch-screen, Property 3
 * Validates: Requirements 2.4, 2.5
 *
 * Property 3 — Payload mapping + JSON preview round-trip:
 * For any BatchSelectionState, buildBatchPayload(selection) contains exactly
 * the two fields `pendingDepositIds` and `pendingWithdrawIds` (never
 * `depositIds` / `withdrawIds` and no extra keys), with values equal to
 * `selectedDepositIds` and `selectedWithdrawIds` respectively; and
 * JSON.parse(previewJson(payload)) deep-equals the payload (round-trip);
 * and previewJson uses 2-space indentation.
 */

// --- Arbitraries ------------------------------------------------------------

// Arbitrary string ids. Plain fast-check strings exercise the input space
// broadly (empty strings, unicode, JSON-significant characters like quotes,
// backslashes and braces) so the round-trip is stressed against escaping.
const idArray = fc.array(fc.string(), { minLength: 0, maxLength: 20 });

const selectionArb: fc.Arbitrary<BatchSelectionState> = fc.record({
  selectedDepositIds: idArray,
  selectedWithdrawIds: idArray,
});

// ---------------------------------------------------------------------------
// Property 3: Payload mapping + JSON preview round-trip
// ---------------------------------------------------------------------------
describe("Feature: batch-screen, Property 3: Payload mapping + JSON preview round-trip", () => {
  it("maps selection onto exactly pendingDepositIds / pendingWithdrawIds with no extra keys", () => {
    // Validates: Requirements 2.5
    fc.assert(
      fc.property(selectionArb, (selection) => {
        const payload = buildBatchPayload(selection);

        // Exactly the two expected keys, in order, and nothing else.
        expect(Object.keys(payload)).toEqual([
          "pendingDepositIds",
          "pendingWithdrawIds",
        ]);

        // The forbidden legacy field names must never appear.
        expect(payload).not.toHaveProperty("depositIds");
        expect(payload).not.toHaveProperty("withdrawIds");

        // Values are mapped from the matching selection arrays.
        expect(payload.pendingDepositIds).toEqual(selection.selectedDepositIds);
        expect(payload.pendingWithdrawIds).toEqual(
          selection.selectedWithdrawIds
        );
      }),
      { numRuns: 200 }
    );
  });

  it("round-trips through previewJson: JSON.parse(previewJson(payload)) deep-equals payload", () => {
    // Validates: Requirements 2.4
    fc.assert(
      fc.property(selectionArb, (selection) => {
        const payload = buildBatchPayload(selection);
        const json = previewJson(payload);

        expect(JSON.parse(json)).toEqual(payload);
      }),
      { numRuns: 200 }
    );
  });

  it("pretty-prints with 2-space indentation (equals JSON.stringify(payload, null, 2))", () => {
    // Validates: Requirements 2.4
    fc.assert(
      fc.property(selectionArb, (selection) => {
        const payload = buildBatchPayload(selection);

        expect(previewJson(payload)).toBe(JSON.stringify(payload, null, 2));
      }),
      { numRuns: 200 }
    );
  });
});
