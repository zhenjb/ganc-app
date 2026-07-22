// Generate Keplr-equivalent ADR-036 order-signature test vectors using cosmjs
// (the same amino serialization + secp256k1 Keplr's signArbitrary uses).
//
// Emits TWO vectors, consumed by the ganc-sys Go verifier test:
//   valid          — owner == address derived from the signing pubkey (honest).
//   impersonation   — a VALID signature under key1, but the order claims owner =
//                     address of key2. The Go verifier must REJECT this via the
//                     pubkey->owner binding (proves the binding, not just sig).
//
//   Run from ganc-app:  node scripts/gen-adr036-vector.mjs
import { Secp256k1, sha256 } from "@cosmjs/crypto";
import { serializeSignDoc, pubkeyToAddress, encodeSecp256k1Pubkey } from "@cosmjs/amino";
import { toBase64, toHex, fromHex } from "@cosmjs/encoding";

const PRIV1 = fromHex("1111111111111111111111111111111111111111111111111111111111111111");
const PRIV2 = fromHex("2222222222222222222222222222222222222222222222222222222222222222");

function orderCanonical(o) {
  const F = [
    ["owner", o.owner], ["market", o.market], ["side", o.side],
    ["price", o.price], ["qty", o.qty], ["expiry", o.expiry], ["nonce", o.nonce],
  ];
  let s = "zkdex/order/v0";
  for (const [k, v] of F) s += `\n${k}:${String(v).trim()}`;
  return s;
}

async function keyMaterial(priv) {
  const kp = await Secp256k1.makeKeypair(priv);
  const compressed = Secp256k1.compressPubkey(kp.pubkey);
  const owner = pubkeyToAddress(encodeSecp256k1Pubkey(compressed), "cosmos");
  return { compressed, owner };
}

// Sign `canonical` for a claimed `owner` using `priv`.
async function sign(priv, compressed, owner, canonical) {
  const signDoc = {
    chain_id: "", account_number: "0", sequence: "0",
    fee: { gas: "0", amount: [] },
    msgs: [{ type: "sign/MsgSignData", value: { signer: owner, data: toBase64(new TextEncoder().encode(canonical)) } }],
    memo: "",
  };
  const signBytes = serializeSignDoc(signDoc);
  const ext = await Secp256k1.createSignature(sha256(signBytes), priv);
  const sig64 = new Uint8Array([...ext.r(32), ...ext.s(32)]);
  return {
    pubkeyBase64: toBase64(compressed),
    signatureBase64: toBase64(sig64),
    signBytesHex: toHex(signBytes),
  };
}

const k1 = await keyMaterial(PRIV1);
const k2 = await keyMaterial(PRIV2);

// valid: owner = addr(key1), signed by key1.
const validOrder = { owner: k1.owner, market: "ATOM/USDC", side: "buy", price: "100", qty: "20", expiry: "2000000", nonce: "1" };
const validCanon = orderCanonical(validOrder);
const valid = { order: validOrder, canonical: validCanon, owner: k1.owner, ...(await sign(PRIV1, k1.compressed, k1.owner, validCanon)) };

// impersonation: order claims owner = addr(key2), but is signed by key1.
const impOrder = { owner: k2.owner, market: "ATOM/USDC", side: "buy", price: "100", qty: "20", expiry: "2000000", nonce: "1" };
const impCanon = orderCanonical(impOrder);
const impersonation = {
  order: impOrder, canonical: impCanon,
  ownerClaimed: k2.owner, signerAddr: k1.owner,
  ...(await sign(PRIV1, k1.compressed, k2.owner, impCanon)), // key1 signs a doc claiming owner=k2
};

console.log(JSON.stringify({
  note: "Keplr-equivalent ADR-036 order vectors (cosmjs). Deterministic. Do not use these keys.",
  valid,
  impersonation,
}, null, 2));
