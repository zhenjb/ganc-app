import { NextResponse, type NextRequest } from "next/server";
import { cancelOrderMock } from "@/app/api/_mock/trade";

/**
 * DELETE /api/order/{id}?owner=
 *
 * Mock route handler for cancelling an order.
 * Handles 400 (owner_required), 403 (not owner), 404 (not found).
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  const { id } = await params;
  const owner = request.nextUrl.searchParams.get("owner") ?? "";

  const result = cancelOrderMock(id, owner);

  if (result.ok) {
    return NextResponse.json({ status: "cancelled" }, { status: 200 });
  }

  return NextResponse.json(
    { error: result.message },
    { status: result.status }
  );
}
