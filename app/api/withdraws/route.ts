import { NextResponse } from "next/server";
import type { WithdrawRecord } from "@/app/lib/interfaces/withdraw";

const mockWithdraws: WithdrawRecord[] = [
  {
    id: "wd-1",
    destination: "cosmos1alice",
    destinationHash: "0xac44abc123",
    amount: "40",
    denom: "uusdc",
    nullifier: "0xac44abc123",
    status: "pending",
    createdAt: "2026-06-28T07:00:00Z",
  },
  {
    id: "wd-2",
    destination: "cosmos1bob",
    destinationHash: "0xbb55def456",
    amount: "100",
    denom: "uusdc",
    nullifier: "0xbb55def456",
    status: "claimed",
    createdAt: "2026-06-27T15:30:00Z",
    claimedAt: "2026-06-27T16:00:00Z",
  },
];

/**
 * GET /api/withdraws
 *
 * Mock route handler that returns a list of withdraw records.
 * In production mode returns 404 (real backend handles it).
 */
export async function GET(): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  return NextResponse.json({ withdraws: mockWithdraws }, { status: 200 });
}
