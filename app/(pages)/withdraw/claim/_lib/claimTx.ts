// =============================================================================
// Custom proto: /ob.zkdex.v1.MsgClaimWithdraw (FE-09)
// -----------------------------------------------------------------------------
// Encodes/decodes the MsgClaimWithdraw cosmos message for the claim flow.
// Wire layout:
//   field 1 (creator)     tag 0x0a, length-delimited string
//   field 2 (withdrawId)  tag 0x12, length-delimited string
//
// Follows the same protobufjs/minimal pattern used by msgDeposit.ts (FE-14).
// =============================================================================

import { Registry } from "@cosmjs/proto-signing";
import { defaultRegistryTypes, SigningStargateClient } from "@cosmjs/stargate";
import type { OfflineSigner } from "@cosmjs/proto-signing";
import * as _m0 from "protobufjs/minimal";
import type { Keplr } from "@keplr-wallet/types";
import { ApiError } from "@/app/lib/interfaces/api";
import { getChainSpec } from "@/app/lib/services/wallet/chainConfig";

declare global {
  interface Window {
    keplr?: Keplr;
    leap?: Keplr;
  }
}

export const MSG_CLAIM_WITHDRAW_TYPE_URL = "/ob.zkdex.v1.MsgClaimWithdraw";

export interface MsgClaimWithdraw {
  creator: string;
  withdrawId: string;
}

export const MsgClaimWithdraw = {
  typeUrl: MSG_CLAIM_WITHDRAW_TYPE_URL,

  encode(message: MsgClaimWithdraw, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.creator !== "") {
      writer.uint32(10).string(message.creator);
    }
    if (message.withdrawId !== "") {
      writer.uint32(18).string(message.withdrawId);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): MsgClaimWithdraw {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    const end = length === undefined ? reader.len : reader.pos + length;
    const message: MsgClaimWithdraw = { creator: "", withdrawId: "" };
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) break;
          message.creator = reader.string();
          continue;
        case 2:
          if (tag !== 18) break;
          message.withdrawId = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) break;
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromPartial(object: Partial<MsgClaimWithdraw>): MsgClaimWithdraw {
    return {
      creator: object.creator ?? "",
      withdrawId: object.withdrawId ?? "",
    };
  },
};

/**
 * Registry that augments cosmjs default tx types with MsgClaimWithdraw.
 * Hand this to `SigningStargateClient.connectWithSigner(rpc, signer, { registry })`.
 */
export function buildClaimRegistry(): Registry {
  return new Registry([
    ...defaultRegistryTypes,
    [MSG_CLAIM_WITHDRAW_TYPE_URL, MsgClaimWithdraw],
  ]);
}

/**
 * Amino type converter for MsgClaimWithdraw.
 * Required when using getOfflineSignerOnlyAmino — Keplr needs Amino encoding
 * to render the approval popup for custom message types.
 */
export const aminoClaimConverter = {
  "/ob.zkdex.v1.MsgClaimWithdraw": {
    aminoType: "zkdex/MsgClaimWithdraw",
    toAmino: (msg: MsgClaimWithdraw) => ({
      creator: msg.creator,
      withdraw_id: msg.withdrawId,
    }),
    fromAmino: (msg: { creator: string; withdraw_id: string }): MsgClaimWithdraw => ({
      creator: msg.creator,
      withdrawId: msg.withdraw_id,
    }),
  },
};

// -- Wallet helpers (mirrors walletClient.ts pattern) -------------------------

function pickProvider(): { api: Keplr } {
  if (typeof window === "undefined") {
    throw new Error("claimTx is browser-only");
  }
  if (window.keplr) return { api: window.keplr };
  if (window.leap) return { api: window.leap };
  throw new Error("No wallet detected (Keplr or Leap required)");
}

function normalizeError(err: unknown, context: string): never {
  console.error(`[FE-09] claim error: ${context}`, err);
  throw new ApiError("Internal Server Error", 500);
}

function isUserReject(err: unknown): boolean {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    return msg.includes("request rejected") || msg.includes("rejected");
  }
  return false;
}

/**
 * Sign and broadcast a MsgClaimWithdraw transaction.
 * Follows the exact same flow as broadcastDeposit in walletClient.ts:
 *   1. pickProvider() → wallet API
 *   2. Verify key.bech32Address === creator
 *   3. getSigner() → OfflineSigner
 *   4. SigningStargateClient.connectWithSigner(rpc, signer, { registry })
 *   5. signAndBroadcast(creator, [msg], fee)
 *   6. Check result.code !== 0 → throw ApiError
 *   7. Return { txHash: `0x${hash}` }
 */
