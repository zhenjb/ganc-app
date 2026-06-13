/**
 * Shorten a hex string for display purposes.
 *
 * - If input is not a string, returns "".
 * - If hex.length <= 18, returns it unchanged.
 * - If hex.length > 18, returns first 10 chars + "…" (U+2026) + last 6 chars.
 */
export function shortenHex(hex: unknown): string {
  if (typeof hex !== "string") return "";
  if (hex.length <= 18) return hex;
  return `${hex.slice(0, 10)}\u2026${hex.slice(-6)}`;
}
