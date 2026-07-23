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
  /** True while the entire flow (request + claim) is in progress. */
  submitting: boolean;
  /** Current phase for UI feedback. */
  phase: WithdrawPhase;
  submitError: string | null;
  lastResult: WithdrawRecord | null;
  history: WithdrawRecord[];
  setField: (field: keyof WithdrawRequestFormState, value: string) => void;
  handleSubmit: () => Promise<void>;
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
 * Withdraw + auto-claim hook for the deposit page's Withdraw tab.
 *
 * Full flow on submit:
 *   1. postWithdrawRequest (off-chain request)
 *   2. Connect wallet (Keplr/Leap) → sign MsgClaimWithdraw → broadcast on-chain
 *      (real/local mode) OR postWithdrawClaim (mock mode)
 *   3. Refresh state
 *
 * The button stays in loading state for the entire duration.
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

  const handleSubmit = useCallback(async () => {
    if (!state) return;

    setSubmitting(true);
    setSubmitError(null);
    setPhase("requesting");

    let record: WithdrawRecord;

    // Step 1: Submit withdraw request (off-chain)
    try {
      const response = await postWithdrawRequest({
        destination: formState.destination,
        destinationHash: "0x",
        amount: formState.amount,
        denom: formState.denom,
      });
      record = response.request;
    } catch {
      setSubmitError("Internal Server Error");
      setPhase("error");
      setSubmitting(false);
      return;
    }

    // Step 2: Auto-claim
    setPhase("claiming");

    try {
      if (state.mode === "mock") {
        // Mock mode: use the REST API claim endpoint
        await postWithdrawClaim({
          nullifier: record.nullifier,
          destination: record.destination,
        });
      } else {
        // Real/local mode: connect wallet → wait for settlement → sign MsgClaimWithdraw → broadcast
        const { connectWallet } = await import("@/app/lib/services/wallet");
        const connection = await connectWallet();

        // Wait for the withdraw record to be settled on-chain before claiming.
        // The sequencer needs time to include it in a batch and settle.
        const { getWithdrawSettlementStatus } = await import(
          "@/app/lib/services/api"
        );

        const MAX_POLL_ATTEMPTS = 30;
        const POLL_INTERVAL_MS = 2000;
        let settled = false;

        for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
          const status = await getWithdrawSettlementStatus(record.id);
          if (status === "claimable") {
            settled = true;
            break;
          }
          if (status === "claimed") {
            // Already claimed somehow — treat as success
            settled = true;
            break;
          }
          // Wait before next poll
          await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        }

        if (!settled) {
          throw new Error("Withdraw not settled on-chain within timeout");
        }

        // Dynamic import of broadcastClaim from the wallet services
        const { broadcastClaim } = await import(
          "@/app/lib/services/wallet/claimTx"
        );
        await broadcastClaim(record.id, connection.address);
      }

      // Claim succeeded: update record to "claimed"
      const claimedRecord: WithdrawRecord = {
        ...record,
        status: "claimed",
        claimedAt: new Date().toISOString(),
      };
      setLastResult(claimedRecord);
      setHistory((prev) => [claimedRecord, ...prev]);
      setPhase("done");

      // Refresh state to reflect updated balances.
      // Small delay so the backend has time to process the on-chain event.
      await new Promise((r) => setTimeout(r, 1500));
      try {
        await refresh();
      } catch {
        // Non-critical
      }
    } catch (err) {
      // Claim failed but withdraw request succeeded — still record the request
      setLastResult(record);
      setHistory((prev) => [record, ...prev]);

      // Determine error message
      if (err instanceof Error && err.message.toLowerCase().includes("rejected")) {
        setSubmitError("Transaction cancelled");
      } else {
        setSubmitError("Internal Server Error");
      }
      setPhase("error");
    } finally {
      setSubmitting(false);
    }
  }, [formState.destination, formState.denom, formState.amount, state, refresh]);

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
  };
}
