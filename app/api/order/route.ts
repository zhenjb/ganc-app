import { NextResponse } from "next/server";
import { validateOrder, placeOrderMock } from "@/app/api/_mock/trade";
import type { OrderInput } from "@/app/lib/interfaces/trade";

/**
 * POST /api/order
 *
 * Mock route handler for placing an order.
 * Validates the input and either returns a success response or a 400
 * with a typed `reason` code.
 */
export async function POST(request: Request): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  let body: OrderInput;
  try {
    body = (await request.json()) as OrderInput;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON", reason: "bad_format" },
      { status: 400 }
    );
  }

  // Validate
  const validation = validateOrder(body);
  if (!validation.valid) {
    return NextResponse.json(
      { error: "Order rejected", reason: validation.reason },
      { status: 400 }
    );
  }

  // Place order
  const result = placeOrderMock(body);
  return NextResponse.json(result, { status: 200 });
}
