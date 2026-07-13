import { NextResponse } from "next/server";
import { getMarketsData } from "@/app/api/_mock/trade";

/**
 * GET /api/markets
 *
 * Mock route handler that returns available market metadata.
 */
export function GET(): NextResponse {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  return NextResponse.json(getMarketsData());
}
