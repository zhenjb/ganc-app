"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getWithdrawRequests,
  getWithdraws,
  getWithdrawSettlementStatus,
} from "@/app/lib/services/api";
import type { WithdrawRecord } from "@/app/lib/interfaces/withdraw";

export interface UseWithdrawHistoryReturn {
  /** Withdrawals fetched from the backend (persisted across reloads). */
  remoteEntries: WithdrawRecord[];
  /** Whether the initial fetch is in progress. */
  loading: boolean;
  /** Whether BOTH fetches failed (normalized — never exposes raw error text). */
  fetchError: boolean;
  /** Re-fetch the withdraw history from the backend. */
  refetch: () => Promise<void>;
}

/**
 * Fetches the persisted withdraw history and merges the two backend lists:
 *   - GET /api/withdraw-requests → pending/submitted requests
 *   - GET /api/withdraws         → settled records (claimable/claimed)
 * De-duplicated by id (the settled RECORD wins over the pending REQUEST so the
 * most advanced status is shown), newest first, and — when `owner` is given —
 * filtered to that owner's own withdrawals (destination === owner).
 *
 * This is the withdraw analog of `useDepositHistory`; without it the Withdraw
 * tab's history is session-only and disappears on refresh.
 */
export function useWithdrawHistory(
  owner?: string | null
): UseWithdrawHistoryReturn {
  const [remoteEntries, setRemoteEntries] = useState<WithdrawRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  const fetchHistory = useCallback(async () => {
    setFetchError(false);
    try {
      const [reqRes, recRes] = await Promise.allSettled([
        getWithdrawRequests(),
        getWithdraws(),
      ]);

      // Both endpoints unreachable → surface the error, keep prior entries.
      if (reqRes.status === "rejected" && recRes.status === "rejected") {
        setFetchError(true);
        return;
      }

      const requests =
        reqRes.status === "fulfilled" ? reqRes.value.requests : [];
      const records =
        recRes.status === "fulfilled" ? recRes.value.withdraws : [];

      // Merge by id — insert requests first, then let settled records override
      // (a record carries the claimed/settled status a bare request does not).
      const byId = new Map<string, WithdrawRecord>();
      for (const r of requests) byId.set(r.id, r);
      for (const r of records) byId.set(r.id, r);

      const connected = owner?.trim() ?? "";
      const merged = [...byId.values()]
        .filter((r) => connected === "" || r.destination === connected)
        .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));

      // Reconcile claimed status against the CHAIN. In non-mock modes the FE
      // claims by broadcasting MsgClaimWithdraw directly from the user's wallet
      // (see claimTx.broadcastClaim) — the off-chain store never learns about it,
      // so GET /api/withdraws keeps reporting claimed=false and the Claim button
      // wrongly re-appears after a page refresh (session override is gone). The
      // chain-records probe is the FE's settlement source of truth (the same one
      // the claim gate polls), so use it to upgrade stale rows to "claimed".
      // Only probe rows that still look claimable, and ONLY EVER upgrade (never
      // downgrade) — this leaves mock mode, where the store is authoritative,
      // untouched (its chain probe returns claimed=false, so no override fires).
      const reconciled = await Promise.all(
        merged.map(async (r) => {
          if (r.status === "claimed" || r.status === "rejected") return r;
          const chain = await getWithdrawSettlementStatus(r.id);
          return chain === "claimed" ? { ...r, status: "claimed" as const } : r;
        })
      );

      setRemoteEntries(reconciled);
    } catch {
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }, [owner]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return { remoteEntries, loading, fetchError, refetch: fetchHistory };
}
