import { NextResponse } from "next/server";
import { paidViewForBuyer } from "@/lib/paid-return";
import { readGateEmail, readOtpSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Server re-check for the return page. The ref selects a stored order. It is not proof of payment. */
export async function GET(request: Request) {
  const ref = new URL(request.url).searchParams.get("ref");
  const otp = await readOtpSession();
  const gate = await readGateEmail();
  const email = otp && gate && otp.email === gate ? otp.email : null;
  const status = await paidViewForBuyer(email, ref);
  return NextResponse.json({ status }, { headers: { "Cache-Control": "no-store" } });
}
