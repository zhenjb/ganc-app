import { NextResponse } from "next/server";
import { mockState } from "@/app/api/_mock/state";

export function GET(): NextResponse {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  return NextResponse.json(mockState);
}
