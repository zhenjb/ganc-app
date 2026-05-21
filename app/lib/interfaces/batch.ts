import type { HexString } from "./state";

/**
 * Public inputs of a settlement update.
 *
 * The 6 fields MUST appear in this exact order (Req 2.12). Object literal
 * key order is preserved by `JSON.stringify` and by `Object.keys`, so any
 * downstream consumer that serializes or iterates this shape sees the
 * locked order.
 */
export interface SettlementUpdate {
  oldStateRoot: HexString;
  newStateRoot: HexString;
  depositsRoot: HexString;
  withdrawalsRoot: HexString;
  nullifiersRoot: HexString;
  withdrawOutputsRoot: HexString;
}

export interface BatchCommitments {
  /** publicInputs MUST follow the locked field order (Req 2.12). */
  publicInputs: SettlementUpdate;
  batchHash: HexString;
}

export interface Witness {
  inputs: HexString[];
  auxiliary?: Record<string, string> | null;
}

export interface BatchBuildInput {
  pendingDepositIds: string[];
  pendingWithdrawIds: string[];
}

export interface BatchBuildResponse {
  commitments: BatchCommitments;
  witness: Witness;
}

export interface BatchSubmitInput {
  commitments: BatchCommitments;
  proof: HexString;
}

export interface BatchSubmitResponse {
  txHash: HexString;
  newStateRoot: HexString;
}
