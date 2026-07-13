import { NextResponse } from "next/server";
import { mockState } from "@/app/api/_mock/state";
import type { DepositRecord, DepositResponse } from "@/app/lib/interfaces/deposit";

/**
 * POST /api/deposit
 *
 * Mock route handler that simulates a deposit transaction.
 * Validates input, mutates in-memory mockState, and returns a DepositRecord.
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

  const { depositor, amount, denom } = body as {
    depositor?: string;
    amount?: string;
    denom?: string;
  };

  // Validate: depositor non-empty
  if (!depositor || depositor.trim() === "") {
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

  // Check balance sufficiency
  const balanceKey = `${depositor}/${denom}`;
  const currentBalanceStr = mockState.userBalances[balanceKey] ?? "0";
  const currentBalance = BigInt(currentBalanceStr);

  if (amountBigInt > currentBalance) {
    return NextResponse.json(
      { error: "insufficient balance" },
      { status: 400 },
    );
  }

  // Mutate mockState — module balance is a Record<denom, string>, so we
  // accumulate the deposited amount under the matching denom key only.
  mockState.userBalances[balanceKey] = (currentBalance - amountBigInt).toString();
  const currentModuleStr = mockState.moduleAccountBalance[denom] ?? "0";
  mockState.moduleAccountBalance[denom] = (
    BigInt(currentModuleStr) + amountBigInt
  ).toString();
  mockState.depositStatus = "processed";

  // Generate DepositRecord
  const id = crypto.randomUUID();
  const txHash = ("0x" + crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "")) as `0x${string}`;
  const createdAt = new Date().toISOString();

  const deposit: DepositRecord = {
    id,
    depositor,
    amount,
    denom,
    txHash,
    createdAt,
    processed: true,
  };

  mockState.latestDeposit = deposit;

  const response: DepositResponse = { deposit };
  return NextResponse.json(response, { status: 200 });
}
