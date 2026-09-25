import { isValidEmail, normalizeEmail } from "@/lib/identity";
import { badRequest, json } from "@/lib/http";
import { VERIFY_FAIL, otpTable, verifyOtp } from "@/lib/otp";
import { setOtpSession } from "@/lib/session";
import { destinationForVerifiedEmail } from "@/lib/verified-destination";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CODE_RE = /^\d{6}$/;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    email?: string;
    code?: string;
    mode?: string;
  } | null;
  const email = normalizeEmail(body?.email ?? "");
  const code = String(body?.code ?? "").trim();
  if (!isValidEmail(email)) return badRequest("Enter a valid email.");
  if (!CODE_RE.test(code)) return json({ ok: false, message: VERIFY_FAIL }, 400);

  let matched = false;
  try {
    matched = await verifyOtp(email, code, otpTable());
  } catch {
    return json({ error: "Sign-in isn’t available right now." }, 503);
  }
  if (!matched) return json({ ok: false, message: VERIFY_FAIL }, 400);

  const signed = await setOtpSession(email);
  if (!signed) return json({ error: "Sign-in isn’t available right now." }, 503);

  const next = await destinationForVerifiedEmail(email);
  return json({ ok: true, next });
}
