/**
 * Form state for the withdraw request form.
 * Tracks user input for destination address, denomination, and amount.
 *
 * Promoted from app/(pages)/withdraw/_types/ because it is now used by the
 * shared WithdrawRequestForm component in app/components/.
 */
export interface WithdrawRequestFormState {
  destination: string;
  denom: string;
  amount: string;
}

/**
 * Validation errors that block form submission.
 * A null value means the field is valid.
 */
export interface WithdrawValidationErrors {
  destination: string | null;
  amount: string | null;
}

/**
 * Validation warnings that do not block submission.
 * A null value means no warning for the field.
 */
export interface WithdrawValidationWarnings {
  amount: string | null;
}
