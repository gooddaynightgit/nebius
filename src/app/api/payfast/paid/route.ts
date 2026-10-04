import { NextResponse } from "next/server";
import { paidPollForHandoff } from "@/lib/paid-return";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const noStore = { "Cache-Control": "no-store" };

/** Re-check for the return page. The handoff must match the stored order. The ref is not proof. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const result = await paidPollForHandoff(url.searchParams.get("ref"), url.searchParams.get("handoff"));
  if (result.status === "absent") {
    return NextResponse.json({ status: "absent" }, { status: 404, headers: noStore });
  }
  if (result.status === "pending") {
    return NextResponse.json({ status: "pending" }, { status: 200, headers: noStore });
  }
  return NextResponse.json(
    { status: "complete", purchase: result.purchase },
    { status: 200, headers: noStore },
  );
}
