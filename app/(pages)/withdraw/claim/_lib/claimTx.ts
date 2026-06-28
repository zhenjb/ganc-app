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
    const spec = getChainSpec();

    // 1. Pick wallet provider
    const { api } = pickProvider();

    // 2. Verify signer address matches creator
    const key = await api.getKey(spec.chainId);
    if (key.bech32Address !== creator) {
      throw new Error(
        `Wallet address mismatch: signer=${key.bech32Address} creator=${creator}`
      );
    }

    // 3. Get offline signer
    const signer = api.getOfflineSigner(spec.chainId) as OfflineSigner;

    // 4. Connect signing client with claim registry
    const client = await SigningStargateClient.connectWithSigner(
      spec.rpc,
      signer,
      { registry: buildClaimRegistry() }
    );

    // 5. Build fee and broadcast
    const fee = {
      amount: [{ denom: spec.feeDenom, amount: spec.defaultFeeAmount }],
      gas: spec.defaultGas,
    };

    const result = await client.signAndBroadcast(
      creator,
      [
        {
          typeUrl: MSG_CLAIM_WITHDRAW_TYPE_URL,
          value: { creator, withdrawId },
        },
      ],
      fee
    );

    // 6. Check for on-chain failure
    if (result.code !== 0) {
      console.error("[FE-09] tx failed", {
        code: result.code,
        rawLog: result.rawLog,
      });
      throw new ApiError("Internal Server Error", 500);
    }

    // 7. Return normalized txHash
    return {
      txHash: `0x${result.transactionHash.toLowerCase()}`,
    };
  } catch (err) {
    // Re-throw ApiError as-is
    if (err instanceof ApiError) throw err;
    // Let user rejection bubble up identifiably
    if (isUserReject(err)) throw err;
    normalizeError(err, "broadcastClaim");
  }
}
