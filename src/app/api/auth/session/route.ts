import { json } from "@/lib/http";
import { readGateEmail, readOtpSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const otp = await readOtpSession();
  const gate = await readGateEmail();
  const signedIn = Boolean(otp && gate && otp.email === gate);
  return json({ signedIn, email: signedIn && otp ? otp.email : null });
}
