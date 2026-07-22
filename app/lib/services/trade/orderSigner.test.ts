// @vitest-environment node
//
// Golden-vector test for the mock order signer. Runs in the `node` environment
// (global config is jsdom) so Web Crypto `crypto.subtle` is guaranteed present.
//
// The expected signature is cross-checked against the ganc-sys backend signer
// `state.MockOrderSignature` (ganc-sys/p3/script-test/sign_order) for the same
// inputs — if the backend canonical/domain ever changes, this test fails first.
import { describe, it, expect } from "vitest";
import { signMockOrder, orderCanonicalString, type SignableOrder } from "./orderSigner";

const GOLDEN: SignableOrder = {
  owner: "cosmos1q0939u8prhhg4l4pyt06te7g054tc6ef7rwj6d",
  market: "ATOM/USDC",
  side: "sell",
  price: "122",
  qty: "100",
  expiry: "1900000000",
  nonce: "1784647697571",
};

const GOLDEN_SIG =
  "0xbe482ba86d56d164fe975afd8682ad74fbb055b12e84129a51728435a6251d4f";

describe("signMockOrder", () => {
  it("matches the ganc-sys backend golden vector byte-for-byte", async () => {
    expect(await signMockOrder(GOLDEN)).toBe(GOLDEN_SIG);
  });

  it("builds canonical: version first, '\\n' separators, no trailing newline", () => {
    expect(orderCanonicalString(GOLDEN)).toBe(
      "zkdex/order/v0\n" +
        "owner:cosmos1q0939u8prhhg4l4pyt06te7g054tc6ef7rwj6d\n" +
        "market:ATOM/USDC\n" +
        "side:sell\n" +
        "price:122\n" +
        "qty:100\n" +
        "expiry:1900000000\n" +
        "nonce:1784647697571"
    );
  });

  it("trims fields before signing (surrounding spaces do not change the sig)", async () => {
    // owner is padded too: it appears twice (canonical line + preimage prefix),
    // so this also checks both trim sites agree.
    const padded: SignableOrder = {
      ...GOLDEN,
      price: "  122  ",
      owner: `  ${GOLDEN.owner}  `,
    };
    expect(await signMockOrder(padded)).toBe(GOLDEN_SIG);
  });

  it("changes the signature when any signed field changes", async () => {
    const buy = await signMockOrder({ ...GOLDEN, side: "buy" });
    const nonce2 = await signMockOrder({ ...GOLDEN, nonce: "1784647697572" });
    expect(buy).not.toBe(GOLDEN_SIG);
    expect(nonce2).not.toBe(GOLDEN_SIG);
  });

  it("rejects empty or newline-bearing fields (matches backend)", () => {
    expect(() => orderCanonicalString({ ...GOLDEN, price: "" })).toThrow(/price/);
    expect(() => orderCanonicalString({ ...GOLDEN, owner: "a\nb" })).toThrow(/owner/);
  });
});
