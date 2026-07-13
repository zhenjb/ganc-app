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
  createdAt: string;
  /** Whether the deposit was successfully processed by the backend. */
  processed: boolean;
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

/**
 * Response body for `GET /api/deposits/{depositId}` (FE-14).
 * Used after a wallet-signed deposit has been indexed by the backend.
 */
export interface DepositLookupResponse {
  deposit: DepositRecord;
}

/**
 * Response body for `GET /api/deposits` — paginated deposit history.
 */
export interface DepositListResponse {
  deposits: DepositRecord[];
}
