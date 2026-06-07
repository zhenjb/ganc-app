// =============================================================================
// Custom proto: /ob.zkdex.v1.MsgDeposit (FE-14)
// -----------------------------------------------------------------------------
// Per P1 checklist mục 1–2:
//   typeUrl  = "/ob.zkdex.v1.MsgDeposit"   (NOT ob.backend.v1.MsgDeposit)
//   creator  = signer wallet address
//   denom    = e.g. "USDT"
//   amount   = decimal string (BigInt-safe)
//
// Encode/decode is implemented manually with `protobufjs/minimal` (already a
// transitive dep of cosmjs-types) so we don't need to ship a proto compiler.
// Wire layout:
//   field 1 (creator) tag 0x0a, length-delimited string
//   field 2 (denom)   tag 0x12, length-delimited string
//   field 3 (amount)  tag 0x1a, length-delimited string
// =============================================================================

import { Registry } from "@cosmjs/proto-signing";
import { defaultRegistryTypes } from "@cosmjs/stargate";
import * as _m0 from "protobufjs/minimal";

export const MSG_DEPOSIT_TYPE_URL = "/ob.zkdex.v1.MsgDeposit";
export const EVENT_DEPOSIT_TYPE = "ob.zkdex.v1.EventDeposit";

export interface MsgDeposit {
  creator: string;
  denom: string;
  amount: string;
}

export const MsgDeposit = {
  typeUrl: MSG_DEPOSIT_TYPE_URL,

  encode(message: MsgDeposit, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.creator !== "") {
      writer.uint32(10).string(message.creator);
    }
    if (message.denom !== "") {
      writer.uint32(18).string(message.denom);
    }
    if (message.amount !== "") {
      writer.uint32(26).string(message.amount);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): MsgDeposit {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    const end = length === undefined ? reader.len : reader.pos + length;
    const message: MsgDeposit = { creator: "", denom: "", amount: "" };
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) break;
          message.creator = reader.string();
          continue;
        case 2:
          if (tag !== 18) break;
          message.denom = reader.string();
          continue;
        case 3:
          if (tag !== 26) break;
          message.amount = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) break;
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromPartial(object: Partial<MsgDeposit>): MsgDeposit {
    return {
      creator: object.creator ?? "",
      denom: object.denom ?? "",
      amount: object.amount ?? "",
    };
  },
};

/**
 * Registry that augments cosmjs default tx types with our custom MsgDeposit.
 * Hand this to `SigningStargateClient.connectWithSigner(rpc, signer, { registry })`.
 */
export function buildDepositRegistry(): Registry {
  return new Registry([
    ...defaultRegistryTypes,
    [MSG_DEPOSIT_TYPE_URL, MsgDeposit],
  ]);
}
