import { request } from "@/app/lib/services/http";
import type { AppState } from "@/app/lib/interfaces/state";
import type {
  DepositInput,
  DepositResponse,
  DepositLookupResponse,
} from "@/app/lib/interfaces/deposit";
import type {
  WithdrawRequestInput,
  WithdrawRequestResponse,
  WithdrawClaimInput,
  WithdrawClaimResponse,
} from "@/app/lib/interfaces/withdraw";

export interface CallOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
}

export function getState(opts?: CallOptions): Promise<AppState> {
  return request<AppState>("/api/state", { method: "GET", ...opts });
}

export function postDeposit(
  input: DepositInput,
  opts?: CallOptions
): Promise<DepositResponse> {
  return request<DepositResponse>("/api/deposit", {
    method: "POST",
    body: JSON.stringify(input),
    ...opts,
  });
}

/**
 * GET /api/deposits/{depositId} — fetch an indexed deposit by id.
 * Used by the wallet-signed flow (FE-14) after broadcasting a real MsgDeposit.
 */
export function getDepositById(
  depositId: string,
  opts?: CallOptions
): Promise<DepositLookupResponse> {
  return request<DepositLookupResponse>(
    `/api/deposits/${encodeURIComponent(depositId)}`,
    { method: "GET", ...opts }
  );
}

export function postWithdrawRequest(
  input: WithdrawRequestInput,
  opts?: CallOptions
): Promise<WithdrawRequestResponse> {
  return request<WithdrawRequestResponse>("/api/withdraw-request", {
    method: "POST",
    body: JSON.stringify(input),
    ...opts,
  });
}

export function postWithdrawClaim(
  input: WithdrawClaimInput,
  opts?: CallOptions
): Promise<WithdrawClaimResponse> {
  return request<WithdrawClaimResponse>("/api/withdraw/claim", {
    method: "POST",
    body: JSON.stringify(input),
    ...opts,
  });
}
