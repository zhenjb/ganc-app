"use client";

import { useCallback, useEffect, useState } from "react";
import { postWithdrawRequest, postWithdrawClaim } from "@/app/lib/services/api";
import { useAppStateContext } from "@/app/lib/contexts/AppStateContext";
import { useWalletContext } from "@/app/lib/contexts/WalletContext";
import type { WithdrawRecord } from "@/app/lib/interfaces/withdraw";
import type {
  WithdrawRequestFormState,
  WithdrawValidationErrors,
  WithdrawValidationWarnings,
} from "@/app/lib/interfaces/withdraw-form";
import {
  validateWithdrawAmount,
  validateWithdrawAmountWarning,
} from "@/app/lib/services/withdraw-validate";

export type WithdrawPhase =
  | "idle"
  | "requesting"
  | "claiming"
  | "done"
  | "error";

export interface UseWithdrawFormReturn {
  formState: WithdrawRequestFormState;
  errors: WithdrawValidationErrors;
  warnings: WithdrawValidationWarnings;
  /** True while the withdraw request + auto-claim is in progress. */
  submitting: boolean;
  /** Current phase for UI feedback. */
  phase: WithdrawPhase;
  submitError: string | null;
  lastResult: WithdrawRecord | null;
  /** Session-scoped requests made this tab-session (merged with remote history). */
  history: WithdrawRecord[];
  setField: (field: keyof WithdrawRequestFormState, value: string) => void;
  /** Submit the withdraw request, then auto-claim best-effort (Hybrid). */
  handleSubmit: () => Promise<void>;
  /** Claim a settled withdrawal on-chain (module→user). Returns success. */
  claim: (record: WithdrawRecord) => Promise<boolean>;
  /** id of the withdrawal currently being claimed (null = none). */
  claimingId: string | null;
  /** Error from the last claim attempt (null = none). */
  claimError: string | null;
}

/**
 * Parse the default destination address from the first key in userBalances.
 */
function parseDefaultDestination(
  userBalances: Record<string, string> | undefined
): string {
  if (!userBalances) return "";
  const firstKey = Object.keys(userBalances)[0];
  if (!firstKey) return "";
  return firstKey.split("/")[0] ?? "";
}

/**
 * Withdraw hook (Hybrid model) for the deposit page's Withdraw tab.
 *
 * handleSubmit runs request + auto-claim in ONE click (like the original UX):
 *   1. postWithdrawRequest (off-chain debit; request persisted to history)
 *   2. claim() best-effort — waits for the sequencer to settle, then signs
 *      MsgClaimWithdraw and broadcasts (real/local) OR postWithdrawClaim (mock).
 *      Reject/timeout/failure is NON-FATAL: the request stays claimable and can
 *      be finished later from the history row's Claim button (see `claim`).
 *   3. Refresh state
 *
 * The button stays in loading state for the whole request + auto-claim duration.
 */
