import { NextResponse } from "next/server";
import { paidViewForHandoff } from "@/lib/paid-return";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Re-check for the return page. The handoff must match the stored order. The ref is not proof. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const status = await paidViewForHandoff(url.searchParams.get("ref"), url.searchParams.get("handoff"));
  const httpStatus = status === "absent" ? 404 : 200;
  return NextResponse.json({ status }, { status: httpStatus, headers: { "Cache-Control": "no-store" } });
}
