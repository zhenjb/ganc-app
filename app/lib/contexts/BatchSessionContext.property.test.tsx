import { describe, it, expect } from "vitest";
import { act, renderHook } from "@testing-library/react";
import fc from "fast-check";
import {
  BatchSessionProvider,
  useBatchSession,
} from "@/app/lib/contexts/BatchSessionContext";
import type {
  BatchCommitments,
  Witness,
} from "@/app/lib/interfaces/batch";

/**
 * Property-based tests for the in-memory batch session handoff.
 *
 * Feature: batch-screen, Property 13
 * Validates: Requirements 9.2, 9.4, 10.6
 */

// --- Arbitraries ------------------------------------------------------------

// A single hex character (both cases) — hex values are preserved verbatim, so
// mixing cases guards against any accidental normalization in the session.
const hexCharArb = fc.constantFrom(..."0123456789abcdefABCDEF".split(""));

// A `0x`-prefixed hex string of `byteLength` bytes (2 hex chars per byte).
const hexStringOf = (byteLength: number): fc.Arbitrary<string> =>
  fc
    .array(hexCharArb, {
      minLength: byteLength * 2,
      maxLength: byteLength * 2,
    })
    .map((cs) => `0x${cs.join("")}`);

// A 32-byte root, matching the on-chain 0x + 64 hex layout.
const rootArb = hexStringOf(32);

// `publicInputs` with all 6 settlement roots in the locked field order.
const publicInputsArb = fc.record({
  oldStateRoot: rootArb,
  newStateRoot: rootArb,
  depositsRoot: rootArb,
  withdrawalsRoot: rootArb,
  nullifiersRoot: rootArb,
  withdrawOutputsRoot: rootArb,
});

const commitmentsArb: fc.Arbitrary<BatchCommitments> = fc.record({
  publicInputs: publicInputsArb,
  batchHash: rootArb,
});

// Witness inputs: at least one hex element of varied byte length.
const witnessInputsArb = fc.array(
  fc.integer({ min: 1, max: 48 }).chain(hexStringOf),
  { minLength: 1, maxLength: 8 },
);

// Auxiliary is either a string→string record or null (per the Witness type).
const auxiliaryArb = fc.oneof(
  fc.constant(null),
  fc.dictionary(fc.string(), fc.string(), { maxKeys: 6 }),
);

const witnessArb: fc.Arbitrary<Witness> = fc.record({
  inputs: witnessInputsArb,
  auxiliary: auxiliaryArb,
});

// A BatchBuildResponse-like payload accepted by `setBatch`.
const buildResponseArb = fc.record({
  commitments: commitmentsArb,
  witness: witnessArb,
});

// ---------------------------------------------------------------------------
// Property 13: Handoff session round-trip
// ---------------------------------------------------------------------------
describe("Feature: batch-screen, Property 13: handoff session round-trip", () => {
  it("returns commitments and witness deep-equal to the written values with stale === false", () => {
    // Validates: Requirements 9.2, 9.4
    // Reuse a single hook instance and run many setBatch calls through it; this
    // exercises the round-trip far faster than re-rendering per sample while
    // still proving the latest write wins.
    const { result } = renderHook(() => useBatchSession(), {
      wrapper: BatchSessionProvider,
    });

    fc.assert(
      fc.property(buildResponseArb, ({ commitments, witness }) => {
        act(() => {
          result.current.setBatch({ commitments, witness });
        });

        // The session hands back exactly what was written...
        expect(result.current.commitments).toEqual(commitments);
        expect(result.current.witness).toEqual(witness);
        // ...and a freshly built batch is never stale.
        expect(result.current.stale).toBe(false);
      }),
      { numRuns: 200 },
    );
  });

  it("clears a previously stale flag whenever setBatch stores a fresh batch", () => {
    // Validates: Requirements 10.6
    // Even if the session was marked stale before, a fresh setBatch must reset
    // stale to false (the inverse direction of the markStale transition).
    const { result } = renderHook(() => useBatchSession(), {
      wrapper: BatchSessionProvider,
    });

    fc.assert(
      fc.property(buildResponseArb, ({ commitments, witness }) => {
        // Force a stale state first.
        act(() => {
          result.current.markStale();
        });
        expect(result.current.stale).toBe(true);

        // A fresh build clears stale and stores the new values.
        act(() => {
          result.current.setBatch({ commitments, witness });
        });

        expect(result.current.stale).toBe(false);
        expect(result.current.commitments).toEqual(commitments);
        expect(result.current.witness).toEqual(witness);
      }),
      { numRuns: 100 },
    );
  });

  it("flips stale to true after markStale once a batch is present", () => {
    // Validates: Requirements 10.6
    // Complementary check: markStale after a setBatch reports the batch as
    // out of sync without discarding the stored commitments/witness.
    const { result } = renderHook(() => useBatchSession(), {
      wrapper: BatchSessionProvider,
    });

    fc.assert(
      fc.property(buildResponseArb, ({ commitments, witness }) => {
        act(() => {
          result.current.setBatch({ commitments, witness });
        });
        expect(result.current.stale).toBe(false);

        act(() => {
          result.current.markStale();
        });

        expect(result.current.stale).toBe(true);
        // Stored data survives a stale transition.
        expect(result.current.commitments).toEqual(commitments);
        expect(result.current.witness).toEqual(witness);
      }),
      { numRuns: 100 },
    );
  });
});
