"use client";

import { useCallback, useState } from "react";
import { postDeposit } from "@/app/lib/services/api";
import { useAppStateContext } from "@/app/lib/contexts/AppStateContext";
import type { DepositRecord } from "@/app/lib/interfaces/deposit";
import type {
  DepositFormState,
  DepositHistoryEntry,
  ValidationErrors,
  ValidationWarnings,
} from "@/app/(pages)/deposit/_types";
import {
  validateDepositor,
  validateAmount,
  validateAmountWarning,
} from "@/app/(pages)/deposit/_lib/validate";

export interface UseDepositFormReturn {
  formState: DepositFormState;
  errors: ValidationErrors;
  warnings: ValidationWarnings;
  submitting: boolean;
  submitError: string | null;
  lastResult: DepositRecord | null;
  balanceSnapshot: { userBalance: string; moduleBalance: string } | null;
  refreshError: boolean;
  history: DepositHistoryEntry[];
  setField: (field: keyof DepositFormState, value: string) => void;
  handleSubmit: () => Promise<void>;
}

/**
 * Parse the default depositor address from the first key in userBalances.
 * Keys are formatted as "{address}/{denom}", so we split by "/" and take the first part.
 */
function parseDefaultDepositor(
  userBalances: Record<string, string> | undefined
): string {
  if (!userBalances) return "";
  const firstKey = Object.keys(userBalances)[0];
  if (!firstKey) return "";
  return firstKey.split("/")[0] ?? "";
}

/**
 * Custom hook managing the entire deposit form lifecycle:
 * state initialization, field validation, submission, balance diffing, and history.
 */
export function useDepositForm(): UseDepositFormReturn {
  const { state, refresh } = useAppStateContext();

  // Form state — initialized with defaults derived from AppState
  const [formState, setFormState] = useState<DepositFormState>(() => ({
    depositor: parseDefaultDepositor(state?.balances.userBalances),
    denom: "uusdc",
    amount: "",
  }));

  const [errors, setErrors] = useState<ValidationErrors>({
    depositor: null,
    amount: null,
  });

  const [warnings, setWarnings] = useState<ValidationWarnings>({
    amount: null,
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<DepositRecord | null>(null);
  const [balanceSnapshot, setBalanceSnapshot] = useState<{
    userBalance: string;
    moduleBalance: string;
  } | null>(null);
  const [refreshError, setRefreshError] = useState(false);
  const [history, setHistory] = useState<DepositHistoryEntry[]>([]);

  /**
   * Update a single form field and run validation immediately.
   */
  const setField = useCallback(
    (field: keyof DepositFormState, value: string) => {
      setFormState((prev) => ({ ...prev, [field]: value }));
      // Clear submit error when user edits the form
      setSubmitError(null);

      if (field === "depositor") {
        setErrors((prev) => ({
          ...prev,
          depositor: validateDepositor(value),
        }));
      }

      if (field === "amount") {
        const amountError = value === "" ? null : validateAmount(value);
        setErrors((prev) => ({ ...prev, amount: amountError }));

        // Only compute warning if there is no error and amount is non-empty
        if (!amountError && value !== "" && state) {
          const balanceKey = `${formState.depositor}/${formState.denom}`;
          const currentBalance =
            state.balances.userBalances[balanceKey] ?? "0";
          setWarnings({ amount: validateAmountWarning(value, currentBalance) });
        } else {
          setWarnings({ amount: null });
        }
      }

      // Re-validate amount warning when depositor or denom changes (balance key changes)
      if ((field === "depositor" || field === "denom") && formState.amount !== "") {
        const newDepositor = field === "depositor" ? value : formState.depositor;
        const newDenom = field === "denom" ? value : formState.denom;
        const amountError = validateAmount(formState.amount);
        if (!amountError && state) {
          const balanceKey = `${newDepositor}/${newDenom}`;
          const currentBalance =
            state.balances.userBalances[balanceKey] ?? "0";
          setWarnings({
            amount: validateAmountWarning(formState.amount, currentBalance),
          });
        }
      }
    },
    [formState.depositor, formState.denom, formState.amount, state]
  );

  /**
   * Submit the deposit:
   * 1. Snapshot current balances
   * 2. Call postDeposit API
   * 3. On success: set result, refresh state, add to history
   * 4. On refresh failure: set refreshError (result card still shows)
   * 5. On API failure: set submitError, keep form unchanged
   */
  const handleSubmit = useCallback(async () => {
    if (!state) return;

    setSubmitting(true);
    setSubmitError(null);
    setRefreshError(false);

    // Snapshot balances before the API call
    const balanceKey = `${formState.depositor}/${formState.denom}`;
    const userBalance = state.balances.userBalances[balanceKey] ?? "0";
    const moduleBalance = state.balances.moduleAccountBalance;
    const snapshot = { userBalance, moduleBalance };
    setBalanceSnapshot(snapshot);

    try {
      const response = await postDeposit({
        depositor: formState.depositor,
        denom: formState.denom,
        amount: formState.amount,
      });

      // Success: set result
      setLastResult(response.deposit);

      // Refresh state to get updated balances
      try {
        await refresh();
      } catch {
        // Refresh failed — result card still shows, but balance diff shows error
        setRefreshError(true);
      }

      // Add to session history
      setHistory((prev) => [
        {
          deposit: response.deposit,
          timestamp: new Date().toISOString(),
        },
        ...prev,
      ]);
    } catch {
      // API error: show generic error, keep form unchanged
      setSubmitError("Internal Server Error");
      // Reset snapshot since deposit didn't go through
      setBalanceSnapshot(null);
    } finally {
      setSubmitting(false);
    }
  }, [state, formState.depositor, formState.denom, formState.amount, refresh]);

  return {
    formState,
    errors,
    warnings,
    submitting,
    submitError,
    lastResult,
    balanceSnapshot,
    refreshError,
    history,
    setField,
    handleSubmit,
  };
}
