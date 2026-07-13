import { NextResponse, type NextRequest } from "next/server";
import { mockState } from "@/app/api/_mock/state";
import { getReservedBalancesData } from "@/app/api/_mock/trade";

export function GET(request: NextRequest): NextResponse {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  // If `owner` query param is present, return reserved balances (trade screen)
  const owner = request.nextUrl.searchParams.get("owner");
  if (owner) {
    return NextResponse.json(getReservedBalancesData(owner));
  }

  return NextResponse.json(mockState);
}
