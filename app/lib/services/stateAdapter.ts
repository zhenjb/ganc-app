// =============================================================================
// State adapter (FE-02) — backend DTO → FE AppState
// -----------------------------------------------------------------------------
// The backend (`GET /api/state`, ganc-sys/pkg/types/state.go) returns a state
// shape that differs from the FE `AppState` contract:
//
//   - balances are flat top-level fields (`userBalances`, `moduleAccountBalance`)
//     instead of nested under `balances`, and `moduleAccountBalance` is a
//     per-denom map instead of a single string.
//   - `latestDeposit` uses `depositId`/`owner`/`createdHeight` instead of
//     `id`/`depositor`/`createdAt`.
//   - withdrawals arrive as `latestWithdrawRequest` + `latestWithdrawRecords[]`
//     with a `claimed` boolean instead of a single `latestWithdraw` with a
//     `status` string.
//   - batch data is split across `latestSettlement` (old/new state roots) and
//     `latestBatchCommitments` (the 4 payload roots); there is no `batchHash`.
//
// Consuming the raw response directly crashes the dashboard (e.g.
// `Cannot destructure property 'userBalances' of 'balances'`). This module
// normalizes the backend payload into the FE `AppState` defensively: any
// missing field falls back to a safe default so the UI degrades gracefully
// instead of throwing.
// =============================================================================

import type {
  AppState,
  BalancesResponse,
  Mode,
  HexString,
} from "@/app/lib/interfaces/state";
import type { DepositRecord } from "@/app/lib/interfaces/deposit";
import type { WithdrawRecord } from "@/app/lib/interfaces/withdraw";
import type { BatchCommitments, SettlementUpdate } from "@/app/lib/interfaces/batch";

/** Preferred denom when collapsing the module-account balance map to a string. */
const PREFERRED_DENOM = "uusdc";

// --- Raw backend shapes (only the fields we read) ---------------------------

export interface BackendDepositRecord {
  depositId?: string;
  owner?: string;
  denom?: string;
  amount?: string;
  processed?: boolean;
  createdHeight?: number;
  txHash?: string;
}

export interface BackendWithdrawRecord {
  withdrawId?: string;
  owner?: string;
  denom?: string;
  amount?: string;
  destination?: string;
  destinationHash?: string;
  nullifier?: string;
  claimed?: boolean;
}

interface BackendSettlementUpdate {
  oldStateRoot?: string;
  newStateRoot?: string;
}

interface BackendBatchCommitments {
  depositsRoot?: string;
  withdrawalsRoot?: string;
  nullifiersRoot?: string;
  withdrawOutputsRoot?: string;
}

export interface BackendAppState {
  mode?: string;
  currentStateRoot?: string | null;
  userBalances?: Record<string, string> | null;
  moduleAccountBalance?: Record<string, string> | string | null;

  /**
   * Present only when the payload is already FE-shaped (e.g. the internal
   * `app/api/_mock/state.ts` route). When set, `toAppState` trusts it verbatim
   * instead of reconstructing balances from the flat backend fields.
   */
  balances?: BalancesResponse | null;

  latestDeposit?: BackendDepositRecord | null;
  latestWithdrawRequest?: BackendWithdrawRecord | null;
  latestWithdrawRecords?: BackendWithdrawRecord[] | null;
  latestSettlement?: BackendSettlementUpdate | null;
  latestBatchCommitments?: BackendBatchCommitments | null;

  proofStatus?: string;
  depositStatus?: string;
  withdrawStatus?: string;
  batchStatus?: string;
}

// --- Field mappers ----------------------------------------------------------

/**
 * Collapses the backend module-account balance map (`denom → amount`) into the
 * single decimal string the FE `BalanceTable` expects. Prefers `uusdc`, then
 * the first available denom, then "0". Already-string values pass through.
 */
function pickModuleAccountBalance(
  raw: Record<string, string> | string | null | undefined
): string {
  if (typeof raw === "string") return raw;
  if (raw && typeof raw === "object") {
    if (typeof raw[PREFERRED_DENOM] === "string") return raw[PREFERRED_DENOM];
    const first = Object.values(raw).find((v) => typeof v === "string");
    if (typeof first === "string") return first;
  }
  return "0";
}

function mapBalances(raw: BackendAppState): BalancesResponse {
  return {
    userBalances: raw.userBalances ?? {},
    moduleAccountBalance: pickModuleAccountBalance(raw.moduleAccountBalance),
  };
}

