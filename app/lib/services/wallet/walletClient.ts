// =============================================================================
// Wallet client (FE-14)
// -----------------------------------------------------------------------------
// Browser-only adapter that:
//   1. connects Keplr or Leap (in that priority order),
//   2. signs `/ob.zkdex.v1.MsgDeposit`,
//   3. broadcasts via SigningStargateClient,
//   4. parses `deposit_id` from `ob.zkdex.v1.EventDeposit` if present.
//
// Every failure (no wallet, user reject, fee insufficient, rpc timeout, code
// !== 0, ...) is logged via `console.error` and re-thrown as a normalized
// `ApiError("Internal Server Error", 500)` so the UI can surface exactly one
// English message (product rule: single normalized error).
// =============================================================================

import type { Keplr } from "@keplr-wallet/types";
import { SigningStargateClient, type DeliverTxResponse } from "@cosmjs/stargate";
import type { OfflineSigner } from "@cosmjs/proto-signing";
import { ApiError } from "@/app/lib/interfaces/api";
import type {
  WalletConnection,
  WalletProvider,
  BroadcastDepositResult,
} from "@/app/lib/interfaces/wallet";
import { getChainInfo, getChainSpec } from "./chainConfig";
import {
  buildDepositRegistry,
  EVENT_DEPOSIT_TYPE,
  MSG_DEPOSIT_TYPE_URL,
  type MsgDeposit,
} from "./msgDeposit";

declare global {
  interface Window {
    keplr?: Keplr;
    leap?: Keplr;
  }
}

function pickProvider(): { name: WalletProvider; api: Keplr } {
  if (typeof window === "undefined") {
    throw new Error("walletClient is browser-only");
  }
  if (window.keplr) return { name: "keplr", api: window.keplr };
  if (window.leap) return { name: "leap", api: window.leap };
  throw new Error("No wallet detected (Keplr or Leap required)");
}

function normalizeError(err: unknown, context: string): never {
  const raw = err instanceof Error ? err.message : String(err);
  // User dismissed the wallet popup — a normal cancellation, not a system
  // error. Keplr/Leap phrase it as "Request rejected" / "rejected" / "denied".
  if (/reject|denied|cancel/i.test(raw)) {
    throw new ApiError("Transaction cancelled", 499);
  }
  // Genuine wallet/broadcast failure: log it (dev overlay) and surface the real
  // reason instead of a generic 500.
  console.error(`[FE-14] wallet error: ${context}`, err);
  throw new ApiError(raw.trim() !== "" ? raw : "Wallet request failed", 500);
}

/**
 * Request wallet connection, suggesting the chain to Keplr if it's missing.
 * Returns the active bech32 address + chain id + provider name.
 */
export async function connectWallet(): Promise<WalletConnection> {
  try {
    const spec = getChainSpec();
    const { name, api } = pickProvider();

    // Keplr/Leap throw if the chain is unknown. Suggest first, then enable.
    try {      console.log('connect 1')
      await api.experimentalSuggestChain(getChainInfo());
      console.log('connect')
    } catch (suggestErr) {
      // Some wallets (e.g. Leap with allowlisted chain) may already know the
      // chain and reject suggest. That's fine — fall through to enable.
      console.warn("[FE-14] suggestChain skipped", suggestErr);
    }

    await api.enable(spec.chainId);
    const key = await api.getKey(spec.chainId);

    if (!key.bech32Address || key.bech32Address === "") {
      throw new Error("Wallet returned empty bech32Address");
    }

    return {
      address: key.bech32Address,
      chainId: spec.chainId,
      provider: name,
    };
  } catch (err) {
    normalizeError(err, "connectWallet");
  }
}

async function getSigner(chainId: string): Promise<OfflineSigner> {
  const { api } = pickProvider();
  // Prefer the direct signer (proto) over amino — cosmjs supports both via
  // SigningStargateClient.connectWithSigner.
  return api.getOfflineSigner(chainId) as OfflineSigner;
}

/**
 * Walk through `tx.events` and return the `deposit_id` attribute of the
 * first `ob.zkdex.v1.EventDeposit` event. Returns null when not found.
 */
function parseDepositId(result: DeliverTxResponse): string | null {
  const events = result.events ?? [];
  for (const ev of events) {
    if (ev.type !== EVENT_DEPOSIT_TYPE) continue;
    for (const attr of ev.attributes) {
      if (attr.key === "deposit_id") {
        // Cosmos SDK ≥0.50 returns plain strings; older nodes returned
        // base64-wrapped values surrounded by quotes. Trim both forms.
        return attr.value.replace(/^"|"$/g, "");
      }
    }
  }
  return null;
}

/**
 * Sign + broadcast a single MsgDeposit. Throws ApiError(500) on any failure.
 */
export async function broadcastDeposit(
  msg: MsgDeposit
): Promise<BroadcastDepositResult> {
  try {
    const spec = getChainSpec();

    // Sanity: connected wallet must match the configured chain.
    const { api } = pickProvider();

    // Keep the fee we pass (defaultFeeAmount) instead of letting Keplr
    // recompute it via gasPriceStep × gas (which would charge the user).
    api.defaultOptions = {
      ...api.defaultOptions,
      sign: {
        ...api.defaultOptions?.sign,
        preferNoSetFee: true,
        disableBalanceCheck: true,
      },
    };

    const key = await api.getKey(spec.chainId);
    if (key.bech32Address !== msg.creator) {
      throw new Error(
        `Wallet address mismatch: signer=${key.bech32Address} msg.creator=${msg.creator}`
      );
    }

    const signer = await getSigner(spec.chainId);
    const client = await SigningStargateClient.connectWithSigner(
      spec.rpc,
      signer,
      { registry: buildDepositRegistry() }
    );

    const fee = {
      amount: [{ denom: spec.feeDenom, amount: spec.defaultFeeAmount }],
      gas: spec.defaultGas,
    };

    const result = await client.signAndBroadcast(
      msg.creator,
      [{ typeUrl: MSG_DEPOSIT_TYPE_URL, value: msg }],
      fee
    );

    if (result.code !== 0) {
      console.error("[FE-14] tx failed", {
        code: result.code,
        rawLog: result.rawLog,
      });
      throw new ApiError("Internal Server Error", 500);
    }

    return {
      txHash: `0x${result.transactionHash.toLowerCase()}`,
      depositId: parseDepositId(result),
    };
  } catch (err) {
    if (err instanceof ApiError) throw err;
    normalizeError(err, "broadcastDeposit");
  }
}
