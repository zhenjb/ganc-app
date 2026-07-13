import { NextResponse, type NextRequest } from "next/server";
import { getOpenOrdersData } from "@/app/api/_mock/trade";

/**
 * GET /api/orders?owner=
 *
 * Mock route handler that returns open orders for a given owner.
 */
export function GET(request: NextRequest): NextResponse {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  const owner = request.nextUrl.searchParams.get("owner") ?? "";
  if (!owner) {
    return NextResponse.json(
      { error: "owner_required" },
      { status: 400 }
    );
  }

  return NextResponse.json(getOpenOrdersData(owner));
}
