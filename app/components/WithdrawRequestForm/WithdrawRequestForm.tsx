// =============================================================================
// Withdraw Request Screen (FE-05) — WithdrawRequestForm
// -----------------------------------------------------------------------------
// Controlled presentational form with 3 fields: Destination (text), Denom
// (select), Amount (text). Displays inline validation errors, a non-blocking
// amount warning, a loading indicator while submitting, and an inline submit
// error message.
//
// This component is purely presentational: all state and behaviour are owned
// by `useWithdrawRequestForm` and passed in via props. Mirrors the structure
// and conventions of the Deposit screen's DepositForm.
//
// Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 2.2, 3.1, 3.2
// =============================================================================

import type {
  WithdrawRequestFormState,
  WithdrawValidationErrors as ValidationErrors,
  WithdrawValidationWarnings as ValidationWarnings,
} from "@/app/lib/interfaces/withdraw-form";
import styles from "./WithdrawRequestForm.module.scss";

export interface WithdrawRequestFormProps {
  formState: WithdrawRequestFormState;
  errors: ValidationErrors;
  warnings: ValidationWarnings;
  submitting: boolean;
  disabled: boolean; // true when AppState not loaded
  onFieldChange: (field: keyof WithdrawRequestFormState, value: string) => void;
  onSubmit: () => void;
  submitError: string | null;
  /** Available denominations from the backend. Falls back to ["USDT"]. */
  denoms?: string[];
}

/**
 * Determines whether the submit button should be disabled.
 * Blocks while submitting, while disabled (state not loaded), or while any
 * blocking validation error is present. The non-blocking amount warning does
 * NOT disable submission.
 */
function isSubmitDisabled(
  submitting: boolean,
  disabled: boolean,
  errors: ValidationErrors
): boolean {
  return (
    submitting ||
    disabled ||
    errors.destination !== null ||
    errors.amount !== null
  );
}

const DEFAULT_DENOMS = ["USDT"];

export function WithdrawRequestForm({
  formState,
  errors,
  warnings,
  submitting,
  disabled,
  onFieldChange,
  onSubmit,
  submitError,
  denoms = DEFAULT_DENOMS,
}: WithdrawRequestFormProps): React.JSX.Element {
  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit();
  };

  const submitDisabled = isSubmitDisabled(submitting, disabled, errors);

  return (
    <form
      className={styles.form}
      onSubmit={handleFormSubmit}
      aria-label="Withdraw request form"
      noValidate
    >
      {/* Destination field */}
      <div className={styles.fieldGroup}>
        <label htmlFor="withdraw-destination" className={styles.label}>
          Destination
        </label>
        <input
          id="withdraw-destination"
          type="text"
          className={`${styles.input}${errors.destination ? ` ${styles.inputError}` : ""}`}
          value={formState.destination}
          onChange={(e) => onFieldChange("destination", e.target.value)}
          disabled
          placeholder="Connect wallet to fill address"
          aria-invalid={errors.destination !== null}
          aria-describedby={
            errors.destination ? "withdraw-destination-error" : undefined
          }
        />
        {errors.destination && (
          <p
            id="withdraw-destination-error"
            className={styles.error}
            role="alert"
          >
            {errors.destination}
          </p>
        )}
      </div>

      {/* Denom field */}
      <div className={styles.fieldGroup}>
        <label htmlFor="withdraw-denom" className={styles.label}>
          Denom
        </label>
        <select
          id="withdraw-denom"
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
        <label htmlFor="withdraw-amount" className={styles.label}>
          Amount
        </label>
        <input
          id="withdraw-amount"
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
              ? "withdraw-amount-error"
              : warnings.amount
                ? "withdraw-amount-warning"
                : undefined
          }
        />
        {errors.amount && (
          <p id="withdraw-amount-error" className={styles.error} role="alert">
            {errors.amount}
          </p>
        )}
        {!errors.amount && warnings.amount && (
          <p
            id="withdraw-amount-warning"
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
          <span>Destination</span>
          <b>{formState.destination || "—"}</b>
        </div>
        <div className={styles.summaryRow}>
          <span>Asset</span>
          <b>{formState.denom}</b>
        </div>
        <div className={styles.summaryRow}>
          <span>Amount</span>
          <b>{formState.amount || "—"}</b>
        </div>
        <div className={styles.summaryRow}>
          <span>Source</span>
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
        {submitting && <span className={styles.spinner} aria-hidden="true" />}
        {submitting ? "Submitting…" : "Withdraw"}
      </button>

      {/* Inline submit error (normalized "Internal Server Error") */}
      {submitError && (
        <p className={styles.submitError} role="alert">
          {submitError}
        </p>
      )}
    </form>
  );
}

export default WithdrawRequestForm;
