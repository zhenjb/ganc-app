// =============================================================================
// Order signing — real Cosmos ADR-036 (secp256k1) via the browser wallet.
// -----------------------------------------------------------------------------
// The user's wallet (Keplr / Leap) signs the order's CANONICAL bytes with
// `signArbitrary` (ADR-036 arbitrary-message signing). The backend
// (ADR036OrderSignatureVerifier, ORDER_SIG_MODE=adr36) reconstructs the same
// ADR-036 envelope, verifies the secp256k1 signature, and binds the signer
// pubkey to order.Owner. Replaces the mock signer for real order auth.
// =============================================================================

import type { Keplr } from "@keplr-wallet/types";
import { getChainSpec } from "./chainConfig";
import { orderCanonicalString, type SignableOrder } from "@/app/lib/services/trade/orderSigner";

/** Base64 signature + base64 compressed pubkey the backend expects. */
export interface OrderSignature {
  signature: string;
  pubkey: string;
}

function pickProvider(): Keplr {
  if (typeof window === "undefined") {
    throw new Error("order signing is browser-only");
  }
  const w = window as unknown as { keplr?: Keplr; leap?: Keplr };
  if (w.keplr) return w.keplr;
  if (w.leap) return w.leap;
  throw new Error("No wallet detected (Keplr or Leap required)");
}

/**
 * Sign an order with the connected wallet via ADR-036. `order.owner` MUST be the
 * connected wallet address (the wallet signs as that account); the backend then
 * asserts the recovered pubkey derives to it. Returns the base64 signature and
 * base64 compressed pubkey to POST alongside the order.
 */
export async function signOrderAdr36(order: SignableOrder): Promise<OrderSignature> {
  const { chainId } = getChainSpec();
  const provider = pickProvider();
  await provider.enable(chainId);

  const canonical = orderCanonicalString(order);
  const res = await provider.signArbitrary(chainId, order.owner, canonical);

  // res: StdSignature { signature: base64, pub_key: { type, value: base64 } }.
  return { signature: res.signature, pubkey: res.pub_key.value };
}
