// =============================================================================
// Response adapters — normalize backend JSON into the FE interface shapes.
// -----------------------------------------------------------------------------
// The FE was authored against the mock backend contract (app/api/*), whose
// field names differ from the real ganc-sys backend:
//
//   deposit  : real {depositId, owner}          vs FE {id, depositor}
//   withdraw : real {withdrawId, owner, claimed} vs FE {id, ..., status}
//   wrappers : real {depositRecord|withdrawRequest|withdrawRecord}
//              vs FE {deposit|request}
//
// These adapters are TOLERANT: they read the real-backend field first and fall
// back to the FE/mock field, so a single call site works against BOTH backends.
// All fields are coerced to safe defaults ("" / {} / null) so a missing field
// can never crash a downstream `.slice()` / `.amount` / `Object.entries()`.
// =============================================================================

import type { DepositRecord } from "@/app/lib/interfaces/deposit";
import type { WithdrawRecord } from "@/app/lib/interfaces/withdraw";
import type { AppState } from "@/app/lib/interfaces/state";
import type {
  BatchCommitments,
  SettlementUpdate,
} from "@/app/lib/interfaces/batch";

type Raw = Record<string, unknown>;

/** Coerce an unknown value into a plain record ({} when not an object). */
function asRaw(v: unknown): Raw {
  return v !== null && typeof v === "object" ? (v as Raw) : {};
}

/** First non-nullish value coerced to string; "" when all are nullish. */
function str(...vals: unknown[]): string {
  for (const v of vals) {
    if (v === undefined || v === null) continue;
    return typeof v === "string" ? v : String(v);
  }
  return "";
}

/**
 * Normalize a deposit record from either backend.
 * Real: {depositId, owner, denom, amount, txHash, createdHeight}.
 * Mock: {id, depositor, denom, amount, txHash, createdAt}.
 */
export function normalizeDeposit(input: unknown): DepositRecord {
  const r = asRaw(input);
  return {
    id: str(r.depositId, r.id),
    depositor: str(r.owner, r.depositor),
    amount: str(r.amount),
    denom: str(r.denom),
    txHash: str(r.txHash),
    createdAt: str(r.createdAt),
  };
}

/**
 * Normalize a withdraw record/request from either backend.
 * Real record : {withdrawId, owner, destination, denom, amount, nullifier, claimed}.
 * Real request: {withdrawId, owner, destination, denom, amount, nonce, signature}.
 * Mock        : {id, destination, destinationHash, denom, amount, nullifier, status, createdAt}.
 * `status` is derived from the real `claimed` flag when the mock `status` is absent.
 */
export function normalizeWithdraw(input: unknown): WithdrawRecord {
  const r = asRaw(input);

  let status: WithdrawRecord["status"];
  if (typeof r.status === "string") {
    status = r.status as WithdrawRecord["status"];
  } else if (r.claimed === true) {
    status = "claimed";
  } else if (r.claimed === false) {
    status = "processed";
  } else {
    status = "pending";
  }

  return {
    id: str(r.withdrawId, r.id),
    destination: str(r.destination),
    destinationHash: str(r.destinationHash),
    amount: str(r.amount),
    denom: str(r.denom),
    nullifier: str(r.nullifier),
    status,
    createdAt: str(r.createdAt),
    claimedAt: r.claimedAt == null ? null : str(r.claimedAt),
  };
}

/**
 * Normalize batch commitments into the FE shape `{ publicInputs: {6 roots},
 * batchHash }`. The real backend splits the 6 roots across two fields — old/new
 * stateRoot live on the SettlementUpdate, the other 4 roots are FLAT on the
 * BatchCommitments (depositsRoot/withdrawalsRoot/nullifiersRoot/
 * withdrawOutputsRoot) and there is no `publicInputs`/`batchHash`. The mock
 * backend already nests all 6 under `publicInputs`. This reads whichever is
 * present (nested first, then flat + settlement) so the card never crashes on a
 * missing `publicInputs`.
 */
function normalizeBatchCommitments(
  rawCommitments: unknown,
  rawSettlement: unknown
): BatchCommitments | null {
  if (rawCommitments == null) return null;
  const c = asRaw(rawCommitments);
  const s = asRaw(rawSettlement);
  const pi = c.publicInputs != null ? asRaw(c.publicInputs) : {};
  const publicInputs: SettlementUpdate = {
    oldStateRoot: str(pi.oldStateRoot, s.oldStateRoot),
    newStateRoot: str(pi.newStateRoot, s.newStateRoot),
    depositsRoot: str(pi.depositsRoot, c.depositsRoot),
    withdrawalsRoot: str(pi.withdrawalsRoot, c.withdrawalsRoot),
    nullifiersRoot: str(pi.nullifiersRoot, c.nullifiersRoot),
    withdrawOutputsRoot: str(pi.withdrawOutputsRoot, c.withdrawOutputsRoot),
  };
  return { publicInputs, batchHash: str(c.batchHash) };
}

/** Normalize a value that may be a single record, an array, or null. */
function normalizeWithdrawList(
  input: unknown
): WithdrawRecord | WithdrawRecord[] | null {
  if (input == null) return null;
  if (Array.isArray(input)) return input.map(normalizeWithdraw);
  return normalizeWithdraw(input);
}

/**
 * Normalize the full /api/state payload.
 * Top-level names already match between backends, but the NESTED deposit /
 * withdraw records diverge — those are normalized here. Maps are forced to {}
 * so BalanceTable's `Object.entries()` can never receive null/undefined.
 */
export function normalizeState(input: unknown): AppState {
  const r = asRaw(input);
  return {
    mode: r.mode === "mock" ? "mock" : "local",
    currentStateRoot:
      r.currentStateRoot == null ? null : str(r.currentStateRoot),
    userBalances: asRaw(r.userBalances) as Record<string, string>,
    moduleAccountBalance: asRaw(r.moduleAccountBalance) as Record<
      string,
      string
    >,
    depositStatus:
      (r.depositStatus as AppState["depositStatus"]) ?? "none",
    withdrawStatus:
      (r.withdrawStatus as AppState["withdrawStatus"]) ?? "none",
    proofStatus: (r.proofStatus as AppState["proofStatus"]) ?? "idle",
    batchStatus: (r.batchStatus as AppState["batchStatus"]) ?? "none",
    latestDeposit:
      r.latestDeposit == null ? null : normalizeDeposit(r.latestDeposit),
    latestWithdrawRequest:
      r.latestWithdrawRequest == null
        ? null
        : normalizeWithdraw(r.latestWithdrawRequest),
    latestSettlement:
      (r.latestSettlement as AppState["latestSettlement"]) ?? null,
    latestBatchCommitments: normalizeBatchCommitments(
      r.latestBatchCommitments,
      r.latestSettlement,
    ),
    latestProof: (r.latestProof as AppState["latestProof"]) ?? null,
    latestWithdrawRecords: normalizeWithdrawList(r.latestWithdrawRecords),
  };
}
