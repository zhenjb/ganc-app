import { describe, it, expect } from "vitest";
import { render, cleanup, within } from "@testing-library/react";
import fc from "fast-check";
import { PublicInputsTable } from "@/app/(pages)/proof/_components/PublicInputsTable/PublicInputsTable";
import { PUBLIC_INPUT_LABELS } from "@/app/constants/zkInputs";

/**
 * Property-based test for PublicInputsTable order preservation.
 *
 * Feature: proof-screen, Property 4
 * Validates: Requirements 6.5
 *
 * Property 4: For any valid publicInputs array of 6 HexString elements, the
 * PublicInputsTable rendered output SHALL display the values in the exact fixed
 * order defined by PUBLIC_INPUT_LABELS: [oldStateRoot, newStateRoot,
 * depositsRoot, withdrawalsRoot, nullifiersRoot, withdrawOutputsRoot].
 */

// Arbitrary hex string generator — produces "0x" prefixed strings of varying lengths.
const hexCharArb = fc.constantFrom(
  ..."0123456789abcdef".split("")
);

const hexStringArb = fc
  .array(hexCharArb, { minLength: 2, maxLength: 64 })
  .map((chars) => `0x${chars.join("")}`);

// Always generate exactly 6-element arrays to match PUBLIC_INPUT_LABELS length.
const publicInputs6Arb = fc.tuple(
  hexStringArb,
  hexStringArb,
  hexStringArb,
  hexStringArb,
  hexStringArb,
  hexStringArb
);

describe("Feature: proof-screen, Property 4: PublicInputsTable order preservation", () => {
  it("renders labels in the exact fixed order of PUBLIC_INPUT_LABELS for any 6-element hex array", () => {
    // Validates: Requirements 6.5
    fc.assert(
      fc.property(publicInputs6Arb, (tuple) => {
        const publicInputs = [...tuple];

        const { container } = render(
          <PublicInputsTable publicInputs={publicInputs} invalid={false} />
        );
        try {
          // Scope to <tbody> to exclude the header row
          const tbody = container.querySelector("tbody");
          expect(tbody).not.toBeNull();

          const rows = within(tbody!).getAllByRole("row");

          // Must have exactly 6 data rows
          expect(rows).toHaveLength(6);

          rows.forEach((row, index) => {
            const cells = within(row).getAllByRole("cell");

            // Column 0: Index — should be the numeric index
            expect(cells[0]).toHaveTextContent(String(index));

            // Column 1: Label — must match PUBLIC_INPUT_LABELS[i] in order
            expect(cells[1]).toHaveTextContent(PUBLIC_INPUT_LABELS[index]);
          });
        } finally {
          cleanup();
        }
      }),
      { numRuns: 100 }
    );
  });
});
