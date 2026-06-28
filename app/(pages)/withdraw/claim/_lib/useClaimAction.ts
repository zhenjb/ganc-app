"use client";

import { useCallback, useRef, useState } from "react";
import type { WithdrawRecord } from "@/app/lib/interfaces/withdraw";
import type { Mode } from "@/app/lib/interfaces/state";
import type {
  ClaimRowState,
  ClaimTxResult,
  UseClaimActionReturn,
} from "../_types";
import { broadcastClaim } from "./claimTx";

export interface UseClaimActionOptions {
  records: WithdrawRecord[];
  mode: Mode;
  refresh: () => Promise<void>;
}

/**
 * Detect user-rejected wallet signing from error message.
 * Matches the same pattern used in claimTx.ts.
 */
function isUserReject(err: unknown): boolean {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    return msg.includes("rejected");
  }
  return false;
}

/**
 * Small delay helper for mock mode simulation.
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Per-row claim action hook for the Claim screen (FE-09).
 *
 * Guarantees:
 *   - Each row is independently claimable; concurrent claims on different rows
 *     are allowed.
 *   - A single in-flight guard per withdrawId prevents duplicate broadcasts
 *     (Req 2.2).
 *   - Mock mode produces deterministic txHash="0xmockclaimwithdraw" (Req 6.1, 6.2).
 *   - Real mode calls broadcastClaim() → refresh() → builds result (Req 2.1).
 *   - User rejection → "Transaction cancelled"; other errors → "Internal Server Error"
 *     (Req 5.1, 5.2).
 *   - `retry(id)` clears the error then re-triggers claim (Req 5.3, 5.4).
 */
export function useClaimAction(
  options: UseClaimActionOptions,
): UseClaimActionReturn {
  const { records, mode, refresh } = options;

  const [rowStates, setRowStates] = useState<Map<string, ClaimRowState>>(
    () => new Map(),
  );

  // Per-row in-flight guards. React state is async, so a ref-based Map is the
  // authoritative gate for the single-in-flight invariant per row (Req 2.2).
  const inFlightRef = useRef<Map<string, boolean>>(new Map());

  // Keep latest records/refresh in refs so the claim callback stays stable.
  const recordsRef = useRef(records);
  recordsRef.current = records;
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  /**
   * Helper to update a single row's state immutably, triggering a re-render.
   */
  const setRowState = useCallback(
    (withdrawId: string, patch: ClaimRowState) => {
      setRowStates((prev) => {
        const next = new Map(prev);
        next.set(withdrawId, patch);
        return next;
      });
    },
    [],
  );

  const claim = useCallback(
    async (withdrawId: string): Promise<void> => {
      // Single in-flight guard per row
      if (inFlightRef.current.get(withdrawId)) return;
      inFlightRef.current.set(withdrawId, true);

      // 1. Set claiming state
      setRowState(withdrawId, { claiming: true, result: null, error: null });

      try {
        let result: ClaimTxResult;

        if (mode === "mock") {
          // 2a. Mock mode: simulate locally with deterministic output
          await delay(500);
          const record = recordsRef.current.find((r) => r.id === withdrawId);
          if (!record) {
            throw new Error(`Record not found: ${withdrawId}`);
          }
          result = {
            txHash: "0xmockclaimwithdraw",
            withdrawRecord: {
              ...record,
              status: "claimed",
              claimedAt: new Date().toISOString(),
            },
            userBalances: { [`${record.destination}/USDT`]: "940" },
            moduleAccountBalance: { USDT: "60" },
          };
        } else {
          // 2b. Real mode: connect wallet and broadcast on-chain
          const { connectWallet } = await import(
            "@/app/lib/services/wallet"
          );
          const connection = await connectWallet();
          const { txHash } = await broadcastClaim(
            withdrawId,
            connection.address,
          );

          // 3. Refresh state to get fresh balances
          await refreshRef.current();

          // 4. Build result from refreshed records
          const record = recordsRef.current.find((r) => r.id === withdrawId);
          result = {
            txHash,
            withdrawRecord: {
              ...(record as WithdrawRecord),
              status: "claimed",
              claimedAt: new Date().toISOString(),
            },
            userBalances: {},
            moduleAccountBalance: {},
          };
        }

        // 5. Success
        setRowState(withdrawId, { claiming: false, result, error: null });

        // In mock mode, fire a background refresh to sync context
        if (mode === "mock") {
          void refreshRef.current().catch(() => {});
        }
      } catch (err) {
        // 6. Error handling
        if (isUserReject(err)) {
          setRowState(withdrawId, {
            claiming: false,
            result: null,
            error: "Transaction cancelled",
          });
        } else {
          setRowState(withdrawId, {
            claiming: false,
            result: null,
            error: "Internal Server Error",
          });
        }
      } finally {
        inFlightRef.current.set(withdrawId, false);
      }
    },
    [mode, setRowState],
  );

  const clearError = useCallback(
    (withdrawId: string): void => {
      setRowStates((prev) => {
        const current = prev.get(withdrawId);
        if (!current || current.error === null) return prev;
        const next = new Map(prev);
        next.set(withdrawId, { ...current, error: null });
        return next;
      });
    },
    [],
  );

  const retry = useCallback(
    async (withdrawId: string): Promise<void> => {
      clearError(withdrawId);
      await claim(withdrawId);
    },
    [clearError, claim],
  );

  return { rowStates, claim, clearError, retry };
}
