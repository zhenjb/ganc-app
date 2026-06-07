import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  validateBatchBuildInput,
  buildMockBatchResponse,
} from "@/app/api/batch/build/route";
import type { SettlementUpdate } from "@/app/lib/interfaces/batch";
import type { AppState } from "@/app/lib/interfaces/state";

/**
 * Property-based tests for the POST /api/batch/build mock route (FE-06).
 *
 * Feature: batch-screen
 *   Property 14 — Classification of valid/invalid mock-route input
 *                 (validateBatchBuildInput)
 *   Property 15 — Mock response builder produces a schema-correct response
 *                 (buildMockBatchResponse)
 *
 * Each property is checked against an independent oracle derived directly
 * from the specification (design.md Properties 14 & 15, Requirements 13.1-13.6),
 * not from the implementation, so the test catches an implementation that
 * drifts from the spec.
 */

// Locked key order of SettlementUpdate (Req 13.4 / 2.12).
const LOCKED_ROOT_ORDER: Array<keyof SettlementUpdate> = [
  "oldStateRoot",
  "newStateRoot",
  "depositsRoot",
  "withdrawalsRoot",
  "nullifiersRoot",
  "withdrawOutputsRoot",
];

// A 0x-prefixed 32-byte hex root, i.e. matches /^0x[0-9a-fA-F]{64}$/.
const ROOT_RE = /^0x[0-9a-fA-F]{64}$/;
// A 0x-prefixed non-empty hex string, i.e. matches /^0x[0-9a-fA-F]+$/.
const HEX_RE = /^0x[0-9a-fA-F]+$/;

// ---------------------------------------------------------------------------
// Property 14: validateBatchBuildInput classification
// ---------------------------------------------------------------------------

/**
 * Independent oracle for the request-body classification, derived from the
 * spec rather than the implementation:
 *  - "valid"   iff body is an object with both id fields being string arrays
 *              AND the total element count is >= 1.
 *  - "empty"   iff both fields are string arrays but both are empty.
 *  - "invalid" otherwise.
 */
function classify(body: unknown): "valid" | "empty" | "invalid" {
  if (typeof body !== "object" || body === null) {
    return "invalid";
  }
  const record = body as Record<string, unknown>;
  const dep = record.pendingDepositIds;
  const wd = record.pendingWithdrawIds;
  const depOk = Array.isArray(dep) && dep.every((x) => typeof x === "string");
  const wdOk = Array.isArray(wd) && wd.every((x) => typeof x === "string");
  if (!depOk || !wdOk) {
    return "invalid";
  }
  if ((dep as string[]).length === 0 && (wd as string[]).length === 0) {
    return "empty";
  }
  return "valid";
}

// Arbitraries that, together, exercise every classification class.
const stringArrayArb = fc.array(fc.string(), { maxLength: 5 });
const nonEmptyStringArrayArb = fc.array(fc.string(), {
  minLength: 1,
  maxLength: 5,
});

// A value that is generally NOT a string array (used for invalid bodies).
const notAStringArrayArb = fc.oneof(
  fc.integer(),
  fc.boolean(),
  fc.constant(null),
  fc.string(),
  fc.array(fc.integer(), { minLength: 1, maxLength: 5 }),
  fc.array(fc.oneof(fc.string(), fc.integer()), { minLength: 1, maxLength: 5 }),
  fc.dictionary(fc.string(), fc.string()),
);

// Bodies that should classify as "valid": both string arrays, total >= 1.
const validBodyArb = fc.oneof(
  fc.record({
    pendingDepositIds: nonEmptyStringArrayArb,
    pendingWithdrawIds: stringArrayArb,
  }),
  fc.record({
    pendingDepositIds: stringArrayArb,
    pendingWithdrawIds: nonEmptyStringArrayArb,
  }),
);

// The single "empty" body.
const emptyBodyArb = fc.constant({
  pendingDepositIds: [] as string[],
  pendingWithdrawIds: [] as string[],
});

