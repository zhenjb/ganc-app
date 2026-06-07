// =============================================================================
// Deposit Screen (FE-04 / FE-14) — DepositForm
// -----------------------------------------------------------------------------
// Controlled presentational form. In real mode (FE-14) the depositor field is
// read-only and derived from the connected wallet; a Connect Wallet panel is
// shown above the form. In mock mode (FE-04) the depositor remains editable.
//
// Amount values are displayed with thousand separators (display only); the raw
// string value flows back to the parent via onFieldChange.
// =============================================================================

import type {
  DepositFormState,
  ValidationErrors,
  ValidationWarnings,
  WalletState,
} from "@/app/(pages)/deposit/_types";
import { shortenHex } from "@/app/lib/services/format";
import styles from "./DepositForm.module.scss";

export interface DepositFormProps {
  formState: DepositFormState;
  errors: ValidationErrors;
  warnings: ValidationWarnings;
  submitting: boolean;
  disabled: boolean; // true when state not loaded
  onFieldChange: (field: keyof DepositFormState, value: string) => void;
  onSubmit: () => void;
  submitError: string | null;
  /** When true, depositor is wallet-derived and the Connect panel renders. */
  isRealMode: boolean;
  wallet: WalletState;
  onConnectWallet: () => void;
  onDisconnectWallet: () => void;
}

/**
 * Format a numeric string with thousand separators for display.
 * Returns empty string for non-numeric or empty input.
 */
function formatWithThousandSeparators(value: string): string {
  if (!value) return "";
  if (!/^\d+$/.test(value)) return "";
  return BigInt(value).toLocaleString("en-US");
}

/**
 * Decide whether the submit button should be disabled.
 * In real mode, an unconnected wallet also disables submit.
 */
function isSubmitDisabled(
  submitting: boolean,
  disabled: boolean,
  errors: ValidationErrors,
  amount: string,
  isRealMode: boolean,
  walletConnected: boolean
): boolean {
  return (
    submitting ||
    disabled ||
    errors.depositor !== null ||
    errors.amount !== null ||
    amount === "" ||
    (isRealMode && !walletConnected)
  );
}

export function DepositForm({
  formState,
  errors,
  warnings,
  submitting,
  disabled,
  onFieldChange,
  onSubmit,
  submitError,
  isRealMode,
  wallet,
  onConnectWallet,
  onDisconnectWallet,
}: DepositFormProps): React.JSX.Element {
  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit();
  };

  const formattedAmount = formatWithThousandSeparators(formState.amount);
  const walletConnected = wallet.connection !== null;
  const submitDisabled = isSubmitDisabled(
    submitting,
    disabled,
    errors,
    formState.amount,
    isRealMode,
    walletConnected
  );

  return (
    <form
      className={styles.form}
      onSubmit={handleFormSubmit}
      aria-label="Deposit form"
      noValidate
    >
      {/* Wallet panel — real mode only */}
      {isRealMode && (
        <div className={styles.walletPanel} role="region" aria-label="Wallet connection">
          {walletConnected ? (
            <div className={styles.walletConnected}>
              <span className={styles.walletProvider}>
                {wallet.connection?.provider === "leap" ? "Leap" : "Keplr"}
              </span>
              <span className={styles.walletAddress}>
                {shortenHex(wallet.connection?.address ?? "", 8, 6)}
              </span>
              <button
                type="button"
                className={styles.walletDisconnect}
                onClick={onDisconnectWallet}
                disabled={submitting}
              >
                Disconnect
              </button>
            </div>
          ) : (
            <div className={styles.walletDisconnected}>
              <p className={styles.walletHelp}>
                Connect Keplr or Leap. Make sure your wallet has fee and deposit
                denom available.
              </p>
              <button
                type="button"
                className={styles.walletConnect}
                onClick={onConnectWallet}
                disabled={wallet.connecting || submitting}
                aria-busy={wallet.connecting}
              >
                {wallet.connecting && (
                  <span className={styles.spinner} aria-hidden="true" />
                )}
                {wallet.connecting ? "Connecting…" : "Connect Wallet"}
              </button>
              {wallet.error && (
                <p className={styles.submitError} role="alert">
                  {wallet.error}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Depositor field */}
      <div className={styles.fieldGroup}>
        <label htmlFor="deposit-depositor" className={styles.label}>
          Depositor
        </label>
        <input
          id="deposit-depositor"
          type="text"
          className={`${styles.input}${errors.depositor ? ` ${styles.inputError}` : ""}`}
          value={formState.depositor}
          onChange={(e) => onFieldChange("depositor", e.target.value)}
          disabled={disabled || isRealMode}
          readOnly={isRealMode}
          placeholder={isRealMode ? "Connect wallet to fill" : "cosmos1..."}
          aria-invalid={errors.depositor !== null}
          aria-describedby={
            errors.depositor ? "deposit-depositor-error" : undefined
          }
        />
        {errors.depositor && (
          <p
            id="deposit-depositor-error"
            className={styles.error}
            role="alert"
          >
            {errors.depositor}
          </p>
        )}
      </div>

      {/* Denom field */}
      <div className={styles.fieldGroup}>
        <label htmlFor="deposit-denom" className={styles.label}>
          Denom
        </label>
        <select
          id="deposit-denom"
          className={styles.select}
          value={formState.denom}
          onChange={(e) => onFieldChange("denom", e.target.value)}
          disabled={disabled}
          aria-label="Select denomination"
        >
          <option value="USDT">USDT</option>
        </select>
      </div>

      {/* Amount field */}
      <div className={styles.fieldGroup}>
        <label htmlFor="deposit-amount" className={styles.label}>
          Amount
        </label>
        <input
          id="deposit-amount"
          type="text"
          inputMode="numeric"
          className={`${styles.input}${errors.amount ? ` ${styles.inputError}` : ""}`}
          value={formState.amount}
          onChange={(e) => onFieldChange("amount", e.target.value)}
          disabled={disabled}
          placeholder="Enter amount"
          aria-invalid={errors.amount !== null}
          aria-describedby={
            errors.amount
              ? "deposit-amount-error"
              : warnings.amount
                ? "deposit-amount-warning"
                : formattedAmount
                  ? "deposit-amount-display"
                  : undefined
          }
        />
        {formattedAmount && !errors.amount && (
          <span id="deposit-amount-display" className={styles.amountDisplay}>
            {formattedAmount}
          </span>
        )}
        {errors.amount && (
          <p id="deposit-amount-error" className={styles.error} role="alert">
            {errors.amount}
          </p>
        )}
        {!errors.amount && warnings.amount && (
          <p
            id="deposit-amount-warning"
            className={styles.warning}
            role="status"
          >
            {warnings.amount}
          </p>
        )}
      </div>

      {/* Submit button */}
      <button
        type="submit"
        className={styles.submitButton}
        disabled={submitDisabled}
        aria-busy={submitting}
      >
        {submitting && (
          <span className={styles.spinner} aria-hidden="true" />
        )}
        {submitting ? "Submitting…" : "Submit Deposit"}
      </button>

      {/* Inline submit error */}
      {submitError && (
        <p className={styles.submitError} role="alert">
          {submitError}
        </p>
      )}
    </form>
  );
}

export default DepositForm;
