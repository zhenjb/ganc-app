import { describe, it, expect } from "vitest";
import fc from "fast-check";
import type { WithdrawRecord } from "@/app/lib/interfaces/withdraw";
import type { HexString } from "@/app/lib/interfaces/state";
import { hasPendingRequest } from "./WithdrawRequestScreen";

// Arbitrary for generating valid WithdrawRecord objects with varying statuses.
// The status field is the only one that affects the CTA predicate.
const withdrawRecordArb: fc.Arbitrary<WithdrawRecord> = fc.record({
  id: fc.uuid(),
  destination: fc
    .stringOf(fc.constantFrom(..."abcdefghijklmnopqrstuvwxyz0123456789".split("")), {
      minLength: 38,
      maxLength: 50,
    })
    .map((suffix) => "cosmos1" + suffix),
  destinationHash: fc
    .hexaString({ minLength: 64, maxLength: 64 })
    .map((h) => `0x${h}` as HexString),
  amount: fc.nat({ max: 1000000 }).map((n) => String(n + 1)),
  denom: fc.constant("uusdc"),
  nullifier: fc
    .hexaString({ minLength: 64, maxLength: 64 })
    .map((h) => `0x${h}` as HexString),
  status: fc.constantFrom(
    "pending" as const,
    "processed" as const,
    "claimed" as const,
    "rejected" as const
  ),
  createdAt: fc.date().map((d) => d.toISOString()),
});

describe("Feature: withdraw-request-screen, Property 6: CTA enabled iff pending requests exist", () => {
  /**
   * **Validates: Requirements 6.2, 6.3**
   *
   * For any array of WithdrawRecord objects, hasPendingRequest returns true if
   * and only if at least one record has status === "pending".
   */
  it("hasPendingRequest is true iff at least one record is pending", () => {
    fc.assert(
      fc.property(fc.array(withdrawRecordArb), (records) => {
        const expected = records.some((r) => r.status === "pending");
        expect(hasPendingRequest(records)).toBe(expected);
      }),
      { numRuns: 100 }
    );
  });
});
