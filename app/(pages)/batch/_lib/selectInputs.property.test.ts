import { describe, it, expect } from "vitest";
import fc from "fast-check";
import type { DepositRecord, WithdrawRecord } from "@/app/lib/interfaces";
import {
  selectAvailableDeposits,
  selectAvailableWithdraws,
} from "@/app/(pages)/batch/_lib/selectInputs";

// Run enough iterations to exercise the dedup / first-occurrence logic across
// many input shapes (fast-check default numRuns is 100; raised here for safety).
const NUM_RUNS = 200;

// Small id pool so collisions between `latest` and `history` happen frequently,
// which is what actually exercises the dedup-by-id behaviour.
const idArb = fc.constantFrom("id-0", "id-1", "id-2", "id-3", "id-4");
const hexArb = fc.hexaString().map((s) => `0x${s}`);
const withdrawStatusArb = fc.constantFrom(
  "pending",
  "processed",
  "claimed",
  "rejected"
) as fc.Arbitrary<WithdrawRecord["status"]>;

const depositRecordArb: fc.Arbitrary<DepositRecord> = fc.record({
  id: idArb,
  depositor: fc.string(),
  amount: fc.bigUint().map((n) => n.toString()),
  denom: fc.string({ minLength: 1, maxLength: 6 }),
  txHash: hexArb,
  createdAt: fc.date().map((d) => d.toISOString()),
});

const withdrawRecordArb: fc.Arbitrary<WithdrawRecord> = fc.record({
  id: idArb,
  destination: fc.string(),
  destinationHash: hexArb,
  amount: fc.bigUint().map((n) => n.toString()),
  denom: fc.string({ minLength: 1, maxLength: 6 }),
  nullifier: hexArb,
  status: withdrawStatusArb,
  createdAt: fc.date().map((d) => d.toISOString()),
});

// `latest` may be a record, null, or undefined (all three branches of the helper).
const latestDepositArb = fc.oneof(
  fc.constant(null),
  fc.constant(undefined),
  depositRecordArb
) as fc.Arbitrary<DepositRecord | null | undefined>;

const latestWithdrawArb = fc.oneof(
  fc.constant(null),
  fc.constant(undefined),
  withdrawRecordArb
) as fc.Arbitrary<WithdrawRecord | null | undefined>;

// Feature: batch-screen, Property 1
// Validates: Requirements 2.1
describe("Property 1: selectAvailableDeposits — union, dedup by id, first occurrence", () => {
  it("dedups by id and keeps the first occurrence in [latest, ...history]", () => {
    fc.assert(
      fc.property(
        latestDepositArb,
        fc.array(depositRecordArb, { maxLength: 12 }),
        (latest, history) => {
          const result = selectAvailableDeposits(latest, history);
          const union = latest ? [latest, ...history] : [...history];
          const unionIds = new Set(union.map((r) => r.id));

          // (a) No two elements share the same id.
          const resultIds = result.map((r) => r.id);
          expect(new Set(resultIds).size).toBe(resultIds.length);

          // (b) Every id in the result exists in the input union.
          for (const record of result) {
            expect(unionIds.has(record.id)).toBe(true);
          }

          // (c) For each id, the kept record is the FIRST occurrence in
          // [latest, ...history] (verified via reference equality).
          for (const record of result) {
            const firstOccurrence = union.find((u) => u.id === record.id);
            expect(record).toBe(firstOccurrence);
          }

          // (d) Completeness: every distinct id in the union is represented.
          expect(new Set(resultIds)).toEqual(unionIds);
        }
      ),
      { numRuns: NUM_RUNS }
    );
  });
});

// Feature: batch-screen, Property 2
// Validates: Requirements 2.2
describe("Property 2: selectAvailableWithdraws — pending only, union, dedup by id, first occurrence", () => {
  it("keeps only pending records, dedups by id, and keeps the first pending occurrence", () => {
    fc.assert(
      fc.property(
        latestWithdrawArb,
        fc.array(withdrawRecordArb, { maxLength: 12 }),
        (latest, history) => {
          const result = selectAvailableWithdraws(latest, history);
          const union = latest ? [latest, ...history] : [...history];
          const pendingUnion = union.filter((r) => r.status === "pending");
          const pendingIds = new Set(pendingUnion.map((r) => r.id));

          // (a) Every element of the result is pending.
          for (const record of result) {
            expect(record.status).toBe("pending");
          }

          // (b) No two elements share the same id.
          const resultIds = result.map((r) => r.id);
          expect(new Set(resultIds).size).toBe(resultIds.length);

          // (c) For each id, the kept record is the FIRST occurrence in
          // [latest, ...history] among pending records (reference equality).
          for (const record of result) {
            const firstPending = pendingUnion.find((u) => u.id === record.id);
            expect(record).toBe(firstPending);
          }

          // (d) Completeness: every distinct pending id is represented exactly once.
          expect(new Set(resultIds)).toEqual(pendingIds);
        }
      ),
      { numRuns: NUM_RUNS }
    );
  });
});
