"use client";

import { useCallback, useEffect, useState } from "react";
import { getDeposits } from "@/app/lib/services/api";
import type { DepositHistoryEntry } from "@/app/(pages)/wallet/_types";

export interface UseDepositHistoryReturn {
  /** Entries fetched from the backend (persisted across reloads). */
  remoteEntries: DepositHistoryEntry[];
  /** Whether the initial fetch is in progress. */
  loading: boolean;
  /** Whether the fetch failed (normalized — never exposes raw error text). */
  fetchError: boolean;
  /** Re-fetch the deposit history from the backend. */
  refetch: () => Promise<void>;
}

/**
 * Fetches the persisted deposit history from `GET /api/deposits`.
 * Automatically fires on mount. Call `refetch()` after a new deposit to update.
 */
export function useDepositHistory(): UseDepositHistoryReturn {
  const [remoteEntries, setRemoteEntries] = useState<DepositHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  const fetchHistory = useCallback(async () => {
    setFetchError(false);
    try {
      const { deposits } = await getDeposits();
      const entries: DepositHistoryEntry[] = deposits.map((deposit) => ({
        deposit,
        timestamp: deposit.createdAt || new Date().toISOString(),
      }));
      setRemoteEntries(entries);
    } catch {
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return { remoteEntries, loading, fetchError, refetch: fetchHistory };
}
