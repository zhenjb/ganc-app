import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fc from "fast-check";
import { renderHook, act, cleanup } from "@testing-library/react";
import { useProofGenerate } from "@/app/(pages)/proof/_lib/useProofGenerate";
import { postProofGenerate } from "@/app/lib/services/api";
import { ApiError } from "@/app/lib/interfaces/api";
import type { ProofBundle, ProofGenerateInput } from "@/app/lib/interfaces/proof";

/**
 * Property-based tests for useProofGenerate hook (FE-07).
 *
 * Feature: proof-screen
 *   Property 3 — Failure preserves existing proofBundle
 *
 * **Validates: Requirements 5.3**
 *
 * The property asserts that for ANY existing proofBundle state and any API
 * failure (error or timeout), after the failure the proofBundle value in hook
 * state SHALL remain identical to the value before the call was made.
 */

vi.mock("@/app/lib/services/api", () => ({
  postProofGenerate: vi.fn(),
}));

const mockedPostProofGenerate = vi.mocked(postProofGenerate);

beforeEach(() => {
  mockedPostProofGenerate.mockReset();
});

afterEach(() => {
  cleanup();
});

// --- Arbitraries ------------------------------------------------------------

// Generate a valid hex string that won't be treated as "empty proof"
const validProofArb: fc.Arbitrary<string> = fc
  .hexaString({ minLength: 3, maxLength: 64 })
  .map((s) => `0x${s}`);

// Generate a hex-like string for public inputs
const hexArb: fc.Arbitrary<string> = fc
  .hexaString({ minLength: 4, maxLength: 64 })
  .map((s) => `0x${s}`);

// Generate a valid 6-element publicInputs tuple
const publicInputsArb: fc.Arbitrary<
  [string, string, string, string, string, string]
> = fc.tuple(hexArb, hexArb, hexArb, hexArb, hexArb, hexArb);

// Generate a valid ProofBundle that would be successfully stored by the hook
const validProofBundleArb: fc.Arbitrary<ProofBundle> = fc.record({
  proof: validProofArb,
  publicInputs: publicInputsArb,
  verificationKeyId: fc.string({ minLength: 1, maxLength: 20 }),
});

// Generate an API failure type: either a generic error or a timeout (aborted)
const apiFailureArb: fc.Arbitrary<ApiError> = fc.oneof(
  fc.constant(new ApiError("Internal Server Error", 500, false)),
  fc.constant(new ApiError("Internal Server Error", 500, true)),
  fc.nat({ max: 5 }).map(
    (n) =>
      new ApiError(
        "Internal Server Error",
        [400, 403, 404, 500, 502, 503][n],
        false,
      ),
  ),
);

// Minimal valid input to call generate()
const INPUT: ProofGenerateInput = {
  settlementUpdate: {
    oldStateRoot: "0x01",
    newStateRoot: "0x02",
    depositsRoot: "0x03",
    withdrawalsRoot: "0x04",
    nullifiersRoot: "0x05",
    withdrawOutputsRoot: "0x06",
  },
  batchCommitments: {
    publicInputs: {
      oldStateRoot: "0x01",
      newStateRoot: "0x02",
      depositsRoot: "0x03",
      withdrawalsRoot: "0x04",
      nullifiersRoot: "0x05",
      withdrawOutputsRoot: "0x06",
    },
    batchHash: "0xhash",
  },
  witness: {
    inputs: ["0xabc"],
  },
};

// --- Property 3 -------------------------------------------------------------

describe("useProofGenerate — Property 3: Failure preserves existing proofBundle", () => {
  // Feature: proof-screen, Property 3
  // **Validates: Requirements 5.3**
  it("proofBundle is preserved after API error for any existing bundle", async () => {
    await fc.assert(
      fc.asyncProperty(
        validProofBundleArb,
        apiFailureArb,
        async (bundle, error) => {
          // Step 1: Mock a successful response to establish the proofBundle
          mockedPostProofGenerate.mockResolvedValueOnce({
            proofBundle: bundle,
            state: { proofStatus: "generated" },
          });

          const refresh = vi.fn().mockResolvedValue(undefined);
          const { result, unmount } = renderHook(() =>
            useProofGenerate({ refresh }),
          );

          // Generate successfully to populate proofBundle in hook state
          await act(async () => {
            await result.current.generate(INPUT);
          });

          // Verify bundle was stored
          expect(result.current.proofBundle).toEqual(bundle);
          const bundleBefore = result.current.proofBundle;

          // Step 2: Mock the next call to throw an API error
          mockedPostProofGenerate.mockRejectedValueOnce(error);

          // Call generate again — this time it will fail
          await act(async () => {
            await result.current.generate(INPUT);
          });

          // Step 3: Assert proofBundle is unchanged after failure
          expect(result.current.proofBundle).toEqual(bundleBefore);
          expect(result.current.proofBundle).toEqual(bundle);
          // Confirm error state is flagged
          expect(result.current.error).toBe(true);
          expect(result.current.proofStatus).toBe("idle");

          // Cleanup the hook to avoid leaks between iterations
          unmount();
        },
      ),
      { numRuns: 50 },
    );
  });

  // Feature: proof-screen, Property 3
  // **Validates: Requirements 5.3**
  it("proofBundle remains null after failure when no prior bundle exists", async () => {
    await fc.assert(
      fc.asyncProperty(apiFailureArb, async (error) => {
        mockedPostProofGenerate.mockRejectedValueOnce(error);

        const refresh = vi.fn().mockResolvedValue(undefined);
        const { result, unmount } = renderHook(() =>
          useProofGenerate({ refresh }),
        );

        // Initial state: proofBundle is null
        expect(result.current.proofBundle).toBeNull();

        // Call generate — it will fail
        await act(async () => {
          await result.current.generate(INPUT);
        });

        // proofBundle should still be null (not overwritten)
        expect(result.current.proofBundle).toBeNull();
        expect(result.current.error).toBe(true);
        expect(result.current.proofStatus).toBe("idle");

        // Cleanup the hook to avoid leaks between iterations
        unmount();
      }),
      { numRuns: 30 },
    );
  });
});