export async function broadcastClaim(
  withdrawId: string,
  creator: string
): Promise<{ txHash: string }> {
  try {
    console.log("[FE-09 DEBUG] broadcastClaim START", { withdrawId, creator });

    const spec = getChainSpec();
    console.log("[FE-09 DEBUG] chainSpec:", spec);

    // 1. Pick wallet provider and configure sign options BEFORE building the
    //    signer. Two flags matter here:
    //      - preferNoSetFee: keep the fee we pass ("1 uUSDT") instead of
    //        letting Keplr recompute it via gasPriceStep × gas (which would
    //        yield 5000 uUSDT and force the user to hold USDT for fee).
    //      - disableBalanceCheck: Keplr fetches balances from the LCD/REST
    //        endpoint before enabling the Approve button. On Codespaces our
    //        REST URL blocks CORS and Keplr shows "Failed to fetch balance",
    //        disabling Approve. This flag tells Keplr to trust the on-chain
    //        antehandler for balance validation.
    //    Order matters: defaultOptions is consumed when getOfflineSigner
    //    builds the internal signer, so it MUST be set beforehand.
    const { api } = pickProvider();
    console.log("[FE-09 DEBUG] step 1: wallet provider picked");

    api.defaultOptions = {
      ...api.defaultOptions,
      sign: {
        ...api.defaultOptions?.sign,
        preferNoSetFee: true,
        disableBalanceCheck: true,
      },
    };

    // 2. Verify signer address matches creator
    const key = await api.getKey(spec.chainId);
    console.log("[FE-09 DEBUG] step 2: getKey result:", {
      bech32Address: key.bech32Address,
      creatorMatch: key.bech32Address === creator,
    });
    if (key.bech32Address !== creator) {
      throw new Error(
        `Wallet address mismatch: signer=${key.bech32Address} creator=${creator}`
      );
    }

    // 3. Get offline signer — Direct (protobuf) for SDK v0.50+ chains.
    const signer = api.getOfflineSigner(spec.chainId) as OfflineSigner;
    console.log("[FE-09 DEBUG] step 3: offline signer obtained (direct)");

    // 4. Connect signing client with claim registry
    console.log("[FE-09 DEBUG] step 4: connecting SigningStargateClient to RPC:", spec.rpc);
    const client = await SigningStargateClient.connectWithSigner(
      spec.rpc,
      signer,
      { registry: buildClaimRegistry() }
    );
    console.log("[FE-09 DEBUG] step 4: SigningStargateClient connected");

    // 5. Build fee and broadcast. `signAndBroadcast` runs its own simulation
    // internally — no need to call `client.simulate` beforehand.
    const fee = {
      amount: [{ denom: spec.feeDenom, amount: spec.defaultFeeAmount }],
      gas: spec.defaultGas,
    };
    console.log("[FE-09 DEBUG] step 5: calling signAndBroadcast with fee:", fee);
    console.log("[FE-09 DEBUG] step 5: msg:", {
      typeUrl: MSG_CLAIM_WITHDRAW_TYPE_URL,
      value: { creator, withdrawId },
    });

    let result;
    try {
      console.log("[FE-09 DEBUG] step 5: about to signAndBroadcast...");
      result = await client.signAndBroadcast(
        creator,
        [
          {
            typeUrl: MSG_CLAIM_WITHDRAW_TYPE_URL,
            value: { creator, withdrawId },
          },
        ],
        fee
      );
    } catch (signErr) {
      console.error("[FE-09 DEBUG] step 5: signAndBroadcast THREW:", signErr);
      throw signErr;
    }
    console.log("[FE-09 DEBUG] step 5: signAndBroadcast result:", {
      code: result.code,
      transactionHash: result.transactionHash,
      rawLog: result.rawLog,
    });

    // 6. Check for on-chain failure
    if (result.code !== 0) {
      console.error("[FE-09] tx failed", {
        code: result.code,
        rawLog: result.rawLog,
      });
      throw new ApiError("Internal Server Error", 500);
    }

    // 7. Return normalized txHash
    console.log("[FE-09 DEBUG] broadcastClaim SUCCESS:", result.transactionHash);
    return {
      txHash: `0x${result.transactionHash.toLowerCase()}`,
    };
  } catch (err) {
    console.error("[FE-09 DEBUG] broadcastClaim CAUGHT ERROR:", err);
    // Re-throw ApiError as-is
    if (err instanceof ApiError) throw err;
    // Let user rejection bubble up identifiably
    if (isUserReject(err)) throw err;
    normalizeError(err, "broadcastClaim");
  }
}
