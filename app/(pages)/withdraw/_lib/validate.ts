/**
 * Pure validation functions for the Withdraw Request form.
 * No side effects — each function returns an error/warning message or null.
 */

/**
 * Validates a cosmos destination address.
 * Must match the pattern: cosmos1 followed by at least 38 lowercase alphanumeric characters.
 *
 * @param value - The destination address string to validate
 * @returns Error message if invalid, null if valid
 */
export function validateDestination(value: string): string | null {
  const regex = /^cosmos1[a-z0-9]{38,}$/;
  if (!regex.test(value)) {
    return "Invalid cosmos address";
  }
  return null;
}

/**
 * Validates the withdraw amount.
 * Must be a string representing a positive integer greater than 0.
 * Non-numeric strings, decimals, negatives, and empty input are rejected as
 * "Amount must be a positive integer"; "0" is rejected as
 * "Amount must be greater than 0".
 *
 * @param value - The amount string to validate
 * @returns Error message if invalid, null if valid
 */
export function validateAmount(value: string): string | null {
  // Reject anything that is not a sequence of digits (handles empty,
  // decimals, negatives, whitespace, and other non-numeric input).
  if (!/^\d+$/.test(value)) {
    return "Amount must be a positive integer";
  }

  // Digits-only strings (including leading zeros and very large values)
  // parse cleanly as BigInt; reject zero.
  const num = BigInt(value);
  if (num <= 0n) {
    return "Amount must be greater than 0";
  }

  return null;
}

/**
 * Validates whether the withdraw amount exceeds the current balance.
 * This produces a warning (does not block submission).
 * Assumes both inputs are valid integer strings; if parsing fails for any
 * reason, returns null so the warning never crashes the form.
 *
 * @param value - The amount string to check
 * @param currentBalance - The current balance string to compare against
 * @returns Warning message if amount exceeds balance, null otherwise
 */
export function validateAmountWarning(
  value: string,
  currentBalance: string
): string | null {
  try {
    const amount = BigInt(value);
    const balance = BigInt(currentBalance);

    if (amount > balance) {
      return "Amount exceeds available balance";
    }

    return null;
  } catch {
    // Guard against parse failures — never block on a malformed comparison.
    return null;
  }
}
