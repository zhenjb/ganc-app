import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { POST } from "@/app/api/withdraw-request/route";
import { mockState } from "@/app/api/_mock/state";
import type { WithdrawRecord } from "@/app/lib/interfaces/withdraw";

/**
 * Property-based tests for the withdraw request mock route handler.
 *
 * Feature: withdraw-request-screen
 *   Property 7 — Mock handler returns valid response for valid input
 *               (Requirements 7.1, 7.3)
 *   Property 8 — Mock handler rejects invalid input
 *               (Requirement 7.2)
 *
 * The handler under test lives at `app/api/withdraw-request/route.ts` and
 * exports `POST(request: Request): Promise<NextResponse>`. Tests run under
 * vitest's jsdom environment with `NODE_ENV !== "production"`, so the
 * production 404 guard never triggers. `crypto.randomUUID` /
 * `crypto.getRandomValues` are provided by the Node 18+ test runtime.
 */

// --- Shared regexes ---------------------------------------------------------

// Cosmos address: "cosmos1" followed by >= 38 lowercase alphanumeric chars.
const COSMOS_RE = /^cosmos1[a-z0-9]{38,}$/;
// destinationHash / nullifier: "0x" + 64 lowercase hex chars (32 bytes).
const HEX64_RE = /^0x[0-9a-f]{64}$/;
// UUID v4 shape produced by crypto.randomUUID().
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const LOWER_ALNUM = "abcdefghijklmnopqrstuvwxyz0123456789".split("");
const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

// --- Helpers ----------------------------------------------------------------

/**
 * Mirrors the handler's amount validation: a value is "valid" iff it is a
 * non-empty string that BigInt() parses into a strictly positive integer.
 * Used as a filter safety net so generated "invalid" amounts are guaranteed
 * to actually be rejected by the handler.
 */
function isPositiveBigIntString(value: string): boolean {
  if (value == null || value.trim() === "") return false;
  try {
    return BigInt(value) > 0n;
  } catch {
    return false;
  }
}

/** Builds the POST Request exactly as the frontend would send it. */
function makeRequest(input: unknown): Request {
  return new Request("http://localhost/api/withdraw-request", {
    method: "POST",
    body: JSON.stringify(input),
    headers: { "content-type": "application/json" },
  });
}

// --- Arbitraries: valid components -----------------------------------------

// Always matches COSMOS_RE: "cosmos1" + 38..60 lowercase alphanumeric chars.
const validDestination = fc
  .array(fc.constantFrom(...LOWER_ALNUM), { minLength: 38, maxLength: 60 })
  .map((chars) => "cosmos1" + chars.join(""));

// Strictly positive integer string (digits only), always BigInt > 0.
const validAmount = fc
  .bigInt({ min: 1n, max: 10n ** 30n })
  .map((n) => n.toString());

// Non-empty, non-whitespace denom.
const validDenom = fc.oneof(
  fc.constantFrom("USDT", "uatom", "uosmo", "stake"),
  fc.string({ minLength: 1, maxLength: 12 }).filter((s) => s.trim() !== ""),
);

// --- Arbitraries: invalid components ---------------------------------------

// Destinations that never match COSMOS_RE (bad prefix, uppercase, too short).
const invalidDestination = fc
  .oneof(
    // Arbitrary noise (almost never matches the cosmos shape).
    fc.string(),
    // Correct prefix but too short (< 38 trailing chars).
    fc
      .array(fc.constantFrom(...LOWER_ALNUM), { minLength: 0, maxLength: 37 })
      .map((chars) => "cosmos1" + chars.join("")),
    // Correct prefix but uppercase tail (violates [a-z0-9]).
    fc
      .array(fc.constantFrom(...UPPER), { minLength: 38, maxLength: 50 })
      .map((chars) => "cosmos1" + chars.join("")),
    // Explicit bad-prefix / empty cases.
    fc.constantFrom("", "cosmos", "Cosmos1", "bcosmos1", "osmo1abc", "cosmos2x"),
  )
  .filter((s) => !COSMOS_RE.test(s));

