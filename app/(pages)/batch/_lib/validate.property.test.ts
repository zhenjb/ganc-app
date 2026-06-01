import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  isBuildEnabled,
  shouldWarnPartialBatch,
  canGenerateProof,
} from "@/app/(pages)/batch/_lib/validate";
import type { BatchSelectionState } from "@/app/(pages)/batch/_types";
import type { BatchSession } from "@/app/lib/contexts/BatchSessionContext";
import type {
  BatchCommitments,
  Witness,
} from "@/app/lib/interfaces/batch";

/**
 * Property-based tests for the Batch screen pure predicates (FE-06).
 *
 * Feature: batch-screen
 *   Property 4  — Build enabled iff selection is valid
 *   Property 5  — Partial-batch warning iff exactly one side is selected
 *                 (when single-side build is enabled)
 *   Property 12 — Generate Proof CTA enablement
 *
 * Each property is checked against an independent oracle derived directly
 * from the specification (design.md Properties 4, 5, 12), not from the
 * implementation, so the test would catch an implementation that drifts
 * from the spec.
 */

// --- Shared arbitraries -----------------------------------------------------

// Arbitrary array of selection ids; length is what the predicates care about.
const idArray = fc.array(fc.string(), { minLength: 0, maxLength: 6 });

// Arbitrary selection state across all relevant equivalence classes
// (empty / one-side / both-sides).
const selectionArb: fc.Arbitrary<BatchSelectionState> = fc.record({
  selectedDepositIds: idArray,
  selectedWithdrawIds: idArray,
});

// A minimal non-null commitments object. `canGenerateProof` only inspects
// identity against null, so the structural contents are irrelevant.
const minimalCommitments: BatchCommitments = {
  publicInputs: {
    oldStateRoot: "0x00",
    newStateRoot: "0x01",
    depositsRoot: "0x02",
    withdrawalsRoot: "0x03",
    nullifiersRoot: "0x04",
    withdrawOutputsRoot: "0x05",
  },
  batchHash: "0x06",
};

// A minimal non-null witness object.
const minimalWitness: Witness = { inputs: ["0x07"], auxiliary: null };

// Sometimes null, sometimes a minimal non-null object.
const commitmentsArb: fc.Arbitrary<BatchCommitments | null> = fc.option(
  fc.constant(minimalCommitments),
  { nil: null },
);
const witnessArb: fc.Arbitrary<Witness | null> = fc.option(
  fc.constant(minimalWitness),
  { nil: null },
);

// --- Property 4 -------------------------------------------------------------

describe("isBuildEnabled (Property 4)", () => {
  // Feature: batch-screen, Property 4
  // Validates: Requirements 4.1, 4.4, 4.5
  it("is enabled iff state loaded, not building, and selection valid", () => {
    fc.assert(
      fc.property(
        selectionArb,
        fc.boolean(),
        fc.boolean(),
        fc.boolean(),
        (selection, stateLoaded, building, singleSideEnabled) => {
          // Independent oracle derived from the spec.
          const hasDeposits = selection.selectedDepositIds.length >= 1;
          const hasWithdraws = selection.selectedWithdrawIds.length >= 1;
          const selectionValid =
            (hasDeposits && hasWithdraws) ||
            ((hasDeposits || hasWithdraws) &&
              hasDeposits !== hasWithdraws &&
              singleSideEnabled === true);
          const expected =
            stateLoaded === true && building === false && selectionValid;

          expect(
            isBuildEnabled(
              selection,
              stateLoaded,
              building,
              singleSideEnabled,
            ),
          ).toBe(expected);
        },
      ),
      { numRuns: 200 },
    );
  });

  // Feature: batch-screen, Property 4
  // Validates: Requirements 4.1, 4.4
  it("is always disabled for an empty selection", () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        fc.boolean(),
        fc.boolean(),
        (stateLoaded, building, singleSideEnabled) => {
          const emptySelection: BatchSelectionState = {
            selectedDepositIds: [],
            selectedWithdrawIds: [],
          };
          expect(
            isBuildEnabled(
              emptySelection,
              stateLoaded,
              building,
              singleSideEnabled,
            ),
          ).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// --- Property 5 -------------------------------------------------------------

describe("shouldWarnPartialBatch (Property 5)", () => {
  // Feature: batch-screen, Property 5
  // Validates: Requirements 4.2, 4.3
  it("warns iff single-side enabled and exactly one side is selected", () => {
    fc.assert(
      fc.property(selectionArb, fc.boolean(), (selection, singleSideEnabled) => {
        const hasDeposits = selection.selectedDepositIds.length >= 1;
        const hasWithdraws = selection.selectedWithdrawIds.length >= 1;
        // Independent oracle: single-side enabled AND XOR of the two sides.
        const expected =
          singleSideEnabled === true && hasDeposits !== hasWithdraws;

        expect(shouldWarnPartialBatch(selection, singleSideEnabled)).toBe(
          expected,
        );
      }),
      { numRuns: 200 },
    );
  });

  // Feature: batch-screen, Property 5
  // Validates: Requirements 4.3
  it("never warns when both sides have items or both are empty", () => {
    fc.assert(
      fc.property(
        // Both sides have items, or both sides empty (no XOR cases).
        fc.boolean(),
        fc.boolean(),
        (bothSelected, singleSideEnabled) => {
          const selection: BatchSelectionState = bothSelected
            ? { selectedDepositIds: ["d1"], selectedWithdrawIds: ["w1"] }
            : { selectedDepositIds: [], selectedWithdrawIds: [] };
          expect(
            shouldWarnPartialBatch(selection, singleSideEnabled),
          ).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// --- Property 12 ------------------------------------------------------------

describe("canGenerateProof (Property 12)", () => {
  // Feature: batch-screen, Property 12
  // Validates: Requirements 9.6, 10.4, 10.5, 10.6
  it("is enabled iff commitments and witness present and not stale", () => {
    fc.assert(
      fc.property(
        commitmentsArb,
        witnessArb,
        fc.boolean(),
        (commitments, witness, stale) => {
          // Build a session-like object; canGenerateProof only reads these
          // three fields, so the mutators are not needed for this property.
          const session = {
            commitments,
            witness,
            stale,
          } as BatchSession;

          // Independent oracle derived from the spec.
          const expected =
            commitments !== null && witness !== null && stale === false;

          expect(canGenerateProof(session)).toBe(expected);
        },
      ),
      { numRuns: 200 },
    );
  });
});
