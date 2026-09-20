import { attachEmail } from "@/lib/vault";
import { isValidEmail, normalizeEmail, todayStamp } from "@/lib/identity";
import { badRequest, json } from "@/lib/http";
import { loadSessionVault, toPublicSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const { sessionId, vault } = await loadSessionVault();
  if (vault.captures.length < 1) {
    return badRequest("Save at least one moment before unlocking your story.");
  }
  const body = (await request.json().catch(() => null)) as { email?: string } | null;
  const email = normalizeEmail(body?.email ?? "");
  if (!isValidEmail(email)) return badRequest("Enter a valid email.");
  const next = await attachEmail(sessionId, email);
  const day = todayStamp();
  return json({ session: toPublicSession(next, sessionId, day) });
}
