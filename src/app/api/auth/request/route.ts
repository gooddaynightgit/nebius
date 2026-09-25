import { NextResponse } from "next/server";
import { isValidEmail, normalizeEmail } from "@/lib/identity";
import { badRequest, json } from "@/lib/http";
import {
  REQUEST_SENT,
  REQUEST_UNAVAILABLE,
  REQUEST_WAIT,
  devOtpEchoAllowed,
  issueOtp,
  otpTable,
  sendOtpEmail,
} from "@/lib/otp";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { email?: string } | null;
  const email = normalizeEmail(body?.email ?? "");
  if (!isValidEmail(email)) return badRequest("Enter a valid email.");

  try {
    const issued = await issueOtp(email, otpTable());
    if (!issued.ok) {
      if (issued.reason === "rate") return json({ ok: true, message: REQUEST_WAIT });
      return json({ error: REQUEST_UNAVAILABLE }, 503);
    }
    if (devOtpEchoAllowed()) {
      return NextResponse.json(
        { ok: true, message: REQUEST_SENT },
        { headers: { "x-gdn-dev-code": issued.code } },
      );
    }
    await sendOtpEmail(email, issued.code);
  } catch {
    return json({ error: REQUEST_UNAVAILABLE }, 503);
  }

  return json({ ok: true, message: REQUEST_SENT });
}
