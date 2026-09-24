import { getEntitlement } from "@/lib/entitlement";
import { isValidEmail, normalizeEmail } from "@/lib/identity";
import { badRequest, json } from "@/lib/http";
import { readOtpSession, setGateEmail } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const email = normalizeEmail(await readEmail(request));
  if (!isValidEmail(email)) return badRequest("Enter a valid email.");
  const entitlement = await getEntitlement(email);
  const remaining = entitlement?.remaining ?? 0;
  const exhausted = remaining < 1 && (entitlement?.paymentIds.length ?? 0) > 0;
  const otp = await readOtpSession();
  if (remaining > 0 && otp?.email === email) await setGateEmail(email);
  return json({
    purchased: remaining > 0,
    remaining,
    exhausted,
  });
}

async function readEmail(request: Request): Promise<string> {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = (await request.json().catch(() => null)) as { email?: string } | null;
    return body?.email ?? "";
  }
  const form = await request.formData();
  return String(form.get("email") ?? "");
}
