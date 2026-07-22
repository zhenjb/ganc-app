import { describe, it, expect, vi, afterEach } from "vitest";

// Isolate from env: getChainSpec() otherwise requires several NEXT_PUBLIC_* vars.
vi.mock("./chainConfig", () => ({ getChainSpec: () => ({ chainId: "ob-1" }) }));

import { signOrderAdr36 } from "./orderSign";
import { orderCanonicalString } from "@/app/lib/services/trade/orderSigner";

const ORDER = {
  owner: "cosmos1abc",
  market: "ATOM/USDC",
  side: "buy" as const,
  price: "1",
  qty: "1",
  expiry: "2000000",
  nonce: "7",
};

function win(): Record<string, unknown> {
  return window as unknown as Record<string, unknown>;
}

afterEach(() => {
  delete win().keplr;
  delete win().leap;
  vi.restoreAllMocks();
});

describe("signOrderAdr36", () => {
  it("signs the canonical bytes via ADR-036 and maps signature + pubkey", async () => {
    const enable = vi.fn().mockResolvedValue(undefined);
    const signArbitrary = vi.fn().mockResolvedValue({
      signature: "SIG_B64",
      pub_key: { type: "tendermint/PubKeySecp256k1", value: "PUB_B64" },
    });
    win().keplr = { enable, signArbitrary };

    const out = await signOrderAdr36(ORDER);

    expect(enable).toHaveBeenCalledWith("ob-1");
    expect(signArbitrary).toHaveBeenCalledWith("ob-1", "cosmos1abc", orderCanonicalString(ORDER));
    expect(out).toEqual({ signature: "SIG_B64", pubkey: "PUB_B64" });
  });

  it("throws when no wallet is present", async () => {
    await expect(signOrderAdr36(ORDER)).rejects.toThrow(/wallet/i);
  });
});
