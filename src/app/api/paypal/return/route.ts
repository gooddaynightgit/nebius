import { NextResponse } from "next/server";
import { handlePaypalReturn } from "@/lib/paypal";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** PayPal sends the buyer here after approval with ?ref=…&token=<order id>. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const ref = url.searchParams.get("ref") ?? "";
  const orderId = url.searchParams.get("token") ?? "";
  const next = await handlePaypalReturn(ref, orderId, url.origin);
  return NextResponse.redirect(next, { status: 303, headers: { "Cache-Control": "no-store" } });
}
