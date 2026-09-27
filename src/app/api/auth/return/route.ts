import { NextResponse } from "next/server";
import { openBuyerHandoff } from "@/lib/buyer-handoff";
import { otpSessionSecret } from "@/lib/otp-session";
import { setOtpSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const REF_RE = /^[A-Za-z0-9_-]{1,80}$/;

/**
 * Restores the checkout session from a signed handoff, then continues.
 * `to=paid` lands on `/paid`. Older returns still open the photo page.
 * An anonymous visit, or a tampered token, does not receive a session.
 */
export function authReturnDestination(requestUrl: string): string {
  const url = new URL(requestUrl);
  const toPaid = url.searchParams.get("to") === "paid";
  const dest = new URL(toPaid ? "/paid" : "/app", url.origin);
  if (!toPaid && url.searchParams.get("paid") === "1") dest.searchParams.set("paid", "1");
  const ref = url.searchParams.get("ref") ?? "";
  if (REF_RE.test(ref)) dest.searchParams.set("ref", ref);
  return dest.toString();
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const secret = otpSessionSecret();
  const handoff = url.searchParams.get("handoff") ?? "";
  const opened = secret ? openBuyerHandoff(handoff, Math.floor(Date.now() / 1000), secret) : null;
  if (opened) await setOtpSession(opened.email);
  return NextResponse.redirect(authReturnDestination(request.url), 303);
}
