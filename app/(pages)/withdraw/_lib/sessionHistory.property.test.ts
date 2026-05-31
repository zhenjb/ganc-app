import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fc from "fast-check";
import {
  loadHistory,
  saveHistory,
  appendToHistory,
  STORAGE_KEY,
} from "@/app/(pages)/withdraw/_lib/sessionHistory";
import type { WithdrawRecord } from "@/app/lib/interfaces/withdraw";

/**
 * Property-based tests for the withdraw request session history helpers.
 *
 * Feature: withdraw-request-screen
 *   Property 4 — Session history round-trip (Requirements 5.2, 5.3)
 *   Property 5 — History prepend ordering (Requirement 5.1)
 *
 * These exercise the real sessionStorage provided by the jsdom test
 * environment (vitest is configured with `environment: "jsdom"`), which
 * mirrors production browser behavior. Each run starts from a clean store.
 */

// --- Arbitraries ------------------------------------------------------------

const WITHDRAW_STATUSES = [
  "pending",
  "processed",
  "claimed",
  "rejected",
] as const;

// Hex-encoded "0x..." string, matching the HexString shape used by the API.
const hexString = fc
  .hexaString({ minLength: 0, maxLength: 64 })
  .map((hex) => "0x" + hex);

// Positive-ish decimal amount string (digits only), JSON-serializable.
const amountString = fc
  .bigInt({ min: 0n, max: 10n ** 30n })
  .map((n) => n.toString());

// ISO-8601 timestamp string, constrained to a sane calendar range so that
// `toISOString()` always yields a valid, stable string.
const isoTimestamp = fc
  .date({
    min: new Date("2000-01-01T00:00:00.000Z"),
    max: new Date("2100-01-01T00:00:00.000Z"),
  })
  .map((d) => d.toISOString());

/**
 * Generates a valid, JSON-serializable WithdrawRecord. The optional
 * `claimedAt` field is generated as one of three meaningful shapes:
 *   - absent  (key omitted entirely)
 *   - null    (explicitly null)
 *   - string  (an ISO timestamp)
 * `undefined` values are never assigned so the object survives a
 * JSON.stringify -> JSON.parse round-trip without losing/altering keys.
 */
const withdrawRecord: fc.Arbitrary<WithdrawRecord> = fc
  .record({
    id: fc.uuid(),
    destination: fc.string({ minLength: 1, maxLength: 60 }),
    destinationHash: hexString,
    amount: amountString,
    denom: fc.constantFrom("uusdc", "uatom", "uosmo", "stake"),
    nullifier: hexString,
    status: fc.constantFrom(...WITHDRAW_STATUSES),
    createdAt: isoTimestamp,
    // `undefined` => omit the key, otherwise keep null or an ISO string.
    claimedAt: fc.oneof(
      fc.constant(undefined),
      fc.constant(null),
      isoTimestamp
    ),
  })
  .map(({ claimedAt, ...rest }) => {
    const record: WithdrawRecord = { ...rest };
    if (claimedAt !== undefined) {
      record.claimedAt = claimedAt;
    }
    return record;
  });

const withdrawRecordList = fc.array(withdrawRecord, {
  minLength: 0,
  maxLength: 15,
});

// --- Isolation --------------------------------------------------------------

beforeEach(() => {
  window.sessionStorage.clear();
});

afterEach(() => {
  window.sessionStorage.clear();
});

// ---------------------------------------------------------------------------
// Property 4: Session history round-trip
// ---------------------------------------------------------------------------
describe("Feature: withdraw-request-screen, Property 4: Session history round-trip", () => {
  it("loadHistory() returns an array deep-equal to the array passed to saveHistory()", () => {
    // Validates: Requirements 5.2, 5.3
    fc.assert(
      fc.property(withdrawRecordList, (records) => {
        window.sessionStorage.clear();

        saveHistory(records);
        const restored = loadHistory();

        // Round-trip preserves contents and ordering exactly.
        expect(restored).toEqual(records);
        // History is persisted under the documented storage key.
        expect(window.sessionStorage.getItem(STORAGE_KEY)).not.toBeNull();
      }),
      { numRuns: 200 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 5: History prepend ordering
// ---------------------------------------------------------------------------
describe("Feature: withdraw-request-screen, Property 5: History prepend ordering", () => {
  it("appendToHistory() returns a new array with the record first and prior history following in order", () => {
    // Validates: Requirement 5.1
    fc.assert(
      fc.property(
        withdrawRecordList,
        withdrawRecord,
        (existing, record) => {
          window.sessionStorage.clear();

          // Seed the store with the pre-existing history.
          saveHistory(existing);

          const result = appendToHistory(record);

          // The result is a brand-new array, not a mutation of the input.
          expect(result.length).toBe(existing.length + 1);
          // First element is the newly appended record.
          expect(result[0]).toEqual(record);
          // Remaining elements equal the prior history, preserving order.
          expect(result.slice(1)).toEqual(existing);

          // The persisted state matches the returned array exactly.
          expect(loadHistory()).toEqual(result);
        }
      ),
      { numRuns: 200 }
    );
  });
});