// Amounts that never parse as a positive BigInt (zero, negative, decimal,
// non-numeric, empty/whitespace).
const invalidAmount = fc
  .oneof(
    fc.constant("0"),
    fc.bigInt({ min: 1n, max: 10n ** 24n }).map((n) => "-" + n.toString()),
    fc
      .tuple(
        fc.bigInt({ min: 0n, max: 10n ** 12n }),
        fc.bigInt({ min: 1n, max: 10n ** 12n }),
      )
      .map(([whole, frac]) => `${whole}.${frac}`),
    fc.string(),
    fc.constantFrom("", " ", "abc", "12abc", "NaN", "1e3", "+", "-"),
  )
  .filter((s) => !isPositiveBigIntString(s));

// Empty or whitespace-only denom (rejected by `!denom || denom.trim() === ""`).
const invalidDenom = fc.constantFrom("", " ", "  ", "\t", "\n", "   ");

// --- Arbitraries: full request bodies --------------------------------------

const validInput = fc.record({
  destination: validDestination,
  destinationHash: fc.constant("0x"),
  amount: validAmount,
  denom: validDenom,
});

// Each variant violates exactly one rule while keeping the others valid, so
// the handler's rejection is unambiguously attributable to that rule. This is
// a strict subset of "violates at least one rule".
const invalidInput = fc.oneof(
  // Bad destination, valid amount + denom.
  fc.record({
    destination: invalidDestination,
    destinationHash: fc.constant("0x"),
    amount: validAmount,
    denom: validDenom,
  }),
  // Valid destination, bad amount, valid denom.
  fc.record({
    destination: validDestination,
    destinationHash: fc.constant("0x"),
    amount: invalidAmount,
    denom: validDenom,
  }),
  // Valid destination + amount, empty/whitespace denom.
  fc.record({
    destination: validDestination,
    destinationHash: fc.constant("0x"),
    amount: validAmount,
    denom: invalidDenom,
  }),
);

// ---------------------------------------------------------------------------
// Property 7: Mock handler returns valid response for valid input
// ---------------------------------------------------------------------------
describe("Feature: withdraw-request-screen, Property 7: Mock handler returns valid response for valid input", () => {
  it("returns 200 with a fully-formed WithdrawRecord and mutates mockState", async () => {
    // Validates: Requirements 7.1, 7.3
    await fc.assert(
      fc.asyncProperty(validInput, async (input) => {
        const res = await POST(makeRequest(input));

        expect(res.status).toBe(200);

        const json = (await res.json()) as { request: WithdrawRecord };
        const record = json.request;

        // Generated identity fields.
        expect(typeof record.id).toBe("string");
        expect(record.id).toMatch(UUID_RE);
        expect(record.nullifier).toMatch(HEX64_RE);
        expect(record.destinationHash).toMatch(HEX64_RE);

        // Echoed input fields.
        expect(record.destination).toBe(input.destination);
        expect(record.amount).toBe(input.amount);
        expect(record.denom).toBe(input.denom);

        // Fixed status + valid ISO timestamp.
        expect(record.status).toBe("pending");
        expect(typeof record.createdAt).toBe("string");
        expect(new Date(record.createdAt).toISOString()).toBe(record.createdAt);

        // Side effects: mockState reflects the generated record.
        expect(mockState.withdrawStatus).toBe("pending");
        expect(mockState.latestWithdrawRequest).toEqual(record);
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 8: Mock handler rejects invalid input
// ---------------------------------------------------------------------------
describe("Feature: withdraw-request-screen, Property 8: Mock handler rejects invalid input", () => {
  it("returns 400 with { error: \"invalid input\" } for any rule-violating body", async () => {
    // Validates: Requirement 7.2
    await fc.assert(
      fc.asyncProperty(invalidInput, async (input) => {
        const res = await POST(makeRequest(input));

        expect(res.status).toBe(400);

        const json = await res.json();
        expect(json).toEqual({ error: "invalid input" });
      }),
      { numRuns: 100 },
    );
  });
});
