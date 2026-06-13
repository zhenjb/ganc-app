import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { validateProofBundle } from "@/app/(pages)/proof/_lib/validate";
import type { ProofBundle } from "@/app/lib/interfaces/proof";

/**
 * Property-based tests for validateProofBundle (FE-07).
 *
 * Feature: proof-screen
 *   Property 1 — validateProofBundle consistency
 *
 * Validates: Requirements 3.1, 3.2, 3.3
 *
 * The property asserts that for ANY generated ProofBundle-like object,
 * `valid === (!emptyProof && !invalidInputs)` always holds. An independent
 * oracle is derived directly from the spec, not from the implementation.
 */

// --- Arbitraries ------------------------------------------------------------

// Generate a hex-like string (may include "", "0x", or non-empty values).
const hexArb: fc.Arbitrary<string> = fc.oneof(
  fc.constant(""),
  fc.constant("0x"),
  fc.string({ minLength: 1, maxLength: 66 }).map((s) => `0x${s}`),
  fc.string({ minLength: 1, maxLength: 32 }),
);

// Generate publicInputs as an arbitrary-length array of hex strings (0–10).
// The type says tuple of 6, but we cast to exercise the length check.
const publicInputsArb: fc.Arbitrary<string[]> = fc.array(hexArb, {
  minLength: 0,
  maxLength: 10,
});

// Generate a full ProofBundle-like object with arbitrary fields.
const proofBundleArb: fc.Arbitrary<ProofBundle> = fc.record({
  proof: hexArb,
  publicInputs: publicInputsArb as fc.Arbitrary<
    [string, string, string, string, string, string]
  >,
  verificationKeyId: fc.string({ minLength: 0, maxLength: 20 }),
});

// --- Property 1 -------------------------------------------------------------

describe("validateProofBundle (Property 1)", () => {
  // Feature: proof-screen, Property 1
  // Validates: Requirements 3.1, 3.2, 3.3
  it("valid === (!emptyProof && !invalidInputs) for any ProofBundle", () => {
    fc.assert(
      fc.property(proofBundleArb, (bundle) => {
        const result = validateProofBundle(bundle);

        // Independent oracle derived from the spec:
        const expectedEmptyProof = !bundle.proof || bundle.proof === "0x";
        const expectedInvalidInputs = bundle.publicInputs.length !== 6;
        const expectedValid = !expectedEmptyProof && !expectedInvalidInputs;

        // Assert each field matches the oracle
        expect(result.emptyProof).toBe(expectedEmptyProof);
        expect(result.invalidInputs).toBe(expectedInvalidInputs);
        expect(result.valid).toBe(expectedValid);

        // Core property: valid is exactly the conjunction
        expect(result.valid).toBe(!result.emptyProof && !result.invalidInputs);
      }),
      { numRuns: 500 },
    );
  });

  // Feature: proof-screen, Property 1
  // Validates: Requirements 3.1
  it("emptyProof is true when proof is '' or '0x'", () => {
    fc.assert(
      fc.property(
        fc.constantFrom("", "0x"),
        publicInputsArb,
        fc.string({ minLength: 0, maxLength: 10 }),
        (proof, inputs, keyId) => {
          const bundle = {
            proof,
            publicInputs: inputs,
            verificationKeyId: keyId,
          } as unknown as ProofBundle;

          const result = validateProofBundle(bundle);
          expect(result.emptyProof).toBe(true);
          expect(result.valid).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: proof-screen, Property 1
  // Validates: Requirements 3.2
  it("invalidInputs is true when publicInputs.length !== 6", () => {
    fc.assert(
      fc.property(
        // Generate arrays with length !== 6
        fc.array(hexArb, { minLength: 0, maxLength: 10 }).filter(
          (arr) => arr.length !== 6,
        ),
        fc.string({ minLength: 3, maxLength: 66 }),
        fc.string({ minLength: 0, maxLength: 10 }),
        (inputs, proof, keyId) => {
          const bundle = {
            proof,
            publicInputs: inputs,
            verificationKeyId: keyId,
          } as unknown as ProofBundle;

          const result = validateProofBundle(bundle);
          expect(result.invalidInputs).toBe(true);
          expect(result.valid).toBe(false);
        },
      ),
      { numRuns: 200 },
    );
  });

  // Feature: proof-screen, Property 1
  // Validates: Requirements 3.3
  it("valid is true only when proof is non-empty and publicInputs has 6 elements", () => {
    fc.assert(
      fc.property(
        // Non-empty proof that is not "0x"
        fc.string({ minLength: 3, maxLength: 66 }).filter(
          (s) => s !== "0x" && s !== "",
        ),
        // Exactly 6 inputs
        fc.array(hexArb, { minLength: 6, maxLength: 6 }),
        fc.string({ minLength: 0, maxLength: 10 }),
        (proof, inputs, keyId) => {
          const bundle = {
            proof,
            publicInputs: inputs,
            verificationKeyId: keyId,
          } as unknown as ProofBundle;

          const result = validateProofBundle(bundle);
          expect(result.emptyProof).toBe(false);
          expect(result.invalidInputs).toBe(false);
          expect(result.valid).toBe(true);
        },
      ),
      { numRuns: 200 },
    );
  });
});
