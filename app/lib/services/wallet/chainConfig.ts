// =============================================================================
// Chain config (FE-14)
// -----------------------------------------------------------------------------
// Reads NEXT_PUBLIC_CHAIN_* env vars (P1 checklist mục 4) and produces:
//   1. ChainSpec — minimal shape used by walletClient.ts
//   2. ChainInfo — Keplr-compatible payload used for experimentalSuggestChain
//
// Throws explicit errors at call time when required envs are missing in real
// mode. Mock mode never imports this module (dynamic import in handleSubmit).
//
// IMPORTANT — Next.js inlines `NEXT_PUBLIC_*` env vars into the browser bundle
// via static text replacement. It only matches *literal* `process.env.<NAME>`
// expressions; dynamic access like `process.env[name]` is left as-is and
// resolves to `undefined` at runtime in the browser. So every var below MUST
// be referenced by its full literal name.
// See: https://nextjs.org/docs/pages/guides/environment-variables#bundling-environment-variables-for-the-browser
// =============================================================================

import type { ChainInfo, FeeCurrency, Currency } from "@keplr-wallet/types";

export interface ChainSpec {
  chainId: string;
  rpc: string;
  rest: string;
  bech32Prefix: string;
  feeDenom: string;
  defaultGas: string;
  defaultFeeAmount: string;
  /** Comma-separated list flattened to array, e.g. ["USDT", "uatom"]. */
  depositDenoms: string[];
}

function required(name: string, raw: string | undefined): string {
  const trimmed = raw?.trim() ?? "";
  if (trimmed === "") {
    throw new Error(`Missing required env: ${name}`);
  }
  return trimmed;
}

function optional(raw: string | undefined, fallback: string): string {
  const trimmed = raw?.trim() ?? "";
  return trimmed !== "" ? trimmed : fallback;
}

export function getChainSpec(): ChainSpec {
  // Literal references so Next.js can inline these into the client bundle.
  const chainId = required("NEXT_PUBLIC_CHAIN_ID", process.env.NEXT_PUBLIC_CHAIN_ID);
  const rpc = required("NEXT_PUBLIC_CHAIN_RPC", process.env.NEXT_PUBLIC_CHAIN_RPC);
  const rest = optional(process.env.NEXT_PUBLIC_CHAIN_REST, "");
  const bech32Prefix = optional(process.env.NEXT_PUBLIC_CHAIN_BECH32_PREFIX, "cosmos");
  const feeDenom = optional(process.env.NEXT_PUBLIC_CHAIN_FEE_DENOM, "uatom");
  const defaultGas = optional(process.env.NEXT_PUBLIC_CHAIN_DEFAULT_GAS, "200000");
  const defaultFeeAmount = optional(process.env.NEXT_PUBLIC_CHAIN_DEFAULT_FEE_AMOUNT, "0");
  const depositDenomsRaw = optional(
    process.env.NEXT_PUBLIC_CHAIN_DEPOSIT_DENOMS,
    "USDT,uatom"
  );
  const depositDenoms = depositDenomsRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return {
    chainId,
    rpc,
    rest,
    bech32Prefix,
    feeDenom,
    defaultGas,
    defaultFeeAmount,
    depositDenoms,
  };
}

/**
 * Build a Keplr-compatible ChainInfo for `experimentalSuggestChain`.
 * Coin decimals default to 6, which is correct for `USDT` / `uatom`.
 */
/**
 * Convert a minimal denom to its display form.
 * Cosmos SDK convention: `u` prefix = micro unit (e.g. `uatom` → `ATOM`).
 * If the denom is already uppercase or doesn't follow the u-prefix pattern
 * (e.g. `USDT`, `ATOM`), return it as-is.
 */
function toDisplayDenom(denom: string): string {
  // Only strip `u` when it's followed by all-lowercase letters (e.g. uatom, uosmo).
  // Tokens like USDT, ATOM are already display-form.
  if (/^u[a-z]+$/.test(denom)) {
    return denom.slice(1).toUpperCase();
  }
  return denom;
}

export function getChainInfo(): ChainInfo {
  const spec = getChainSpec();

  const feeCurrency: FeeCurrency = {
    coinDenom: toDisplayDenom(spec.feeDenom),
    coinMinimalDenom: spec.feeDenom,
    coinDecimals: 6,
    gasPriceStep: {
      low: 0.01,
      average: 0.025,
      high: 0.04,
    },
  };

  const currencies: Currency[] = spec.depositDenoms.map((denom) => ({
    coinDenom: toDisplayDenom(denom),
    coinMinimalDenom: denom,
    coinDecimals: 6,
  }));

  // Keplr requires the fee currency to also appear in `currencies`.
  if (!currencies.some((c) => c.coinMinimalDenom === spec.feeDenom)) {
    currencies.push({
      coinDenom: feeCurrency.coinDenom,
      coinMinimalDenom: spec.feeDenom,
      coinDecimals: 6,
    });
  }

  return {
    chainId: spec.chainId,
    chainName: spec.chainId,
    rpc: spec.rpc,
    rest: spec.rest,
    bip44: { coinType: 118 },
    bech32Config: {
      bech32PrefixAccAddr: spec.bech32Prefix,
      bech32PrefixAccPub: `${spec.bech32Prefix}pub`,
      bech32PrefixValAddr: `${spec.bech32Prefix}valoper`,
      bech32PrefixValPub: `${spec.bech32Prefix}valoperpub`,
      bech32PrefixConsAddr: `${spec.bech32Prefix}valcons`,
      bech32PrefixConsPub: `${spec.bech32Prefix}valconspub`,
    },
    currencies,
    feeCurrencies: [feeCurrency],
    stakeCurrency: feeCurrency,
  } as ChainInfo;
}
