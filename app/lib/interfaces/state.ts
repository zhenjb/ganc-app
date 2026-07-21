import type { DepositRecord } from "./deposit";
import type { WithdrawRecord } from "./withdraw";
import type { BatchCommitments, SettlementUpdate } from "./batch";
import type { ProofBundle } from "./proof";

/**
 * Backend operating mode reported by `GET /api/state`.
 *
 * `"local"` — in-process / dev backend (was previously `"real"`).
 * `"mock"`  — frontend-only mock backend served by the route handlers in
 *             `app/api/*` while the real backend is offline.
 */
export type Mode = "mock" | "local";

/**
 * `"none"` is the resting state used by the backend when no transaction of
 * the given kind has been issued yet (Req 6.x). The other variants mirror
 * the on-chain lifecycle.
 */
export type DepositStatus =
  | "none"
  | "pending"
  | "processed"
  | "rejected";
export type WithdrawStatus =
  | "none"
  | "pending"
  | "processed"
  | "claimed"
  | "rejected";
export type ProofStatus = "idle" | "pending" | "generated" | "rejected";
export type BatchStatus =
  | "none"
  | "pending"
  | "submitted"
  | "settled"
  | "rejected";

/**
 * Hex-encoded byte string in `0x...` form.
 *
 * Preserved verbatim from the backend — never lowercased or otherwise
 * normalized at the type layer (Req 2.10).
 */
export type HexString = string;

export interface AppState {
  mode: Mode;
  currentStateRoot: HexString | null;

  /** Map of "{address}/{denom}" → amount (decimal string, BigInt-safe). */
  userBalances: Record<string, string>;
  /** Module account totals, keyed by denom (decimal string, BigInt-safe). */
  moduleAccountBalance: Record<string, string>;

  depositStatus: DepositStatus;
  withdrawStatus: WithdrawStatus;
  proofStatus: ProofStatus;
  batchStatus: BatchStatus;

  latestDeposit?: DepositRecord | null;
  latestWithdrawRequest?: WithdrawRecord | null;
  latestSettlement?: SettlementUpdate | null;
  latestBatchCommitments?: BatchCommitments | null;
  latestProof?: ProofBundle | null;
  latestWithdrawRecords?: WithdrawRecord | WithdrawRecord[] | null;

  /** Available denominations reported by the backend. */
  denoms?: string[];
}
