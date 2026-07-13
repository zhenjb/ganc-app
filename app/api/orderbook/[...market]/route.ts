import { NextResponse } from "next/server";
import { getOrderbookData } from "@/app/api/_mock/trade";

/**
 * GET /api/orderbook/{market}
 *
 * Mock route handler that returns the order book snapshot for a given market.
 * The market name contains "/" (e.g. "ATOM/USDC") which is captured via
 * the catch-all [...market] segment and joined back together.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ market: string[] }> }
): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  const { market: marketSegments } = await params;
  const market = marketSegments.join("/");

  const data = getOrderbookData(market);
  if (!data) {
    return NextResponse.json(
      { error: "unknown_market", reason: "unknown_market" },
      { status: 404 }
    );
  }

  return NextResponse.json(data);
}