// Bodies that should (almost always) classify as "invalid". The oracle is the
// single source of truth, so any branch that accidentally yields a valid/empty
// body is still asserted correctly.
const invalidBodyArb = fc.oneof(
  // Non-object bodies.
  fc.integer(),
  fc.boolean(),
  fc.constant(null),
  fc.string(),
  fc.array(fc.string(), { maxLength: 4 }),
  // Missing one or both fields.
  fc.record({ pendingDepositIds: stringArrayArb }),
  fc.record({ pendingWithdrawIds: stringArrayArb }),
  fc.record({ foo: fc.string() }),
  // One field is not a string array.
  fc.record({
    pendingDepositIds: notAStringArrayArb,
    pendingWithdrawIds: stringArrayArb,
  }),
  fc.record({
    pendingDepositIds: stringArrayArb,
    pendingWithdrawIds: notAStringArrayArb,
  }),
  // Arrays containing non-string elements.
  fc.record({
    pendingDepositIds: fc.array(fc.integer(), { minLength: 1, maxLength: 5 }),
    pendingWithdrawIds: stringArrayArb,
  }),
);

const bodyArb = fc.oneof(validBodyArb, emptyBodyArb, invalidBodyArb);

describe("validateBatchBuildInput (Property 14)", () => {
  // Feature: batch-screen, Property 14
  // Validates: Requirements 13.1, 13.2, 13.3
  it("classifies arbitrary bodies exactly as the spec oracle", () => {
    fc.assert(
      fc.property(bodyArb, (body) => {
        const expected = classify(body);
        const result = validateBatchBuildInput(body);

        expect(result.kind).toBe(expected);

        // For valid bodies, the echoed input must equal the source arrays.
        if (expected === "valid") {
          const source = body as {
            pendingDepositIds: string[];
            pendingWithdrawIds: string[];
          };
          expect(result).toEqual({
            kind: "valid",
            input: {
              pendingDepositIds: source.pendingDepositIds,
              pendingWithdrawIds: source.pendingWithdrawIds,
            },
          });
        }
      }),
      { numRuns: 300 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 15: buildMockBatchResponse schema
// ---------------------------------------------------------------------------

// A 0x-prefixed 32-byte hex root (lowercase) for the AppState root.
const hexRootArb = fc
  .hexaString({ minLength: 64, maxLength: 64 })
  .map((h) => `0x${h}`);

// A minimal but type-correct AppState carrying an arbitrary currentStateRoot.
// buildMockBatchResponse only reads currentStateRoot; the rest is filler.
const appStateArb: fc.Arbitrary<AppState> = hexRootArb.map((root) => ({
  mode: "mock",
  currentStateRoot: root,
  userBalances: {},
  moduleAccountBalance: {},
  depositStatus: "none",
  withdrawStatus: "none",
  proofStatus: "idle",
  batchStatus: "none",
}));

describe("buildMockBatchResponse (Property 15)", () => {
  // Feature: batch-screen, Property 15
  // Validates: Requirements 13.4, 13.5, 13.6
  it("produces a schema-correct BatchBuildResponse for any AppState", () => {
    fc.assert(
      fc.property(appStateArb, (state) => {
        const response = buildMockBatchResponse(state);
        const publicInputs = response.commitments.publicInputs;

        // Locked key order of the 6 roots (Req 13.4).
        expect(Object.keys(publicInputs)).toEqual(LOCKED_ROOT_ORDER);

        const roots = LOCKED_ROOT_ORDER.map((key) => publicInputs[key]);

        // Each root matches the 32-byte hex shape (Req 13.4).
        for (const root of roots) {
          expect(root).toMatch(ROOT_RE);
        }

        // The 6 roots are pairwise distinct (Req 13.4).
        expect(new Set(roots).size).toBe(6);

        // oldStateRoot is taken verbatim from the app state (Req 13.4).
        expect(publicInputs.oldStateRoot).toBe(state.currentStateRoot);

        // batchHash matches the 32-byte hex shape (Req 13.5).
        expect(response.commitments.batchHash).toMatch(ROOT_RE);

        // witness.inputs is non-empty and each element is a 0x hex string
        // (Req 13.6).
        expect(response.witness.inputs.length).toBeGreaterThanOrEqual(1);
        for (const input of response.witness.inputs) {
          expect(input).toMatch(HEX_RE);
        }

        // witness.auxiliary has at least one key containing "secret" (Req 13.6).
        const auxKeys = Object.keys(response.witness.auxiliary ?? {});
        const hasSecretKey = auxKeys.some((key) =>
          key.toLowerCase().includes("secret"),
        );
        expect(hasSecretKey).toBe(true);
      }),
      { numRuns: 200 },
    );
  });
});
