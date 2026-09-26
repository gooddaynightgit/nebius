import { json } from "@/lib/http";
import { clearOtpSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  await clearOtpSession();
  return json({ ok: true, next: "/" });
}