export function useWithdrawForm(): UseWithdrawFormReturn {
  const { state, refresh } = useAppStateContext();
  const { address: walletAddress } = useWalletContext();

  const [formState, setFormState] = useState<WithdrawRequestFormState>(() => ({
    destination: walletAddress ?? parseDefaultDestination(state?.userBalances),
    denom: state?.denoms?.[0] ?? "USDT",
    amount: "",
  }));

  const [errors, setErrors] = useState<WithdrawValidationErrors>({
    destination: null,
    amount: null,
  });

  const [warnings, setWarnings] = useState<WithdrawValidationWarnings>({
    amount: null,
  });

  // Sync destination field when wallet address changes
  useEffect(() => {
    if (walletAddress) {
      setFormState((prev) => ({ ...prev, destination: walletAddress }));
      setErrors((prev) => ({ ...prev, destination: null }));
    }
  }, [walletAddress]);

  const [submitting, setSubmitting] = useState(false);
  const [phase, setPhase] = useState<WithdrawPhase>("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<WithdrawRecord | null>(null);
  const [history, setHistory] = useState<WithdrawRecord[]>([]);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);

  const getCurrentBalance = useCallback(
    (destination: string, denom: string): string => {
      if (!state) return "0";
      return state.userBalances[`${destination}/${denom}`] ?? "0";
    },
    [state]
  );

  const setField = useCallback(
    (field: keyof WithdrawRequestFormState, value: string) => {
      // Destination is always derived from connected wallet — ignore edits
      if (field === "destination") {
        return;
      }
      setFormState((prev) => ({ ...prev, [field]: value }));
      setSubmitError(null);

      if (field === "amount") {
        const amountError = value === "" ? null : validateWithdrawAmount(value);
        setErrors((prev) => ({ ...prev, amount: amountError }));

        if (!amountError && value !== "") {
          const balance = getCurrentBalance(formState.destination, formState.denom);
          setWarnings({ amount: validateWithdrawAmountWarning(value, balance) });
        } else {
          setWarnings({ amount: null });
        }
      }

      if (field === "denom" && formState.amount !== "") {
        const nextDenom = value;
        const amountError = validateWithdrawAmount(formState.amount);
        if (!amountError) {
          const balance = getCurrentBalance(formState.destination, nextDenom);
          setWarnings({ amount: validateWithdrawAmountWarning(formState.amount, balance) });
        } else {
          setWarnings({ amount: null });
        }
      }
    },
    [formState.destination, formState.denom, formState.amount, getCurrentBalance]
  );

  // Claim a withdrawal's on-chain payout (module→user). Resumable: safe to call
  // any time after the request; it waits for the sequencer to settle the batch
  // (claimable) before broadcasting MsgClaimWithdraw. Rejecting the wallet popup
  // is a benign "Transaction cancelled" — the withdrawal stays claimable and can
  // be finished later from the history row's Claim button. Owns its own errors
  // (sets claimError, returns a boolean) — it never throws to the caller, so
  // handleSubmit can await it best-effort.
  const claim = useCallback(
    async (record: WithdrawRecord): Promise<boolean> => {
      if (!state) return false;
      setClaimingId(record.id);
      setClaimError(null);
      try {
        if (state.mode === "mock") {
          await postWithdrawClaim({
            nullifier: record.nullifier,
            destination: record.destination,
          });
        } else {
          const { connectWallet } = await import("@/app/lib/services/wallet");
          const connection = await connectWallet();
          const { getWithdrawSettlementStatus } = await import(
            "@/app/lib/services/api"
          );

          const MAX_POLL_ATTEMPTS = 30;
          const POLL_INTERVAL_MS = 2000;
          let settled = false;
          for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
            const status = await getWithdrawSettlementStatus(record.id);
            if (status === "claimable" || status === "claimed") {
              settled = true;
              break;
            }
            await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
          }
          if (!settled) {
            throw new Error(
              "Withdraw not settled on-chain yet — try Claim again in a moment"
            );
          }

          const { broadcastClaim } = await import(
            "@/app/lib/services/wallet/claimTx"
          );
          await broadcastClaim(record.id, connection.address);
        }

        // Reflect claimed status in the session copy (remote refetch confirms it).
        setHistory((prev) =>
          prev.map((r) =>
            r.id === record.id
              ? { ...r, status: "claimed", claimedAt: new Date().toISOString() }
              : r
          )
        );
        await new Promise((r) => setTimeout(r, 1500));
        try {
          await refresh();
        } catch {
          // Non-critical
        }
        return true;
      } catch (err) {
        const raw = err instanceof Error && err.message ? err.message : "";
        setClaimError(
          /reject|denied|cancel/i.test(raw)
            ? "Transaction cancelled"
            : raw || "Claim failed"
        );
        return false;
      } finally {
        setClaimingId(null);
      }
    },
    [state, refresh]
  );

  // Submit the withdraw request, then AUTO-CLAIM best-effort (Hybrid model).
  //   1. postWithdrawRequest → off-chain debit; request persisted to history.
  //      A failure HERE is fatal (surfaced as submitError).
  //   2. claim(record) best-effort — waits for the batch to settle, then
  //      broadcasts the on-chain payout. Because claim() owns its errors and
  //      never throws, a rejected popup / timeout / failure is NON-FATAL: the
  //      request stays claimable in history and can be finished later via the
  //      Claim button. This restores the original one-click UX while keeping a
  //      cancelled claim recoverable instead of stranding the withdrawal.
  const handleSubmit = useCallback(async () => {
    if (!state) return;

    setSubmitting(true);
    setSubmitError(null);
    setPhase("requesting");

    try {
      const response = await postWithdrawRequest({
        destination: formState.destination,
        destinationHash: "0x",
        amount: formState.amount,
        denom: formState.denom,
      });
      const record = response.request;
      setLastResult(record);

      // Reflect the off-chain debit in the balances.
      await new Promise((r) => setTimeout(r, 800));
      try {
        await refresh();
      } catch {
        // Non-critical
      }

      // Auto-claim (best-effort). claim() sets claimError on its own and does
      // not throw, so a cancelled/failed claim leaves the request claimable in
      // history rather than surfacing as a request error.
      setPhase("claiming");
      await claim(record);
      setPhase("done");
    } catch (e) {
      // Only the REQUEST step can reach here (claim swallows its own errors).
      setSubmitError(
        e instanceof Error && e.message ? e.message : "Withdraw request failed"
      );
      setPhase("error");
    } finally {
      setSubmitting(false);
    }
  }, [
    formState.destination,
    formState.denom,
    formState.amount,
    state,
    refresh,
    claim,
  ]);

  return {
    formState,
    errors,
    warnings,
    submitting,
    phase,
    submitError,
    lastResult,
    history,
    setField,
    handleSubmit,
    claim,
    claimingId,
    claimError,
  };
}
