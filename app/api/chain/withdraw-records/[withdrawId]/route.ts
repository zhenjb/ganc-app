// =============================================================================
// GET /api/chain/withdraw-records/{withdrawId} — mock route handler (dev-only)
// -----------------------------------------------------------------------------
// Mirrors the real ganc-sys chain-query endpoint used by the claim page to
// decide whether a withdraw has been settled on-chain (and is therefore
// claimable). In the mock/offline demo there is no operator/sequencer, so any
// known withdraw is treated as already settled + not-yet-claimed → claimable.
// The real backend returns 404 until the batch is settled.
// =============================================================================

import { NextResponse } from "next/server";
import { mockState } from "@/app/api/_mock/state";

export async function GET(
  _request: Request,
  context: { params: Promise<{ withdrawId: string }> }
): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  const { withdrawId } = await context.params;
  const latest = mockState.latestWithdrawRequest;

  return NextResponse.json(
    {
      withdrawRecord: {
        withdrawId,
        owner: latest?.destination ?? "",
        denom: latest?.denom ?? "USDT",
        amount: latest?.amount ?? "0",
        destination: latest?.destination ?? "",
        nullifier: latest?.nullifier ?? "",
        claimed: false,
      },
    },
    { status: 200 }
  );
}
