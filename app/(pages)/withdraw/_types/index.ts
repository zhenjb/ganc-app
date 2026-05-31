/**
 * Form state for the withdraw request form.
 * Tracks user input for destination address, denomination, and amount.
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
export interface ValidationErrors {
  destination: string | null;
  amount: string | null;
}

/**
 * Validation warnings that do not block submission.
 * A null value means no warning for the field.
 */
export interface ValidationWarnings {
  amount: string | null;
}
