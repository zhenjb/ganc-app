import { NextResponse } from "next/server";
import { mockState } from "@/app/api/_mock/state";
import type { DepositRecord } from "@/app/lib/interfaces/deposit";

/**
 * GET /api/deposits
 *
 * Mock route handler that returns a list of deposit records.
 * In production mode returns 404 (real backend handles it).
 */
export async function GET(): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  // Build a list from the latestDeposit in mock state.
  // In a real backend this would return all indexed deposits.
  const deposits: DepositRecord[] = [];

  if (mockState.latestDeposit) {
    deposits.push(mockState.latestDeposit);
  }

  return NextResponse.json({ deposits }, { status: 200 });
}
