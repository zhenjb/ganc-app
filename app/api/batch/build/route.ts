import { NextResponse } from "next/server";
import { mockState } from "@/app/api/_mock/state";
import type {
  BatchBuildInput,
  BatchBuildResponse,
  BatchCommitments,
  SettlementUpdate,
  Witness,
} from "@/app/lib/interfaces/batch";
import type { AppState } from "@/app/lib/interfaces/state";

/**
 * Classification of a parsed request body for POST /api/batch/build.
 *
 * - `valid`   → both id arrays are string arrays and the total length is >= 1.
 * - `empty`   → both id arrays are string arrays but both are empty.
 * - `invalid` → anything else (missing field, not an array, non-string element).
 */
export type BatchBuildValidation =
  | { kind: "valid"; input: BatchBuildInput }
  | { kind: "empty" }
  | { kind: "invalid" };

/** Type guard: value is an array whose elements are all strings. */
function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

/**
 * Pure validator for the batch build request body.
 *
 * Never mutates `mockState`; the caller decides the HTTP response based on the
 * returned classification.
 */
export function validateBatchBuildInput(body: unknown): BatchBuildValidation {
  if (typeof body !== "object" || body === null) {
    return { kind: "invalid" };
  }

  const { pendingDepositIds, pendingWithdrawIds } = body as {
    pendingDepositIds?: unknown;
    pendingWithdrawIds?: unknown;
  };

  // Both fields must be present and be arrays of strings.
  if (!isStringArray(pendingDepositIds) || !isStringArray(pendingWithdrawIds)) {
    return { kind: "invalid" };
  }

  // Both arrays empty → nothing to batch.
  if (pendingDepositIds.length === 0 && pendingWithdrawIds.length === 0) {
    return { kind: "empty" };
  }

  return { kind: "valid", input: { pendingDepositIds, pendingWithdrawIds } };
}

/** Generate a random hex string of `bytes` bytes (no `0x` prefix). */
function randomHex(bytes: number): string {
  const arr = crypto.getRandomValues(new Uint8Array(bytes));
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Pure builder for a mock BatchBuildResponse.
 *
 * Produces a `BatchBuildResponse` whose `commitments.publicInputs` contains the
 * 6 roots in the locked order. `oldStateRoot` is taken from
 * `state.currentStateRoot` (falling back to a generated root only when it is
 * null, which keeps every root matching `^0x[0-9a-fA-F]{64}$`). The other 5
 * roots are generated and guaranteed pairwise distinct from each other and from
 * `oldStateRoot`.
 */
export function buildMockBatchResponse(state: AppState): BatchBuildResponse {
  const oldStateRoot: string = state.currentStateRoot ?? `0x${randomHex(32)}`;

  // Track all roots already used so generated roots stay pairwise distinct.
  const seen = new Set<string>([oldStateRoot]);
  const distinctRoot = (): string => {
    let candidate = `0x${randomHex(32)}`;
    while (seen.has(candidate)) {
      candidate = `0x${randomHex(32)}`;
    }
    seen.add(candidate);
    return candidate;
  };

  const publicInputs: SettlementUpdate = {
    oldStateRoot,
    newStateRoot: distinctRoot(),
    depositsRoot: distinctRoot(),
    withdrawalsRoot: distinctRoot(),
    nullifiersRoot: distinctRoot(),
    withdrawOutputsRoot: distinctRoot(),
  };

  const commitments: BatchCommitments = {
    publicInputs,
    batchHash: `0x${randomHex(32)}`,
  };

  // At least one input plus an auxiliary entry whose key contains "secret"
  // so the witness masking behaviour can be exercised downstream.
  const witness: Witness = {
    inputs: [`0x${randomHex(32)}`, `0x${randomHex(16)}`],
    auxiliary: {
      userSecret: "mock-user-secret",
      nonce: "1",
    },
  };

  return { commitments, witness };
}

/**
 * POST /api/batch/build
 *
 * Mock route handler that simulates building a batch from the selected pending
 * deposits/withdrawals. Validates input, builds a schema-correct
 * `BatchBuildResponse`, and mutates the in-memory `mockState`.
 */
export async function POST(request: Request): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    // Parse failure → 400, no mutation.
    return NextResponse.json({ error: "invalid input" }, { status: 400 });
  }

  const validation = validateBatchBuildInput(body);

  if (validation.kind === "invalid") {
    // Missing field / not an array / non-string element → 400, no mutation.
    return NextResponse.json({ error: "invalid input" }, { status: 400 });
  }

  if (validation.kind === "empty") {
    // Both arrays empty → 400, no mutation.
    return NextResponse.json({ error: "no batch inputs" }, { status: 400 });
  }

  const response = buildMockBatchResponse(mockState);

  // Mutate mockState to reflect the new batch lifecycle.
  mockState.batchStatus = "pending";
  mockState.proofStatus = "idle";
  mockState.batchCommitments = response.commitments;

  return NextResponse.json(response, { status: 200 });
}
