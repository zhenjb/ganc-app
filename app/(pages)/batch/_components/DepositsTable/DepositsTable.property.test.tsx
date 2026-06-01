import { describe, it, expect } from "vitest";
import { render, cleanup, within } from "@testing-library/react";
import fc from "fast-check";
import { DepositsTable } from "@/app/(pages)/batch/_components/DepositsTable/DepositsTable";
import { formatAmount } from "@/app/lib/services/format";
import type { DepositRecord } from "@/app/lib/interfaces/deposit";

/**
 * Property-based test for the batch-screen DepositsTable.
 *
 * Feature: batch-screen, Property 7
 * Validates: Requirements 6.1, 6.3
 *
 * Property 7 (DepositsTable part): for any array of selected DepositRecord,
 * the table renders exactly one data row per record (Req 6.3) and each row's
 * cells contain `id`, `depositor`, `formatAmount(amount, denom)`, `denom` in
 * that column order (Req 6.1). The header row (thead) is excluded from the
 * data-row count by scoping queries to the <tbody>.
 */

// Safe alphabet for id / depositor / denom so rendered textContent compares
// exactly without whitespace-normalization surprises.
const SAFE_CHARS =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".split("");

const safeString = (minLength: number, maxLength: number) =>
  fc
    .array(fc.constantFrom(...SAFE_CHARS), { minLength, maxLength })
    .map((chars) => chars.join(""));

// Decimal-string amount (BigInt-safe) — never a number (Req 6.5 territory).
const amountArb = fc.bigUint().map(String);

// Short denom strings, e.g. "ETH", "USDC".
const denomArb = safeString(1, 6);

// A single DepositRecord. txHash/createdAt are not rendered by the table but
// are part of the type, so we fill them with plausible values.
const depositRecordArb: fc.Arbitrary<DepositRecord> = fc.record({
  id: safeString(1, 10),
  depositor: safeString(1, 12),
  amount: amountArb,
  denom: denomArb,
  txHash: safeString(1, 16).map((s) => `0x${s}`),
  createdAt: fc.constant("2024-01-01T00:00:00.000Z"),
});

// Arrays of records. Cap the length to keep render-per-sample runs fast.
const depositRecordsArb = fc.array(depositRecordArb, {
  minLength: 1,
  maxLength: 5,
});

describe("Feature: batch-screen, Property 7: DepositsTable renders correct rows and ordered columns", () => {
  it("renders exactly one data row per record with cells id, depositor, formatAmount(amount, denom), denom in order", () => {
    // Validates: Requirements 6.1, 6.3
    fc.assert(
      fc.property(depositRecordsArb, (records) => {
        // Ensure unique React keys (deposit.id is used as key); duplicate ids
        // only emit console warnings, but keeping them unique keeps assertions
        // robust regardless of generation.
        const deposits: DepositRecord[] = records.map((record, index) => ({
          ...record,
          id: `${record.id}-${index}`,
        }));

        const { container } = render(<DepositsTable deposits={deposits} />);
        try {
          // Scope to <tbody> so the thead header row never counts as data.
          const tbody = container.querySelector("tbody");
          const rows = tbody ? within(tbody).queryAllByRole("row") : [];

          // Req 6.3: one data row per selected record.
          expect(rows).toHaveLength(deposits.length);

          rows.forEach((row, index) => {
            const record = deposits[index];
            const cells = within(row).getAllByRole("cell");

            // Req 6.1: four columns in the locked order.
            expect(cells).toHaveLength(4);
            expect(cells[0]).toHaveTextContent(record.id);
            expect(cells[1]).toHaveTextContent(record.depositor);
            expect(cells[2]).toHaveTextContent(
              formatAmount(record.amount, record.denom)
            );
            expect(cells[3]).toHaveTextContent(record.denom);
          });
        } finally {
          // Reset the DOM between fast-check samples to avoid duplicate roots.
          cleanup();
        }
      }),
      { numRuns: 150 }
    );
  });

  it("renders zero data rows for an empty deposits array (row count equals length)", () => {
    // Validates: Requirements 6.3
    const { container } = render(<DepositsTable deposits={[]} />);
    try {
      const tbody = container.querySelector("tbody");
      const rows = tbody ? within(tbody).queryAllByRole("row") : [];
      expect(rows).toHaveLength(0);
    } finally {
      cleanup();
    }
  });
});
