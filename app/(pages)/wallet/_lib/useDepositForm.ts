"use client";

import { useCallback, useState } from "react";
import { getDepositById, postDeposit } from "@/app/lib/services/api";
import { useAppStateContext } from "@/app/lib/contexts/AppStateContext";
import type { DepositRecord } from "@/app/lib/interfaces/deposit";
import type { WalletConnection } from "@/app/lib/interfaces/wallet";
import type {
  DepositFormState,
  DepositHistoryEntry,
  ValidationErrors,
  ValidationWarnings,
  WalletState,
} from "@/app/(pages)/wallet/_types";
import {
  validateDepositor,
  validateAmount,
  validateAmountWarning,
} from "@/app/(pages)/wallet/_lib/validate";

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
  wallet: WalletState;
  isRealMode: boolean;
  setField: (field: keyof DepositFormState, value: string) => void;
  handleSubmit: () => Promise<void>;
  handleConnectWallet: () => Promise<void>;
  handleDisconnectWallet: () => void;
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
 * mode-aware submission (mock POST vs wallet-signed broadcast), validation,
 * balance diffing, history, and wallet connection.
 */
export function useDepositForm(): UseDepositFormReturn {
  const { state, refresh } = useAppStateContext();

  const isRealMode = state?.mode === "local";

  // Form state — initialized with defaults derived from AppState.
  const [formState, setFormState] = useState<DepositFormState>(() => ({
    depositor: parseDefaultDepositor(state?.userBalances),
    denom: "USDT",
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

  // Session-only wallet connection state. Never persisted to localStorage.
  const [wallet, setWallet] = useState<WalletState>({
    connection: null,
    connecting: false,
    error: null,
  });

  /**
   * Update a single form field and run validation immediately.
   * In real mode the depositor field is derived from the wallet address and
   * cannot be edited directly — we silently ignore depositor writes there.
   */
  const setField = useCallback(
    (field: keyof DepositFormState, value: string) => {
      if (field === "depositor" && isRealMode) {
        return;
      }
      setFormState((prev) => ({ ...prev, [field]: value }));
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

        if (!amountError && value !== "" && state) {
          const balanceKey = `${formState.depositor}/${formState.denom}`;
          const currentBalance =
            state.userBalances[balanceKey] ?? "0";
          setWarnings({
            amount: validateAmountWarning(value, currentBalance),
          });
        } else {
          setWarnings({ amount: null });
        }
      }

      if (
        (field === "depositor" || field === "denom") &&
        formState.amount !== ""
      ) {
        const newDepositor =
          field === "depositor" ? value : formState.depositor;
        const newDenom = field === "denom" ? value : formState.denom;
        const amountError = validateAmount(formState.amount);
        if (!amountError && state) {
          const balanceKey = `${newDepositor}/${newDenom}`;
          const currentBalance =
            state.userBalances[balanceKey] ?? "0";
          setWarnings({
            amount: validateAmountWarning(formState.amount, currentBalance),
          });
        }
      }
    },
    [
      formState.depositor,
      formState.denom,
      formState.amount,
      isRealMode,
      state,
    ]
  );

  /**
   * Connect to the browser wallet (Keplr/Leap) and pin its address into the
   * depositor field. All errors are normalized to "Internal Server Error".
   * Dynamically imported so wallet code never ships in mock-mode bundles.
   */
  const handleConnectWallet = useCallback(async (): Promise<WalletConnection | null> => {
    setWallet({ connection: null, connecting: true, error: null });
    try {
      const { connectWallet } = await import("@/app/lib/services/wallet");
      const connection = await connectWallet();
      setWallet({ connection, connecting: false, error: null });
      setFormState((prev) => ({ ...prev, depositor: connection.address }));
      setErrors((prev) => ({ ...prev, depositor: null }));
      return connection;
    } catch {
      setWallet({
        connection: null,
        connecting: false,
        error: "Internal Server Error",
      });
      return null;
    }
  }, []) as unknown as () => Promise<void>;

  const handleDisconnectWallet = useCallback(() => {
    setWallet({ connection: null, connecting: false, error: null });
    setFormState((prev) => ({ ...prev, depositor: "" }));
  }, []);

  /**
   * Submit the deposit. Branches on mode:
   *  - mock: POST /api/deposit (existing behavior).
   *  - real: auto-connects wallet if needed, then wallet sign + broadcast
   *          MsgDeposit, then GET /api/deposits/{id}.
   */
  const handleSubmit = useCallback(async () => {
    if (!state) return;

    setSubmitting(true);
    setSubmitError(null);
    setRefreshError(false);

    // In real mode, auto-connect wallet if not already connected.
    let depositorAddress = formState.depositor;
    if (state.mode === "local" && !wallet.connection) {
      setWallet((prev) => ({ ...prev, connecting: true, error: null }));
      try {
        const { connectWallet } = await import("@/app/lib/services/wallet");
        const connection = await connectWallet();
        setWallet({ connection, connecting: false, error: null });
        setFormState((prev) => ({ ...prev, depositor: connection.address }));
        setErrors((prev) => ({ ...prev, depositor: null }));
        depositorAddress = connection.address;
      } catch {
        setWallet({
          connection: null,
          connecting: false,
          error: "Internal Server Error",
        });
        setSubmitting(false);
        setSubmitError("Internal Server Error");
        return;
      }
    }

    const balanceKey = `${depositorAddress}/${formState.denom}`;
    const userBalance = state.userBalances[balanceKey] ?? "0";
    const moduleBalance = state.moduleAccountBalance[formState.denom] ?? "0";
    const snapshot = { userBalance, moduleBalance };
    setBalanceSnapshot(snapshot);

    try {
      let deposit: DepositRecord;

      if (state.mode === "local") {
        // ---- Wallet-signed real flow ---------------------------------------
        const { broadcastDeposit } = await import(
          "@/app/lib/services/wallet"
        );

        const result = await broadcastDeposit({
          creator: depositorAddress,
          denom: formState.denom,
          amount: formState.amount,
        });

        if (result.depositId) {
          // Indexed already — fetch the canonical record.
          try {
            const lookup = await getDepositById(result.depositId);
            deposit = lookup.deposit;
          } catch (lookupErr) {
            console.error("[FE-14] getDepositById failed", lookupErr);
            // Fall back to the partial record so the user still sees txHash.
            deposit = {
              id: result.depositId,
              depositor: depositorAddress,
              amount: formState.amount,
              denom: formState.denom,
              txHash: result.txHash,
              createdAt: new Date().toISOString(),
              processed: true,
            };
          }
        } else {
          // Tx broadcast OK but EventDeposit not yet indexed.
          deposit = {
            id: "",
            depositor: depositorAddress,
            amount: formState.amount,
            denom: formState.denom,
            txHash: result.txHash,
            createdAt: new Date().toISOString(),
            processed: true,
          };
        }
      } else {
        // ---- Mock flow (dev / offline) -------------------------------------
        const response = await postDeposit({
          depositor: formState.depositor,
          denom: formState.denom,
          amount: formState.amount,
        });
        deposit = response.deposit;
      }

      setLastResult(deposit);

      // Always refresh state (real or mock).
      try {
        await refresh();
      } catch {
        setRefreshError(true);
      }

      setHistory((prev) => [
        { deposit, timestamp: new Date().toISOString() },
        ...prev,
      ]);
    } catch {
      setSubmitError("Internal Server Error");
      setBalanceSnapshot(null);
    } finally {
      setSubmitting(false);
    }
  }, [
    state,
    formState.depositor,
    formState.denom,
    formState.amount,
    wallet.connection,
    refresh,
  ]);

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
    wallet,
    isRealMode,
    setField,
    handleSubmit,
    handleConnectWallet,
    handleDisconnectWallet,
  };
}
