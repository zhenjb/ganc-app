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
  ETH: { symbol: "ETH", name: "Ethereum", color: "#627EEA" },
  USDC: { symbol: "USDC", name: "USD Coin", color: "#2775CA" },
  BTC: { symbol: "BTC", name: "Bitcoin", color: "#F7931A" },
  USDT: { symbol: "USDT", name: "Tether", color: "#26A17B" },
  ATOM: { symbol: "ATOM", name: "Cosmos", color: "#2E3148" },
  uatom: { symbol: "ATOM", name: "Cosmos", color: "#2E3148" },
};

const DEFAULT_INFO: DenomInfo = { symbol: "???", name: "Unknown", color: "#8B86A6" };

export function getDenomInfo(denom: string): DenomInfo {
  return DENOM_MAP[denom] ?? { symbol: denom, name: denom, color: "#8B86A6" };
}

export function getDenomSymbol(denom: string): string {
  return (DENOM_MAP[denom] ?? DEFAULT_INFO).symbol;
}
