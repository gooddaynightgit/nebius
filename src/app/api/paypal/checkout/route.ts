import { NextResponse } from "next/server";
import { newId, normalizeEmail } from "@/lib/identity";
import { otpAllowsEmail } from "@/lib/otp-session";
import { rememberPayfastOrder } from "@/lib/paid-return";
import { createPaypalOrder, paypalCredentials } from "@/lib/paypal";
import { readOtpSession, readSessionId } from "@/lib/session";
import { ensurePaymentVault } from "@/lib/vault";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const noStore = { "Cache-Control": "no-store" };

export async function GET() {
  return NextResponse.json({ ok: true, configured: Boolean(paypalCredentials()) }, { headers: noStore });
}

export async function POST(request: Request) {
  const origin = new URL(request.url).origin;
  const otp = await readOtpSession();
  const email = normalizeEmail(otp?.email ?? "");
  if (!otpAllowsEmail(otp, email)) {
    return NextResponse.redirect(new URL("/signin", origin), { status: 303, headers: noStore });
  }
  const ref = newId("pay");
  try {
    await rememberPayfastOrder(email, ref);
    await ensurePaymentVault(email, await readSessionId());
    const approveUrl = await createPaypalOrder(email, ref, origin);
    return NextResponse.redirect(approveUrl, { status: 303, headers: noStore });
  } catch (error) {
    console.error("[paypal] checkout could not start", error);
    return NextResponse.redirect(new URL("/moments?cancelled=1", origin), { status: 303, headers: noStore });
  }
}
