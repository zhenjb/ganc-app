import { NextResponse } from "next/server";
import { mockState } from "@/app/api/_mock/state";
import type { WithdrawRecord, WithdrawRequestResponse } from "@/app/lib/interfaces/withdraw";

/**
 * POST /api/withdraw-request
 *
 * Mock route handler that simulates a withdraw request.
 * Validates input, mutates in-memory mockState, and returns a WithdrawRecord.
 */
export async function POST(request: Request): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "invalid input" },
      { status: 400 },
    );
  }

  const { destination, amount, denom } = body as {
    destination?: string;
    destinationHash?: string;
    amount?: string;
    denom?: string;
  };

  // Validate: destination must match cosmos address regex
  if (!destination || !/^cosmos1[a-z0-9]{38,}$/.test(destination)) {
    return NextResponse.json(
      { error: "invalid input" },
      { status: 400 },
    );
  }

  // Validate: denom non-empty
  if (!denom || denom.trim() === "") {
    return NextResponse.json(
      { error: "invalid input" },
      { status: 400 },
    );
  }

  // Validate: amount parseable as positive BigInt
  if (!amount || amount.trim() === "") {
    return NextResponse.json(
      { error: "invalid input" },
      { status: 400 },
    );
  }

  let amountBigInt: bigint;
  try {
    amountBigInt = BigInt(amount);
  } catch {
    return NextResponse.json(
      { error: "invalid input" },
      { status: 400 },
    );
  }

  if (amountBigInt <= 0n) {
    return NextResponse.json(
      { error: "invalid input" },
      { status: 400 },
    );
  }

  // Generate random hex string (32 bytes = 64 hex chars)
  const randomHex = (bytes: number): string => {
    const arr = crypto.getRandomValues(new Uint8Array(bytes));
    return Array.from(arr)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  };

  // Generate WithdrawRecord
  const record: WithdrawRecord = {
    id: crypto.randomUUID(),
    destination,
    destinationHash: `0x${randomHex(32)}`,
    amount,
    denom,
    nullifier: `0x${randomHex(32)}`,
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  // Mutate mockState
  mockState.withdrawStatus = "pending";
  mockState.latestWithdrawRequest = record;

  const response: WithdrawRequestResponse = { request: record };
  return NextResponse.json(response, { status: 200 });
}
