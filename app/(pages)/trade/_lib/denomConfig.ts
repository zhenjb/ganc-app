// =============================================================================
// Denom → display mapping for the trading screen
// =============================================================================

export interface DenomInfo {
  symbol: string;
  name: string;
  /** CSS color for the coin icon circle */
  color: string;
}

const DENOM_MAP: Record<string, DenomInfo> = {
  // Display symbols
  ETH: { symbol: "ETH", name: "Ethereum", color: "#627EEA" },
  USDC: { symbol: "USDC", name: "USD Coin", color: "#2775CA" },
  BTC: { symbol: "BTC", name: "Bitcoin", color: "#F7931A" },
  USDT: { symbol: "USDT", name: "Tether", color: "#26A17B" },
  ATOM: { symbol: "ATOM", name: "Cosmos", color: "#2E3148" },
  OSMO: { symbol: "OSMO", name: "Osmosis", color: "#750BBB" },
  // Cosmos micro-denoms (the smallest unit the backend/state uses). Mapped to
  // the SAME display info as their symbol so the UI never shows raw "uxxx".
  uatom: { symbol: "ATOM", name: "Cosmos", color: "#2E3148" },
  uosmo: { symbol: "OSMO", name: "Osmosis", color: "#750BBB" },
  uusdc: { symbol: "USDC", name: "USD Coin", color: "#2775CA" },
  uusdt: { symbol: "USDT", name: "Tether", color: "#26A17B" },
};

/**
 * Normalizes a Cosmos micro-denom ("u" + lowercase symbol, e.g. "uosmo") to its
 * display symbol ("OSMO"). Non-micro strings are uppercased as-is. This keeps
 * even unmapped denoms readable ("uxyz" → "XYZ") instead of raw.
 */
function displaySymbol(denom: string): string {
  return /^u[a-z]{2,}$/.test(denom) ? denom.slice(1).toUpperCase() : denom.toUpperCase();
}

export function getDenomInfo(denom: string): DenomInfo {
  // 1. Exact match (display symbol or known micro-denom).
  // 2. Fall back to the normalized symbol so "uosmo" resolves to the OSMO entry
  //    and unknown micro-denoms still render a clean uppercase symbol.
  const symbol = displaySymbol(denom);
  return (
    DENOM_MAP[denom] ??
    DENOM_MAP[symbol] ?? { symbol, name: symbol, color: "#8B86A6" }
  );
}

export function getDenomSymbol(denom: string): string {
  return getDenomInfo(denom).symbol;
}
