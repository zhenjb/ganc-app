import type { HexString } from "./state";

export interface WithdrawRequest {
  id: string;
  destination: string;
  destinationHash: HexString;
  amount: string;
  denom: string;
  nullifier: HexString;
}

export interface WithdrawRecord extends WithdrawRequest {
  status: "pending" | "processed" | "claimed" | "rejected";
  createdAt: string;
  claimedAt?: string | null;
}

export interface WithdrawRequestInput {
  destination: string;
  destinationHash: HexString;
  amount: string;
  denom: string;
}

export interface WithdrawRequestResponse {
  request: WithdrawRecord;
}

export interface WithdrawClaimInput {
  nullifier: HexString;
  destination: string;
}

export interface WithdrawClaimResponse {
  txHash: HexString;
  claimedAt: string;
}

/**
 * Response body for `GET /api/withdraws` — paginated withdraw history.
 */
export interface WithdrawListResponse {
  withdraws: WithdrawRecord[];
}
