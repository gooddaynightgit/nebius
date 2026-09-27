import { NextResponse } from "next/server";
import { authReturnDestination, openBuyerHandoff } from "@/lib/buyer-handoff";
import { otpSessionSecret } from "@/lib/otp-session";
import { setOtpSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Restores the checkout session from a signed handoff, then continues.
 * `to=paid` lands on `/paid`. Older returns still open the photo page.
 * An anonymous visit, or a tampered token, does not receive a session.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const secret = otpSessionSecret();
  const handoff = url.searchParams.get("handoff") ?? "";
  const opened = secret ? openBuyerHandoff(handoff, Math.floor(Date.now() / 1000), secret) : null;
  if (opened) await setOtpSession(opened.email);
  return NextResponse.redirect(authReturnDestination(request.url), 303);
}
