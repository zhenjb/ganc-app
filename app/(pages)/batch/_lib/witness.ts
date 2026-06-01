/**
 * Pure helpers for the Witness panel of the Batch screen.
 * No side effects — each function maps its inputs to a display string.
 */

/** Single Unicode ellipsis character (U+2026) used as the elision separator. */
const ELLIPSIS = "…";

/** Fixed mask applied to secret auxiliary values, exactly 8 asterisks. */
const SECRET_MASK = "********";

/** Substring (case-insensitive) that marks an auxiliary key as secret. */
const SECRET_KEY_MARKER = "secret";

/**
 * Shortens a witness input hex string for display.
 *
 * When the input is longer than 10 hex characters, it is collapsed to the first
 * 6 characters, the ellipsis separator, and the last 4 characters. Inputs with
 * 10 hex characters or fewer are returned verbatim. The threshold is measured on
 * the raw character count of the provided string.
 *
 * @param hex - The witness input hex string to shorten
 * @returns The shortened representation, or the verbatim input when short enough
 */
export function shortenWitnessInput(hex: string): string {
  if (hex.length > 10) {
    return `${hex.slice(0, 6)}${ELLIPSIS}${hex.slice(-4)}`;
  }
  return hex;
}

/**
 * Masks an auxiliary witness value when it represents a secret.
 *
 * Returns the fixed 8-character mask if (and only if) the key contains the
 * substring "secret" (case-insensitive) AND secrets are hidden
 * (`showSecret === false`). In every other case the original value is returned
 * verbatim. The mask is independent of the real value's length.
 *
 * @param key - The auxiliary entry key
 * @param value - The auxiliary entry value
 * @param showSecret - Whether the "Show secret (dev only)" toggle is on
 * @returns The fixed mask for hidden secrets, otherwise the original value
 */
export function maskAuxValue(
  key: string,
  value: string,
  showSecret: boolean
): string {
  const isSecret = key.toLowerCase().includes(SECRET_KEY_MARKER);
  if (isSecret && !showSecret) {
    return SECRET_MASK;
  }
  return value;
}
