// =============================================================================
// Order signer (MOCK) — FE side of the ganc-sys order-signature contract.
// -----------------------------------------------------------------------------
// Reproduces, byte-for-byte, the mock order signature that the ganc-sys backend
// recomputes and verifies in `MockOrderSignatureVerifier`. This is NOT a real
// wallet signature (no private key, no public-key crypto) — it is a
// deterministic hash binding used for the MVP. It mirrors:
//   - ganc-sys/pkg/types/trade.go            (CanonicalString: version + fields)
//   - ganc-sys/internal/state/order_signature.go (domain + mockOrderSignatureFor)
//
//   canonical = "zkdex/order/v0"
//               + "\n" + "owner:"  + owner
//               + "\n" + "market:" + market
//               + "\n" + "side:"   + side
//               + "\n" + "price:"  + price
//               + "\n" + "qty:"    + qty
//               + "\n" + "expiry:" + expiry
//               + "\n" + "nonce:"  + nonce      (each value trimmed; no trailing \n)
//   preimage  = "zkdex/orderSig/mock/v0" + "|" + owner + "|" + canonical
//   signature = "0x" + lowerhex( SHA-256( utf8(preimage) ) )
//
// SECURITY (known limitation): it hashes only public data, so anyone can forge it
// for any owner — it does NOT prove the owner authorized the order. Replace with a
// real ADR-036 / secp256k1 wallet signature (and a matching backend verifier)
// before handling real value. See Document/dbcheck.md §7.4.
// =============================================================================

import type { OrderInput } from "@/app/lib/interfaces/trade";

/** The canonical (signed) fields of an order — everything except the signature. */
export type SignableOrder = Omit<OrderInput, "signature">;

const ORDER_CANONICAL_VERSION = "zkdex/order/v0";
const MOCK_ORDER_SIG_DOMAIN = "zkdex/orderSig/mock/v0";

/** Ordered (label, value) pairs of the canonical preimage. The order is FROZEN. */
function canonicalFields(o: SignableOrder): ReadonlyArray<readonly [string, string]> {
  return [
    ["owner", o.owner.trim()],
    ["market", o.market.trim()],
    ["side", o.side.trim()],
    ["price", o.price.trim()],
    ["qty", o.qty.trim()],
    ["expiry", o.expiry.trim()],
    ["nonce", o.nonce.trim()],
  ];
}

/**
 * Build the canonical string that is signed/hashed for an order — identical
 * bytes to ganc-sys `SignedOrder.CanonicalString()`: version first, one
 * `label:value` per line joined by `\n`, no trailing newline. Throws if any
 * field is empty or contains a newline (which could forge field boundaries),
 * matching the backend's rejection.
 */
export function orderCanonicalString(o: SignableOrder): string {
  let s = ORDER_CANONICAL_VERSION;
  for (const [label, value] of canonicalFields(o)) {
    if (value === "") {
      throw new Error(`order canonical field "${label}" is empty`);
    }
    if (/[\r\n]/.test(value)) {
      throw new Error(`order canonical field "${label}" contains a newline`);
    }
    s += `\n${label}:${value}`;
  }
  return s;
}

/** Lowercase hex encoding of a byte buffer. */
function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Compute the mock order signature the backend expects:
 *   "0x" + hex( SHA-256( "zkdex/orderSig/mock/v0" | owner | canonicalBytes ) )
 *
 * IMPORTANT: call this with the EXACT field values that will be POSTed, then send
 * that same object (sign-then-send). Signing a stale `expiry`/`nonce` and sending
 * different values yields `bad_signature` on the backend.
 */
export async function signMockOrder(o: SignableOrder): Promise<string> {
  const preimage = `${MOCK_ORDER_SIG_DOMAIN}|${o.owner.trim()}|${orderCanonicalString(o)}`;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(preimage));
  return `0x${toHex(digest)}`;
}
