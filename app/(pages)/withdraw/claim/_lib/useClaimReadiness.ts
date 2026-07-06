"use client";

import { useEffect, useRef, useState } from "react";
import {
  getWithdrawSettlementStatus,
  type WithdrawSettlementStatus,
} from "@/app/lib/services/api";

const POLL_INTERVAL_MS = 5000;

/**
 * Polls the on-chain settlement status of each withdraw id so the claim page
 * can gate the Claim button: a withdraw is only claimable once the operator's
 * settlement sequencer has submitted the batch containing it (the on-chain
 * record then exists). Until then the row shows "Pending settlement".
 *
 * Polling runs every 5s and stops once every id is resolved to a terminal
 * state (claimable/claimed), so the button flips to enabled automatically
 * shortly after settlement without a manual refresh.
 */
export function useClaimReadiness(
  ids: string[]
): Map<string, WithdrawSettlementStatus> {
  const [statuses, setStatuses] = useState<
    Map<string, WithdrawSettlementStatus>
  >(new Map());

  // Stable primitive dependency so the effect only re-subscribes when the set
  // of ids actually changes (not on every parent render).
  const key = ids.filter(Boolean).slice().sort().join(",");
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const idList = key ? key.split(",") : [];
    // No ids → nothing to poll. Don't setState synchronously here (there are no
    // rows consuming the map); the async poll below is the only writer.
    if (idList.length === 0) {
      return;
    }

    const ctrl = new AbortController();

    const poll = async (): Promise<boolean> => {
      const entries = await Promise.all(
        idList.map(
          async (id) =>
            [
              id,
              await getWithdrawSettlementStatus(id, { signal: ctrl.signal }),
            ] as const
        )
      );
      if (!mountedRef.current) return true;
      setStatuses(new Map(entries));
      // Keep polling while anything is still pending/unknown.
      return entries.every(([, s]) => s === "claimable" || s === "claimed");
    };

    let timer: ReturnType<typeof setTimeout> | null = null;
    const tick = async () => {
      const done = await poll();
      if (!mountedRef.current || done) return;
      timer = setTimeout(tick, POLL_INTERVAL_MS);
    };
    void tick();

    return () => {
      mountedRef.current = false;
      ctrl.abort();
      if (timer) clearTimeout(timer);
    };
  }, [key]);

  return statuses;
}
