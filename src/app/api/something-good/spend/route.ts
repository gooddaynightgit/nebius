import { consumeMoment } from "@/lib/entitlement";
import { json } from "@/lib/http";
import { PAYMENT_HREF } from "@/lib/login-destination";
import { readOtpSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Something Good uses one play from the same `goodfans.game` balance as GoodDayNight.
 * Not signed in -> 401 { signIn }. No plays left -> { buy, href }. Otherwise one play is spent.
 */
export async function POST() {
  const otp = await readOtpSession();
  if (!otp?.email) return json({ ok: false, signIn: true }, 401);
  try {
    const remaining = await consumeMoment(otp.email);
    if (remaining === null) return json({ ok: false, buy: true, href: PAYMENT_HREF });
    return json({ ok: true, remaining });
  } catch {
    return json({ ok: false, error: "We couldn't check your plays right now." }, 503);
  }
}
