import { NextResponse } from "next/server";
import { openBuyerHandoff } from "@/lib/buyer-handoff";
import { otpSessionSecret } from "@/lib/otp-session";
import { setOtpSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const REF_RE = /^[A-Za-z0-9_-]{1,80}$/;

/**
 * PayFast return. A valid handoff sets the same gdn_otp + gdn_em session
 * checkout already required, then lands on the photo page. An anonymous
 * visit, or a tampered token, does not.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const secret = otpSessionSecret();
  const handoff = url.searchParams.get("handoff") ?? "";
  const opened = secret ? openBuyerHandoff(handoff, Math.floor(Date.now() / 1000), secret) : null;
  if (opened) await setOtpSession(opened.email);

  const dest = new URL("/app", url.origin);
  if (url.searchParams.get("paid") === "1") dest.searchParams.set("paid", "1");
  const ref = url.searchParams.get("ref") ?? "";
  if (REF_RE.test(ref)) dest.searchParams.set("ref", ref);
  return NextResponse.redirect(dest, 303);
}
