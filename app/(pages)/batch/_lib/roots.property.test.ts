import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { isMissingRoot, selectCommitmentRoots } from "@/app/(pages)/batch/_lib/roots";
import type { SettlementUpdate } from "@/app/lib/interfaces/batch";

/**
 * Property-based tests for the batch root helpers.
 *
 * Feature: batch-screen
 *   Property 6 — Missing root predicate (isMissingRoot)
 *   Property 9 — Locked ordering of the 4 commitment roots (selectCommitmentRoots)
 *
 * Each property is checked against an oracle derived directly from the
 * specification (design Properties 6 & 9), not from the implementation.
 */

const HEX_DIGITS = "0123456789abcdefABCDEF".split("");

// The 4 values that the spec considers "missing" for a root (design Property 6).
const MISSING_VALUES: readonly (string | null | undefined)[] = [
  "",
  "0x",
  null,
  undefined,
];

// Spec oracle for isMissingRoot: true iff value is "" | "0x" | null | undefined.
function expectedMissing(value: string | null | undefined): boolean {
  return value === "" || value === "0x" || value === null || value === undefined;
}

// A valid, present hex string: "0x" + at least one hex digit. By construction
// this can never be "" or "0x", so it always represents a present root.
const validHex = fc
  .array(fc.constantFrom(...HEX_DIGITS), { minLength: 1, maxLength: 64 })
  .map((chars) => "0x" + chars.join(""));

// Arbitrary non-empty strings that are guaranteed not to be a missing value.
const nonMissingString = fc
  .string({ minLength: 1 })
  .filter((s) => s !== "0x");

// An arbitrary root field value used to build SettlementUpdate fixtures. We use
// hex-shaped strings (incl. the empty / "0x" placeholders) so the ordering
// property holds regardless of the actual root contents.
const rootFieldValue = fc.oneof(
  validHex,
  fc.constantFrom<string>("", "0x")
);

// ---------------------------------------------------------------------------
// Feature: batch-screen, Property 6
// Validates: Requirements 5.8, 7.6, 7.10
// ---------------------------------------------------------------------------
describe("Feature: batch-screen, Property 6: Missing root predicate", () => {
  it("returns true if and only if the value is \"\" | \"0x\" | null | undefined (oracle)", () => {
    // Validates: Requirements 5.8, 7.6, 7.10
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constantFrom(...MISSING_VALUES),
          validHex,
          nonMissingString
        ),
        (value) => {
          expect(isMissingRoot(value)).toBe(expectedMissing(value));
        }
      ),
      { numRuns: 200 }
    );
  });

  it("returns true for every missing value (\"\", \"0x\", null, undefined)", () => {
    // Validates: Requirements 5.8, 7.6, 7.10
    fc.assert(
      fc.property(fc.constantFrom(...MISSING_VALUES), (value) => {
        expect(isMissingRoot(value)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it("returns false for any present (non-empty, non-\"0x\") hex string", () => {
    // Validates: Requirements 5.8, 7.6, 7.10
    fc.assert(
      fc.property(validHex, (value) => {
        expect(value).not.toBe("");
        expect(value).not.toBe("0x");
        expect(isMissingRoot(value)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it("returns false for any non-empty string that is not a missing value", () => {
    // Validates: Requirements 5.8, 7.6, 7.10
    fc.assert(
      fc.property(nonMissingString, (value) => {
        expect(isMissingRoot(value)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Feature: batch-screen, Property 9
// Validates: Requirements 7.5
// ---------------------------------------------------------------------------
describe("Feature: batch-screen, Property 9: Locked ordering of commitment roots", () => {
  // Build an arbitrary SettlementUpdate with independent values per field.
  const settlementUpdate = fc.record<SettlementUpdate>({
    oldStateRoot: rootFieldValue,
    newStateRoot: rootFieldValue,
    depositsRoot: rootFieldValue,
    withdrawalsRoot: rootFieldValue,
    nullifiersRoot: rootFieldValue,
    withdrawOutputsRoot: rootFieldValue,
  });

  const EXPECTED_ORDER: (keyof SettlementUpdate)[] = [
    "depositsRoot",
    "withdrawalsRoot",
    "nullifiersRoot",
    "withdrawOutputsRoot",
  ];

  it("returns exactly 4 entries whose keys follow the locked order, regardless of contents", () => {
    // Validates: Requirements 7.5
    fc.assert(
      fc.property(settlementUpdate, (publicInputs) => {
        const result = selectCommitmentRoots(publicInputs);

        // Exactly 4 entries.
        expect(result).toHaveLength(4);

        // Keys appear in the fixed, deterministic order.
        expect(result.map((entry) => entry.key)).toEqual(EXPECTED_ORDER);
      }),
      { numRuns: 200 }
    );
  });

  it("maps each entry's value to the corresponding field in publicInputs", () => {
    // Validates: Requirements 7.5
    fc.assert(
      fc.property(settlementUpdate, (publicInputs) => {
        const result = selectCommitmentRoots(publicInputs);

        for (const entry of result) {
          expect(entry.value).toBe(publicInputs[entry.key]);
        }
      }),
      { numRuns: 200 }
    );
  });

  it("keeps the ordering invariant even when several roots share identical contents", () => {
    // Validates: Requirements 7.5
    fc.assert(
      fc.property(rootFieldValue, (sharedValue) => {
        const publicInputs: SettlementUpdate = {
          oldStateRoot: sharedValue,
          newStateRoot: sharedValue,
          depositsRoot: sharedValue,
          withdrawalsRoot: sharedValue,
          nullifiersRoot: sharedValue,
          withdrawOutputsRoot: sharedValue,
        };

        const result = selectCommitmentRoots(publicInputs);

        expect(result.map((entry) => entry.key)).toEqual(EXPECTED_ORDER);
        expect(result.every((entry) => entry.value === sharedValue)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });
});