/**
 * Maps a backend deposit record (`depositId`/`owner`/`createdHeight`) onto the
 * FE `DepositRecord` (`id`/`depositor`/`createdAt`). `fallbackTxHash` lets the
 * caller supply the response-level `txHash` when the record itself omits it.
 * Tolerant of missing fields so callers never crash on a partial record.
 */
export function toDepositRecord(
  d: BackendDepositRecord | null | undefined,
  fallbackTxHash?: string
): DepositRecord | null {
  if (d == null) return null;
  return {
    id: d.depositId ?? "",
    depositor: d.owner ?? "",
    amount: d.amount ?? "0",
    denom: d.denom ?? "",
    txHash: (d.txHash ?? fallbackTxHash ?? "") as HexString,
    // Backend exposes `createdHeight` (block height), not an ISO timestamp.
    createdAt: "",
  };
}

/**
 * Maps a backend withdraw record/request (`withdrawId`/`owner`/`claimed`) onto
 * the FE `WithdrawRecord` (`id`/`status`/...). The backend create-request
 * payload omits nullifier/destinationHash, so those default to empty strings.
 * Tolerant of missing fields so callers never crash on a partial record.
 */
export function toWithdrawRecord(
  w: BackendWithdrawRecord | null | undefined
): WithdrawRecord | null {
  if (w == null) return null;
  return {
    id: w.withdrawId ?? "",
    destination: w.destination ?? "",
    destinationHash: (w.destinationHash ?? "") as HexString,
    amount: w.amount ?? "0",
    denom: w.denom ?? "",
    nullifier: (w.nullifier ?? "") as HexString,
    status: w.claimed ? "claimed" : "pending",
    createdAt: "",
  };
}

function mapWithdraw(raw: BackendAppState): WithdrawRecord | null {
  // Prefer the indexed record (carries nullifier + claimed); fall back to the
  // latest request if no records are available.
  const records = raw.latestWithdrawRecords ?? [];
  const w = records.length > 0 ? records[0] : raw.latestWithdrawRequest;
  return toWithdrawRecord(w);
}

function mapBatchCommitments(raw: BackendAppState): BatchCommitments | null {
  const settlement = raw.latestSettlement;
  const commitments = raw.latestBatchCommitments;
  // Only synthesize a batch card when the backend has either piece of data.
  if (settlement == null && commitments == null) return null;

  const publicInputs: SettlementUpdate = {
    oldStateRoot: (settlement?.oldStateRoot ?? "") as HexString,
    newStateRoot: (settlement?.newStateRoot ?? "") as HexString,
    depositsRoot: (commitments?.depositsRoot ?? "") as HexString,
    withdrawalsRoot: (commitments?.withdrawalsRoot ?? "") as HexString,
    nullifiersRoot: (commitments?.nullifiersRoot ?? "") as HexString,
    withdrawOutputsRoot: (commitments?.withdrawOutputsRoot ?? "") as HexString,
  };

  return {
    publicInputs,
    // Backend does not expose a batch hash; leave empty so the card renders it
    // verbatim (shortenHex passes short strings through unchanged).
    batchHash: "" as HexString,
  };
}

/**
 * Normalizes a raw `GET /api/state` backend payload into the FE `AppState`.
 * Tolerant of missing fields: every branch has a safe fallback so the
 * dashboard never throws on an unexpected/partial response.
 */
export function toAppState(raw: BackendAppState | null | undefined): AppState {
  const safe = raw ?? {};

  // Already FE-shaped (internal mock route): trust it as-is rather than
  // rebuilding from the flat backend fields, which would discard the data.
  if (
    safe.balances != null &&
    typeof safe.balances === "object" &&
    safe.balances.userBalances != null
  ) {
    return safe as unknown as AppState;
  }

  return {
    mode: safe.mode === "mock" ? "mock" : ("real" as Mode),
    currentStateRoot: safe.currentStateRoot ?? null,
    balances: mapBalances(safe),

    depositStatus: (safe.depositStatus ?? "idle") as AppState["depositStatus"],
    withdrawStatus: (safe.withdrawStatus ??
      "idle") as AppState["withdrawStatus"],
    proofStatus: (safe.proofStatus ?? "idle") as AppState["proofStatus"],
    batchStatus: (safe.batchStatus ?? "idle") as AppState["batchStatus"],

    latestDeposit: toDepositRecord(safe.latestDeposit),
    latestWithdraw: mapWithdraw(safe),
    batchCommitments: mapBatchCommitments(safe),
  };
}
