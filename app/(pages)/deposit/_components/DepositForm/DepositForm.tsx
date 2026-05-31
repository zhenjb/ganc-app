// =============================================================================
// Deposit Screen (FE-04) — DepositForm
// -----------------------------------------------------------------------------
// Controlled presentational form with 3 fields: Depositor (text), Denom
// (select), Amount (text). Displays inline validation errors/warnings, a
// loading indicator when submitting, and an inline submit error message.
//
// Amount values are displayed with thousand separators (display only) — the
// raw string value is passed to the parent via onFieldChange.
//
// Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.5, 3.2, 3.5, 6.1, 6.2, 9.1, 9.2
// =============================================================================

import type {
  DepositFormState,
  ValidationErrors,
  ValidationWarnings,
} from "@/app/(pages)/deposit/_types";
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
}

/**
 * Formats a numeric string with thousand separators for display.
 * Returns empty string for non-numeric or empty input.
 */
function formatWithThousandSeparators(value: string): string {
  if (!value) return "";
  // Only format if the value is a valid integer (digits only)
  if (!/^\d+$/.test(value)) return "";
  return BigInt(value).toLocaleString("en-US");
}

/**
 * Determines whether the submit button should be disabled.
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

export function DepositForm({
  formState,
  errors,
  warnings,
  submitting,
  disabled,
  onFieldChange,
  onSubmit,
  submitError,
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
          disabled={disabled}
          placeholder="cosmos1..."
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
          <option value="uusdc">uusdc</option>
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
