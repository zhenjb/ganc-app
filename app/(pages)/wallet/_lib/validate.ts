/**
 * Pure validation functions for the Deposit form.
 * No side effects — each function returns an error/warning message or null.
 */

/**
 * Validates a cosmos depositor address.
 * Must match the pattern: cosmos1 followed by at least 38 lowercase alphanumeric characters.
 *
 * @param value - The depositor address string to validate
 * @returns Error message if invalid, null if valid
 */
export function validateDepositor(value: string): string | null {
  const regex = /^cosmos1[a-z0-9]{38,}$/;
  if (!regex.test(value)) {
    return "Invalid cosmos address";
  }
  return null;
}

/**
 * Validates the deposit amount.
 * Must be a string representing a positive integer greater than 0.
 *
 * @param value - The amount string to validate
 * @returns Error message if invalid, null if valid
 */
export function validateAmount(value: string): string | null {
  // Check for non-numeric characters or decimal points
  if (!/^\d+$/.test(value)) {
    return "Amount must be a positive integer";
  }

  // Check if the integer is greater than 0
  const num = BigInt(value);
  if (num <= 0n) {
    return "Amount must be greater than 0";
  }

  return null;
}

/**
 * Validates whether the deposit amount exceeds the current balance.
 * This produces a warning (does not block submission).
 *
 * @param value - The amount string to check
 * @param currentBalance - The current balance string to compare against
 * @returns Warning message if amount exceeds balance, null otherwise
 */
export function validateAmountWarning(
  value: string,
  currentBalance: string
): string | null {
  const amount = BigInt(value);
  const balance = BigInt(currentBalance);

  if (amount > balance) {
    return "Amount exceeds available balance";
  }

  return null;
}

/**
 * Validates a transaction hash.
 * Must start with "0x" and have a total length of at least 10 characters.
 *
 * @param hash - The transaction hash string to validate
 * @returns Warning message if suspicious, null if valid
 */
export function validateTxHash(hash: string): string | null {
  if (!hash.startsWith("0x") || hash.length < 10) {
    return "Suspicious tx hash";
  }
  return null;
}
