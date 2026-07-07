import { request } from "@/app/lib/services/http";
import {
  toAppState,
  toDepositRecord,
  toWithdrawRecord,
  type BackendAppState,
  type BackendDepositRecord,
  type BackendWithdrawRecord,
} from "@/app/lib/services/stateAdapter";
import type { AppState } from "@/app/lib/interfaces/state";
import type {
  DepositInput,
  DepositResponse,
  DepositLookupResponse,
  DepositRecord,
} from "@/app/lib/interfaces/deposit";
import type {
  WithdrawRequestInput,
  WithdrawRequestResponse,
  WithdrawRecord,
  WithdrawClaimInput,
  WithdrawClaimResponse,
} from "@/app/lib/interfaces/withdraw";

export interface CallOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
}

export async function getState(opts?: CallOptions): Promise<AppState> {
  // The backend `/api/state` shape differs from the FE `AppState` contract
  // (flat balances, renamed record fields, split batch data). Normalize it
  // through the adapter so the dashboard never receives an undefined `balances`
  // or mis-shaped record. See stateAdapter.ts for the field mapping.
  const raw = await request<BackendAppState>("/api/state", {
    method: "GET",
    ...opts,
  });
  return toAppState(raw);
}

/**
 * Backend `POST /api/deposit` response (ganc-sys/pkg/types/api.go) returns
 * `{ txHash, depositRecord, state }`. The internal mock route instead returns
 * an already-FE-shaped `{ deposit }`; both are accepted below.
 */
interface BackendDepositResponse {
  txHash?: string;
  depositRecord?: BackendDepositRecord | null;
  deposit?: DepositRecord | null;
}

export async function postDeposit(
  input: DepositInput,
  opts?: CallOptions
): Promise<DepositResponse> {
  // The real backend expects `owner`; the mock route expects `depositor`. Send
  // both (Go's decoder ignores unknown fields) so the same call works against
  // either, and normalize whichever response shape comes back.
  const body = {
    owner: input.depositor,
    depositor: input.depositor,
    denom: input.denom,
    amount: input.amount,
  };
  const raw = await request<BackendDepositResponse>("/api/deposit", {
    method: "POST",
    body: JSON.stringify(body),
    ...opts,
  });

  // Mock route: already FE-shaped — pass through.
  if (raw.deposit != null) {
    return { deposit: raw.deposit };
  }

  // Real backend: map the backend record onto the FE `DepositRecord`.
  const deposit = toDepositRecord(raw.depositRecord, raw.txHash);
  return {
    deposit: deposit ?? {
      id: "",
      depositor: input.depositor,
      amount: input.amount,
      denom: input.denom,
      txHash: (raw.txHash ?? "") as DepositRecord["txHash"],
      createdAt: "",
    },
  };
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

/**
 * Backend `POST /api/withdraw-request` response (ganc-sys/pkg/types/api.go)
 * returns `{ withdrawRequest, state }`. The internal mock route instead returns
 * an already-FE-shaped `{ request }`; both are accepted below.
 */
interface BackendWithdrawRequestResponse {
  withdrawRequest?: BackendWithdrawRecord | null;
  request?: WithdrawRecord | null;
}

export async function postWithdrawRequest(
  input: WithdrawRequestInput,
  opts?: CallOptions
): Promise<WithdrawRequestResponse> {
  // The backend requires `owner` (the off-chain balance holder being debited).
  // The FE form's single address field doubles as that holder — it keys the
  // balance lookup `${destination}/${denom}` — so `destination` is the owner.
  // Send `owner` plus the original FE fields (the mock route reads
  // `destination`/`denom`/`amount` and ignores the rest).
  const body = {
    owner: input.destination,
    destination: input.destination,
    destinationHash: input.destinationHash,
    denom: input.denom,
    amount: input.amount,
  };
  const raw = await request<BackendWithdrawRequestResponse>(
    "/api/withdraw-request",
    {
      method: "POST",
      body: JSON.stringify(body),
      ...opts,
    }
  );

  // Mock route: already FE-shaped — pass through.
  if (raw.request != null) {
    return { request: raw.request };
  }

  // Real backend: map the backend record onto the FE `WithdrawRecord`.
  const record = toWithdrawRecord(raw.withdrawRequest);
  return {
    request: record ?? {
      id: "",
      destination: input.destination,
      destinationHash: input.destinationHash,
      amount: input.amount,
      denom: input.denom,
      nullifier: "" as WithdrawRecord["nullifier"],
      status: "pending",
      createdAt: "",
    },
  };
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
