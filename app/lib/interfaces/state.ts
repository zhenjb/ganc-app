import type { DepositRecord } from "./deposit";
import type { WithdrawRecord } from "./withdraw";
import type { BatchCommitments } from "./batch";

export type Mode = "mock" | "real";

export type DepositStatus = "idle" | "pending" | "processed" | "rejected";
export type WithdrawStatus =
  | "idle"
  | "pending"
  | "processed"
  | "claimed"
  | "rejected";
export type ProofStatus = "idle" | "pending" | "generated" | "rejected";
export type BatchStatus =
  | "idle"
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

export interface BalancesResponse {
  /** Map of user address → amount (decimal string). */
  userBalances: Record<string, string>;
  /** Module account total (decimal string). */
  moduleAccountBalance: string;
}

export interface AppState {
  mode: Mode;
  currentStateRoot: HexString | null;
  balances: BalancesResponse;

  depositStatus: DepositStatus;
  withdrawStatus: WithdrawStatus;
  proofStatus: ProofStatus;
  batchStatus: BatchStatus;

  latestDeposit?: DepositRecord | null;
  latestWithdraw?: WithdrawRecord | null;
  batchCommitments?: BatchCommitments | null;
}
