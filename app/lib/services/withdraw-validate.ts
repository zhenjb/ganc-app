/**
 * Shared pure validation functions for withdraw request forms.
 * Promoted from app/(pages)/withdraw/_lib/validate.ts for reuse across pages.
 * No side effects — each function returns an error/warning message or null.
 */

/**
 * Validates a cosmos destination address.
 * Must match the pattern: cosmos1 followed by at least 38 lowercase alphanumeric characters.
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
 */
export function validateWithdrawAmount(value: string): string | null {
  if (!/^\d+$/.test(value)) {
    return "Amount must be a positive integer";
  }
  const num = BigInt(value);
  if (num <= 0n) {
    return "Amount must be greater than 0";
  }
  return null;
}

/**
 * Produces a warning if the withdraw amount exceeds the current balance.
 * Does not block submission.
 */
export function validateWithdrawAmountWarning(
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
    return null;
  }
}
