export function shortenHex(
  hex: string,
  head: number = 6,
  tail: number = 4
): string {
  if (typeof hex !== "string") return "";
  // hex starts with "0x"; the threshold accounts for that prefix.
  if (hex.length <= head + tail + 2) return hex;
  return `${hex.slice(0, head + 2)}…${hex.slice(-tail)}`;
}

export function formatAmount(amount: string, denom: string): string {
  // Use BigInt to preserve precision for values ≥ 2^53 (Req 5.5).
  let big: bigint;
  try {
    big = BigInt(amount);
  } catch {
    throw new RangeError(`formatAmount: invalid amount "${amount}"`);
  }
  return `${big.toString()} ${denom}`;
}
