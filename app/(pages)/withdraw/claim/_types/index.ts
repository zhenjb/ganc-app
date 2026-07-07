import type { WithdrawRecord } from "@/app/lib/interfaces/withdraw";

/**
 * Result of a successful claim transaction.
 */
export interface ClaimTxResult {
  txHash: string;
  withdrawRecord: WithdrawRecord;
  userBalances: Record<string, string>;
  moduleAccountBalance: Record<string, string>;
}

/**
 * Per-row state tracking the claim lifecycle for a single WithdrawRecord.
 */
export interface ClaimRowState {
  claiming: boolean;
  result: ClaimTxResult | null;
  error: string | null;
}

/**
 * Return type of the useClaimAction hook.
 */
export interface UseClaimActionReturn {
  /** Per-row state map: withdrawId → ClaimRowState */
  rowStates: Map<string, ClaimRowState>;
  /** Trigger claim for a specific withdrawId */
  claim: (withdrawId: string) => Promise<void>;
  /** Clear error for a specific row (before retry) */
  clearError: (withdrawId: string) => void;
  /** Retry the last failed claim */
  retry: (withdrawId: string) => Promise<void>;
}
