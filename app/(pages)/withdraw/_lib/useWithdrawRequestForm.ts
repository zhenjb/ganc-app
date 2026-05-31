"use client";

import { useCallback, useState } from "react";
import { postWithdrawRequest } from "@/app/lib/services/api";
import { useAppStateContext } from "@/app/lib/contexts/AppStateContext";
import type { WithdrawRecord } from "@/app/lib/interfaces/withdraw";
import type {
  WithdrawRequestFormState,
  ValidationErrors,
  ValidationWarnings,
} from "@/app/(pages)/withdraw/_types";
import {
  validateDestination,
  validateAmount,
  validateAmountWarning,
} from "@/app/(pages)/withdraw/_lib/validate";
import {
  loadHistory,
  appendToHistory,
} from "@/app/(pages)/withdraw/_lib/sessionHistory";

export interface UseWithdrawRequestFormReturn {
  formState: WithdrawRequestFormState;
  errors: ValidationErrors;
  warnings: ValidationWarnings;
  submitting: boolean;
  submitError: string | null;
  lastResult: WithdrawRecord | null;
  refreshError: boolean;
  history: WithdrawRecord[];
  setField: (field: keyof WithdrawRequestFormState, value: string) => void;
  handleSubmit: () => Promise<void>;
}

/**
 * Parse the default destination address from the first key in userBalances.
 * Keys are formatted as "{address}/{denom}", so we split by "/" and take the
 * first part. Guards against a null/empty balances map by returning "".
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
 * Custom hook managing the entire withdraw request form lifecycle:
 * state initialization, field validation, submission, result handling, and
 * session-persisted history.
 *
 * Mirrors the structure of `useDepositForm`: it reads the shared `state` and
 * `refresh` from `AppStateContext` rather than accepting them as parameters.
 */
export function useWithdrawRequestForm(): UseWithdrawRequestFormReturn {
  const { state, refresh } = useAppStateContext();

  // Form state — initialized with defaults derived from AppState.
  const [formState, setFormState] = useState<WithdrawRequestFormState>(() => ({
    destination: parseDefaultDestination(state?.balances.userBalances),
    denom: "uusdc",
    amount: "",
  }));

  const [errors, setErrors] = useState<ValidationErrors>({
    destination: null,
    amount: null,
  });

  const [warnings, setWarnings] = useState<ValidationWarnings>({
    amount: null,
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<WithdrawRecord | null>(null);
  const [refreshError, setRefreshError] = useState(false);
  // Hydrate the history from sessionStorage via a lazy initializer. The
  // WithdrawRequestScreen that owns this hook only mounts on the client once
  // AppState is non-null (the page shell renders a skeleton until then), so
  // there is no SSR-rendered output for this subtree to mismatch against.
  // `loadHistory` is SSR-safe and returns [] when sessionStorage is
  // unavailable, so initializing here is safe and avoids a setState-in-effect.
  const [history, setHistory] = useState<WithdrawRecord[]>(() => loadHistory());

  /**
   * Compute the current balance for the active destination/denom pair.
   * Balances are keyed as "{address}/{denom}"; missing entries default to "0".
   */
  const getCurrentBalance = useCallback(
    (destination: string, denom: string): string => {
      if (!state) return "0";
      const balanceKey = `${destination}/${denom}`;
      return state.balances.userBalances[balanceKey] ?? "0";
    },
    [state]
  );

  /**
   * Update a single form field and run validation immediately.
   */
  const setField = useCallback(
    (field: keyof WithdrawRequestFormState, value: string) => {
      setFormState((prev) => ({ ...prev, [field]: value }));
      // Clear any prior submit error when the user edits the form.
      setSubmitError(null);

      if (field === "destination") {
        setErrors((prev) => ({
          ...prev,
          destination: validateDestination(value),
        }));
      }

      if (field === "amount") {
        const amountError = value === "" ? null : validateAmount(value);
        setErrors((prev) => ({ ...prev, amount: amountError }));

        // Only compute the warning when the amount is valid and non-empty.
        if (!amountError && value !== "") {
          const currentBalance = getCurrentBalance(
            formState.destination,
            formState.denom
          );
          setWarnings({ amount: validateAmountWarning(value, currentBalance) });
        } else {
          setWarnings({ amount: null });
        }
      }

      // Re-validate the amount warning when destination or denom changes,
      // because the balance key (and therefore the available balance) changes.
      if (
        (field === "destination" || field === "denom") &&
        formState.amount !== ""
      ) {
        const nextDestination =
          field === "destination" ? value : formState.destination;
        const nextDenom = field === "denom" ? value : formState.denom;
        const amountError = validateAmount(formState.amount);
        if (!amountError) {
          const currentBalance = getCurrentBalance(nextDestination, nextDenom);
          setWarnings({
            amount: validateAmountWarning(formState.amount, currentBalance),
          });
        } else {
          setWarnings({ amount: null });
        }
      }
    },
    [formState.destination, formState.denom, formState.amount, getCurrentBalance]
  );

  /**
   * Submit the withdraw request:
   * 1. Call postWithdrawRequest with a "0x" destinationHash placeholder.
   * 2. On success: set lastResult, persist + prepend to session history.
   * 3. Refresh AppState; if refresh fails, flag refreshError but KEEP the
   *    result card (lastResult is preserved).
   * 4. On API failure: set submitError and preserve all form input values.
   */
  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    setSubmitError(null);
    setRefreshError(false);

    try {
      const response = await postWithdrawRequest({
        destination: formState.destination,
        destinationHash: "0x",
        amount: formState.amount,
        denom: formState.denom,
      });

      const record = response.request;

      // Success: surface the result card.
      setLastResult(record);

      // Persist to session history (prepended, most-recent-first) and sync
      // the in-memory list with the persisted result.
      setHistory(appendToHistory(record));

      // Refresh shared state so withdrawStatus / latestWithdraw update.
      try {
        await refresh();
      } catch {
        // Refresh failed — keep the result card visible, flag the error.
        setRefreshError(true);
      }
    } catch {
      // API error: surface the single normalized error, preserve form state.
      setSubmitError("Internal Server Error");
    } finally {
      setSubmitting(false);
    }
  }, [formState.destination, formState.denom, formState.amount, refresh]);

  return {
    formState,
    errors,
    warnings,
    submitting,
    submitError,
    lastResult,
    refreshError,
    history,
    setField,
    handleSubmit,
  };
}
