// =============================================================================
// GET /api/deposits/{id} — mock route handler (dev-only)
// -----------------------------------------------------------------------------
// Used by the wallet-signed deposit flow (FE-14) to fetch a DepositRecord
// after broadcasting MsgDeposit. In production this hits the real backend
// (P4) — the route handler simply 404s so it never returns mock data live.
// =============================================================================

import { NextResponse } from "next/server";
import { mockState } from "@/app/api/_mock/state";
import type { DepositLookupResponse } from "@/app/lib/interfaces/deposit";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  const { id } = await context.params;

  const latest = mockState.latestDeposit;
  if (!latest || latest.id !== id) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  const response: DepositLookupResponse = { deposit: latest };
  return NextResponse.json(response, { status: 200 });
}
