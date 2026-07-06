import { request, getApiBaseUrl } from "@/app/lib/services/http";
import {
  normalizeState,
  normalizeDeposit,
  normalizeWithdraw,
} from "@/app/lib/services/adapters";
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

export async function getState(opts?: CallOptions): Promise<AppState> {
  const raw = await request<unknown>("/api/state", { method: "GET", ...opts });
  return normalizeState(raw);
}

export async function postDeposit(
  input: DepositInput,
  opts?: CallOptions
): Promise<DepositResponse> {
  // Send BOTH field-name variants so one body works against either backend:
  // real ganc-sys reads `owner`, the mock route reads `depositor`. Extra keys
  // are ignored by both.
  const body = {
    owner: input.depositor,
    depositor: input.depositor,
    denom: input.denom,
    amount: input.amount,
  };
  const raw = await request<Record<string, unknown>>("/api/deposit", {
    method: "POST",
    body: JSON.stringify(body),
    ...opts,
  });
  // Unwrap real `depositRecord` or mock `deposit`, then normalize the record.
  return { deposit: normalizeDeposit(raw.depositRecord ?? raw.deposit ?? raw) };
}

/**
 * GET /api/deposits/{depositId} — fetch an indexed deposit by id.
 * Used by the wallet-signed flow (FE-14) after broadcasting a real MsgDeposit.
 */
export async function getDepositById(
  depositId: string,
  opts?: CallOptions
): Promise<DepositLookupResponse> {
  const raw = await request<Record<string, unknown>>(
    `/api/deposits/${encodeURIComponent(depositId)}`,
    { method: "GET", ...opts }
  );
  return { deposit: normalizeDeposit(raw.depositRecord ?? raw.deposit ?? raw) };
}

export async function postWithdrawRequest(
  input: WithdrawRequestInput,
  opts?: CallOptions
): Promise<WithdrawRequestResponse> {
  // Real ganc-sys requires `owner`; for a self-withdraw the owner is the
  // destination account. `destinationHash` is a mock-only field (ignored by
  // the real backend). Sending all keys keeps a single body valid on both.
  const body = {
    owner: input.destination,
    destination: input.destination,
    destinationHash: input.destinationHash,
    denom: input.denom,
    amount: input.amount,
  };
  const raw = await request<Record<string, unknown>>("/api/withdraw-request", {
    method: "POST",
    body: JSON.stringify(body),
    ...opts,
  });
  // Unwrap real `withdrawRequest` or mock `request`, then normalize.
  return {
    request: normalizeWithdraw(raw.withdrawRequest ?? raw.request ?? raw),
  };
}

/**
 * Settlement readiness of a withdraw, derived from the on-chain record:
 *  - "pending_settlement": no on-chain record yet (operator hasn't settled the
 *    batch containing it) — claiming now would fail with "withdraw not found".
 *  - "claimable": on-chain record exists and is not yet claimed.
 *  - "claimed": already claimed on-chain.
 *  - "unknown": transient error / endpoint unreachable — treated as not-ready.
 */
export type WithdrawSettlementStatus =
  | "pending_settlement"
  | "claimable"
  | "claimed"
  | "unknown";

/**
 * GET /api/chain/withdraw-records/{withdrawId} — the "is it settled yet?" probe.
 * Uses a raw fetch (not `request`) because a 404 is a normal state, not an
 * error: the backend returns 404 until the sequencer settles the batch on-chain.
 */
export async function getWithdrawSettlementStatus(
  withdrawId: string,
  opts?: CallOptions
): Promise<WithdrawSettlementStatus> {
  const url = `${getApiBaseUrl()}/api/chain/withdraw-records/${encodeURIComponent(
    withdrawId
  )}`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "GET",
      cache: "no-store",
      signal: opts?.signal,
    });
  } catch {
    return "unknown";
  }
  if (res.status === 404) return "pending_settlement";
  if (!res.ok) return "unknown";
  try {
    const body = (await res.json()) as {
      withdrawRecord?: { claimed?: boolean };
      claimed?: boolean;
    };
    const claimed = body?.withdrawRecord?.claimed ?? body?.claimed ?? false;
    return claimed ? "claimed" : "claimable";
  } catch {
    return "unknown";
  }
}

export async function postWithdrawClaim(
  input: WithdrawClaimInput,
  opts?: CallOptions
): Promise<WithdrawClaimResponse> {
  const raw = await request<Record<string, unknown>>("/api/withdraw/claim", {
    method: "POST",
    body: JSON.stringify(input),
    ...opts,
  });
  const record = normalizeWithdraw(raw.withdrawRecord ?? raw.record ?? raw);
  return {
    txHash: String(raw.txHash ?? ""),
    claimedAt: record.claimedAt ?? String(raw.claimedAt ?? ""),
  };
}
