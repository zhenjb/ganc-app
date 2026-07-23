// =============================================================================
// Deposit Screen (FE-04) — DepositForm
// -----------------------------------------------------------------------------
// Controlled presentational form for making deposits.
// The depositor field is always editable (mock mode).
//
// Amount values are displayed with thousand separators (display only); the raw
// string value flows back to the parent via onFieldChange.
// =============================================================================

import type {
  DepositFormState,
  ValidationErrors,
  ValidationWarnings,
} from "@/app/(pages)/wallet/_types";
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
  /** Available denominations from the backend. Falls back to ["USDT"]. */
  denoms?: string[];
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
 */
function isSubmitDisabled(
  submitting: boolean,
  disabled: boolean,
  errors: ValidationErrors,
  amount: string
): boolean {
  return (
    submitting ||
    disabled ||
    errors.depositor !== null ||
    errors.amount !== null ||
    amount === ""
  );
}

const DEFAULT_DENOMS = ["USDT"];

export function DepositForm({
  formState,
  errors,
  warnings,
  submitting,
  disabled,
  onFieldChange,
  onSubmit,
  submitError,
  denoms = DEFAULT_DENOMS,
}: DepositFormProps): React.JSX.Element {
  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit();
  };

  const formattedAmount = formatWithThousandSeparators(formState.amount);
  const submitDisabled = isSubmitDisabled(
    submitting,
    disabled,
    errors,
    formState.amount
  );

  return (
    <form
      className={styles.form}
      onSubmit={handleFormSubmit}
      aria-label="Deposit form"
      noValidate
    >
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
          disabled
          placeholder="Connect wallet to fill address"
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
          {denoms.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
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

      {/* Transaction Summary */}
      <div className={styles.summary}>
        <div className={styles.summaryTitle}>Transaction Summary</div>
        <div className={styles.summaryRow}>
          <span>Depositor</span>
          <b>{formState.depositor || "—"}</b>
        </div>
        <div className={styles.summaryRow}>
          <span>Asset</span>
          <b>{formState.denom}</b>
        </div>
        <div className={styles.summaryRow}>
          <span>Amount</span>
          <b>{formattedAmount || "—"}</b>
        </div>
        <div className={styles.summaryRow}>
          <span>Destination</span>
          <b>Module Account</b>
        </div>
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
        {submitting ? "Submitting…" : "Deposit"}
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
