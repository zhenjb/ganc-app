import { NextResponse, type NextRequest } from "next/server";
import { getTradesData } from "@/app/api/_mock/trade";

/**
 * GET /api/trades?market=
 *
 * Mock route handler that returns trade fills for a given market.
 * NOTE: market query param contains "/" (e.g. "ATOM/USDC") — this is fine
 * as a query parameter value (auto-encoded by the browser).
 */
export function GET(request: NextRequest): NextResponse {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  const market = request.nextUrl.searchParams.get("market") ?? "";
  return NextResponse.json(getTradesData(market));
}
