import type { HexString } from "./state";

/**
 * A persisted deposit record returned by the backend.
 *
 * `amount` is a decimal string (BigInt-safe) per Req 2.11 — never a number,
 * so values larger than `Number.MAX_SAFE_INTEGER` round-trip losslessly.
 */
export interface DepositRecord {
  id: string;
  depositor: string;
  amount: string;
  denom: string;
  txHash: HexString;
  /** ISO 8601 timestamp string. */
  createdAt: string;
}

/**
 * Request body for `POST /api/deposit`.
 */
export interface DepositInput {
  depositor: string;
  amount: string;
  denom: string;
}

/**
 * Response body for `POST /api/deposit`.
 */
export interface DepositResponse {
  deposit: DepositRecord;
}
