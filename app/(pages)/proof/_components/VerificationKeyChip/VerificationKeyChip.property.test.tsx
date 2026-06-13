import { describe, it, expect } from "vitest";
import { render, cleanup } from "@testing-library/react";
import fc from "fast-check";
import { VerificationKeyChip } from "@/app/(pages)/proof/_components/VerificationKeyChip/VerificationKeyChip";

/**
 * Property-based test for VerificationKeyChip verbatim rendering.
 *
 * Feature: proof-screen, Property 5
 * Validates: Requirements 6.7
 *
 * Property 5: For any non-empty verificationKeyId string, the
 * VerificationKeyChip SHALL render the string verbatim without truncation
 * or modification.
 */

// Arbitrary non-empty strings of varying length and content.
const nonEmptyStringArb = fc.string({ minLength: 1, maxLength: 100 });

describe("Feature: proof-screen, Property 5: VerificationKeyChip verbatim rendering", () => {
  it("renders any non-empty keyId string verbatim without truncation or modification", () => {
    // Validates: Requirements 6.7
    fc.assert(
      fc.property(nonEmptyStringArb, (keyId) => {
        const { container } = render(<VerificationKeyChip keyId={keyId} />);
        try {
          // The chip span contains the keyId — locate it specifically by class
          // (SCSS modules mangle names, so query by the second <span> in the component)
          const spans = container.querySelectorAll("span");
          // The component renders: <span class="label"> + <span class="chip">
          // The chip is the second span.
          const chipSpan = spans[1];

          expect(chipSpan).toBeDefined();
          // The text content of the chip must be exactly the input — no truncation,
          // no case change, no prefix/suffix.
          expect(chipSpan.textContent).toBe(keyId);
        } finally {
          cleanup();
        }
      }),
      { numRuns: 200 },
    );
  });
});
